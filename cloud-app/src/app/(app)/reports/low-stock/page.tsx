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
  reorder_point: number | null;
};

export default function LowStockReportPage() {
  const [parts, setParts] = useState<Part[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("parts")
      .select("id, part_number, description, bin_location, quantity_on_hand, reorder_point")
      .eq("active", true)
      .not("reorder_point", "is", null)
      .order("quantity_on_hand")
      .then(({ data }) => setParts((data ?? []).filter((p) => p.quantity_on_hand <= (p.reorder_point ?? 0))));
  }, []);

  if (!parts) return null;

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
          <h1 className="text-lg font-bold">Low Stock Report</h1>
          <p className="text-xs text-slate-500">Generated {new Date().toLocaleString()}</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-black">
              <th className="py-1">Part #</th>
              <th className="py-1">Description</th>
              <th className="py-1">Bin</th>
              <th className="py-1 text-right">On hand</th>
              <th className="py-1 text-right">Reorder pt</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-b border-dashed border-slate-300">
                <td className="py-1 font-mono">{p.part_number}</td>
                <td className="py-1">{p.description}</td>
                <td className="py-1">{p.bin_location ?? "—"}</td>
                <td className="py-1 text-right font-medium">{p.quantity_on_hand}</td>
                <td className="py-1 text-right text-slate-500">{p.reorder_point}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {parts.length === 0 && <p className="text-sm text-slate-500 mt-4">Nothing is at or below its reorder point.</p>}
      </div>
    </div>
  );
}
