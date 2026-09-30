import Link from "@/components/nav-link";
import { ArrowUpRight, Building2, Camera } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { WASTE_STREAMS, type WasteStream } from "@/lib/constants";
import { STREAM_GUIDE } from "@/lib/waste-guide";
import { cn } from "@/lib/utils";

// Bin colors per India's SWM Rules 2016 (icon fill + label chip)
const BIN_TONES: Record<WasteStream, { icon: string; chip: string }> = {
  wet: { icon: "text-emerald", chip: "bg-emerald/12 text-emerald" },
  dry: { icon: "text-blue", chip: "bg-blue/12 text-blue" },
  hazardous: { icon: "text-coral", chip: "bg-coral/12 text-coral" },
  e_waste: { icon: "text-night dark:text-foreground", chip: "bg-foreground/8 text-foreground" },
};

/** A simple lidded bin, filled with the current text color. */
function BinGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect x="6" y="6" width="20" height="3.5" rx="1.75" fill="currentColor" />
      <rect x="12.5" y="3" width="7" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
      <path d="M8 11h16l-1.6 15.2A2.5 2.5 0 0 1 19.9 28.5h-7.8a2.5 2.5 0 0 1-2.5-2.3L8 11z" fill="currentColor" opacity="0.9" />
      <path d="M13 15v9M16 15v9M19 15v9" stroke="white" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Report an issue", href: "/app/report" },
      { label: "Request a pickup", href: "/app/pickup" },
      { label: "Track my tickets", href: "/app/tickets" },
      { label: "Waste guide", href: "/app/learn" },
    ],
  },
  {
    title: "For organizations",
    links: [
      { label: "Register your society", href: "/app/orgs/new" },
      { label: "Join with a code", href: "/app/orgs" },
      { label: "QR codes for public places", href: "/#collect" },
      { label: "Municipal dashboard", href: "/#resolve" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "How it works", href: "/#flow" },
      { label: "Who it's for", href: "/#audiences" },
      { label: "Try a demo account", href: "/login" },
      { label: "Create an account", href: "/signup" },
    ],
  },
] as const;

/** Landing page footer: brand + actions, link columns, bin legend, oversized wordmark. */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden border-t border-border bg-card">
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-10 sm:px-6 sm:pt-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Logo />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
              One platform connecting residents, societies, campuses and public places with the municipality, so every
              waste complaint is tracked until it&apos;s actually clean.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/app/report"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-px hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" /> Report an issue
              </Link>
              <Link
                href="/app/orgs/new"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Building2 className="h-4 w-4" /> Register your society
              </Link>
            </div>
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8 lg:col-span-7">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="group inline-flex items-center gap-1 text-[14px] text-foreground/80 transition-colors hover:text-foreground"
                      >
                        <span className="bg-linear-to-r from-current to-current bg-[length:0%_1px] bg-bottom-left bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
                          {l.label}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-60" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bin legend: segregate at source */}
        <div className="mt-8 grid grid-cols-1 gap-2 rounded-2xl bg-muted p-2 sm:mt-14 sm:grid-cols-2 sm:gap-3 sm:rounded-3xl sm:p-3 lg:grid-cols-[1.1fr_repeat(4,minmax(0,1fr))]">
          <div className="col-span-1 flex flex-col justify-between gap-3 p-3 sm:col-span-2 sm:gap-4 lg:col-span-1">
            <div>
              <div className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                Segregate at source
              </div>
              <p className="mt-2 text-[15px] leading-snug font-semibold tracking-[-0.02em] text-foreground sm:text-[17px]">
                Four bins, sorted at home, make collection work.
              </p>
            </div>
            <Link
              href="/app/learn"
              className="group inline-flex w-fit items-center gap-1 text-sm font-semibold text-foreground"
            >
              Open the waste guide
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          {(Object.keys(WASTE_STREAMS) as WasteStream[]).map((key) => {
            const s = WASTE_STREAMS[key];
            const tone = BIN_TONES[key];
            return (
              <div
                key={key}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 transition-transform duration-300 hover:-translate-y-0.5 sm:rounded-2xl sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <BinGlyph className={tone.icon} />
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tone.chip)}>
                    {s.bin.split(" / ")[0]}
                  </span>
                </div>
                <div className="mt-3 text-[14px] font-semibold tracking-[-0.01em] text-foreground sm:mt-4 sm:text-[15px]">{s.label}</div>
                <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                  {STREAM_GUIDE[key].examples.slice(0, 2).join(", ")}
                </div>
                <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-1", s.swatch)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Oversized wordmark */}
      <div aria-hidden className="pointer-events-none mt-6 select-none">
        <div className="mx-auto max-w-[1240px] px-2 sm:px-4">
          <div className="bg-linear-to-b from-foreground/[0.14] to-foreground/0 bg-clip-text text-center text-[21vw] leading-[0.8] font-bold tracking-[-0.06em] text-transparent lg:text-[260px]">
            SafaiSetu
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-4 py-5 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {year} SafaiSetu · Built for cleaner cities</span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
              </span>
              Hackathon 2026 build
            </span>
            <ThemeToggle withLabel />
          </div>
        </div>
      </div>
    </footer>
  );
}
