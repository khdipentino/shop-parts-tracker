import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getEmployeeById, getTransactionsForEmployee } from "@/lib/db";
import { EmployeeEditForm, EmployeeActiveToggle } from "./EmployeeDetailClient";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = getEmployeeById(id);
  if (!employee) notFound();

  const history = getTransactionsForEmployee(id, 100);

  return (
    <div className="space-y-6">
      <Link href="/employees" className="text-sm text-slate-500 dark:text-slate-400 underline">
        ← All employees
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {employee.first_name} {employee.last_name}
            {!employee.active && (
              <span className="ml-2 text-xs align-middle rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5">
                Inactive
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Badge {employee.badge_code}
            {employee.shop_section ? ` · ${employee.shop_section}` : ""}
          </p>
        </div>
        <Link href={`/employees/${employee.id}/badge`} className="text-sm text-slate-500 dark:text-slate-400 underline">
          Print badge
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <EmployeeEditForm employee={employee} />
        <EmployeeActiveToggle employeeId={employee.id} active={employee.active} />
      </div>

      <div>
        <h2 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Issue / return history</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Part</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Work order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {format(new Date(h.created_at), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-4 py-2 capitalize text-slate-700 dark:text-slate-300">{h.type}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{h.part?.description}</td>
                  <td
                    className={`px-4 py-2 font-mono ${h.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}
                  >
                    {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{h.work_order_number ?? ""}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                    No activity yet.
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
