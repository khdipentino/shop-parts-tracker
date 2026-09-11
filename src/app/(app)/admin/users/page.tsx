import { createClient } from "@/lib/supabase/server";
import UserRow from "./UserRow";

export default async function ManageUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, app_role, active")
    .neq("app_role", "pending")
    .order("full_name");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Manage staff</h1>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(users ?? []).map((u) => (
              <UserRow
                key={u.id}
                userId={u.id}
                fullName={u.full_name}
                role={u.app_role as "staff" | "admin"}
                active={u.active}
                isSelf={u.id === user?.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
