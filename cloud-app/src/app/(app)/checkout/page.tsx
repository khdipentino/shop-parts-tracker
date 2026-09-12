"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { issueParts } from "@/app/actions/transactions";
import ScannerInput from "@/components/ScannerInput";

type Employee = { id: string; first_name: string; last_name: string; badge_code: string };
type Part = { id: string; part_number: string; description: string; barcode_code: string; quantity_on_hand: number };
type CartLine = { part: Part; quantity: number };

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [workOrder, setWorkOrder] = useState("");
  const [assetId, setAssetId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleEmployeeScan(code: string) {
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, badge_code")
      .eq("badge_code", code)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      setMessage({ text: `No active employee found for badge "${code}".`, tone: "error" });
      return;
    }
    setEmployee(data);
    setMessage({ text: `Employee: ${data.first_name} ${data.last_name}`, tone: "info" });
  }

  async function handlePartScan(code: string) {
    const { data, error } = await supabase
      .from("parts")
      .select("id, part_number, description, barcode_code, quantity_on_hand")
      .eq("barcode_code", code)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      setMessage({ text: `No active part found for barcode "${code}".`, tone: "error" });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.part.id === data.id);
      if (existing) {
        return prev.map((l) => (l.part.id === data.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { part: data, quantity: 1 }];
    });
    setMessage({ text: `Added: ${data.description}`, tone: "info" });
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
    setAssetId("");
    setCart([]);
    setMessage(null);
  }

  const canComplete = cart.length > 0 && workOrder.trim() !== "" && assetId.trim() !== "";

  async function handleComplete() {
    if (!employee || !canComplete) return;
    setSubmitting(true);
    setMessage(null);
    const result = await issueParts(
      employee.id,
      workOrder,
      assetId,
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
        <h1 className="text-xl font-semibold text-ink">Checkout</h1>
        <p className="text-sm text-slate-500 mt-1">
          Scan the employee&rsquo;s badge, then scan each part they&rsquo;re taking.
        </p>
      </div>

      {message && (
        <p
          className={`text-sm rounded-md px-3 py-2 border ${
            message.tone === "error"
              ? "text-red-600 bg-red-50 border-red-200"
              : "text-emerald-700 bg-emerald-50 border-emerald-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <label className="block text-sm font-medium text-slate-700">1. Employee badge</label>
        {employee ? (
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
            <span className="text-sm text-ink">
              {employee.first_name} {employee.last_name} · {employee.badge_code}
            </span>
            <button onClick={startOver} className="text-xs text-slate-500 underline">
              Change employee
            </button>
          </div>
        ) : (
          <ScannerInput onScan={handleEmployeeScan} placeholder="Scan employee badge…" />
        )}
      </div>

      {employee && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Work order number <span className="text-red-500">*</span>
                </label>
                <input
                  value={workOrder}
                  onChange={(e) => setWorkOrder(e.target.value)}
                  placeholder="e.g. WO-4471"
                  required
                  className="w-full rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Asset ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="e.g. VEH-2214"
                  required
                  className="w-full rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">2. Scan parts</label>
            <ScannerInput onScan={handlePartScan} placeholder="Scan part barcode…" />
          </div>

          {cart.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Part</th>
                    <th className="px-4 py-2 font-medium w-24">Qty</th>
                    <th className="px-4 py-2 font-medium w-24">Left after</th>
                    <th className="px-4 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((line) => (
                    <tr key={line.part.id}>
                      <td className="px-4 py-2">
                        <p className="text-ink">{line.part.description}</p>
                        <p className="text-slate-500 text-xs">{line.part.part_number}</p>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateQuantity(line.part.id, Number(e.target.value))}
                          className="w-16 rounded-md border border-slate-300 bg-white text-ink px-2 py-1"
                        />
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {line.part.quantity_on_hand - line.quantity}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeLine(line.part.id)}
                          className="text-slate-400 hover:text-red-600"
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
              disabled={!canComplete || submitting}
              className="bg-brand text-white rounded-md px-4 py-2.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
            >
              {submitting ? "Completing…" : "Complete & print receipt"}
            </button>
            <button onClick={startOver} className="text-sm text-slate-500 underline">
              Start over
            </button>
          </div>
        </>
      )}
    </div>
  );
}
