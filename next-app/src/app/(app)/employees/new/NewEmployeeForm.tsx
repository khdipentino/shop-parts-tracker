"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEmployee } from "@/app/actions/employees";

const fieldClass =
  "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

export default function NewEmployeeForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createEmployee,
    undefined as { error?: string; employeeId?: string } | undefined
  );

  useEffect(() => {
    if (state?.employeeId) router.push(`/employees/${state.employeeId}`);
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>First name</label>
          <input name="first_name" required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input name="last_name" required className={fieldClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Badge code</label>
        <input name="badge_code" required className={fieldClass} placeholder="What's printed/encoded on their badge" />
      </div>
      <div>
        <label className={labelClass}>
          Shop section <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input name="shop_section" className={fieldClass} />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {pending ? "Saving…" : "Save employee"}
      </button>
    </form>
  );
}
