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
      <h1 className="text-xl font-semibold text-ink">Pending requests</h1>

      {(!pending || pending.length === 0) ? (
        <p className="text-sm text-slate-500">No pending access requests.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {pending.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-ink font-medium">{p.full_name}</p>
                <p className="text-xs text-slate-500">
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
