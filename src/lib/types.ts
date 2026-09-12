export type AppRole = "staff" | "admin";
export type TxnType = "receive" | "issue" | "return" | "adjustment";

export interface Staff {
  id: string;
  full_name: string;
  pin_hash: string;
  app_role: AppRole;
  active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  badge_code: string;
  shop_section: string | null;
  active: boolean;
  created_at: string;
}

export interface Part {
  id: string;
  part_number: string;
  description: string;
  barcode_code: string;
  quantity_on_hand: number;
  reorder_point: number | null;
  bin_location: string | null;
  unit_cost: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: number;
  employee_id: string;
  work_order_number: string | null;
  created_by: string | null;
  created_at: string;
  voided: boolean;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  part_id: string;
  quantity: number;
  returned_quantity: number;
  unit_cost_snapshot: number | null;
}

export interface Transaction {
  id: string;
  type: TxnType;
  part_id: string;
  quantity: number;
  employee_id: string | null;
  invoice_id: string | null;
  invoice_item_id: string | null;
  work_order_number: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}
