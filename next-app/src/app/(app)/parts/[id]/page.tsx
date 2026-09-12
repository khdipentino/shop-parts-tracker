import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getPartById, getTransactionsForPart } from "@/lib/db";
import { PartEditForm, AdjustStockForm, ArchiveToggle } from "./PartDetailClient";

export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const part = getPartById(id);
  if (!part) notFound();

  const history = getTransactionsForPart(id, 100);
  const low = part.reorder_point != null && part.quantity_on_hand <= part.reorder_point;

  return (
    <div className="space-y-6">
      <Link href="/parts" className="text-sm text-slate-500 dark:text-slate-400 underline">
        ← All parts
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {part.description}
            {!part.active && (
              <span className="ml-2 text-xs align-middle rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5">
                Archived
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {part.part_number} · barcode {part.barcode_code}
            {part.bin_location ? ` · bin ${part.bin_location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`text-2xl font-mono ${low ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}
          >
            {part.quantity_on_hand}
          </span>
          <Link href={`/parts/${part.id}/label`} className="text-sm text-slate-500 dark:text-slate-400 underline">
            Print label
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <PartEditForm part={part} />
        <AdjustStockForm partId={part.id} />
        <ArchiveToggle partId={part.id} active={part.active} />
      </div>

      <div>
        <h2 className="font-medium text-slate-900 dark:text-slate-100 mb-3">History</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Employee / receipt</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {format(new Date(h.created_at), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-4 py-2 capitalize text-slate-700 dark:text-slate-300">{h.type}</td>
                  <td
                    className={`px-4 py-2 font-mono ${h.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                    {h.employee ? `${h.employee.first_name} ${h.employee.last_name}` : ""}
                    {h.invoice_number != null ? ` · #${h.invoice_number}` : ""}
                    {h.work_order_number ? ` · ${h.work_order_number}` : ""}
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{h.notes ?? ""}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    No history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
