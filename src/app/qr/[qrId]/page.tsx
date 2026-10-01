import type { Metadata } from "next";
import Link from "@/components/nav-link";
import { MapPin, QrCode } from "lucide-react";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_TYPE_META } from "@/lib/constants";
import type { OrgType } from "@/lib/types";
import { GuestReportForm } from "./guest-form";
import { I18nProvider } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Report a problem",
  robots: { index: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public page a QR code opens for visitors: report in a few taps, no account. */
export default async function GuestQrPage({ params }: PageProps<"/qr/[qrId]">) {
  const { qrId } = await params;
  const locale = await getLocale();
  const t = (k: string) => translate(locale, k);
  const { data } = UUID.test(qrId)
    ? await createAdminClient()
        .from("qr_points")
        .select("id, label, organizations!inner(name, type, status)")
        .eq("id", qrId)
        .eq("organizations.status", "approved")
        .maybeSingle()
    : { data: null };
  const qr = data as unknown as {
    id: string;
    label: string;
    organizations: { name: string; type: OrgType };
  } | null;

  return (
    <I18nProvider locale={locale}>
      <div
        lang={locale}
        className="min-h-dvh bg-background px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <div className="flex items-center justify-between">
            <Logo />
            <LanguageSwitcher />
          </div>
          {!qr ? (
            <Card className="p-6">
              <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
                This QR code isn&apos;t active
              </h1>
              <p className="mt-2 text-[15px] text-slate">
                It may have been removed by the organization. You can still
                report the problem with a SafaiSetu account.
              </p>
              <Link
                href="/app/report"
                className="mt-4 inline-block font-semibold text-blue"
              >
                Report with an account
              </Link>
            </Card>
          ) : (
            <>
              <div>
                <div className="label-mono flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5" /> {t("Scanned QR code")}
                </div>
                <h1 className="mt-2 font-display text-[28px] leading-tight font-bold tracking-[-0.03em]">
                  {t("Report a problem here")}
                </h1>
                <p className="mt-2 flex items-start gap-1.5 text-[15px] text-slate">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <b className="text-ink">{qr.label}</b> ·{" "}
                    {qr.organizations.name} (
                    {ORG_TYPE_META[qr.organizations.type].label})
                  </span>
                </p>
              </div>
              <GuestReportForm qrId={qr.id} />
              <p className="text-center text-sm text-slate">
                {t("Have an account?")}{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(`/app/report?qr=${qr.id}`)}`}
                  className="font-semibold text-blue"
                >
                  {t("Log in to report and get email updates")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </I18nProvider>
  );
}
