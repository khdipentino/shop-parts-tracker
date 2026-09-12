import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getInvoiceItems, getInvoiceWithDetails } from "@/lib/db";
import VoidInvoiceButton from "./VoidInvoiceButton";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = getInvoiceWithDetails(id);
  if (!details) notFound();
  const { invoice, employee, creator } = details;

  const items = getInvoiceItems(id);

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
            {employee ? `${employee.first_name} ${employee.last_name}` : "Unknown employee"}
            {invoice.work_order_number ? ` · ${invoice.work_order_number}` : ""} ·{" "}
            {format(new Date(invoice.created_at), "MMM d, yyyy h:mm a")}
            {creator ? ` · rung up by ${creator.full_name}` : ""}
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
            {items.map((i) => (
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
