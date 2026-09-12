import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");

  return (
    <AppShell fullName={staff.full_name} isAdmin={staff.app_role === "admin"}>
      {children}
    </AppShell>
  );
}
