"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Barcode from "@/components/Barcode";

type Employee = { id: string; first_name: string; last_name: string; badge_code: string };

export default function PrintAllBadgesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("employees")
      .select("id, first_name, last_name, badge_code")
      .eq("active", true)
      .order("last_name")
      .order("first_name")
      .then(({ data }) => setEmployees(data ?? []));
  }, []);

  if (!employees) return null;

  return (
    <div className="space-y-4">
      {/* Landscape only for this page — a wide wall sheet with several
          badges per row prints far better sideways than portrait. */}
      <style>{"@page { size: landscape; margin: 0.4in; }"}</style>

      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark"
        >
          Print all badges
        </button>
        <p className="text-sm text-slate-500">
          {employees.length} active employee{employees.length === 1 ? "" : "s"}, alphabetical by last name. Prints
          landscape.
        </p>
      </div>

      <div className="text-center mb-2 hidden print:block">
        <h1 className="text-lg font-bold text-black">Employee Badge Directory</h1>
        <p className="text-xs text-slate-500">{new Date().toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 bg-white text-black">
        {employees.map((e) => (
          <div key={e.id} className="border border-slate-300 rounded-md p-2 flex flex-col items-center text-center break-inside-avoid">
            <Barcode value={e.badge_code} height={36} />
            <p className="text-sm font-medium mt-1">
              {e.last_name}, {e.first_name}
            </p>
          </div>
        ))}
        {employees.length === 0 && <p className="text-sm text-slate-500 col-span-4">No active employees to print.</p>}
      </div>
    </div>
  );
}
