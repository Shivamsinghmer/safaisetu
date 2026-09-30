import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Glossy slider CTA (from the "Book a Call" spec): dark bezel pill with an
 * acid-green glossy slider that expands on hover/focus, swapping the dotted
 * arrow for `hoverIcon` while the label slides out. Styles live in globals.css.
 * Use for the single most important action in a view.
 */
export function GlossyCta({
  href,
  label,
  hoverIcon,
  className,
}: {
  href: string;
  label: string;
  hoverIcon: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("glossy-cta", className)} aria-label={label}>
      <span className="glossy-cta__slider" aria-hidden>
        <svg className="glossy-cta__arrow" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="10" cy="12" r="1.5" />
          <circle cx="14" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
          <circle cx="14" cy="8" r="1.5" />
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="14" cy="16" r="1.5" />
          <circle cx="10" cy="20" r="1.5" />
        </svg>
        <span className="glossy-cta__icon">{hoverIcon}</span>
      </span>
      <span className="glossy-cta__label">{label}</span>
    </Link>
  );
}
