"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function numberOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
}

export async function createPart(_prevState: unknown, formData: FormData) {
  const partNumber = String(formData.get("part_number") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const barcodeCode = String(formData.get("barcode_code") || "").trim() || partNumber;
  const reorderPoint = numberOrNull(formData.get("reorder_point"));
  const binLocation = String(formData.get("bin_location") || "").trim() || null;
  const unitCost = numberOrNull(formData.get("unit_cost"));
  const initialQuantity = numberOrNull(formData.get("initial_quantity"));

  if (!partNumber || !description) {
    return { error: "Part number and description are required." };
  }

  const supabase = await createClient();
  const { data: part, error } = await supabase
    .from("parts")
    .insert({
      part_number: partNumber,
      description,
      barcode_code: barcodeCode,
      reorder_point: reorderPoint,
      bin_location: binLocation,
      unit_cost: unitCost,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (initialQuantity && initialQuantity > 0) {
    const { error: txnError } = await supabase.from("transactions").insert({
      type: "receive",
      part_id: part.id,
      quantity: initialQuantity,
      notes: "Initial stock on hand",
    });
    if (txnError) return { error: txnError.message };
  }

  revalidatePath("/parts");
  return { partId: part.id as string };
}

export async function updatePart(_prevState: unknown, formData: FormData) {
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("parts")
    .update({
      part_number: partNumber,
      description,
      barcode_code: barcodeCode,
      reorder_point: reorderPoint,
      bin_location: binLocation,
      unit_cost: unitCost,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/parts");
  revalidatePath(`/parts/${id}`);
  return { ok: true };
}

export async function setPartActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("parts").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/parts");
  revalidatePath(`/parts/${id}`);
  return { ok: true };
}

export async function adjustStock(_prevState: unknown, formData: FormData) {
  const partId = String(formData.get("part_id") || "");
  const delta = numberOrNull(formData.get("delta"));
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!partId || !delta) {
    return { error: "A part and a non-zero adjustment amount are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    type: "adjustment",
    part_id: partId,
    quantity: delta,
    notes: notes ?? "Manual stock adjustment (e.g. cycle count)",
  });
  if (error) return { error: error.message };

  revalidatePath(`/parts/${partId}`);
  revalidatePath("/parts");
  return { ok: true };
}
