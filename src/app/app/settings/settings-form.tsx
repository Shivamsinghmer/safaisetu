"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/app/actions/account";
import { useT } from "@/components/i18n-provider";
import { Card, CardHeader, Field, FormMessage, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { LOCALES, type Locale } from "@/lib/i18n";

export function SettingsForm({
  email,
  initial,
}: {
  email: string;
  initial: { full_name: string; phone: string; email_updates: boolean; email_notices: boolean; locale: Locale };
}) {
  const { t } = useT();
  const [state, action] = useActionState(updateSettingsAction, null);

  return (
    <form action={action} className="grid max-w-2xl grid-cols-1 gap-6">
      <Card>
        <CardHeader label={t("Profile")} title={initial.full_name || email} />
        <div className="flex flex-col gap-4 p-5">
          <Field label={t("Full name")} htmlFor="full_name">
            <Input id="full_name" name="full_name" defaultValue={initial.full_name} required autoComplete="name" />
          </Field>
          <Field label={t("Phone")} htmlFor="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} autoComplete="tel" />
          </Field>
          <Field label={t("Email")} htmlFor="email">
            <Input id="email" value={email} readOnly disabled />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader label={t("Email")} title={t("Email me about")} />
        <div className="flex flex-col gap-1 p-5">
          <Toggle
            name="email_updates"
            defaultChecked={initial.email_updates}
            title={t("Updates on my tickets and tasks")}
            text={t("Status changes, assignments, pickup dates and approvals.")}
          />
          <Toggle
            name="email_notices"
            defaultChecked={initial.email_notices}
            title={t("Notices from my society and city")}
            text={t("Collection changes, drives and reminders.")}
          />
          <p className="mt-2 text-xs text-ash">{t("In-app notifications are always on.")}</p>
        </div>
      </Card>

      <Card>
        <CardHeader label={t("Language")} title={t("Language")} />
        <div className="flex flex-wrap gap-2 p-5" role="radiogroup" aria-label={t("Language")}>
          {LOCALES.map((l) => (
            <label
              key={l.value}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-bone px-4 font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
            >
              <input type="radio" name="locale" value={l.value} defaultChecked={initial.locale === l.value} className="sr-only" />
              {l.label}
            </label>
          ))}
        </div>
      </Card>

      <FormMessage state={state} />
      <SubmitButton pendingText={t("Saving…")} className="self-start">
        {t("Save changes")}
      </SubmitButton>
    </form>
  );
}

function Toggle({ name, defaultChecked, title, text }: { name: string; defaultChecked: boolean; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-1 py-3">
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-sm text-slate">{text}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand)]" />
    </label>
  );
}
