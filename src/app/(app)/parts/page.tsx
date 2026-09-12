import Link from "next/link";
import { listParts } from "@/lib/db";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const parts = listParts(q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Parts</h1>
        <Link
          href="/parts/new"
          className="bg-slate-900 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          + New part
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search part number, description, or barcode…"
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
              <th className="px-4 py-2 font-medium">Part #</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Bin</th>
              <th className="px-4 py-2 font-medium">On hand</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {parts.map((p) => {
              const low = p.reorder_point != null && p.quantity_on_hand <= p.reorder_point;
              return (
                <tr key={p.id} className={!p.active ? "opacity-50" : ""}>
                  <td className="px-4 py-2">
                    <Link href={`/parts/${p.id}`} className="text-slate-900 dark:text-slate-100 font-medium hover:underline">
                      {p.part_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{p.description}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{p.bin_location ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        low
                          ? "rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs font-medium"
                          : "text-slate-700 dark:text-slate-300"
                      }
                    >
                      {p.quantity_on_hand}
                    </span>
                  </td>
                </tr>
              );
            })}
            {parts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                  No parts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
