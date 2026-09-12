"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updatePart, adjustStock, setPartActive } from "@/app/actions/parts";

type Part = {
  id: string;
  part_number: string;
  description: string;
  barcode_code: string;
  reorder_point: number | null;
  bin_location: string | null;
  unit_cost: number | null;
  active: boolean;
};

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";
const labelClass = "block text-sm font-medium text-slate-700 mb-1";

export function PartEditForm({ part }: { part: Part }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await updatePart(undefined, new FormData(e.currentTarget));
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-sm text-slate-500 underline">
        Edit part
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="id" value={part.id} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Part number</label>
          <input name="part_number" defaultValue={part.part_number} required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Barcode</label>
          <input name="barcode_code" defaultValue={part.barcode_code} required className={fieldClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <input name="description" defaultValue={part.description} required className={fieldClass} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Bin location</label>
          <input name="bin_location" defaultValue={part.bin_location ?? ""} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Reorder point</label>
          <input name="reorder_point" type="number" min={0} defaultValue={part.reorder_point ?? ""} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Unit cost</label>
          <input name="unit_cost" type="number" min={0} step="0.01" defaultValue={part.unit_cost ?? ""} className={fieldClass} />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-500 underline">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function AdjustStockForm({ partId }: { partId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(adjustStock, undefined as { error?: string; ok?: boolean } | undefined);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-slate-500 underline">
        Adjust stock (cycle count / correction)
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="part_id" value={partId} />
      <div className="flex gap-3 items-end">
        <div>
          <label className={labelClass}>
            Adjustment <span className="text-slate-400 font-normal">(+ or -)</span>
          </label>
          <input name="delta" type="number" required className={`${fieldClass} w-28`} />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Reason</label>
          <input name="notes" placeholder="e.g. cycle count correction" className={fieldClass} />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Apply adjustment"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 underline">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ArchiveToggle({ partId, active }: { partId: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await setPartActive(partId, !active);
        setBusy(false);
      }}
      className="text-sm text-slate-500 underline disabled:opacity-50"
    >
      {active ? "Archive part" : "Reactivate part"}
    </button>
  );
}
