"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

type Row = {
  id: string;
  type: string;
  quantity: number;
  created_at: string;
  work_order_number: string | null;
  notes: string | null;
  part: { part_number: string; description: string } | null;
  employee: { first_name: string; last_name: string } | null;
  performer: { full_name: string } | null;
};

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function ActivityReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runReport() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("transactions")
      .select(
        "id, type, quantity, created_at, work_order_number, notes, part:parts(part_number, description), employee:employees(first_name, last_name), performer:profiles!transactions_performed_by_fkey(full_name)"
      )
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("transactions")
      .select(
        "id, type, quantity, created_at, work_order_number, notes, part:parts(part_number, description), employee:employees(first_name, last_name), performer:profiles!transactions_performed_by_fkey(full_name)"
      )
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as unknown as Row[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <style>{"@page { size: landscape; margin: 0.4in; }"}</style>

      <div className="no-print flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <label>From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1"
          />
          <label>To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1"
          />
          <button
            onClick={runReport}
            disabled={loading}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Run"}
          </button>
        </div>
        <button
          onClick={() => window.print()}
          disabled={!rows}
          className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
        >
          Print
        </button>
        <Link href="/reports" className="text-sm text-slate-500 underline">
          ← Reports
        </Link>
      </div>

      {rows && (
        <div className="bg-white text-black">
          <div className="border-b-2 border-black pb-2 mb-3">
            <h1 className="text-lg font-bold">Activity Log</h1>
            <p className="text-xs text-slate-500">
              {format(new Date(from), "MMM d, yyyy")} – {format(new Date(to), "MMM d, yyyy")} · generated{" "}
              {new Date().toLocaleString()}
            </p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 border-b border-black">
                <th className="py-1">Date</th>
                <th className="py-1">Type</th>
                <th className="py-1">Part</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1">Employee</th>
                <th className="py-1">Work order</th>
                <th className="py-1">Performed by</th>
                <th className="py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-dashed border-slate-300">
                  <td className="py-1 whitespace-nowrap">{format(new Date(r.created_at), "MM/dd/yy h:mm a")}</td>
                  <td className="py-1 capitalize">{r.type}</td>
                  <td className="py-1">
                    {r.part?.description} <span className="text-slate-500">({r.part?.part_number})</span>
                  </td>
                  <td className={`py-1 text-right ${r.quantity > 0 ? "font-medium" : ""}`}>
                    {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
                  </td>
                  <td className="py-1">{r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : ""}</td>
                  <td className="py-1">{r.work_order_number ?? ""}</td>
                  <td className="py-1">{r.performer?.full_name ?? ""}</td>
                  <td className="py-1 text-slate-500">{r.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && <p className="text-sm text-slate-500 mt-4">No activity in this date range.</p>}
        </div>
      )}
    </div>
  );
}
