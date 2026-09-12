-- =====================================================================
-- Shop Parts Tracker — barcode quick sign-in + professional receipts
-- Run this once in the Supabase SQL editor, after 0001_init.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Barcode quick sign-in: each staff member gets a short "ID code" (what
-- gets printed as their username barcode) and we keep a copy of their
-- email on the profile so an unauthenticated scan can be resolved to an
-- email address without exposing the rest of auth.users. The actual
-- "password barcode" is just their real Supabase Auth password, reset to
-- a random printable code by an admin (see get_email_for_staff_code and
-- the app's resetStaffPassword action) — no separate secret storage here.
-- ---------------------------------------------------------------------
alter table profiles add column if not exists email text;
alter table profiles add column if not exists staff_code text unique;

update profiles set email = (select u.email from auth.users u where u.id = profiles.id)
where email is null;

update profiles set staff_code = 'STF-' || upper(substr(replace(id::text, '-', ''), 1, 6))
where staff_code is null;

create function ensure_profile_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is null then
    select u.email into new.email from auth.users u where u.id = new.id;
  end if;
  if new.staff_code is null then
    new.staff_code := 'STF-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

create trigger trg_profile_defaults
before insert on profiles
for each row execute function ensure_profile_defaults();

-- Resolves a scanned ID badge to the email address to sign in with.
-- Security definer so it can be called by a not-yet-authenticated visitor
-- (the whole point of quick sign-in) — it only ever returns an email
-- address, never anything else from the profile.
create function get_email_for_staff_code(p_staff_code text) returns text
language sql security definer stable set search_path = public as $$
  select email from profiles where staff_code = p_staff_code and active
$$;

grant execute on function get_email_for_staff_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Receipts: work order number and asset ID are now mandatory on every
-- issued receipt.
-- ---------------------------------------------------------------------
update invoices set work_order_number = 'UNKNOWN' where work_order_number is null;
alter table invoices alter column work_order_number set not null;

alter table invoices add column if not exists asset_id text;
update invoices set asset_id = 'UNKNOWN' where asset_id is null;
alter table invoices alter column asset_id set not null;

-- create_issue is replaced (not just updated) because the new asset_id
-- parameter changes its signature — Postgres treats that as a different
-- function, so the old 3-argument version is dropped first.
drop function if exists create_issue(uuid, text, jsonb);

create function create_issue(
  p_employee_id uuid,
  p_work_order_number text,
  p_asset_id text,
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
  v_work_order_number text := nullif(trim(p_work_order_number), '');
  v_asset_id text := nullif(trim(p_asset_id), '');
begin
  if not is_staff() then
    raise exception 'Only staff can issue parts.';
  end if;
  if v_work_order_number is null then
    raise exception 'Work order number is required.';
  end if;
  if v_asset_id is null then
    raise exception 'Asset ID is required.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one part is required.';
  end if;

  insert into invoices (employee_id, work_order_number, asset_id)
  values (p_employee_id, v_work_order_number, v_asset_id)
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
    values ('issue', v_part_id, -v_quantity, p_employee_id, v_invoice_id, v_invoice_item_id, v_work_order_number);
  end loop;

  return v_invoice_id;
end;
$$;

grant execute on function create_issue(uuid, text, text, jsonb) to authenticated;
