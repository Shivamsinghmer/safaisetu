import Link from "next/link";
import { ChevronRight, Clock, QrCode, Truck, ArrowUpRight } from "lucide-react";
import { SeverityTag, StatusPill } from "@/components/ui";
import { categoryLabel } from "@/lib/constants";
import type { TicketListRow } from "@/lib/tickets";
import { cn, isOverdue, timeAgo } from "@/lib/utils";

export function TicketList({
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
  return (
    <ul className={cn("divide-y divide-bone overflow-hidden rounded-xl border border-bone bg-white", className)}>
      {tickets.map((t) => {
        const overdue = isOverdue(t.sla_due_at, t.status);
        return (
          <li key={t.id}>
            <Link
              href={`/app/tickets/${t.id}`}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-mist sm:gap-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-[12px] font-medium text-ash">{t.code}</span>
                  {t.kind === "pickup" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue">
                      <Truck className="h-3 w-3" /> Pickup
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
                  {categoryLabel(t.category)}
                </div>
                <div className="mt-0.5 truncate text-[13px] text-slate">
                  {[showOrg && t.org?.name, t.unit_label, showWard && t.ward?.name, t.address]
                    .filter(Boolean)
                    .join(" · ") || "Location on map"}
                </div>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                <StatusPill status={t.status} />
                <div className="flex items-center gap-3">
                  <SeverityTag severity={t.severity} />
                  <span className={cn("inline-flex items-center gap-1 text-xs", overdue ? "font-semibold text-coral" : "text-ash")}>
                    <Clock className="h-3 w-3" />
                    {overdue ? "Overdue" : timeAgo(t.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:hidden">
                <StatusPill status={t.status} />
                <span className={cn("text-[11px]", overdue ? "font-semibold text-coral" : "text-ash")}>
                  {overdue ? "Overdue" : timeAgo(t.created_at)}
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
