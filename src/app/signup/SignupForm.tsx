"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestAccess } from "@/app/actions/auth";

const fieldClass =
  "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(
    requestAccess,
    undefined as { error?: string } | undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Full name</label>
        <input name="full_name" type="text" required className={fieldClass} />
      </div>

      <div>
        <label className={labelClass}>Email</label>
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </div>

      <div>
        <label className={labelClass}>Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">At least 8 characters.</p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-slate-900 text-white rounded-md py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {pending ? "Submitting…" : "Request access"}
      </button>

      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        Already approved?{" "}
        <Link href="/login" className="text-slate-900 dark:text-slate-100 font-medium underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
