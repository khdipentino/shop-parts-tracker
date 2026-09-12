"use client";

import { useRef, useState } from "react";
import { barcodeSignIn } from "@/app/actions/auth";
import ScannerInput from "@/components/ScannerInput";

export default function BarcodeSignInForm() {
  const [staffCode, setStaffCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  function handleIdScan(code: string) {
    setError(null);
    setStaffCode(code);
    // ScannerInput re-mounts the password field right after this render;
    // give it a tick to exist, then focus it so the second scan lands
    // there with no click in between.
    setTimeout(() => passwordInputRef.current?.focus(), 0);
  }

  async function handlePasswordScan(code: string) {
    if (!staffCode) return;
    setSubmitting(true);
    setError(null);
    const result = await barcodeSignIn(staffCode, code);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      setStaffCode(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">1. Scan your ID badge</label>
        {staffCode ? (
          <div className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm">
            <span className="font-mono text-slate-900 dark:text-slate-100">{staffCode}</span>
            <button
              type="button"
              onClick={() => {
                setStaffCode(null);
                setError(null);
              }}
              className="text-xs text-slate-500 dark:text-slate-400 underline"
            >
              Rescan
            </button>
          </div>
        ) : (
          <ScannerInput onScan={handleIdScan} placeholder="Scan ID badge…" />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">2. Scan your password barcode</label>
        <ScannerInput
          ref={passwordInputRef}
          onScan={handlePasswordScan}
          placeholder={staffCode ? "Scan password barcode…" : "Scan your ID badge first…"}
          disabled={!staffCode || submitting}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {submitting && <p className="text-sm text-slate-500 dark:text-slate-400">Signing in…</p>}
    </div>
  );
}
