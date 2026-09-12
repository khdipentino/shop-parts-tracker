import { redirect } from "next/navigation";
import { countStaff } from "@/lib/db";
import SetupForm from "./SetupForm";

// Must be re-checked on every request, not baked in at build time — see
// the comment on the same line in src/app/page.tsx.
export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (countStaff() > 0) redirect("/login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Welcome</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          This looks like the first time Shop Parts Tracker has run on this computer. Create the first admin
          account to get started — you can add everyone else afterward.
        </p>
        <SetupForm />
      </div>
    </div>
  );
}
