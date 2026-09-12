import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Request access</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Tell us who you are. An admin will approve your access before you can use the counter.
        </p>
        <SignupForm />
      </div>
    </div>
  );
}
