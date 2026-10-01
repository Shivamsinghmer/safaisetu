import { Check, Hourglass, RotateCcw, Star } from "lucide-react";
import type { TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Translate = (s: string, vars?: Record<string, string | number>) => string;

/** Where a cleaned-up ticket stands with its reporter: waiting for approval, approved (with rating) or reopened */
export function ApprovalChip({
  status,
  rating,
  t,
  className,
}: {
  status: TicketStatus;
  rating?: number | null;
  t: Translate;
  className?: string;
}) {
  if (status === "resolved")
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-amber/12 px-2 py-0.5 text-[11px] font-semibold text-amber", className)}>
        <Hourglass className="h-3 w-3" aria-hidden /> {t("Awaiting approval")}
      </span>
    );
  if (status === "closed")
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-emerald/12 px-2 py-0.5 text-[11px] font-semibold text-emerald", className)}>
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> {t("Approved")}
        {rating ? (
          <span className="inline-flex items-center gap-0.5 tabular-nums">
            · <Star className="h-3 w-3 fill-current" aria-hidden /> {rating}
          </span>
        ) : null}
      </span>
    );
  if (status === "reopened")
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full bg-pink/12 px-2 py-0.5 text-[11px] font-semibold text-pink", className)}>
        <RotateCcw className="h-3 w-3" aria-hidden /> {t("Reopened")}
      </span>
    );
  return null;
}

/** A before → after pair of small square thumbnails for list rows. Renders nothing without photos. */
export function ProofThumbs({
  before,
  after,
  t,
  size = 44,
}: {
  before?: string | null;
  after?: string | null;
  t: Translate;
  size?: number;
}) {
  if (!before && !after) return null;
  return (
    <span className="relative flex shrink-0" style={{ width: after && before ? size * 1.6 : size, height: size }}>
      {before && <Thumb src={before} label={t("Before")} size={size} />}
      {after && (
        <span className={cn("absolute top-0", before ? "right-0" : "left-0")}>
          <Thumb src={after} label={t("After")} size={size} good />
        </span>
      )}
    </span>
  );
}

function Thumb({ src, label, size, good }: { src: string; label: string; size: number; good?: boolean }) {
  return (
    <span
      className={cn(
        "relative block overflow-hidden rounded-lg bg-mist ring-2 ring-card",
        good && "shadow-[0_2px_6px_-2px_rgb(0_0_0/0.25)]",
      )}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover" />
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 py-px text-center text-[8px] leading-3 font-bold tracking-wide uppercase",
          good ? "bg-mint/90 text-night" : "bg-black/55 text-snow",
        )}
      >
        {label}
      </span>
    </span>
  );
}
