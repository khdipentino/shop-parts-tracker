import Link from "next/link";

const reports = [
  {
    href: "/reports/low-stock",
    title: "Low stock",
    desc: "Every active part at or below its reorder point — what to order next.",
  },
  {
    href: "/reports/inventory",
    title: "Full inventory",
    desc: "Every active part with current stock, bin, and dollar value — plus a grand total.",
  },
  {
    href: "/reports/activity",
    title: "Activity log",
    desc: "Every receive/issue/return/adjustment in a date range you pick, for reconciling against your other system.",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Pick one to view and print.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors"
          >
            <h2 className="font-medium text-ink">{r.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
