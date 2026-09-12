-- =====================================================================
-- Shop Parts Tracker — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type app_role as enum ('pending', 'staff', 'admin');
create type txn_type as enum ('receive', 'issue', 'return', 'adjustment');

-- ---------------------------------------------------------------------
-- Profiles — one per authenticated (counter staff) user
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  app_role app_role not null default 'pending',
  active boolean not null default true,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Security-definer helpers so RLS policies can check the caller's own
-- role without recursively re-evaluating RLS on `profiles`.
create function current_app_role() returns app_role
language sql security definer stable set search_path = public as $$
  select app_role from profiles where id = auth.uid() and active
$$;

create function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select app_role = 'admin' from profiles where id = auth.uid() and active), false)
$$;

create function is_staff() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select app_role in ('staff', 'admin') from profiles where id = auth.uid() and active), false)
$$;

-- Prevent a non-admin from promoting themselves (or reactivating
-- themselves) by editing their own profile row directly.
create function guard_profile_privilege_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.app_role is distinct from old.app_role
       or new.active is distinct from old.active
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at then
      raise exception 'Only an admin can change role, active state, or approval fields.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_profile
before update on profiles
for each row execute function guard_profile_privilege_change();

create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Employees — the people parts get issued to, identified by badge scan
-- ---------------------------------------------------------------------
create table employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  badge_code text not null unique,
  shop_section text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Parts — the catalog + live stock count
-- ---------------------------------------------------------------------
create table parts (
  id uuid primary key default gen_random_uuid(),
  part_number text not null unique,
  description text not null,
  barcode_code text not null unique,
  quantity_on_hand int not null default 0,
  reorder_point int,
  bin_location text,
  unit_cost numeric(10, 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_parts_touch
before update on parts
for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------
-- Invoices — one per counter transaction that issues parts to an
-- employee (what gets printed as their work-order receipt)
-- ---------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated always as identity,
  employee_id uuid not null references employees(id),
  work_order_number text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  voided boolean not null default false,
  voided_by uuid references profiles(id),
  voided_at timestamptz,
  void_reason text
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  part_id uuid not null references parts(id),
  quantity int not null check (quantity > 0),
  returned_quantity int not null default 0 check (returned_quantity >= 0),
  unit_cost_snapshot numeric(10, 2),
  constraint invoice_items_return_lte_qty check (returned_quantity <= quantity)
);

-- ---------------------------------------------------------------------
-- Transactions — the full history of every part's stock movement.
-- quantity is a SIGNED delta applied directly to parts.quantity_on_hand:
-- receive/return are positive, issue is negative, adjustment is either.
-- ---------------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  type txn_type not null,
  part_id uuid not null references parts(id),
  quantity int not null check (quantity <> 0),
  employee_id uuid references employees(id),
  invoice_id uuid references invoices(id),
  invoice_item_id uuid references invoice_items(id),
  work_order_number text,
  notes text,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint transactions_direction check (
    (type = 'receive' and quantity > 0) or
    (type = 'issue' and quantity < 0) or
    (type = 'return' and quantity > 0) or
    (type = 'adjustment')
  )
);

create index transactions_part_id_idx on transactions (part_id, created_at desc);
create index transactions_employee_id_idx on transactions (employee_id, created_at desc);
create index transactions_invoice_id_idx on transactions (invoice_id);

-- Keep parts.quantity_on_hand as a running total, updated by every
-- transaction insert, so "how many in stock" is always a plain column
-- read — no need to sum the whole history on every page load.
create function apply_transaction_to_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update parts set quantity_on_hand = quantity_on_hand + new.quantity where id = new.part_id;
  return new;
end;
$$;

create trigger trg_apply_transaction
after insert on transactions
for each row execute function apply_transaction_to_stock();

-- Every transaction and invoice is stamped with who actually performed it
-- server-side, from the session — never trusted from client input, so the
-- audit trail (and the receipt) can't be spoofed by editing a form field.
create function stamp_transaction_performer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.performed_by = auth.uid();
  return new;
end;
$$;

create trigger trg_stamp_transaction
before insert on transactions
for each row execute function stamp_transaction_performer();

create function stamp_invoice_created_by() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_by = auth.uid();
  return new;
end;
$$;

create trigger trg_stamp_invoice
before insert on invoices
for each row execute function stamp_invoice_created_by();

-- ---------------------------------------------------------------------
-- create_issue — the counter checkout: one employee, one or more parts,
-- all-or-nothing. Creates the invoice + line items + the "issue" stock
-- movement for each item in a single transaction, so a half-built
-- receipt (invoice with no items, or items with no stock movement) can
-- never happen even if one row along the way fails.
-- p_items shape: [{"part_id": "...", "quantity": 2}, ...]
-- ---------------------------------------------------------------------
create function create_issue(
  p_employee_id uuid,
  p_work_order_number text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invoice_id uuid;
  v_item jsonb;
  v_part_id uuid;
  v_quantity int;
  v_unit_cost numeric(10, 2);
  v_invoice_item_id uuid;
begin
  if not is_staff() then
    raise exception 'Only staff can issue parts.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one part is required.';
  end if;

  insert into invoices (employee_id, work_order_number)
  values (p_employee_id, nullif(trim(p_work_order_number), ''))
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_part_id := (v_item->>'part_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Each item quantity must be a positive number.';
    end if;

    select unit_cost into v_unit_cost from parts where id = v_part_id;

    insert into invoice_items (invoice_id, part_id, quantity, unit_cost_snapshot)
    values (v_invoice_id, v_part_id, v_quantity, v_unit_cost)
    returning id into v_invoice_item_id;

    insert into transactions (type, part_id, quantity, employee_id, invoice_id, invoice_item_id, work_order_number)
    values ('issue', v_part_id, -v_quantity, p_employee_id, v_invoice_id, v_invoice_item_id, nullif(trim(p_work_order_number), ''));
  end loop;

  return v_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------
-- create_return — return some (or all) of one line item on an invoice
-- back to stock. Validates against what's actually still outstanding on
-- that line so you can't return more than was issued.
-- ---------------------------------------------------------------------
create function create_return(
  p_invoice_item_id uuid,
  p_quantity int,
  p_notes text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item invoice_items%rowtype;
  v_invoice invoices%rowtype;
  v_transaction_id uuid;
  v_outstanding int;
begin
  if not is_staff() then
    raise exception 'Only staff can process returns.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Return quantity must be a positive number.';
  end if;

  select * into v_item from invoice_items where id = p_invoice_item_id;
  if not found then
    raise exception 'Invoice line item not found.';
  end if;

  select * into v_invoice from invoices where id = v_item.invoice_id;
  if v_invoice.voided then
    raise exception 'Cannot return an item on a voided invoice.';
  end if;

  v_outstanding := v_item.quantity - v_item.returned_quantity;
  if p_quantity > v_outstanding then
    raise exception 'Only % of this part are still outstanding on this receipt.', v_outstanding;
  end if;

  update invoice_items set returned_quantity = returned_quantity + p_quantity where id = p_invoice_item_id;

  insert into transactions (type, part_id, quantity, employee_id, invoice_id, invoice_item_id, work_order_number, notes)
  values ('return', v_item.part_id, p_quantity, v_invoice.employee_id, v_invoice.id, v_item.id, v_invoice.work_order_number, nullif(trim(p_notes), ''))
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

-- ---------------------------------------------------------------------
-- void_invoice — the whole receipt was a mistake (wrong employee, wrong
-- parts scanned). Restocks whatever on it hasn't already been
-- individually returned, and marks the invoice voided. The invoice and
-- its history stay in place either way — nothing is deleted.
-- ---------------------------------------------------------------------
create function void_invoice(p_invoice_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_invoice invoices%rowtype;
  v_item invoice_items%rowtype;
  v_outstanding int;
begin
  if not is_staff() then
    raise exception 'Only staff can void a receipt.';
  end if;

  select * into v_invoice from invoices where id = p_invoice_id;
  if not found then
    raise exception 'Invoice not found.';
  end if;
  if v_invoice.voided then
    raise exception 'This invoice is already voided.';
  end if;

  for v_item in select * from invoice_items where invoice_id = p_invoice_id loop
    v_outstanding := v_item.quantity - v_item.returned_quantity;
    if v_outstanding > 0 then
      update invoice_items set returned_quantity = quantity where id = v_item.id;
      insert into transactions (type, part_id, quantity, employee_id, invoice_id, invoice_item_id, work_order_number, notes)
      values ('adjustment', v_item.part_id, v_outstanding, v_invoice.employee_id, v_invoice.id, v_item.id, v_invoice.work_order_number,
              'Restocked: receipt voided — ' || coalesce(nullif(trim(p_reason), ''), 'no reason given'));
    end if;
  end loop;

  update invoices
  set voided = true, voided_by = auth.uid(), voided_at = now(), void_reason = nullif(trim(p_reason), '')
  where id = p_invoice_id;
end;
$$;

-- Grant the three action RPCs to signed-in users explicitly (rather than
-- relying on Postgres's default PUBLIC execute grant) — each function
-- checks is_staff() itself before doing anything.
grant execute on function create_issue(uuid, text, jsonb) to authenticated;
grant execute on function create_return(uuid, int, text) to authenticated;
grant execute on function void_invoice(uuid, text) to authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles enable row level security;
alter table employees enable row level security;
alter table parts enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table transactions enable row level security;

-- profiles
create policy profiles_select_own_or_admin on profiles for select
  using (id = auth.uid() or is_admin());
create policy profiles_insert_own on profiles for insert
  with check (id = auth.uid() and app_role = 'pending');
create policy profiles_update_own_or_admin on profiles for update
  using (id = auth.uid() or is_admin());
create policy profiles_delete_admin on profiles for delete
  using (is_admin());

-- Everything below is "any approved counter staff can fully use the
-- counter" — this is a single small shop, not a multi-tenant app, so
-- staff vs admin only matters for who can approve new staff accounts.
create policy employees_all on employees for all
  using (is_staff()) with check (is_staff());

create policy parts_all on parts for all
  using (is_staff()) with check (is_staff());

create policy invoices_all on invoices for all
  using (is_staff()) with check (is_staff());

create policy invoice_items_all on invoice_items for all
  using (is_staff()) with check (is_staff());

create policy transactions_all on transactions for all
  using (is_staff()) with check (is_staff());

-- =====================================================================
-- Realtime — live stock counts + a live invoice feed at a busy counter
-- =====================================================================
alter publication supabase_realtime add table parts;
alter publication supabase_realtime add table transactions;
