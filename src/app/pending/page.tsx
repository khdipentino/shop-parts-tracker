import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role, full_name, active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.active && profile.app_role !== "pending") redirect("/dashboard");

  const wasApproved = profile && !profile.active && profile.app_role !== "pending";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {wasApproved ? "Access revoked" : "Access requested"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          {profile?.full_name ? `Hi ${profile.full_name}. ` : ""}
          {wasApproved
            ? "An admin has deactivated your access to this app. Contact an admin if you believe this is a mistake."
            : "Your request is waiting on an admin to approve it. Check back shortly, or reach out to your shop admin directly."}
        </p>
        <form action={signOut} className="mt-6">
          <button className="text-sm text-slate-500 dark:text-slate-400 underline" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
