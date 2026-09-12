"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/auth";

const fieldClass =
  "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

export default function LoginForm({ staff }: { staff: { id: string; full_name: string }[] }) {
  const [state, formAction, pending] = useActionState(signIn, undefined as { error?: string } | undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass}>Your name</label>
        <select name="staff_id" required defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Select your name…
          </option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>PIN</label>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          required
          autoFocus
          autoComplete="current-password"
          className={fieldClass}
        />
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
