"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Part = {
  id: string;
  part_number: string;
  description: string;
  bin_location: string | null;
  quantity_on_hand: number;
  unit_cost: number | null;
};

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function InventoryReportPage() {
  const [parts, setParts] = useState<Part[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("parts")
      .select("id, part_number, description, bin_location, quantity_on_hand, unit_cost")
      .eq("active", true)
      .order("part_number")
      .then(({ data }) => setParts(data ?? []));
  }, []);

  if (!parts) return null;

  const totalUnits = parts.reduce((s, p) => s + p.quantity_on_hand, 0);
  const totalValue = parts.reduce((s, p) => s + p.quantity_on_hand * (p.unit_cost ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark"
        >
          Print
        </button>
        <Link href="/reports" className="text-sm text-slate-500 underline">
          ← Reports
        </Link>
      </div>

      <div className="bg-white text-black">
        <div className="border-b-2 border-black pb-2 mb-3">
          <h1 className="text-lg font-bold">Full Inventory Report</h1>
          <p className="text-xs text-slate-500">Generated {new Date().toLocaleString()}</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-black">
              <th className="py-1">Part #</th>
              <th className="py-1">Description</th>
              <th className="py-1">Bin</th>
              <th className="py-1 text-right">On hand</th>
              <th className="py-1 text-right">Unit cost</th>
              <th className="py-1 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-b border-dashed border-slate-300">
                <td className="py-1 font-mono">{p.part_number}</td>
                <td className="py-1">{p.description}</td>
                <td className="py-1">{p.bin_location ?? "—"}</td>
                <td className="py-1 text-right">{p.quantity_on_hand}</td>
                <td className="py-1 text-right text-slate-500">
                  {p.unit_cost != null ? currency.format(p.unit_cost) : "—"}
                </td>
                <td className="py-1 text-right font-medium">
                  {currency.format(p.quantity_on_hand * (p.unit_cost ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td className="py-2" colSpan={3}>
                {parts.length} parts
              </td>
              <td className="py-2 text-right">{totalUnits}</td>
              <td className="py-2"></td>
              <td className="py-2 text-right">{currency.format(totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
