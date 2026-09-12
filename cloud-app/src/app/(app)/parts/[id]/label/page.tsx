"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Barcode from "@/components/Barcode";

type Part = { part_number: string; description: string; barcode_code: string };

export default function PartLabelPage() {
  const params = useParams<{ id: string }>();
  const [part, setPart] = useState<Part | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("parts")
      .select("part_number, description, barcode_code")
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data }) => setPart(data));
  }, [params.id]);

  if (!part) return null;

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="bg-brand text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-dark dark:bg-brand dark:text-white dark:hover:bg-brand-dark"
        >
          Print label
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Prints on plain paper — cut to size, or use adhesive label sheets in your printer.
        </p>
      </div>

      <div className="inline-block border border-slate-300 dark:border-slate-700 rounded-md p-4 bg-white text-black">
        <p className="text-sm font-medium">{part.description}</p>
        <p className="text-xs text-slate-600 mb-2">{part.part_number}</p>
        <Barcode value={part.barcode_code} height={50} />
      </div>
    </div>
  );
}
