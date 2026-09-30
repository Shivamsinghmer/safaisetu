import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#6647f0" />
      {/* a bridge (setu) arcing over a leaf-cut bin lid */}
      <path d="M7 20c2.5-6 15.5-6 18 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10 20v3.5M16 17v6.5M22 20v3.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="9.5" r="2.4" fill="#6ee7b7" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="SafaiSetu home">
      <LogoMark />
      <span className="font-display text-[17px] font-extrabold tracking-[-0.03em] text-onyx">SafaiSetu</span>
    </Link>
  );
}
