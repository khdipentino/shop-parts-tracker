import { notFound } from "next/navigation";
import { getEmployeeById } from "@/lib/db";
import Barcode from "@/components/Barcode";
import PrintButton from "@/components/PrintButton";

export default async function EmployeeBadgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = getEmployeeById(id);
  if (!employee) notFound();

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <PrintButton label="Print badge" />
      </div>

      <div className="inline-block border border-slate-300 dark:border-slate-700 rounded-md p-4 bg-white text-black w-64">
        <p className="text-base font-medium">
          {employee.first_name} {employee.last_name}
        </p>
        {employee.shop_section && <p className="text-xs text-slate-600 mb-2">{employee.shop_section}</p>}
        <Barcode value={employee.badge_code} height={50} />
      </div>
    </div>
  );
}
