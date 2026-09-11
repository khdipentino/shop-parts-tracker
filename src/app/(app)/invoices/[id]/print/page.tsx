"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

type Item = { id: string; quantity: number; part: { part_number: string; description: string } | null };
type Invoice = {
  invoice_number: number;
  work_order_number: string | null;
  created_at: string;
  employee: { first_name: string; last_name: string; badge_code: string } | null;
};

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
          .select("invoice_number, work_order_number, created_at, employee:employees(first_name, last_name, badge_code)")
          .eq("id", params.id)
          .maybeSingle(),
        supabase
          .from("invoice_items")
          .select("id, quantity, part:parts(part_number, description)")
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

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Print
        </button>
        <Link href="/checkout" className="text-sm text-slate-500 dark:text-slate-400 underline">
          Start next checkout
        </Link>
      </div>

      <div className="max-w-md border border-slate-300 dark:border-slate-700 rounded-md p-6 bg-white text-black">
        <h1 className="text-lg font-semibold">Parts Receipt</h1>
        <p className="text-sm text-slate-600">#{invoice.invoice_number}</p>
        <div className="mt-4 text-sm space-y-1">
          <p>
            <span className="text-slate-500">Employee: </span>
            {invoice.employee ? `${invoice.employee.first_name} ${invoice.employee.last_name}` : "—"}
          </p>
          {invoice.work_order_number && (
            <p>
              <span className="text-slate-500">Work order / vehicle: </span>
              {invoice.work_order_number}
            </p>
          )}
          <p>
            <span className="text-slate-500">Date: </span>
            {format(new Date(invoice.created_at), "MMM d, yyyy h:mm a")}
          </p>
        </div>

        <table className="w-full text-sm mt-4 border-t border-slate-300 pt-2">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-medium">Part</th>
              <th className="py-1 font-medium text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-slate-200">
                <td className="py-1">
                  {i.part?.description}
                  <span className="text-slate-500"> ({i.part?.part_number})</span>
                </td>
                <td className="py-1 text-right">{i.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-xs text-slate-500 mt-6">Attach this receipt to the work order to charge the vehicle.</p>
      </div>
    </div>
  );
}
