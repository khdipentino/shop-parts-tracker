"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/");
}

export async function requestAccess(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "").trim();

  if (!fullName) {
    return { error: "Name is required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.user) {
    return {
      error:
        "Check your email to confirm your account, then log in to finish your access request.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    app_role: "pending",
  });
  if (profileError) return { error: profileError.message };

  redirect("/pending");
}

// Quick sign-in: scan an ID badge (resolves to an email via a narrowly-
// scoped database function, since the visitor isn't authenticated yet),
// then scan a password barcode and sign in with it exactly like typing an
// email+password would — same real account, same session, same RLS. The
// barcode is just a different way of entering the same credentials.
export async function barcodeSignIn(staffCode: string, passwordCode: string) {
  if (!staffCode || !passwordCode) return { error: "Scan both your ID badge and your password code." };

  const supabase = await createClient();
  const { data: email, error: lookupError } = await supabase.rpc("get_email_for_staff_code", {
    p_staff_code: staffCode,
  });
  if (lookupError || !email) return { error: "Unrecognized ID badge." };

  const { error } = await supabase.auth.signInWithPassword({ email, password: passwordCode });
  if (error) return { error: "Incorrect password barcode." };

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
