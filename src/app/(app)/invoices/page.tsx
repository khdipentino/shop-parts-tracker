import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, work_order_number, created_at, voided, employee:employees(first_name, last_name), invoice_items(quantity)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Receipt history</h1>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 font-medium">Work order</th>
              <th className="px-4 py-2 font-medium">Items</th>
              <th className="px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(invoices ?? []).map((inv) => (
              <tr key={inv.id} className={inv.voided ? "opacity-50" : ""}>
                <td className="px-4 py-2">
                  <Link href={`/invoices/${inv.id}`} className="text-slate-900 dark:text-slate-100 font-medium hover:underline">
                    #{inv.invoice_number}
                  </Link>
                  {inv.voided && <span className="ml-2 text-xs text-red-500">voided</span>}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                  {inv.employee ? `${inv.employee.first_name} ${inv.employee.last_name}` : "—"}
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{inv.work_order_number ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                  {inv.invoice_items?.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0) ?? 0}
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {format(new Date(inv.created_at), "MMM d, yyyy h:mm a")}
                </td>
              </tr>
            ))}
            {(!invoices || invoices.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                  No receipts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
