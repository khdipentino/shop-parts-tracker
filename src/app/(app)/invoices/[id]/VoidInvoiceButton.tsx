"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidInvoice } from "@/app/actions/transactions";

export default function VoidInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-red-600 dark:text-red-400 underline">
        Void this receipt
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 space-y-3 max-w-md">
      <p className="text-sm text-red-700 dark:text-red-400">
        This restocks everything on the receipt that hasn&rsquo;t already been individually returned, and marks it
        voided. It stays in history — nothing is deleted.
      </p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (e.g. wrong employee scanned)"
        className="w-full rounded-md border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-3">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await voidInvoice(invoiceId, reason);
            setBusy(false);
            if (result?.error) {
              setError(result.error);
              return;
            }
            router.refresh();
            setOpen(false);
          }}
          className="bg-red-600 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? "Voiding…" : "Confirm void"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-slate-500 dark:text-slate-400 underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
