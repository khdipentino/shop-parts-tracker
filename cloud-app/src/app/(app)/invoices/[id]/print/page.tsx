"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import Barcode from "@/components/Barcode";

type Item = {
  id: string;
  quantity: number;
  returned_quantity: number;
  part: { part_number: string; description: string } | null;
};
type Invoice = {
  invoice_number: number;
  work_order_number: string;
  asset_id: string;
  created_at: string;
  voided: boolean;
  employee: { first_name: string; last_name: string; badge_code: string } | null;
};

export function receiptCode(invoiceNumber: number) {
  return `INV-${String(invoiceNumber).padStart(6, "0")}`;
}

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const printedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: inv }, { data: its }] = await Promise.all([
        supabase
          .from("invoices")
          .select(
            "invoice_number, work_order_number, asset_id, created_at, voided, employee:employees(first_name, last_name, badge_code)"
          )
          .eq("id", params.id)
          .maybeSingle(),
        supabase
          .from("invoice_items")
          .select("id, quantity, returned_quantity, part:parts(part_number, description)")
          .eq("invoice_id", params.id),
      ]);
      setInvoice(inv);
      setItems(its ?? []);
    })();
  }, [params.id]);

  useEffect(() => {
    if (invoice && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 200);
      return () => clearTimeout(t);
    }
  }, [invoice]);

  if (!invoice) return null;

  const totalIssued = items.reduce((s, i) => s + i.quantity, 0);
  const totalReturned = items.reduce((s, i) => s + i.returned_quantity, 0);
  const anyReturned = totalReturned > 0;

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark dark:bg-brand dark:hover:bg-brand-dark"
        >
          Print
        </button>
        <Link href="/checkout" className="text-sm text-slate-500 dark:text-slate-400 underline">
          Start next checkout
        </Link>
      </div>

      <div className="max-w-md border border-slate-300 rounded-md p-6 bg-white text-black relative">
        {invoice.voided && (
          <div className="absolute top-6 right-6 border-4 border-red-600 text-red-600 font-bold text-lg px-3 py-1 rotate-12 opacity-80">
            VOIDED
          </div>
        )}

        <div className="text-center border-b-2 border-black pb-3 mb-3">
          <p className="text-xs tracking-widest uppercase text-slate-500">Shop Parts Tracker</p>
          <h1 className="text-lg font-bold mt-1">PARTS RECEIPT</h1>
          <p className="text-sm font-mono mt-1">{receiptCode(invoice.invoice_number)}</p>
          <div className="flex justify-center mt-2">
            <Barcode value={receiptCode(invoice.invoice_number)} height={40} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
          <div>
            <span className="text-slate-500 block text-xs uppercase">Employee</span>
            {invoice.employee ? `${invoice.employee.first_name} ${invoice.employee.last_name}` : "—"}
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase">Date</span>
            {format(new Date(invoice.created_at), "MMM d, yyyy h:mm a")}
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase">Work order #</span>
            {invoice.work_order_number}
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase">Asset ID</span>
            {invoice.asset_id}
          </div>
        </div>

        <table className="w-full text-sm border-t border-black pt-2">
          <thead>
            <tr className="text-left text-slate-500 text-xs uppercase">
              <th className="py-1 font-medium">Part</th>
              <th className="py-1 font-medium text-right">Issued</th>
              {anyReturned && <th className="py-1 font-medium text-right">Returned</th>}
              {anyReturned && <th className="py-1 font-medium text-right">Net</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-dashed border-slate-300">
                <td className="py-1">
                  {i.part?.description}
                  <span className="text-slate-500"> ({i.part?.part_number})</span>
                </td>
                <td className="py-1 text-right">{i.quantity}</td>
                {anyReturned && <td className="py-1 text-right text-slate-500">{i.returned_quantity || ""}</td>}
                {anyReturned && <td className="py-1 text-right font-medium">{i.quantity - i.returned_quantity}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-medium">
              <td className="py-1">Total</td>
              <td className="py-1 text-right">{totalIssued}</td>
              {anyReturned && <td className="py-1 text-right text-slate-500">{totalReturned}</td>}
              {anyReturned && <td className="py-1 text-right">{totalIssued - totalReturned}</td>}
            </tr>
          </tfoot>
        </table>

        <p className="text-xs text-slate-500 mt-6 text-center border-t border-dashed border-slate-300 pt-3">
          Attach this receipt to work order {invoice.work_order_number} to charge asset {invoice.asset_id}.
          <br />
          Keep this receipt — scan it at the counter to process any return.
        </p>
      </div>
    </div>
  );
}
