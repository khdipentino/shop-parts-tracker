"use server";

import { redirect } from "next/navigation";
import { countStaff, createStaff, getStaffById } from "@/lib/db";
import { hashPin, verifyPin } from "@/lib/pin";
import { startSession, endSession } from "@/lib/auth";

export async function signIn(_prevState: unknown, formData: FormData) {
  const staffId = String(formData.get("staff_id") || "");
  const pin = String(formData.get("pin") || "");

  if (!staffId || !pin) return { error: "Choose your name and enter your PIN." };

  const staff = getStaffById(staffId);
  if (!staff || !staff.active || !verifyPin(pin, staff.pin_hash)) {
    return { error: "Incorrect PIN." };
  }

  await startSession(staff.id);
  redirect("/dashboard");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

export async function createFirstAdmin(_prevState: unknown, formData: FormData) {
  if (countStaff() > 0) {
    return { error: "Setup has already been completed — go to the login page instead." };
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const pin = String(formData.get("pin") || "");
  const confirmPin = String(formData.get("confirm_pin") || "");

  if (!fullName) return { error: "Name is required." };
  if (pin.length < 4) return { error: "PIN must be at least 4 digits." };
  if (pin !== confirmPin) return { error: "PINs don't match." };

  const staff = createStaff(fullName, hashPin(pin), "admin");
  await startSession(staff.id);
  redirect("/dashboard");
}
