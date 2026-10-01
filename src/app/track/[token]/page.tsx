import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Card, CardHeader, StatusPill } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrls } from "@/lib/storage";
import { STATUS_META } from "@/lib/constants";
import type { TicketStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { getLocale } from "@/lib/i18n-server";
import { I18nProvider } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { categoryText, statusText, translate } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Track your report",
  robots: { index: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Status of a guest report, reached through its private link (the token is an unguessable
 * UUID). Shows progress and the photos, never other people's names or internal notes.
 */
export default async function TrackPage({
  params,
  searchParams,
}: PageProps<"/track/[token]">) {
  const { token } = await params;
  const { new: isNew } = (await searchParams) as { new?: string };
  if (!UUID.test(token)) notFound();
  const locale = await getLocale();
  const tr = (k: string, v?: Record<string, string>) => translate(locale, k, v);

  const db = createAdminClient();
  const { data } = await db
    .from("tickets")
    .select(
      "id, code, category, status, scope, address, photo_path, after_photo_path, created_at, organizations(name)",
    )
    .eq("public_token", token)
    .maybeSingle();
  const t = data as unknown as {
    id: string;
    code: string;
    category: string;
    status: TicketStatus;
    scope: "internal" | "municipal";
    address: string | null;
    photo_path: string | null;
    after_photo_path: string | null;
    created_at: string;
    organizations: { name: string } | null;
  } | null;
  if (!t) notFound();

  const { data: events } = await db
    .from("ticket_events")
    .select("id, to_status, from_status, created_at")
    .eq("ticket_id", t.id)
    .order("created_at");
  const photos = await signedUrls([t.photo_path, t.after_photo_path]);

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
          {isNew && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald/30 bg-emerald/[0.06] p-4 text-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
              <div>
                <div className="font-semibold text-ink">
                  {tr("Thanks, your report is in as {code}", { code: t.code })}
                </div>
                <div className="text-slate">
                  {tr(
                    "Bookmark this page to check its progress. It's private to this link.",
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[13px] text-ash">{t.code}</div>
              <h1 className="mt-1 font-display text-[28px] leading-tight font-bold tracking-[-0.03em]">
                {categoryText(locale, t.category)}
              </h1>
              <p className="mt-1 text-[15px] text-slate">
                {[t.address, t.organizations?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
            <StatusPill
              status={t.status}
              className="shrink-0 px-3 py-1 text-[13px]"
            />
          </div>

          <div
            className={cn("grid gap-3", t.after_photo_path && "grid-cols-2")}
          >
            {[
              t.photo_path && [tr("Reported"), photos.get(t.photo_path)],
              t.after_photo_path && [
                tr("After cleanup"),
                photos.get(t.after_photo_path),
              ],
            ]
              .filter(Boolean)
              .map((p) => {
                const [label, src] = p as [string, string | undefined];
                return src ? (
                  <figure
                    key={label}
                    className="relative overflow-hidden rounded-2xl border border-bone"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={label}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <figcaption className="absolute top-2 left-2 rounded-full bg-card/95 px-2 py-0.5 text-[11px] font-semibold text-ink">
                      {label}
                    </figcaption>
                  </figure>
                ) : null;
              })}
          </div>

          <Card>
            <CardHeader
              label={tr("Progress")}
              title={
                t.scope === "internal"
                  ? `Handled by ${t.organizations?.name ?? "the organization"}`
                  : "Handled by the municipality"
              }
            />
            <ol className="px-5 py-4">
              {(events ?? []).map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-full",
                      STATUS_META[e.to_status as TicketStatus].dot,
                    )}
                  />
                  <span className="flex-1 font-semibold text-ink">
                    {e.from_status === null
                      ? tr("Reported")
                      : statusText(locale, e.to_status as TicketStatus)}
                  </span>
                  <span className="font-mono text-[11px] text-ash">
                    {formatDate(e.created_at, true)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <p className="text-center text-xs text-ash">
            {tr("Refresh this page to see the latest status.")}
          </p>
        </div>
      </div>
    </I18nProvider>
  );
}
