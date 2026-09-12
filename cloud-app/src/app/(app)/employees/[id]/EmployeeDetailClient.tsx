"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmployee, setEmployeeActive } from "@/app/actions/employees";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  badge_code: string;
  shop_section: string | null;
  active: boolean;
};

const fieldClass =
  "w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600";
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

export function EmployeeEditForm({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await updateEmployee(undefined, new FormData(e.currentTarget));
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-sm text-slate-500 dark:text-slate-400 underline">
        Edit employee
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <input type="hidden" name="id" value={employee.id} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First name</label>
          <input name="first_name" defaultValue={employee.first_name} required className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input name="last_name" defaultValue={employee.last_name} required className={fieldClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Badge code</label>
        <input name="badge_code" defaultValue={employee.badge_code} required className={fieldClass} />
      </div>
      <div>
        <label className={labelClass}>Shop section</label>
        <input name="shop_section" defaultValue={employee.shop_section ?? ""} className={fieldClass} />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-brand-dark disabled:opacity-50 dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-500 dark:text-slate-400 underline">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function EmployeeActiveToggle({ employeeId, active }: { employeeId: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await setEmployeeActive(employeeId, !active);
        setBusy(false);
      }}
      className="text-sm text-slate-500 dark:text-slate-400 underline disabled:opacity-50"
    >
      {active ? "Deactivate employee" : "Reactivate employee"}
    </button>
  );
}
