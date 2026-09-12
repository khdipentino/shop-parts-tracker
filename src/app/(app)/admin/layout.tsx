import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff();
  if (!staff || staff.app_role !== "admin") redirect("/dashboard");
  return <>{children}</>;
}
