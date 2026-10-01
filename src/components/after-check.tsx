import { AlertTriangle, Check, Info, ShieldAlert, ShieldCheck, ShieldQuestion, X } from "lucide-react";
import type { AfterCheck } from "@/lib/types";
import { cn } from "@/lib/utils";

type Translate = (s: string, vars?: Record<string, string | number>) => string;

const VERDICT = {
  pass: { label: "AI verified", Icon: ShieldCheck, chip: "bg-emerald/12 text-emerald" },
  review: { label: "Needs review", Icon: ShieldQuestion, chip: "bg-amber/12 text-amber" },
  fail: { label: "Flagged by AI", Icon: ShieldAlert, chip: "bg-coral/12 text-coral" },
} as const;

/** A check only counts for the photo it was made on */
export function checkFor(check: AfterCheck | null | undefined, afterPath: string | null | undefined) {
  return check && afterPath && check.path === afterPath ? check : null;
}

/** Small verdict chip for lists, galleries and headers */
export function AfterCheckBadge({ check, t, className }: { check: AfterCheck; t: Translate; className?: string }) {
  const v = VERDICT[check.verdict];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", v.chip, className)}>
      <v.Icon className="h-3 w-3" aria-hidden /> {t(v.label)}
    </span>
  );
}

const ICON = {
  fail: { Icon: X, cls: "text-coral" },
  review: { Icon: AlertTriangle, cls: "text-amber" },
  note: { Icon: Info, cls: "text-ash" },
  ok: { Icon: Check, cls: "text-emerald" },
} as const;

/** What the check found, worst first, with the AI's summary and the worker's explanation if they overrode a flag */
export function AfterCheckDetails({ check, t, className }: { check: AfterCheck; t: Translate; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5 text-sm", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <AfterCheckBadge check={check} t={t} />
        {check.summary && <span className="text-slate">{check.summary}</span>}
      </div>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
        {check.reasons.map((r, i) => {
          const { Icon, cls } = ICON[r.level];
          return (
            <li key={i} className="flex items-start gap-2 text-[13px] text-ink">
              <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", cls)} strokeWidth={2.5} aria-hidden />
              <span>{t(r.text)}</span>
            </li>
          );
        })}
      </ul>
      {check.override && (
        <p className="rounded-lg bg-mist px-3 py-2 text-[13px] text-ink">
          <span className="font-semibold">{t("Worker's explanation:")}</span> &ldquo;{check.override}&rdquo;
        </p>
      )}
    </div>
  );
}
