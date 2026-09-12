"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/lib/auth";
import * as db from "@/lib/db";

function numberOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong.";
}

export async function createPart(_prevState: unknown, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  const partNumber = String(formData.get("part_number") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const barcodeCode = String(formData.get("barcode_code") || "").trim() || partNumber;
  const reorderPoint = numberOrNull(formData.get("reorder_point"));
  const binLocation = String(formData.get("bin_location") || "").trim() || null;
  const unitCost = numberOrNull(formData.get("unit_cost"));
  const initialQuantity = numberOrNull(formData.get("initial_quantity")) ?? 0;

  if (!partNumber || !description) {
    return { error: "Part number and description are required." };
  }

  try {
    const part = db.createPart({
      part_number: partNumber,
      description,
      barcode_code: barcodeCode,
      reorder_point: reorderPoint,
      bin_location: binLocation,
      unit_cost: unitCost,
      initial_quantity: initialQuantity,
      performed_by: staff.id,
    });
    revalidatePath("/parts");
    return { partId: part.id };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function updatePart(_prevState: unknown, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  const id = String(formData.get("id") || "");
  const partNumber = String(formData.get("part_number") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const barcodeCode = String(formData.get("barcode_code") || "").trim();
  const reorderPoint = numberOrNull(formData.get("reorder_point"));
  const binLocation = String(formData.get("bin_location") || "").trim() || null;
  const unitCost = numberOrNull(formData.get("unit_cost"));

  if (!id || !partNumber || !description || !barcodeCode) {
    return { error: "Part number, description, and barcode are required." };
  }

  try {
    db.updatePart(id, {
      part_number: partNumber,
      description,
      barcode_code: barcodeCode,
      reorder_point: reorderPoint,
      bin_location: binLocation,
      unit_cost: unitCost,
    });
    revalidatePath("/parts");
    revalidatePath(`/parts/${id}`);
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function setPartActive(id: string, active: boolean) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  db.setPartActive(id, active);
  revalidatePath("/parts");
  revalidatePath(`/parts/${id}`);
  return { ok: true };
}

export async function adjustStock(_prevState: unknown, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  const partId = String(formData.get("part_id") || "");
  const delta = numberOrNull(formData.get("delta"));
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!partId || !delta) {
    return { error: "A part and a non-zero adjustment amount are required." };
  }

  try {
    db.adjustStock(partId, delta, notes ?? "Manual stock adjustment (e.g. cycle count)", staff.id);
    revalidatePath(`/parts/${partId}`);
    revalidatePath("/parts");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
