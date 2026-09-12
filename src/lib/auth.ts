import { cookies } from "next/headers";
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "./session";
import { getStaffById } from "./db";
import type { Staff } from "./types";

// Node-side session helpers — these touch the database (via db.ts) and
// Next.js's cookie APIs, so unlike session.ts this file can only be used
// from Server Components, Server Actions, and Route Handlers, never from
// Edge middleware.
export async function getCurrentStaff(): Promise<Staff | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) return null;

  const staff = getStaffById(session.staffId);
  if (!staff || !staff.active) return null;
  return staff;
}

export async function startSession(staffId: string) {
  const cookieStore = await cookies();
  const token = await createSessionToken(staffId);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // This app is meant to run on plain http, on localhost or a shop's own
    // local network with no internet at all — never assume https.
    secure: false,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function endSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
