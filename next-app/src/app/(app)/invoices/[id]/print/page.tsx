import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getInvoiceItems, getInvoiceWithDetails } from "@/lib/db";
import PrintReceipt from "./PrintReceipt";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const details = getInvoiceWithDetails(id);
  if (!details) notFound();
  const { invoice, employee } = details;
  const items = getInvoiceItems(id);

  return (
    <PrintReceipt
      invoiceNumber={invoice.invoice_number}
      employeeName={employee ? `${employee.first_name} ${employee.last_name}` : "—"}
      workOrderNumber={invoice.work_order_number}
      dateLabel={format(new Date(invoice.created_at), "MMM d, yyyy h:mm a")}
      items={items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        description: i.part?.description ?? "",
        partNumber: i.part?.part_number ?? "",
      }))}
    />
  );
}
