"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Barcode from "@/components/Barcode";

export default function StaffBadgePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const passwordCode = searchParams.get("code");
  const name = searchParams.get("name");
  const [staffCode, setStaffCode] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("staff_code")
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data }) => setStaffCode(data?.staff_code ?? null));
  }, [params.id]);

  if (!passwordCode) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        No password code to print — go back to Manage staff and click &ldquo;Generate password barcode&rdquo; again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark dark:bg-brand dark:hover:bg-brand-dark"
        >
          Print badge
        </button>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          This password code won&rsquo;t be shown again after you leave this page — print it now.
        </p>
      </div>

      <div className="inline-block border border-slate-300 dark:border-slate-700 rounded-md p-4 bg-white text-black w-72">
        {name && <p className="text-base font-medium mb-3">{name}</p>}
        <p className="text-xs text-slate-600 mb-1">Scan to identify:</p>
        <Barcode value={staffCode ?? ""} height={45} />
        <p className="text-xs text-slate-600 mt-3 mb-1">Then scan to sign in:</p>
        <Barcode value={passwordCode} height={45} />
      </div>
    </div>
  );
}
