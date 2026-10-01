import Link from "@/components/nav-link";
import { cn } from "@/lib/utils";
import { MARK_BG, MARK_CHECK, MARK_LEAF, MARK_LEAF_FILL, MARK_VEIN } from "@/lib/brand-mark";

/** The SafaiSetu mark (geometry in lib/brand-mark.ts) */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9.5" fill={MARK_BG} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="none" stroke="#ffffff" strokeOpacity="0.14" />
      <path d={MARK_CHECK} fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={MARK_LEAF} fill={MARK_LEAF_FILL} />
      <path d={MARK_VEIN} stroke={MARK_BG} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/** "Safai" in ink, "Setu" in brand green: the two halves of the name, clean + bridge */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[18px] leading-none font-bold tracking-[-0.035em] text-onyx", className)}>
      Safai<span className="text-brand">Setu</span>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      lang="en"
      className={cn("group inline-flex items-center gap-2.5 rounded-xl outline-offset-4", className)}
      aria-label="SafaiSetu home"
    >
      <LogoMark className="transition-transform duration-300 ease-settle group-hover:-rotate-6" />
      <Wordmark />
    </Link>
  );
}
