"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { receivePart } from "@/app/actions/transactions";
import ScannerInput from "@/components/ScannerInput";

type Part = { id: string; part_number: string; description: string; barcode_code: string; quantity_on_hand: number };
type LogLine = { part: Part; quantity: number; at: string };

export default function ReceivePage() {
  const supabase = useMemo(() => createClient(), []);
  const [part, setPart] = useState<Part | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleScan(code: string) {
    setNotFoundCode(null);
    const { data, error: lookupError } = await supabase
      .from("parts")
      .select("id, part_number, description, barcode_code, quantity_on_hand")
      .eq("barcode_code", code)
      .maybeSingle();

    if (lookupError || !data) {
      setPart(null);
      setNotFoundCode(code);
      return;
    }
    setPart(data);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!part) return;

    const formData = new FormData(e.currentTarget);
    const quantity = Number(formData.get("quantity") || 0);

    setSubmitting(true);
    setError(null);
    const result = await receivePart(undefined, formData);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setLog((prev) => [{ part, quantity, at: new Date().toLocaleTimeString() }, ...prev]);
    setPart(null);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Receive parts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Scan a part barcode, confirm the quantity that came in, and it goes straight onto the shelf count.
        </p>
      </div>

      {!part && <ScannerInput onScan={handleScan} placeholder="Scan or type part barcode / part number…" />}

      {notFoundCode && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          No part found for &ldquo;{notFoundCode}&rdquo;.{" "}
          <Link href={`/parts/new?barcode=${encodeURIComponent(notFoundCode)}`} className="underline font-medium">
            Add it as a new part
          </Link>
          .
        </p>
      )}

      {part && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <input type="hidden" name="part_id" value={part.id} />
          <div>
            <p className="font-medium text-ink">{part.description}</p>
            <p className="text-sm text-slate-500">
              {part.part_number} · {part.quantity_on_hand} currently on hand
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity received
            </label>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              autoFocus
              required
              className="w-32 rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes <span className="text-slate-400 font-normal">(optional — PO #, vendor, etc.)</span>
            </label>
            <input
              name="notes"
              type="text"
              className="w-full rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
            >
              {submitting ? "Logging…" : "Log receipt"}
            </button>
            <button type="button" onClick={() => setPart(null)} className="text-sm text-slate-500 underline">
              Cancel
            </button>
          </div>
        </form>
      )}

      {log.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-medium text-ink text-sm">Logged this session</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {log.map((l, i) => (
              <li key={i} className="px-4 py-2 text-sm flex items-center justify-between">
                <span className="text-ink">{l.part.description}</span>
                <span className="text-emerald-600 font-mono">
                  +{l.quantity} <span className="text-slate-400">· {l.at}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
