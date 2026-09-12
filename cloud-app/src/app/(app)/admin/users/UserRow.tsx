"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserRole, setUserActive, setStaffCode, resetStaffPassword } from "@/app/actions/admin";
import type { AppRole } from "@/lib/database.types";
import Barcode from "@/components/Barcode";

function printIsolated() {
  document.body.classList.add("printing-isolated");
  window.print();
  // afterprint fires once the print dialog closes either way (printed or
  // cancelled) — that's when it's safe to restore the rest of the page.
  window.addEventListener("afterprint", () => document.body.classList.remove("printing-isolated"), { once: true });
}

export default function UserRow({
  userId,
  fullName,
  role,
  active,
  staffCode,
  isSelf,
}: {
  userId: string;
  fullName: string;
  role: AppRole;
  active: boolean;
  staffCode: string | null;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState(staffCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  async function changeRole(newRole: AppRole) {
    setBusy(true);
    await setUserRole(userId, newRole);
    setBusy(false);
    router.refresh();
  }

  async function toggleActive() {
    setBusy(true);
    await setUserActive(userId, !active);
    setBusy(false);
    router.refresh();
  }

  async function saveCode() {
    const result = await setStaffCode(userId, codeDraft);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setEditingCode(false);
    router.refresh();
  }

  async function generatePassword() {
    setGenerating(true);
    setError(null);
    setGeneratedCode(null);
    const result = await resetStaffPassword(userId);
    setGenerating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // Shown right here, without navigating anywhere — resetting a
    // password signs that account out of every session immediately
    // (Supabase's own behavior, not something this app controls), so if
    // this is your own account, a page navigation right now could land
    // you at /login before you ever see the code. Print it from here.
    setGeneratedCode(result.code!);
  }

  return (
    <>
      <tr className={!active ? "opacity-50" : ""}>
        <td className="px-4 py-2 text-slate-900 dark:text-slate-100 align-top">
          {fullName}
          {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
        </td>
        <td className="px-4 py-2 align-top">
          {editingCode ? (
            <div className="flex items-center gap-2">
              <input
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                className="w-28 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm font-mono"
              />
              <button onClick={saveCode} className="text-xs text-brand dark:text-white underline">
                Save
              </button>
              <button onClick={() => setEditingCode(false)} className="text-xs text-slate-500 dark:text-slate-400 underline">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-700 dark:text-slate-300">{staffCode ?? "—"}</span>
              <button onClick={() => setEditingCode(true)} className="text-xs text-slate-500 dark:text-slate-400 underline">
                Edit
              </button>
            </div>
          )}
        </td>
        <td className="px-4 py-2 align-top">
          <select
            value={role}
            disabled={busy || isSelf}
            onChange={(e) => changeRole(e.target.value as AppRole)}
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1 text-sm disabled:opacity-50"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </td>
        <td className="px-4 py-2 align-top">
          <div className="flex flex-col items-start gap-1.5">
            <button
              disabled={busy || isSelf}
              onClick={toggleActive}
              className="text-sm text-slate-500 dark:text-slate-400 underline disabled:opacity-50"
            >
              {active ? "Deactivate" : "Reactivate"}
            </button>
            <button
              disabled={generating || !staffCode}
              onClick={generatePassword}
              className="text-sm text-brand dark:text-white underline disabled:opacity-50"
              title={staffCode ? undefined : "Set an ID code first"}
            >
              {generating ? "Generating…" : "Generate password barcode"}
            </button>
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </td>
      </tr>

      {generatedCode && (
        <tr>
          <td colSpan={4} className="px-4 pb-4">
            <div className="rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {isSelf
                  ? "This just reset your own password — you'll be signed out the moment you navigate anywhere else. Print this now, then sign back in with it."
                  : "This code won't be shown again after you leave this page — print it now."}
              </p>
              <div id="print-isolated" className="inline-block border border-slate-300 rounded-md p-4 bg-white text-black w-72">
                <p className="text-base font-medium mb-3">{fullName}</p>
                <p className="text-xs text-slate-600 mb-1">Scan to identify:</p>
                <Barcode value={staffCode ?? ""} height={45} />
                <p className="text-xs text-slate-600 mt-3 mb-1">Then scan to sign in:</p>
                <Barcode value={generatedCode} height={45} />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={printIsolated}
                  className="bg-brand text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-brand-dark dark:bg-brand dark:hover:bg-brand-dark"
                >
                  Print badge
                </button>
                <button onClick={() => setGeneratedCode(null)} className="text-sm text-slate-500 dark:text-slate-400 underline">
                  Dismiss
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
