import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("employees")
    .select("id, first_name, last_name, badge_code, shop_section, active")
    .order("last_name");

  if (q) {
    const term = q.replace(/[%,]/g, "");
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,badge_code.ilike.%${term}%`);
  }

  const { data: employees } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Employees</h1>
        <Link
          href="/employees/new"
          className="bg-brand text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-brand-dark dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
        >
          + New employee
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or badge…"
          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600"
        />
        <button className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
          Search
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Badge</th>
              <th className="px-4 py-2 font-medium">Section</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(employees ?? []).map((e) => (
              <tr key={e.id} className={!e.active ? "opacity-50" : ""}>
                <td className="px-4 py-2">
                  <Link href={`/employees/${e.id}`} className="text-slate-900 dark:text-slate-100 font-medium hover:underline">
                    {e.first_name} {e.last_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400 font-mono">{e.badge_code}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{e.shop_section ?? "—"}</td>
              </tr>
            ))}
            {(!employees || employees.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
