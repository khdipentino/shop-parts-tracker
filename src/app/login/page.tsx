import { redirect } from "next/navigation";
import { countStaff, listActiveStaffNames } from "@/lib/db";
import LoginForm from "./LoginForm";

// Must be re-checked on every request, not baked in at build time — see
// the comment on the same line in src/app/page.tsx.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  if (countStaff() === 0) redirect("/setup");

  const staff = listActiveStaffNames();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Shop Parts Tracker</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">Pick your name and enter your PIN.</p>
        {staff.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md px-3 py-2">
            No active staff accounts. Ask an admin to reactivate one.
          </p>
        ) : (
          <LoginForm staff={staff} />
        )}
      </div>
    </div>
  );
}
