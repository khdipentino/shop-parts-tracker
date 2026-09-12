import NewEmployeeForm from "./NewEmployeeForm";

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">New employee</h1>
      <NewEmployeeForm />
    </div>
  );
}
