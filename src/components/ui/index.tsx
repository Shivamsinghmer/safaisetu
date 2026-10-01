import Link from "@/components/nav-link";
import type { ComponentProps, ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Button                                                               */
/* ------------------------------------------------------------------ */
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-display text-sm font-bold whitespace-nowrap " +
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-settle " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] cursor-pointer";

const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-white text-ink border border-bone hover:border-cloud hover:bg-mist",
  "outline-blue": "bg-white text-blue border border-blue hover:bg-blue/5",
  ghost: "text-carbon hover:bg-black/4",
  danger: "bg-white text-coral border border-coral/40 hover:bg-coral/5",
  success: "bg-emerald text-snow hover:bg-emerald/90",
};

const buttonSizes = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-9 w-9",
};

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/* ------------------------------------------------------------------ */
/* Pills & badges                                                       */
/* ------------------------------------------------------------------ */
export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { StatusPill, SeverityTag } from "./status";

export function Tag({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-bone bg-white px-3 py-1 text-xs font-semibold text-carbon",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                             */
/* ------------------------------------------------------------------ */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-bone bg-white", className)} {...props} />;
}

export function CardHeader({
  label,
  title,
  action,
  className,
}: {
  label?: string;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-bone px-5 py-4", className)}>
      <div className="min-w-0">
        {label && <div className="label-mono mb-1">{label}</div>}
        {title && <h3 className="font-display text-base font-bold tracking-[-0.02em] text-onyx">{title}</h3>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  caption,
  tone,
  compact,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: "default" | "warn" | "danger" | "good";
  /** Tighter sizing on phones so three cards fit in one row */
  compact?: boolean;
}) {
  return (
    <Card className={cn("h-full", compact ? "p-3 sm:p-5" : "p-5")}>
      <div className={cn("label-mono", compact && "text-[10px] tracking-[0.06em] sm:text-[11px] sm:tracking-[0.08em]")}>
        {label}
      </div>
      <div
        className={cn(
          "mt-2 font-display leading-none font-bold tracking-[-0.04em] text-onyx tabular-nums",
          compact ? "text-[26px] sm:text-[34px]" : "text-[34px]",
          tone === "danger" && "text-coral",
          tone === "warn" && "text-amber",
          tone === "good" && "text-emerald",
        )}
      >
        {value}
      </div>
      {caption && <div className="mt-2 text-[13px] text-slate">{caption}</div>}
    </Card>
  );
}

export function PageHeader({
  label,
  title,
  description,
  actions,
}: {
  label?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 animate-rise">
        {label && <div className="label-mono mb-2">{label}</div>}
        <h1 className="font-display text-[28px] leading-[1.15] font-bold tracking-[-0.035em] sm:text-heading-sm">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cloud bg-mist/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-ash">{icon}</div>}
      <div className="font-display text-base font-bold text-onyx">{title}</div>
      {description && <p className="mt-1 max-w-sm text-sm text-slate">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({ name, className }: { name: string | null | undefined; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mercury font-display text-[11px] font-bold text-carbon ring-2 ring-white",
        className,
      )}
      title={name ?? undefined}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                        */
/* ------------------------------------------------------------------ */
const control =
  "w-full rounded-md border border-input bg-white px-3 text-[15px] text-ink placeholder:text-fog " +
  "transition-[border-color,box-shadow] duration-150 focus:border-blue focus:outline-none focus:ring-3 focus:ring-blue/15 " +
  "disabled:bg-mist disabled:text-ash";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2.5", className)} {...props} />;
}

export { Select, type SelectOption } from "./select";

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-carbon">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ash">{hint}</p>}
    </div>
  );
}

export function FormMessage({ state }: { state: { error?: string; message?: string } | null }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-sm text-coral">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-md border border-emerald/30 bg-emerald/5 px-3 py-2 text-sm text-emerald">
        {state.message}
      </p>
    );
  return null;
}
