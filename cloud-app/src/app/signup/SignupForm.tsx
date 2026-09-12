"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestAccess } from "@/app/actions/auth";

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";
const labelClass = "block text-sm font-medium text-slate-700 mb-1";

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
        <p className="text-xs text-slate-400 mt-1">At least 8 characters.</p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand text-white rounded-md py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Request access"}
      </button>

      <p className="text-sm text-slate-500 text-center">
        Already approved?{" "}
        <Link href="/login" className="text-ink font-medium underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
