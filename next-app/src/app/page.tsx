import { redirect } from "next/navigation";
import { countStaff } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";

// This page's very first branch (staff count) can be true at build time
// and false forever after — never let Next bake that in as a static
// prerender. Every visit must re-check current state.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  if (countStaff() === 0) redirect("/setup");

  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  redirect("/dashboard");
}
