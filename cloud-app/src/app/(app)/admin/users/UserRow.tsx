"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserRole, setUserActive, setStaffCode, resetStaffPassword } from "@/app/actions/admin";
import type { AppRole } from "@/lib/database.types";

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
    const result = await resetStaffPassword(userId);
    setGenerating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(
      `/admin/users/${userId}/badge?code=${encodeURIComponent(result.code!)}&name=${encodeURIComponent(fullName)}`
    );
  }

  return (
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
  );
}
