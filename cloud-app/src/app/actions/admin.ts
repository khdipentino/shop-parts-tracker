"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/database.types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("app_role").eq("id", user.id).maybeSingle();
  return profile?.app_role === "admin" ? user : null;
}

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

export async function setStaffCode(userId: string, staffCode: string) {
  const code = staffCode.trim().toUpperCase();
  if (!code) return { error: "ID code can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ staff_code: code }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

// Generates a fresh random sign-in code and sets it as that person's
// ACTUAL account password via the Supabase Admin API — "regenerating the
// password barcode" is really just resetting their password to something
// short enough to encode in a barcode. Returned once so the caller can
// print it immediately; it is never stored anywhere in readable form
// afterward (Supabase only keeps the hash, same as any password).
export async function resetStaffPassword(userId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easier to read if ever typed by hand
  let code = "";
  for (let i = 0; i < 10; i++) code += alphabet[randomInt(alphabet.length)];

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: code });
  if (error) return { error: error.message };

  return { ok: true, code };
}
