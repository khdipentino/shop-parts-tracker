"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/lib/auth";
import { createStaff, setStaffRole, setStaffActive, resetStaffPin } from "@/lib/db";
import { hashPin } from "@/lib/pin";
import type { AppRole } from "@/lib/types";

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong.";
}

async function requireAdmin() {
  const staff = await getCurrentStaff();
  return staff && staff.app_role === "admin" ? staff : null;
}

export async function addStaff(_prevState: unknown, formData: FormData) {
  if (!(await requireAdmin())) return { error: "Admin access required." };

  const fullName = String(formData.get("full_name") || "").trim();
  const pin = String(formData.get("pin") || "");
  const confirmPin = String(formData.get("confirm_pin") || "");
  const role = String(formData.get("app_role") || "staff") as AppRole;

  if (!fullName) return { error: "Name is required." };
  if (pin.length < 4) return { error: "PIN must be at least 4 digits." };
  if (pin !== confirmPin) return { error: "PINs don't match." };

  try {
    createStaff(fullName, hashPin(pin), role);
    revalidatePath("/admin/staff");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function updateStaffRole(id: string, role: AppRole) {
  if (!(await requireAdmin())) return { error: "Admin access required." };
  setStaffRole(id, role);
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateStaffActive(id: string, active: boolean) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };
  if (admin.active && id === admin.id && !active) {
    return { error: "You can't deactivate your own account." };
  }
  setStaffActive(id, active);
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function changeStaffPin(_prevState: unknown, formData: FormData) {
  if (!(await requireAdmin())) return { error: "Admin access required." };

  const id = String(formData.get("id") || "");
  const pin = String(formData.get("pin") || "");
  const confirmPin = String(formData.get("confirm_pin") || "");

  if (pin.length < 4) return { error: "PIN must be at least 4 digits." };
  if (pin !== confirmPin) return { error: "PINs don't match." };

  resetStaffPin(id, hashPin(pin));
  return { ok: true };
}
