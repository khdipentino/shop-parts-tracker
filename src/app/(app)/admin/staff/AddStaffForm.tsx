"use client";

import { useActionState, useEffect, useRef } from "react";
import { addStaff } from "@/app/actions/admin";

const fieldClass =
  "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

export default function AddStaffForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(addStaff, undefined as { error?: string; ok?: boolean } | undefined);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <h2 className="font-medium text-slate-900 dark:text-slate-100 text-sm">Add staff</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Full name</label>
          <input name="full_name" required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Role</label>
          <select name="app_role" defaultValue="staff" className={fieldClass}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>PIN</label>
          <input name="pin" type="password" inputMode="numeric" required minLength={4} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Confirm PIN</label>
          <input name="confirm_pin" type="password" inputMode="numeric" required minLength={4} className={fieldClass} />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {pending ? "Adding…" : "Add staff"}
      </button>
    </form>
  );
}
