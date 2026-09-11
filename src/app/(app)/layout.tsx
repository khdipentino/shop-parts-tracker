import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, app_role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active || profile.app_role === "pending") redirect("/pending");

  return (
    <AppShell fullName={profile.full_name} isAdmin={profile.app_role === "admin"}>
      {children}
    </AppShell>
  );
}
