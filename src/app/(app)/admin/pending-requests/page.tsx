import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import ApproveButtons from "./ApproveButtons";

export default async function PendingRequestsPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, requested_at")
    .eq("app_role", "pending")
    .order("requested_at");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pending requests</h1>

      {(!pending || pending.length === 0) ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No pending access requests.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {pending.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-slate-900 dark:text-slate-100 font-medium">{p.full_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Requested {format(new Date(p.requested_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              <ApproveButtons userId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
