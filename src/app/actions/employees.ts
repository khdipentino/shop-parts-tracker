"use server";

import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/lib/auth";
import * as db from "@/lib/db";

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong.";
}

export async function createEmployee(_prevState: unknown, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const badgeCode = String(formData.get("badge_code") || "").trim();
  const shopSection = String(formData.get("shop_section") || "").trim() || null;

  if (!firstName || !lastName || !badgeCode) {
    return { error: "First name, last name, and badge code are required." };
  }

  try {
    const employee = db.createEmployee({
      first_name: firstName,
      last_name: lastName,
      badge_code: badgeCode,
      shop_section: shopSection,
    });
    revalidatePath("/employees");
    return { employeeId: employee.id };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function updateEmployee(_prevState: unknown, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  const id = String(formData.get("id") || "");
  const firstName = String(formData.get("first_name") || "").trim();
  const lastName = String(formData.get("last_name") || "").trim();
  const badgeCode = String(formData.get("badge_code") || "").trim();
  const shopSection = String(formData.get("shop_section") || "").trim() || null;

  if (!id || !firstName || !lastName || !badgeCode) {
    return { error: "First name, last name, and badge code are required." };
  }

  try {
    db.updateEmployee(id, { first_name: firstName, last_name: lastName, badge_code: badgeCode, shop_section: shopSection });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function setEmployeeActive(id: string, active: boolean) {
  const staff = await getCurrentStaff();
  if (!staff) return { error: "Not signed in." };

  db.setEmployeeActive(id, active);
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { ok: true };
}
