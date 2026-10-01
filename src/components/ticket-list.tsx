import Link from "@/components/nav-link";
import { ChevronRight, Clock, ImageOff, QrCode, Truck, ArrowUpRight } from "lucide-react";
import { SeverityTag, StatusPill } from "@/components/ui";
import { getT } from "@/lib/i18n-server";
import { categoryText } from "@/lib/i18n";
import type { TicketListRow } from "@/lib/tickets";
import { signedUrls } from "@/lib/storage";
import { ApprovalChip, ProofThumbs } from "@/components/proof";
import { AfterCheckBadge, checkFor } from "@/components/after-check";
import { cn, isOverdue, timeAgo } from "@/lib/utils";

export async function TicketList({
  tickets,
  showOrg = true,
  showWard = false,
  className,
}: {
  tickets: TicketListRow[];
  showOrg?: boolean;
  showWard?: boolean;
  className?: string;
}) {
  const { t: tr, locale } = await getT();
  // One batch of signed URLs for every photo in the list (rows were already fetched through RLS)
  const urls = await signedUrls(tickets.flatMap((t) => [t.photo_path, t.after_photo_path]));
  const url = (p: string | null) => (p ? (urls.get(p) ?? null) : null);
  // Keep titles aligned: when some rows have photos, rows without get an empty slot
  const anyPhoto = tickets.some((t) => t.photo_path || t.after_photo_path);
  return (
    <ul className={cn("divide-y divide-bone overflow-hidden rounded-xl border border-bone bg-card", className)}>
      {tickets.map((t) => {
        const overdue = isOverdue(t.sla_due_at, t.status);
        return (
          <li key={t.id}>
            <Link
              href={`/app/tickets/${t.id}`}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-mist sm:gap-4 sm:px-5"
            >
              {t.photo_path || t.after_photo_path ? (
                <ProofThumbs before={url(t.photo_path)} after={url(t.after_photo_path)} t={tr} size={40} />
              ) : anyPhoto ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-fog" aria-hidden>
                  <ImageOff className="h-4 w-4" />
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[12px] font-medium text-ash">{t.code}</span>
                  {t.kind === "pickup" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue">
                      <Truck className="h-3 w-3" /> {tr("Pickup")}
                    </span>
                  )}
                  {t.source === "qr" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate">
                      <QrCode className="h-3 w-3" /> QR
                    </span>
                  )}
                  {t.escalated && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet">
                      <ArrowUpRight className="h-3 w-3" /> Escalated
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate font-display text-[15px] font-bold tracking-[-0.01em] text-ink">
                  {categoryText(locale, t.category)}
                </div>
                <div className="mt-0.5 truncate text-[13px] text-slate">
                  {[showOrg && t.org?.name, t.unit_label, showWard && t.ward?.name, t.address]
                    .filter(Boolean)
                    .join(" · ") || "Location on map"}
                </div>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const c = checkFor(t.after_check, t.after_photo_path);
                    return c && c.verdict !== "pass" ? <AfterCheckBadge check={c} t={tr} /> : null;
                  })()}
                  {t.status !== "reopened" && <ApprovalChip status={t.status} rating={t.rating} t={tr} />}
                  <StatusPill status={t.status} />
                </div>
                <div className="flex items-center gap-3">
                  <SeverityTag severity={t.severity} />
                  <span className={cn("inline-flex items-center gap-1 text-xs", overdue ? "font-semibold text-coral" : "text-ash")}>
                    <Clock className="h-3 w-3" />
                    {overdue ? tr("Overdue") : timeAgo(t.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:hidden">
                <StatusPill status={t.status} />
                {t.status !== "reopened" && (
                  <ApprovalChip status={t.status} rating={t.rating} t={tr} className="px-1.5 text-[10px]" />
                )}
                <span className={cn("text-[11px]", overdue ? "font-semibold text-coral" : "text-ash")}>
                  {overdue ? tr("Overdue") : timeAgo(t.created_at)}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-fog transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function FilterTabs({
  tabs,
  active,
}: {
  tabs: { key: string; label: string; href: string; count?: number }[];
  active: string;
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          transitionTypes={[]}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors",
            t.key === active ? "bg-primary text-primary-foreground" : "text-carbon hover:bg-black/4",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 font-mono text-[10px] leading-4 font-medium",
                t.key === active ? "bg-white/20" : "bg-mercury text-slate",
              )}
            >
              {t.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
