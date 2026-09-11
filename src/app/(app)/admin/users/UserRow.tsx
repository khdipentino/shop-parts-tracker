"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserRole, setUserActive } from "@/app/actions/admin";
import type { AppRole } from "@/lib/database.types";

export default function UserRow({
  userId,
  fullName,
  role,
  active,
  isSelf,
}: {
  userId: string;
  fullName: string;
  role: AppRole;
  active: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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

  return (
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
      <td className="px-4 py-2">
        <button
          disabled={busy || isSelf}
          onClick={toggleActive}
          className="text-sm text-slate-500 dark:text-slate-400 underline disabled:opacity-50"
        >
          {active ? "Deactivate" : "Reactivate"}
        </button>
      </td>
    </tr>
  );
}
