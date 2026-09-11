"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createEmployee(_prevState: unknown, formData: FormData) {
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const badgeCode = String(formData.get("badge_code") || "").trim();
  const shopSection = String(formData.get("shop_section") || "").trim() || null;

  if (!firstName || !lastName || !badgeCode) {
    return { error: "First name, last name, and badge code are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({ first_name: firstName, last_name: lastName, badge_code: badgeCode, shop_section: shopSection })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/employees");
  return { employeeId: data.id as string };
}

export async function updateEmployee(_prevState: unknown, formData: FormData) {
  const id = String(formData.get("id") || "");
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const badgeCode = String(formData.get("badge_code") || "").trim();
  const shopSection = String(formData.get("shop_section") || "").trim() || null;

  if (!id || !firstName || !lastName || !badgeCode) {
    return { error: "First name, last name, and badge code are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ first_name: firstName, last_name: lastName, badge_code: badgeCode, shop_section: shopSection })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { ok: true };
}

export async function setEmployeeActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("employees").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { ok: true };
}
