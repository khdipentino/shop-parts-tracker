import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("parts")
    .select("id, part_number, description, bin_location, quantity_on_hand, reorder_point, active")
    .order("part_number");

  if (q) {
    const term = q.replace(/[%,]/g, "");
    query = query.or(`part_number.ilike.%${term}%,description.ilike.%${term}%,barcode_code.ilike.%${term}%`);
  }

  const { data: parts } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-ink">Parts</h1>
        <Link
          href="/parts/new"
          className="bg-brand text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-brand-dark"
        >
          + New part
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search part number, description, or barcode…"
          className="flex-1 rounded-md border border-slate-300 bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
          Search
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Part #</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Bin</th>
              <th className="px-4 py-2 font-medium">On hand</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(parts ?? []).map((p) => {
              const low = p.reorder_point != null && p.quantity_on_hand <= p.reorder_point;
              return (
                <tr key={p.id} className={!p.active ? "opacity-50" : ""}>
                  <td className="px-4 py-2">
                    <Link href={`/parts/${p.id}`} className="text-ink font-medium hover:underline">
                      {p.part_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{p.description}</td>
                  <td className="px-4 py-2 text-slate-500">{p.bin_location ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        low
                          ? "rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-medium"
                          : "text-slate-700"
                      }
                    >
                      {p.quantity_on_hand}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(!parts || parts.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
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
