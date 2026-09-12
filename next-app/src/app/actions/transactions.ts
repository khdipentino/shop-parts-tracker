"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/lib/auth";
import * as db from "@/lib/db";

export type CartItem = { part_id: string; quantity: number };

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong.";
}

export async function receivePart(_prevState: unknown, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  const partId = String(formData.get("part_id") || "");
  const quantity = Number(formData.get("quantity") || 0);
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!partId || !quantity || quantity <= 0) {
    return { error: "A part and a positive quantity are required." };
  }

  try {
    db.receivePart(partId, quantity, notes, staff.id);
    revalidatePath("/receive");
    revalidatePath(`/parts/${partId}`);
    revalidatePath("/parts");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function issueParts(
  employeeId: string,
  workOrderNumber: string,
  items: CartItem[]
): Promise<{ invoiceId?: string; error?: string }> {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };
  if (!employeeId) return { error: "Scan or select an employee first." };
  if (!items.length) return { error: "Add at least one part before completing the receipt." };

  try {
    const invoice = db.createIssue(employeeId, workOrderNumber || null, items, staff.id);
    revalidatePath("/parts");
    revalidatePath("/invoices");
    return { invoiceId: invoice.id };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function returnItem(
  invoiceItemId: string,
  quantity: number,
  notes: string
): Promise<{ error?: string; ok?: boolean }> {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };
  if (!invoiceItemId || !quantity || quantity <= 0) {
    return { error: "A line item and a positive quantity are required." };
  }

  try {
    db.createReturn(invoiceItemId, quantity, notes || null, staff.id);
    revalidatePath("/returns");
    revalidatePath("/invoices");
    revalidatePath("/parts");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function voidInvoice(invoiceId: string, reason: string) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  try {
    db.voidInvoice(invoiceId, reason || null, staff.id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath("/parts");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function lookupEmployeeByBadge(code: string) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  const employee = db.getEmployeeByBadge(code);
  if (!employee || !employee.active) return { error: `No active employee found for badge "${code}".` };
  return { employee };
}

export async function lookupPartByBarcode(code: string) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  const part = db.getPartByBarcode(code);
  if (!part || !part.active) return { error: `No active part found for barcode "${code}".` };
  return { part };
}

export async function getOutstandingForEmployee(employeeId: string) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  return { items: db.getOutstandingItemsForEmployee(employeeId) };
}
