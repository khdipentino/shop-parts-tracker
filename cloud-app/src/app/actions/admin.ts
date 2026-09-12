"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/database.types";

export async function approveUser(userId: string, role: AppRole) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("profiles")
    .update({ app_role: role, active: true, approved_at: new Date().toISOString(), approved_by: user?.id ?? null })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin/pending-requests");
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRole(userId: string, role: AppRole) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ app_role: role }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserActive(userId: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
