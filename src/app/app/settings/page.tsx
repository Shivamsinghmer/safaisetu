import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/session";
import { getT } from "@/lib/i18n-server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const { t, locale } = await getT();
  return (
    <>
      <PageHeader label={t("Settings")} title={t("Your account")} description={t("Profile, email updates and language.")} />
      <SettingsForm
        email={viewer.email}
        initial={{
          full_name: viewer.profile.full_name,
          phone: viewer.profile.phone ?? "",
          email_updates: viewer.profile.email_updates,
          email_notices: viewer.profile.email_notices,
          locale,
        }}
      />
    </>
  );
}
