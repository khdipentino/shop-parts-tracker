"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { issueParts, lookupEmployeeByBadge, lookupPartByBarcode } from "@/app/actions/transactions";
import ScannerInput from "@/components/ScannerInput";

type Employee = { id: string; first_name: string; last_name: string; badge_code: string };
type Part = { id: string; part_number: string; description: string; barcode_code: string; quantity_on_hand: number };
type CartLine = { part: Part; quantity: number };

export default function CheckoutPage() {
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [workOrder, setWorkOrder] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleEmployeeScan(code: string) {
    const result = await lookupEmployeeByBadge(code);
    if (result.error || !result.employee) {
      setMessage({ text: result.error ?? "Employee not found.", tone: "error" });
      return;
    }
    setEmployee(result.employee);
    setMessage({ text: `Employee: ${result.employee.first_name} ${result.employee.last_name}`, tone: "info" });
  }

  async function handlePartScan(code: string) {
    const result = await lookupPartByBarcode(code);
    if (result.error || !result.part) {
      setMessage({ text: result.error ?? "Part not found.", tone: "error" });
      return;
    }
    const part = result.part;

    setCart((prev) => {
      const existing = prev.find((l) => l.part.id === part.id);
      if (existing) {
        return prev.map((l) => (l.part.id === part.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { part, quantity: 1 }];
    });
    setMessage({ text: `Added: ${part.description}`, tone: "info" });
  }

  function updateQuantity(partId: string, quantity: number) {
    setCart((prev) =>
      prev.map((l) => (l.part.id === partId ? { ...l, quantity: Math.max(1, Math.floor(quantity) || 1) } : l))
    );
  }

  function removeLine(partId: string) {
    setCart((prev) => prev.filter((l) => l.part.id !== partId));
  }

  function startOver() {
    setEmployee(null);
    setWorkOrder("");
    setCart([]);
    setMessage(null);
  }

  async function handleComplete() {
    if (!employee || cart.length === 0) return;
    setSubmitting(true);
    setMessage(null);
    const result = await issueParts(
      employee.id,
      workOrder,
      cart.map((l) => ({ part_id: l.part.id, quantity: l.quantity }))
    );
    setSubmitting(false);
    if (result.error) {
      setMessage({ text: result.error, tone: "error" });
      return;
    }
    router.push(`/invoices/${result.invoiceId}/print`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Checkout</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Scan the employee&rsquo;s badge, then scan each part they&rsquo;re taking.
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

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">1. Employee badge</label>
        {employee ? (
          <div className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-800 px-3 py-2">
            <span className="text-sm text-slate-900 dark:text-slate-100">
              {employee.first_name} {employee.last_name} · {employee.badge_code}
            </span>
            <button onClick={startOver} className="text-xs text-slate-500 dark:text-slate-400 underline">
              Change employee
            </button>
          </div>
        ) : (
          <ScannerInput onScan={handleEmployeeScan} placeholder="Scan employee badge…" />
        )}
      </div>

      {employee && (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Work order / vehicle # <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              value={workOrder}
              onChange={(e) => setWorkOrder(e.target.value)}
              placeholder="e.g. WO-4471"
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600"
            />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">2. Scan parts</label>
            <ScannerInput onScan={handlePartScan} placeholder="Scan part barcode…" />
          </div>

          {cart.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Part</th>
                    <th className="px-4 py-2 font-medium w-24">Qty</th>
                    <th className="px-4 py-2 font-medium w-24">Left after</th>
                    <th className="px-4 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.map((line) => (
                    <tr key={line.part.id}>
                      <td className="px-4 py-2">
                        <p className="text-slate-900 dark:text-slate-100">{line.part.description}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{line.part.part_number}</p>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateQuantity(line.part.id, Number(e.target.value))}
                          className="w-16 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        {line.part.quantity_on_hand - line.quantity}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeLine(line.part.id)}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          aria-label="Remove"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleComplete}
              disabled={cart.length === 0 || submitting}
              className="bg-slate-900 text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {submitting ? "Completing…" : "Complete & print receipt"}
            </button>
            <button onClick={startOver} className="text-sm text-slate-500 dark:text-slate-400 underline">
              Start over
            </button>
          </div>
        </>
      )}
    </div>
  );
}
