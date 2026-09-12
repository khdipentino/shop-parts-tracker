"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Barcode from "@/components/Barcode";

type Employee = { first_name: string; last_name: string; badge_code: string; shop_section: string | null };

export default function EmployeeBadgePage() {
  const params = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("employees")
      .select("first_name, last_name, badge_code, shop_section")
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data }) => setEmployee(data));
  }, [params.id]);

  if (!employee) return null;

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark"
        >
          Print badge
        </button>
      </div>

      <div className="inline-block border border-slate-300 rounded-md p-4 bg-white text-black w-64">
        <p className="text-base font-medium">
          {employee.first_name} {employee.last_name}
        </p>
        {employee.shop_section && <p className="text-xs text-slate-600 mb-2">{employee.shop_section}</p>}
        <Barcode value={employee.badge_code} height={50} />
      </div>
    </div>
  );
}
