import NewPartForm from "./NewPartForm";

export default async function NewPartPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string }>;
}) {
  const { barcode } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">New part</h1>
      <NewPartForm defaultBarcode={barcode ?? ""} />
    </div>
  );
}
