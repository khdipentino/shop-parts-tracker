"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import BarcodeSignInForm from "./BarcodeSignInForm";

export default function LoginPage() {
  const [mode, setMode] = useState<"barcode" | "password">("barcode");
  const [state, formAction, pending] = useActionState(signIn, undefined as { error?: string } | undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border-t-4 border-t-black border-x border-b border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-ink">Shop Parts Tracker</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          {mode === "barcode" ? "Scan your badge and password code." : "Sign in to continue."}
        </p>

        <div className="flex gap-1 mb-5 rounded-md bg-slate-100 p-1 text-sm">
          <button
            onClick={() => setMode("barcode")}
            className={`flex-1 rounded py-1.5 font-medium transition-colors ${
              mode === "barcode"
                ? "bg-white text-black shadow-sm"
                : "text-slate-500"
            }`}
          >
            Scan badge
          </button>
          <button
            onClick={() => setMode("password")}
            className={`flex-1 rounded py-1.5 font-medium transition-colors ${
              mode === "password"
                ? "bg-white text-black shadow-sm"
                : "text-slate-500"
            }`}
          >
            Email &amp; password
          </button>
        </div>

        {mode === "barcode" ? (
          <BarcodeSignInForm />
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
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
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <p className="text-sm text-slate-500 mt-6 text-center">
          First time here?{" "}
          <Link href="/signup" className="text-ink font-medium underline">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
