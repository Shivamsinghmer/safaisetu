"use client";

import { useT } from "@/components/i18n-provider";
import { SEVERITY_META, STATUS_META } from "@/lib/constants";
import { severityText, statusText } from "@/lib/i18n";
import type { Severity, TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusPill({ status, className }: { status: TicketStatus; className?: string }) {
  const { locale } = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 whitespace-nowrap",
        STATUS_META[status].className,
        className,
      )}
    >
      {statusText(locale, status)}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: Severity }) {
  const { locale } = useT();
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.06em] text-slate uppercase">
      <span className={cn("h-2 w-2 rounded-full", SEVERITY_META[severity].dot)} aria-hidden />
      {severityText(locale, severity)}
    </span>
  );
}
