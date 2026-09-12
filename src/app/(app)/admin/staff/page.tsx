import { listStaff } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import AddStaffForm from "./AddStaffForm";
import StaffRow from "./StaffRow";

export default async function ManageStaffPage() {
  const staff = listStaff();
  const me = await getCurrentStaff();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Manage staff</h1>

      <AddStaffForm />

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {staff.map((s) => (
              <StaffRow
                key={s.id}
                staffId={s.id}
                fullName={s.full_name}
                role={s.app_role}
                active={s.active}
                isSelf={s.id === me?.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
