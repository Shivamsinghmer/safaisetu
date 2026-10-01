"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicSiteUrl } from "@/lib/site-url";
import { LIMITS, TOO_MANY, allow, clientIp } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/types";

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/app";
}

const credentials = z.object({
  email: z.email("Enter a valid email").transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message === "Invalid login credentials" ? "Wrong email or password" : error.message };
  redirect(safeNext(formData.get("next")));
}

const signUpSchema = credentials.extend({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

export async function signUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const { email, password, full_name, phone } = parsed.data;
  if (!(await allow(`signup:${await clientIp()}`, LIMITS.signup.max, LIMITS.signup.window))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone: phone || null },
      emailRedirectTo: `${await publicSiteUrl()}/app`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) {
    return { message: "Check your inbox to confirm your email, then sign in." };
  }
  redirect(safeNext(formData.get("next")));
}

// One-click logins for the seeded demo accounts (see scripts/seed.ts)
const DEMO_ACCOUNTS = {
  citizen: "citizen@demo.safaisetu.in",
  secretary: "secretary@demo.safaisetu.in",
  college: "campus@demo.safaisetu.in",
  municipality: "officer@demo.safaisetu.in",
  worker: "worker@demo.safaisetu.in",
} as const;

/** Demo logins can be switched off for a real deployment with DEMO_LOGIN=off. */
export async function demoSignInAction(formData: FormData) {
  if (process.env.DEMO_LOGIN === "off") redirect("/login");
  const role = formData.get("role") as keyof typeof DEMO_ACCOUNTS;
  const email = DEMO_ACCOUNTS[role];
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) redirect("/login?error=demo");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=demo");
  redirect(safeNext(formData.get("next")));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
