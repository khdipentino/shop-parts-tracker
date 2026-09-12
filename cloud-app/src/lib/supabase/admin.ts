import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role client — bypasses Row Level Security entirely. This is
// only ever imported from server actions that have ALREADY verified the
// caller is an admin using the normal cookie-based client; it must never
// be imported into a client component or exposed to the browser.
// SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix) stays server-only.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel's Environment Variables (from Supabase → " +
        "Project Settings → API → service_role key) and redeploy."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
