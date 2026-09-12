import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import VoidInvoiceButton from "./VoidInvoiceButton";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, work_order_number, asset_id, created_at, voided, void_reason, employee:employees(first_name, last_name, badge_code), creator:profiles!invoices_created_by_fkey(full_name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!invoice) notFound();

  const { data: items } = await supabase
    .from("invoice_items")
    .select("id, quantity, returned_quantity, part:parts(part_number, description)")
    .eq("invoice_id", id);

  return (
    <div className="space-y-6">
      <Link href="/invoices" className="text-sm text-slate-500 dark:text-slate-400 underline">
        ← Receipt history
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Receipt #{invoice.invoice_number}
            {invoice.voided && <span className="ml-2 text-sm text-red-500">Voided</span>}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {invoice.employee ? `${invoice.employee.first_name} ${invoice.employee.last_name}` : "Unknown employee"}
            {" · "}
            {invoice.work_order_number} · Asset {invoice.asset_id} ·{" "}
            {format(new Date(invoice.created_at), "MMM d, yyyy h:mm a")}
          </p>
          {invoice.voided && invoice.void_reason && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">Reason: {invoice.void_reason}</p>
          )}
        </div>
        <Link href={`/invoices/${invoice.id}/print`} className="text-sm text-slate-500 dark:text-slate-400 underline">
          Print / reprint
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Part</th>
              <th className="px-4 py-2 font-medium">Issued</th>
              <th className="px-4 py-2 font-medium">Returned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(items ?? []).map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2">
                  <p className="text-slate-900 dark:text-slate-100">{i.part?.description}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">{i.part?.part_number}</p>
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{i.quantity}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{i.returned_quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!invoice.voided && <VoidInvoiceButton invoiceId={invoice.id} />}
    </div>
  );
}
