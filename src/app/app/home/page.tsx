import type { Metadata } from "next";
import Link from "@/components/nav-link";
import { ArrowRight, BookOpen, Building2, Camera, Clock, Truck, UserPlus } from "lucide-react";
import { ButtonLink, Card, CardHeader, Pill } from "@/components/ui";
import { TicketList } from "@/components/ticket-list";
import { CleanupGallery, type CleanupRow } from "@/components/cleanup-gallery";
import { NoticeList } from "@/components/notice-list";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { OPEN_STATUSES, ORG_TYPE_META } from "@/lib/constants";
import { TICKET_LIST_SELECT, type TicketListRow } from "@/lib/tickets";
import type { Notice } from "@/lib/types";
import { getT } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { t } = await getT();
  const [{ data: tickets }, { data: notices }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("tickets")
      .select(TICKET_LIST_SELECT)
      .eq("reporter_id", viewer.userId)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase.from("notices").select("*").order("created_at", { ascending: false }).limit(5),
    // Cleanups waiting for this person's approval, with their photos
    supabase
      .from("tickets")
      .select(`${TICKET_LIST_SELECT}, resolved_at`)
      .eq("reporter_id", viewer.userId)
      .eq("status", "resolved")
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);
  const toReview = (reviewRows ?? []) as unknown as CleanupRow[];
  const mine = (tickets ?? []) as unknown as TicketListRow[];
  const open = mine.filter((t) => OPEN_STATUSES.includes(t.status)).length;
  const orgName = new Map(viewer.memberships.map((m) => [m.org_id, m.organization.name]));
  const firstName = (viewer.profile.full_name || "there").split(" ")[0];

  return (
    <>
      <div className="mb-8 animate-rise">
        <div className="label-mono mb-2">{t("Home")}</div>
        <h1 className="font-display text-[28px] leading-[1.1] font-bold tracking-[-0.04em] sm:text-[32px] md:text-heading">
          {t("Namaste, {name}.", { name: firstName })}
        </h1>
        <p className="mt-2 text-[15px] text-slate">
          {open ? t("You have {n} open ticket(s).", { n: open }) : t("Nothing pending. Your area looks good.")}
        </p>
      </div>

      {toReview.length > 0 && (
        <section className="mb-8 animate-rise rounded-2xl border border-amber/30 bg-amber/[0.06] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold tracking-[-0.02em]">{t("Is it clean? Your approval is needed")}</h2>
              <p className="text-sm text-slate">
                {t("A worker has uploaded an after photo. Compare it with yours, then approve or reopen.")}
              </p>
            </div>
            <Link href="/app/tickets?tab=review" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
              {t("All to review")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <CleanupGallery tickets={toReview} />
        </section>
      )}

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction href="/app/report" icon={<Camera className="h-5 w-5" />} title={t("Report an issue")} text={t("Overflowing bin, garbage on road, dumping")} primary />
        <QuickAction href="/app/pickup" icon={<Truck className="h-5 w-5" />} title={t("Request pickup")} text={t("Bulky items, e-waste, debris")} />
        <QuickAction href="/app/learn" icon={<BookOpen className="h-5 w-5" />} title={t("Which bin?")} text={t("Snap an item, AI tells you where it goes")} />
        <QuickAction href="/app/orgs" icon={<UserPlus className="h-5 w-5" />} title={t("Join your society")} text={t("Use an invite code or register yours")} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-[-0.02em]">{t("Recent activity")}</h2>
            <Link href="/app/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
              {t("All tickets")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {mine.length ? (
            <TicketList tickets={mine} />
          ) : (
            <Card className="flex flex-col items-center px-6 py-10 text-center">
              <Clock className="h-7 w-7 text-fog" />
              <div className="mt-3 font-display font-bold">{t("No reports yet")}</div>
              <p className="mt-1 max-w-xs text-sm text-slate">{t("Your reports and pickup requests show up here with live status.")}</p>
              <ButtonLink href="/app/report" className="mt-5">
                {t("Report your first issue")}
              </ButtonLink>
            </Card>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader label={t("Your places")} title={t("Societies & campuses")} />
            {viewer.memberships.length ? (
              <ul className="divide-y divide-bone">
                {viewer.memberships.map((m) => (
                  <li key={m.id}>
                    <Link href={`/app/org/${m.org_id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-mist">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist">
                        <Building2 className="h-4 w-4 text-slate" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-ink">{m.organization.name}</div>
                        <div className="text-xs text-slate">
                          {ORG_TYPE_META[m.organization.type].label}
                          {m.unit_label && ` · ${m.unit_label}`}
                        </div>
                      </div>
                      {m.status === "pending" && <Pill className="bg-amber/15 text-amber">{t("Awaiting approval")}</Pill>}
                      {m.role === "admin" && <Pill className="bg-violet/10 text-violet">Admin</Pill>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-5 text-sm text-slate">
                {t("Not part of a society or campus yet.")}{" "}
                <Link href="/app/orgs" className="font-semibold text-blue">
                  {t("Join or register one →")}
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader label={t("Notices")} title={t("From your society & city")} />
            <NoticeList
              notices={(notices ?? []) as Notice[]}
              sourceName={(n) => (n.org_id ? (orgName.get(n.org_id) ?? "Your organization") : "Municipality")}
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function QuickAction({
  href,
  icon,
  title,
  text,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "group flex flex-col gap-4 rounded-xl bg-primary p-5 text-primary-foreground transition-colors hover:bg-primary/90"
          : "group flex flex-col gap-4 rounded-xl border border-bone bg-card p-5 transition-colors hover:border-cloud"
      }
    >
      <span
        className={
          primary
            ? "flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10"
            : "flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink"
        }
      >
        {icon}
      </span>
      <div>
        <div className="flex items-center gap-1 font-display text-base font-bold tracking-[-0.02em]">
          {title}
          <ArrowRight className="h-4 w-4 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <div className={primary ? "mt-0.5 text-[13px] text-primary-foreground/70" : "mt-0.5 text-[13px] text-slate"}>{text}</div>
      </div>
    </Link>
  );
}
