import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { AppRole, Employee, Invoice, InvoiceItem, Part, Staff, Transaction, TxnType } from "./types";

// Everything lives in one file on disk, right next to the app. Back this
// one file up (copy it to a USB drive, etc.) and you have the whole
// database — there's no server, account, or network involved.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "shop-parts-tracker.db");

const SCHEMA_SQL = `
create table if not exists staff (
  id text primary key,
  full_name text not null,
  pin_hash text not null,
  app_role text not null check (app_role in ('staff', 'admin')),
  active integer not null default 1,
  created_at text not null
);

create table if not exists employees (
  id text primary key,
  first_name text not null,
  last_name text not null,
  badge_code text not null unique,
  shop_section text,
  active integer not null default 1,
  created_at text not null
);

create table if not exists parts (
  id text primary key,
  part_number text not null unique,
  description text not null,
  barcode_code text not null unique,
  quantity_on_hand integer not null default 0,
  reorder_point integer,
  bin_location text,
  unit_cost real,
  active integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table if not exists invoices (
  id text primary key,
  invoice_number integer not null unique,
  employee_id text not null references employees(id),
  work_order_number text,
  created_by text references staff(id),
  created_at text not null,
  voided integer not null default 0,
  voided_by text references staff(id),
  voided_at text,
  void_reason text
);

create table if not exists invoice_items (
  id text primary key,
  invoice_id text not null references invoices(id),
  part_id text not null references parts(id),
  quantity integer not null check (quantity > 0),
  returned_quantity integer not null default 0,
  unit_cost_snapshot real
);

create table if not exists transactions (
  id text primary key,
  type text not null check (type in ('receive', 'issue', 'return', 'adjustment')),
  part_id text not null references parts(id),
  quantity integer not null,
  employee_id text references employees(id),
  invoice_id text references invoices(id),
  invoice_item_id text references invoice_items(id),
  work_order_number text,
  notes text,
  performed_by text references staff(id),
  created_at text not null
);

create index if not exists transactions_part_idx on transactions (part_id, created_at desc);
create index if not exists transactions_employee_idx on transactions (employee_id, created_at desc);
create index if not exists transactions_invoice_idx on transactions (invoice_id);
`;

// A dev-mode hot reload re-runs this module; cache the connection on
// globalThis so we don't try to open the same SQLite file twice.
const globalForDb = globalThis as unknown as { __sptDb?: DatabaseSync };

function openDb(): DatabaseSync {
  if (globalForDb.__sptDb) return globalForDb.__sptDb;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA_SQL);

  globalForDb.__sptDb = db;
  return db;
}

// Lazy: importing this module must not touch the disk. Next.js imports
// route modules just to inspect them (during `next build`'s "collecting
// page data" step, potentially from several worker processes at once) —
// if opening the database were a module-level side effect, those workers
// would race to create the same SQLite file and one would see "database
// is locked". Accessing any property below is what actually opens it, on
// first real use at request time.
const db = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const real = openDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

function withTransaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function now() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------
// Row mappers — SQLite has no boolean type, so 0/1 integers come back as
// numbers and need converting.
// ---------------------------------------------------------------------
function mapStaff(row: Record<string, unknown>): Staff {
  return {
    id: row.id as string,
    full_name: row.full_name as string,
    pin_hash: row.pin_hash as string,
    app_role: row.app_role as AppRole,
    active: !!row.active,
    created_at: row.created_at as string,
  };
}

function mapEmployee(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    first_name: row.first_name as string,
    last_name: row.last_name as string,
    badge_code: row.badge_code as string,
    shop_section: (row.shop_section as string | null) ?? null,
    active: !!row.active,
    created_at: row.created_at as string,
  };
}

function mapPart(row: Record<string, unknown>): Part {
  return {
    id: row.id as string,
    part_number: row.part_number as string,
    description: row.description as string,
    barcode_code: row.barcode_code as string,
    quantity_on_hand: Number(row.quantity_on_hand),
    reorder_point: row.reorder_point == null ? null : Number(row.reorder_point),
    bin_location: (row.bin_location as string | null) ?? null,
    unit_cost: row.unit_cost == null ? null : Number(row.unit_cost),
    active: !!row.active,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    invoice_number: Number(row.invoice_number),
    employee_id: row.employee_id as string,
    work_order_number: (row.work_order_number as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: row.created_at as string,
    voided: !!row.voided,
    voided_by: (row.voided_by as string | null) ?? null,
    voided_at: (row.voided_at as string | null) ?? null,
    void_reason: (row.void_reason as string | null) ?? null,
  };
}

function mapInvoiceItem(row: Record<string, unknown>): InvoiceItem {
  return {
    id: row.id as string,
    invoice_id: row.invoice_id as string,
    part_id: row.part_id as string,
    quantity: Number(row.quantity),
    returned_quantity: Number(row.returned_quantity),
    unit_cost_snapshot: row.unit_cost_snapshot == null ? null : Number(row.unit_cost_snapshot),
  };
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    type: row.type as TxnType,
    part_id: row.part_id as string,
    quantity: Number(row.quantity),
    employee_id: (row.employee_id as string | null) ?? null,
    invoice_id: (row.invoice_id as string | null) ?? null,
    invoice_item_id: (row.invoice_item_id as string | null) ?? null,
    work_order_number: (row.work_order_number as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    performed_by: (row.performed_by as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

// ---------------------------------------------------------------------
// Staff (who operates the counter)
// ---------------------------------------------------------------------
export function countStaff(): number {
  const row = db.prepare("select count(*) as n from staff").get();
  return Number(row?.n ?? 0);
}

export function getStaffById(id: string): Staff | null {
  const row = db.prepare("select * from staff where id = ?").get(id);
  return row ? mapStaff(row) : null;
}

export function listStaff(): Staff[] {
  return db.prepare("select * from staff order by full_name").all().map(mapStaff);
}

export function listActiveStaffNames(): { id: string; full_name: string }[] {
  return db
    .prepare("select id, full_name from staff where active = 1 order by full_name")
    .all()
    .map((r) => ({ id: r.id as string, full_name: r.full_name as string }));
}

export function createStaff(fullName: string, pinHash: string, role: AppRole): Staff {
  const id = randomUUID();
  db.prepare("insert into staff (id, full_name, pin_hash, app_role, active, created_at) values (?, ?, ?, ?, 1, ?)").run(
    id,
    fullName,
    pinHash,
    role,
    now()
  );
  return getStaffById(id)!;
}

export function setStaffRole(id: string, role: AppRole) {
  db.prepare("update staff set app_role = ? where id = ?").run(role, id);
}

export function setStaffActive(id: string, active: boolean) {
  db.prepare("update staff set active = ? where id = ?").run(active ? 1 : 0, id);
}

export function resetStaffPin(id: string, pinHash: string) {
  db.prepare("update staff set pin_hash = ? where id = ?").run(pinHash, id);
}

// ---------------------------------------------------------------------
// Employees (who parts get issued to)
// ---------------------------------------------------------------------
export function listEmployees(query?: string): Employee[] {
  if (query) {
    const term = `%${query}%`;
    return db
      .prepare(
        "select * from employees where first_name like ? or last_name like ? or badge_code like ? order by last_name"
      )
      .all(term, term, term)
      .map(mapEmployee);
  }
  return db.prepare("select * from employees order by last_name").all().map(mapEmployee);
}

export function getEmployeeById(id: string): Employee | null {
  const row = db.prepare("select * from employees where id = ?").get(id);
  return row ? mapEmployee(row) : null;
}

export function getEmployeeByBadge(code: string): Employee | null {
  const row = db.prepare("select * from employees where badge_code = ?").get(code);
  return row ? mapEmployee(row) : null;
}

export function createEmployee(data: {
  first_name: string;
  last_name: string;
  badge_code: string;
  shop_section: string | null;
}): Employee {
  const id = randomUUID();
  db.prepare(
    "insert into employees (id, first_name, last_name, badge_code, shop_section, active, created_at) values (?, ?, ?, ?, ?, 1, ?)"
  ).run(id, data.first_name, data.last_name, data.badge_code, data.shop_section, now());
  return getEmployeeById(id)!;
}

export function updateEmployee(
  id: string,
  data: { first_name: string; last_name: string; badge_code: string; shop_section: string | null }
) {
  db.prepare("update employees set first_name = ?, last_name = ?, badge_code = ?, shop_section = ? where id = ?").run(
    data.first_name,
    data.last_name,
    data.badge_code,
    data.shop_section,
    id
  );
}

export function setEmployeeActive(id: string, active: boolean) {
  db.prepare("update employees set active = ? where id = ?").run(active ? 1 : 0, id);
}

// ---------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------
export function listParts(query?: string): Part[] {
  if (query) {
    const term = `%${query}%`;
    return db
      .prepare(
        "select * from parts where part_number like ? or description like ? or barcode_code like ? order by part_number"
      )
      .all(term, term, term)
      .map(mapPart);
  }
  return db.prepare("select * from parts order by part_number").all().map(mapPart);
}

export function getPartById(id: string): Part | null {
  const row = db.prepare("select * from parts where id = ?").get(id);
  return row ? mapPart(row) : null;
}

export function getPartByBarcode(code: string): Part | null {
  const row = db.prepare("select * from parts where barcode_code = ?").get(code);
  return row ? mapPart(row) : null;
}

export function getLowStockParts(): Part[] {
  return db
    .prepare(
      "select * from parts where active = 1 and reorder_point is not null and quantity_on_hand <= reorder_point order by quantity_on_hand asc"
    )
    .all()
    .map(mapPart);
}

export function countActiveParts(): number {
  const row = db.prepare("select count(*) as n from parts where active = 1").get();
  return Number(row?.n ?? 0);
}

export function countActiveEmployees(): number {
  const row = db.prepare("select count(*) as n from employees where active = 1").get();
  return Number(row?.n ?? 0);
}

export function createPart(data: {
  part_number: string;
  description: string;
  barcode_code: string;
  reorder_point: number | null;
  bin_location: string | null;
  unit_cost: number | null;
  initial_quantity: number;
  performed_by: string | null;
}): Part {
  return withTransaction(() => {
    const id = randomUUID();
    const ts = now();
    db.prepare(
      `insert into parts
        (id, part_number, description, barcode_code, quantity_on_hand, reorder_point, bin_location, unit_cost, active, created_at, updated_at)
       values (?, ?, ?, ?, 0, ?, ?, ?, 1, ?, ?)`
    ).run(id, data.part_number, data.description, data.barcode_code, data.reorder_point, data.bin_location, data.unit_cost, ts, ts);

    if (data.initial_quantity > 0) {
      insertTransaction({
        type: "receive",
        part_id: id,
        quantity: data.initial_quantity,
        notes: "Initial stock on hand",
        performed_by: data.performed_by,
      });
    }

    return getPartById(id)!;
  });
}

export function updatePart(
  id: string,
  data: {
    part_number: string;
    description: string;
    barcode_code: string;
    reorder_point: number | null;
    bin_location: string | null;
    unit_cost: number | null;
  }
) {
  db.prepare(
    `update parts set part_number = ?, description = ?, barcode_code = ?, reorder_point = ?, bin_location = ?, unit_cost = ?, updated_at = ?
     where id = ?`
  ).run(data.part_number, data.description, data.barcode_code, data.reorder_point, data.bin_location, data.unit_cost, now(), id);
}

export function setPartActive(id: string, active: boolean) {
  db.prepare("update parts set active = ?, updated_at = ? where id = ?").run(active ? 1 : 0, now(), id);
}

// ---------------------------------------------------------------------
// Transactions — the shared low-level insert + stock update. Every
// higher-level operation (receive, issue, return, adjustment) goes
// through this so quantity_on_hand can never drift from the history.
// ---------------------------------------------------------------------
function insertTransaction(data: {
  type: TxnType;
  part_id: string;
  quantity: number;
  employee_id?: string | null;
  invoice_id?: string | null;
  invoice_item_id?: string | null;
  work_order_number?: string | null;
  notes?: string | null;
  performed_by: string | null;
}): Transaction {
  const id = randomUUID();
  db.prepare(
    `insert into transactions
      (id, type, part_id, quantity, employee_id, invoice_id, invoice_item_id, work_order_number, notes, performed_by, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.type,
    data.part_id,
    data.quantity,
    data.employee_id ?? null,
    data.invoice_id ?? null,
    data.invoice_item_id ?? null,
    data.work_order_number ?? null,
    data.notes ?? null,
    data.performed_by,
    now()
  );
  db.prepare("update parts set quantity_on_hand = quantity_on_hand + ?, updated_at = ? where id = ?").run(
    data.quantity,
    now(),
    data.part_id
  );
  return getTransactionById(id)!;
}

function getTransactionById(id: string): Transaction | null {
  const row = db.prepare("select * from transactions where id = ?").get(id);
  return row ? mapTransaction(row) : null;
}

export function receivePart(partId: string, quantity: number, notes: string | null, performedBy: string | null) {
  if (quantity <= 0) throw new Error("Quantity must be positive.");
  return withTransaction(() =>
    insertTransaction({ type: "receive", part_id: partId, quantity, notes, performed_by: performedBy })
  );
}

export function adjustStock(partId: string, delta: number, notes: string | null, performedBy: string | null) {
  if (delta === 0) throw new Error("Adjustment must be non-zero.");
  return withTransaction(() =>
    insertTransaction({ type: "adjustment", part_id: partId, quantity: delta, notes, performed_by: performedBy })
  );
}

export type CartItem = { part_id: string; quantity: number };

// The counter checkout: one employee, one or more parts, all-or-nothing.
export function createIssue(
  employeeId: string,
  workOrderNumber: string | null,
  items: CartItem[],
  performedBy: string | null
): Invoice {
  if (items.length === 0) throw new Error("At least one part is required.");

  return withTransaction(() => {
    const invoiceId = randomUUID();
    const row = db.prepare("select coalesce(max(invoice_number), 0) + 1 as next from invoices").get();
    const invoiceNumber = Number(row?.next ?? 1);

    db.prepare(
      "insert into invoices (id, invoice_number, employee_id, work_order_number, created_by, created_at, voided) values (?, ?, ?, ?, ?, ?, 0)"
    ).run(invoiceId, invoiceNumber, employeeId, workOrderNumber, performedBy, now());

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new Error("Each item quantity must be a positive number.");
      }
      const part = getPartById(item.part_id);
      if (!part) throw new Error("Unknown part in cart.");

      const itemId = randomUUID();
      db.prepare(
        "insert into invoice_items (id, invoice_id, part_id, quantity, returned_quantity, unit_cost_snapshot) values (?, ?, ?, ?, 0, ?)"
      ).run(itemId, invoiceId, item.part_id, item.quantity, part.unit_cost);

      insertTransaction({
        type: "issue",
        part_id: item.part_id,
        quantity: -item.quantity,
        employee_id: employeeId,
        invoice_id: invoiceId,
        invoice_item_id: itemId,
        work_order_number: workOrderNumber,
        performed_by: performedBy,
      });
    }

    return getInvoiceById(invoiceId)!;
  });
}

export function createReturn(
  invoiceItemId: string,
  quantity: number,
  notes: string | null,
  performedBy: string | null
): Transaction {
  if (quantity <= 0) throw new Error("Return quantity must be a positive number.");

  return withTransaction(() => {
    const itemRow = db.prepare("select * from invoice_items where id = ?").get(invoiceItemId);
    if (!itemRow) throw new Error("Invoice line item not found.");
    const item = mapInvoiceItem(itemRow);

    const invoiceRow = db.prepare("select * from invoices where id = ?").get(item.invoice_id);
    if (!invoiceRow) throw new Error("Invoice not found.");
    const invoice = mapInvoice(invoiceRow);
    if (invoice.voided) throw new Error("Cannot return an item on a voided invoice.");

    const outstanding = item.quantity - item.returned_quantity;
    if (quantity > outstanding) {
      throw new Error(`Only ${outstanding} of this part are still outstanding on this receipt.`);
    }

    db.prepare("update invoice_items set returned_quantity = returned_quantity + ? where id = ?").run(
      quantity,
      invoiceItemId
    );

    return insertTransaction({
      type: "return",
      part_id: item.part_id,
      quantity,
      employee_id: invoice.employee_id,
      invoice_id: invoice.id,
      invoice_item_id: item.id,
      work_order_number: invoice.work_order_number,
      notes,
      performed_by: performedBy,
    });
  });
}

export function voidInvoice(invoiceId: string, reason: string | null, performedBy: string | null) {
  return withTransaction(() => {
    const invoiceRow = db.prepare("select * from invoices where id = ?").get(invoiceId);
    if (!invoiceRow) throw new Error("Invoice not found.");
    const invoice = mapInvoice(invoiceRow);
    if (invoice.voided) throw new Error("This invoice is already voided.");

    const items = db.prepare("select * from invoice_items where invoice_id = ?").all(invoiceId).map(mapInvoiceItem);
    for (const item of items) {
      const outstanding = item.quantity - item.returned_quantity;
      if (outstanding > 0) {
        db.prepare("update invoice_items set returned_quantity = quantity where id = ?").run(item.id);
        insertTransaction({
          type: "adjustment",
          part_id: item.part_id,
          quantity: outstanding,
          employee_id: invoice.employee_id,
          invoice_id: invoice.id,
          invoice_item_id: item.id,
          work_order_number: invoice.work_order_number,
          notes: `Restocked: receipt voided — ${reason?.trim() || "no reason given"}`,
          performed_by: performedBy,
        });
      }
    }

    db.prepare("update invoices set voided = 1, voided_by = ?, voided_at = ?, void_reason = ? where id = ?").run(
      performedBy,
      now(),
      reason?.trim() || null,
      invoiceId
    );
  });
}

export function getRecentTransactions(limit: number): (Transaction & {
  part: Pick<Part, "part_number" | "description"> | null;
  employee: Pick<Employee, "first_name" | "last_name"> | null;
})[] {
  const rows = db
    .prepare(
      `select t.*, p.part_number as p_part_number, p.description as p_description,
              e.first_name as e_first_name, e.last_name as e_last_name
       from transactions t
       left join parts p on p.id = t.part_id
       left join employees e on e.id = t.employee_id
       order by t.created_at desc
       limit ?`
    )
    .all(limit);

  return rows.map((row) => ({
    ...mapTransaction(row),
    part: row.p_part_number
      ? { part_number: row.p_part_number as string, description: row.p_description as string }
      : null,
    employee: row.e_first_name
      ? { first_name: row.e_first_name as string, last_name: row.e_last_name as string }
      : null,
  }));
}

export function getTransactionsForPart(partId: string, limit: number): (Transaction & {
  employee: Pick<Employee, "first_name" | "last_name"> | null;
  invoice_number: number | null;
})[] {
  const rows = db
    .prepare(
      `select t.*, e.first_name as e_first_name, e.last_name as e_last_name, i.invoice_number as i_invoice_number
       from transactions t
       left join employees e on e.id = t.employee_id
       left join invoices i on i.id = t.invoice_id
       where t.part_id = ?
       order by t.created_at desc
       limit ?`
    )
    .all(partId, limit);

  return rows.map((row) => ({
    ...mapTransaction(row),
    employee: row.e_first_name
      ? { first_name: row.e_first_name as string, last_name: row.e_last_name as string }
      : null,
    invoice_number: row.i_invoice_number == null ? null : Number(row.i_invoice_number),
  }));
}

export function getTransactionsForEmployee(
  employeeId: string,
  limit: number
): (Transaction & { part: Pick<Part, "part_number" | "description"> | null })[] {
  const rows = db
    .prepare(
      `select t.*, p.part_number as p_part_number, p.description as p_description
       from transactions t
       left join parts p on p.id = t.part_id
       where t.employee_id = ?
       order by t.created_at desc
       limit ?`
    )
    .all(employeeId, limit);

  return rows.map((row) => ({
    ...mapTransaction(row),
    part: row.p_part_number
      ? { part_number: row.p_part_number as string, description: row.p_description as string }
      : null,
  }));
}

export function listInvoices(limit: number): (Invoice & {
  employee: Pick<Employee, "first_name" | "last_name"> | null;
  item_count: number;
})[] {
  const rows = db
    .prepare(
      `select inv.*, e.first_name as e_first_name, e.last_name as e_last_name,
              (select coalesce(sum(quantity), 0) from invoice_items where invoice_id = inv.id) as item_count
       from invoices inv
       left join employees e on e.id = inv.employee_id
       order by inv.created_at desc
       limit ?`
    )
    .all(limit);

  return rows.map((row) => ({
    ...mapInvoice(row),
    employee: row.e_first_name
      ? { first_name: row.e_first_name as string, last_name: row.e_last_name as string }
      : null,
    item_count: Number(row.item_count ?? 0),
  }));
}

export function getInvoiceById(id: string): Invoice | null {
  const row = db.prepare("select * from invoices where id = ?").get(id);
  return row ? mapInvoice(row) : null;
}

export function getInvoiceWithDetails(id: string): {
  invoice: Invoice;
  employee: Employee | null;
  creator: Staff | null;
} | null {
  const invoice = getInvoiceById(id);
  if (!invoice) return null;
  return {
    invoice,
    employee: getEmployeeById(invoice.employee_id),
    creator: invoice.created_by ? getStaffById(invoice.created_by) : null,
  };
}

export function getInvoiceItems(invoiceId: string): (InvoiceItem & { part: Part | null })[] {
  const rows = db.prepare("select * from invoice_items where invoice_id = ?").all(invoiceId);
  return rows.map((row) => {
    const item = mapInvoiceItem(row);
    return { ...item, part: getPartById(item.part_id) };
  });
}

export function getOutstandingItemsForEmployee(
  employeeId: string
): (InvoiceItem & { part: Part | null; invoice: Invoice })[] {
  const rows = db
    .prepare(
      `select ii.* from invoice_items ii
       join invoices inv on inv.id = ii.invoice_id
       where inv.employee_id = ? and inv.voided = 0 and ii.quantity > ii.returned_quantity
       order by ii.id`
    )
    .all(employeeId);

  return rows.map((row) => {
    const item = mapInvoiceItem(row);
    return { ...item, part: getPartById(item.part_id), invoice: getInvoiceById(item.invoice_id)! };
  });
}
