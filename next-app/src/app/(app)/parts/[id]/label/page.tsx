import { notFound } from "next/navigation";
import { getPartById } from "@/lib/db";
import Barcode from "@/components/Barcode";
import PrintButton from "@/components/PrintButton";

export default async function PartLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const part = getPartById(id);
  if (!part) notFound();

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <PrintButton label="Print label" />
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
