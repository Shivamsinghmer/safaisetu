"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer, requireViewer } from "@/lib/session";
import { LOCALE_COOKIE } from "@/lib/i18n";
import type { ActionState } from "@/lib/types";

const settingsSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().max(20).optional(),
  locale: z.enum(["en", "hi"]),
});

/** Name, phone, email preferences and language. Role and municipality can't change here (column grants). */
export async function updateSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const parsed = settingsSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") || undefined,
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      locale: parsed.data.locale,
      email_updates: formData.get("email_updates") === "on",
      email_notices: formData.get("email_notices") === "on",
    })
    .eq("id", viewer.userId);
  if (error) return { error: error.message };

  (await cookies()).set(LOCALE_COOKIE, parsed.data.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/app", "layout");
  return { ok: true, message: parsed.data.locale === "hi" ? "सेव हो गया।" : "Saved." };
}

export async function markNotificationsReadAction() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.userId).is("read_at", null);
  revalidatePath("/app", "layout");
}

/** Language switcher (landing nav, guest pages): cookie for everyone, profile too when signed in. */
export async function setLocaleAction(locale: string) {
  if (locale !== "en" && locale !== "hi") return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const viewer = await getViewer();
  if (viewer) {
    const supabase = await createClient();
    await supabase.from("profiles").update({ locale }).eq("id", viewer.userId);
  }
  revalidatePath("/", "layout");
}
