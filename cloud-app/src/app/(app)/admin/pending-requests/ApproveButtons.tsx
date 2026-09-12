"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveUser } from "@/app/actions/admin";
import type { AppRole } from "@/lib/database.types";

export default function ApproveButtons({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<AppRole | null>(null);

  async function approve(role: AppRole) {
    setBusy(role);
    await approveUser(userId, role);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={busy !== null}
        onClick={() => approve("staff")}
        className="text-sm bg-brand text-white rounded-md px-3 py-1.5 hover:bg-brand-dark disabled:opacity-50 dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
      >
        {busy === "staff" ? "…" : "Approve as staff"}
      </button>
      <button
        disabled={busy !== null}
        onClick={() => approve("admin")}
        className="text-sm border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
      >
        {busy === "admin" ? "…" : "Approve as admin"}
      </button>
    </div>
  );
}
