"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CartItem = { part_id: string; quantity: number };

export async function receivePart(_prevState: unknown, formData: FormData) {
  const partId = String(formData.get("part_id") || "");
  const quantity = Number(formData.get("quantity") || 0);
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!partId || !quantity || quantity <= 0) {
    return { error: "A part and a positive quantity are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    type: "receive",
    part_id: partId,
    quantity,
    notes,
  });
  if (error) return { error: error.message };

  revalidatePath("/receive");
  revalidatePath(`/parts/${partId}`);
  revalidatePath("/parts");
  return { ok: true };
}

export async function issueParts(
  employeeId: string,
  workOrderNumber: string,
  assetId: string,
  items: CartItem[]
): Promise<{ invoiceId?: string; error?: string }> {
  if (!employeeId) return { error: "Scan or select an employee first." };
  if (!workOrderNumber.trim()) return { error: "Work order number is required." };
  if (!assetId.trim()) return { error: "Asset ID is required." };
  if (!items.length) return { error: "Add at least one part before completing the receipt." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_issue", {
    p_employee_id: employeeId,
    p_work_order_number: workOrderNumber,
    p_asset_id: assetId,
    p_items: items,
  });

  if (error) return { error: error.message };

  revalidatePath("/parts");
  revalidatePath("/invoices");
  return { invoiceId: data as string };
}

export async function returnItem(
  invoiceItemId: string,
  quantity: number,
  notes: string
): Promise<{ error?: string; ok?: boolean }> {
  if (!invoiceItemId || !quantity || quantity <= 0) {
    return { error: "A line item and a positive quantity are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_return", {
    p_invoice_item_id: invoiceItemId,
    p_quantity: quantity,
    p_notes: notes || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/returns");
  revalidatePath("/invoices");
  revalidatePath("/parts");
  return { ok: true };
}

export async function voidInvoice(invoiceId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("void_invoice", {
    p_invoice_id: invoiceId,
    p_reason: reason || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/parts");
  return { ok: true };
}
