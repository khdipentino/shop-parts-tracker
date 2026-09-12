"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createPart } from "@/app/actions/parts";

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";
const labelClass = "block text-sm font-medium text-slate-700 mb-1";

export default function NewPartForm({ defaultBarcode }: { defaultBarcode: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    createPart,
    undefined as { error?: string; partId?: string } | undefined
  );

  useEffect(() => {
    if (state?.partId) router.push(`/parts/${state.partId}`);
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Part number</label>
          <input name="part_number" required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>
            Barcode <span className="text-slate-400 font-normal">(defaults to part number)</span>
          </label>
          <input name="barcode_code" defaultValue={defaultBarcode} className={fieldClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <input name="description" required className={fieldClass} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Bin location</label>
          <input name="bin_location" className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Reorder point</label>
          <input name="reorder_point" type="number" min={0} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Unit cost</label>
          <input name="unit_cost" type="number" min={0} step="0.01" className={fieldClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Starting quantity on hand</label>
        <input name="initial_quantity" type="number" min={0} defaultValue={0} className={fieldClass} />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save part"}
      </button>
    </form>
  );
}
