import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";

const actionCards = [
  { href: "/checkout", title: "Checkout", desc: "Scan an employee badge, scan parts, print the receipt." },
  { href: "/receive", title: "Receive parts", desc: "Log parts coming in and restock the shelf." },
  { href: "/returns", title: "Returns", desc: "Put an unused part back on the shelf." },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: lowStock }, { data: recent }, { count: partCount }, { count: employeeCount }] =
    await Promise.all([
      supabase
        .from("parts")
        .select("id, part_number, description, quantity_on_hand, reorder_point")
        .eq("active", true)
        .not("reorder_point", "is", null)
        .order("quantity_on_hand", { ascending: true })
        .limit(20),
      supabase
        .from("transactions")
        .select(
          "id, type, quantity, created_at, notes, part:parts(part_number, description), employee:employees(first_name, last_name)"
        )
        .order("created_at", { ascending: false })
        .limit(15),
      supabase.from("parts").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("employees").select("id", { count: "exact", head: true }).eq("active", true),
    ]);

  const lowStockRows = (lowStock ?? []).filter((p) => p.quantity_on_hand <= (p.reorder_point ?? 0));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {partCount ?? 0} active parts · {employeeCount ?? 0} active employees
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {actionCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <h2 className="font-medium text-slate-900 dark:text-slate-100">{c.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-medium text-slate-900 dark:text-slate-100">Low stock</h2>
            <Link href="/parts" className="text-xs text-slate-500 dark:text-slate-400 underline">
              All parts
            </Link>
          </div>
          {lowStockRows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-6">
              Nothing at or below its reorder point.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {lowStockRows.map((p) => (
                <li key={p.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <Link href={`/parts/${p.id}`} className="min-w-0">
                    <p className="text-slate-900 dark:text-slate-100 truncate">{p.description}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{p.part_number}</p>
                  </Link>
                  <span className="shrink-0 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
                    {p.quantity_on_hand} on hand
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-medium text-slate-900 dark:text-slate-100">Recent activity</h2>
          </div>
          {!recent || recent.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-6">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((t) => (
                <li key={t.id} className="px-4 py-2.5 text-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-slate-100 truncate">
                      {t.part?.description ?? "Unknown part"}
                      {t.employee ? ` · ${t.employee.first_name} ${t.employee.last_name}` : ""}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs capitalize">
                      {t.type} · {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-mono ${
                      t.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
