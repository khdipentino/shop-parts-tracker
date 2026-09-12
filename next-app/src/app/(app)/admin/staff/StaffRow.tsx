"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changeStaffPin, updateStaffActive, updateStaffRole } from "@/app/actions/admin";
import type { AppRole } from "@/lib/types";

export default function StaffRow({
  staffId,
  fullName,
  role,
  active,
  isSelf,
}: {
  staffId: string;
  fullName: string;
  role: AppRole;
  active: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function changeRole(newRole: AppRole) {
    setBusy(true);
    await updateStaffRole(staffId, newRole);
    setBusy(false);
    router.refresh();
  }

  async function toggleActive() {
    setBusy(true);
    await updateStaffActive(staffId, !active);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <tr className={!active ? "opacity-50" : ""}>
        <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
          {fullName}
          {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
        </td>
        <td className="px-4 py-2">
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
        <td className="px-4 py-2 flex flex-wrap gap-3">
          <button
            disabled={busy || isSelf}
            onClick={toggleActive}
            className="text-sm text-slate-500 dark:text-slate-400 underline disabled:opacity-50"
          >
            {active ? "Deactivate" : "Reactivate"}
          </button>
          <button onClick={() => setResetting((r) => !r)} className="text-sm text-slate-500 dark:text-slate-400 underline">
            Reset PIN
          </button>
        </td>
      </tr>
      {resetting && (
        <tr>
          <td colSpan={3} className="px-4 pb-3">
            <ResetPinForm staffId={staffId} onDone={() => setResetting(false)} />
          </td>
        </tr>
      )}
    </>
  );
}

function ResetPinForm({ staffId, onDone }: { staffId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(changeStaffPin, undefined as { error?: string; ok?: boolean } | undefined);

  useEffect(() => {
    if (state?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 bg-slate-50 dark:bg-slate-800 rounded-md p-3">
      <input type="hidden" name="id" value={staffId} />
      <div>
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">New PIN</label>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          required
          minLength={4}
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Confirm</label>
        <input
          name="confirm_pin"
          type="password"
          inputMode="numeric"
          required
          minLength={4}
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-slate-900 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {pending ? "Saving…" : "Set PIN"}
      </button>
      <button type="button" onClick={onDone} className="text-sm text-slate-500 dark:text-slate-400 underline">
        Cancel
      </button>
    </form>
  );
}
