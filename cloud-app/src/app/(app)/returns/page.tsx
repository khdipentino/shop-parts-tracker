"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { returnItem } from "@/app/actions/transactions";
import ScannerInput from "@/components/ScannerInput";

type OutstandingItem = {
  id: string;
  quantity: number;
  returned_quantity: number;
  part: { part_number: string; description: string } | null;
  invoice: { id: string; invoice_number: number; work_order_number: string; voided: boolean } | null;
};

type Employee = { id: string; first_name: string; last_name: string; badge_code: string };
type Mode = "receipt" | "employee";

function parseReceiptCode(code: string): number | null {
  const match = code.trim().match(/^INV-?0*(\d+)$/i);
  return match ? Number(match[1]) : null;
}

export default function ReturnsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<Mode>("receipt");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<number | null>(null);
  const [items, setItems] = useState<OutstandingItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function applyOutstanding(rows: OutstandingItem[]) {
    const outstanding = rows.filter((i) => i.quantity - i.returned_quantity > 0);
    setItems(outstanding);
    setQuantities(Object.fromEntries(outstanding.map((i) => [i.id, i.quantity - i.returned_quantity])));
  }

  async function loadForEmployee(employeeId: string) {
    const { data, error } = await supabase
      .from("invoice_items")
      .select(
        "id, quantity, returned_quantity, part:parts(part_number, description), invoice:invoices!inner(id, invoice_number, work_order_number, voided, employee_id)"
      )
      .eq("invoice.employee_id", employeeId)
      .eq("invoice.voided", false)
      .order("id");

    if (error) {
      setMessage({ text: error.message, tone: "error" });
      return;
    }
    applyOutstanding((data ?? []) as unknown as OutstandingItem[]);
  }

  async function loadForInvoice(invNumber: number) {
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .select("id, invoice_number, work_order_number, voided")
      .eq("invoice_number", invNumber)
      .maybeSingle();

    if (invError || !inv) {
      setMessage({ text: `No receipt found for #${invNumber}.`, tone: "error" });
      return;
    }
    if (inv.voided) {
      setMessage({ text: `Receipt #${invNumber} has been voided — nothing to return.`, tone: "error" });
      setItems([]);
      return;
    }

    setInvoiceId(inv.id);
    setInvoiceNumber(inv.invoice_number);

    const { data, error } = await supabase
      .from("invoice_items")
      .select("id, quantity, returned_quantity, part:parts(part_number, description)")
      .eq("invoice_id", inv.id)
      .order("id");

    if (error) {
      setMessage({ text: error.message, tone: "error" });
      return;
    }
    applyOutstanding(
      (data ?? []).map((i) => ({ ...i, invoice: inv })) as unknown as OutstandingItem[]
    );
  }

  async function handleReceiptScan(code: string) {
    setMessage(null);
    const invNumber = parseReceiptCode(code);
    if (invNumber == null) {
      setMessage({ text: `"${code}" doesn't look like a receipt code (expected e.g. INV-000123).`, tone: "error" });
      return;
    }
    await loadForInvoice(invNumber);
  }

  async function handleEmployeeScan(code: string) {
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
    await loadForEmployee(data.id);
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
    if (mode === "receipt" && invoiceNumber != null) await loadForInvoice(invoiceNumber);
    else if (mode === "employee" && employee) await loadForEmployee(employee.id);
  }

  function reset() {
    setEmployee(null);
    setInvoiceId(null);
    setInvoiceNumber(null);
    setItems([]);
    setMessage(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    reset();
  }

  const scannedSomething = mode === "receipt" ? invoiceId != null : employee != null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Returns</h1>
        <p className="text-sm text-slate-500 mt-1">
          Scan the receipt to return from it directly, or scan the employee&rsquo;s badge to see everything
          outstanding across all their receipts.
        </p>
      </div>

      <div className="flex gap-1 rounded-md bg-slate-100 p-1 text-sm max-w-xs">
        <button
          onClick={() => switchMode("receipt")}
          className={`flex-1 rounded py-1.5 font-medium transition-colors ${
            mode === "receipt" ? "bg-white text-black shadow-sm" : "text-slate-500"
          }`}
        >
          Scan receipt
        </button>
        <button
          onClick={() => switchMode("employee")}
          className={`flex-1 rounded py-1.5 font-medium transition-colors ${
            mode === "employee" ? "bg-white text-black shadow-sm" : "text-slate-500"
          }`}
        >
          Scan employee badge
        </button>
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

      {scannedSomething ? (
        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
          <span className="text-sm text-ink">
            {mode === "receipt"
              ? `Receipt #${invoiceNumber}`
              : `${employee!.first_name} ${employee!.last_name} · ${employee!.badge_code}`}
          </span>
          <div className="flex items-center gap-3">
            {mode === "receipt" && invoiceId && (
              <Link href={`/invoices/${invoiceId}/print`} className="text-xs text-ink underline">
                Reprint receipt
              </Link>
            )}
            <button onClick={reset} className="text-xs text-slate-500 underline">
              {mode === "receipt" ? "Scan a different receipt" : "Change employee"}
            </button>
          </div>
        </div>
      ) : mode === "receipt" ? (
        <ScannerInput onScan={handleReceiptScan} placeholder="Scan receipt barcode…" />
      ) : (
        <ScannerInput onScan={handleEmployeeScan} placeholder="Scan employee badge…" />
      )}

      {scannedSomething && items.length === 0 && (
        <p className="text-sm text-slate-500">Nothing outstanding here.</p>
      )}

      {items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Part</th>
                {mode === "employee" && <th className="px-4 py-2 font-medium">Receipt</th>}
                <th className="px-4 py-2 font-medium w-20">Out</th>
                <th className="px-4 py-2 font-medium w-24">Return</th>
                <th className="px-4 py-2 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const outstanding = item.quantity - item.returned_quantity;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <p className="text-ink">{item.part?.description}</p>
                      <p className="text-slate-500 text-xs">{item.part?.part_number}</p>
                    </td>
                    {mode === "employee" && (
                      <td className="px-4 py-2 text-slate-500">
                        #{item.invoice?.invoice_number}
                        {item.invoice?.work_order_number ? ` · ${item.invoice.work_order_number}` : ""}
                      </td>
                    )}
                    <td className="px-4 py-2 text-slate-500">{outstanding}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        max={outstanding}
                        value={quantities[item.id] ?? outstanding}
                        onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                        className="w-16 rounded-md border border-slate-300 bg-white text-ink px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleReturn(item)}
                        disabled={busyId === item.id}
                        className="text-sm bg-brand text-white rounded-md px-3 py-1.5 hover:bg-brand-dark disabled:opacity-50"
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
