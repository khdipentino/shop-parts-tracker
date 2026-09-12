"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { returnItem } from "@/app/actions/transactions";
import ScannerInput from "@/components/ScannerInput";

type OutstandingItem = {
  id: string;
  quantity: number;
  returned_quantity: number;
  part: { part_number: string; description: string } | null;
  invoice: { invoice_number: number; work_order_number: string | null; created_at: string } | null;
};

type Employee = { id: string; first_name: string; last_name: string; badge_code: string };

export default function ReturnsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [items, setItems] = useState<OutstandingItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadOutstanding(employeeId: string) {
    const { data, error } = await supabase
      .from("invoice_items")
      .select(
        "id, quantity, returned_quantity, part:parts(part_number, description), invoice:invoices!inner(invoice_number, work_order_number, created_at, voided, employee_id)"
      )
      .eq("invoice.employee_id", employeeId)
      .eq("invoice.voided", false)
      .order("id");

    if (error) {
      setMessage({ text: error.message, tone: "error" });
      return;
    }

    const outstanding = (data ?? []).filter((i) => i.quantity - i.returned_quantity > 0) as unknown as OutstandingItem[];
    setItems(outstanding);
    setQuantities(Object.fromEntries(outstanding.map((i) => [i.id, i.quantity - i.returned_quantity])));
  }

  async function handleScan(code: string) {
    setMessage(null);
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, badge_code")
      .eq("badge_code", code)
      .maybeSingle();

    if (error || !data) {
      setEmployee(null);
      setItems([]);
      setMessage({ text: `No employee found for badge "${code}".`, tone: "error" });
      return;
    }
    setEmployee(data);
    await loadOutstanding(data.id);
  }

  async function handleReturn(item: OutstandingItem) {
    const qty = quantities[item.id] ?? 0;
    if (!qty || qty <= 0) return;
    setBusyId(item.id);
    const result = await returnItem(item.id, qty, "");
    setBusyId(null);
    if (result.error) {
      setMessage({ text: result.error, tone: "error" });
      return;
    }
    setMessage({ text: `Returned ${qty} × ${item.part?.description ?? "part"}.`, tone: "info" });
    if (employee) await loadOutstanding(employee.id);
  }

  function reset() {
    setEmployee(null);
    setItems([]);
    setMessage(null);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Returns</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Scan the employee&rsquo;s badge to see everything still outstanding on their receipts.
        </p>
      </div>

      {message && (
        <p
          className={`text-sm rounded-md px-3 py-2 border ${
            message.tone === "error"
              ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900"
              : "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"
          }`}
        >
          {message.text}
        </p>
      )}

      {employee ? (
        <div className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2">
          <span className="text-sm text-slate-900 dark:text-slate-100">
            {employee.first_name} {employee.last_name} · {employee.badge_code}
          </span>
          <button onClick={reset} className="text-xs text-slate-500 dark:text-slate-400 underline">
            Change employee
          </button>
        </div>
      ) : (
        <ScannerInput onScan={handleScan} placeholder="Scan employee badge…" />
      )}

      {employee && items.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nothing outstanding for this employee.</p>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Part</th>
                <th className="px-4 py-2 font-medium">Receipt</th>
                <th className="px-4 py-2 font-medium w-20">Out</th>
                <th className="px-4 py-2 font-medium w-24">Return</th>
                <th className="px-4 py-2 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => {
                const outstanding = item.quantity - item.returned_quantity;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <p className="text-slate-900 dark:text-slate-100">{item.part?.description}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{item.part?.part_number}</p>
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      #{item.invoice?.invoice_number}
                      {item.invoice?.work_order_number ? ` · ${item.invoice.work_order_number}` : ""}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{outstanding}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        max={outstanding}
                        value={quantities[item.id] ?? outstanding}
                        onChange={(e) =>
                          setQuantities((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                        }
                        className="w-16 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleReturn(item)}
                        disabled={busyId === item.id}
                        className="text-sm bg-slate-900 text-white rounded-md px-3 py-1.5 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        {busyId === item.id ? "…" : "Return"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
