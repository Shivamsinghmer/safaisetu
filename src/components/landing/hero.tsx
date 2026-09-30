import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, Landmark, Sparkles, Store } from "lucide-react";

const LINES = ["Clean cities start", "with one photo."];

const METRICS = [
  { value: "20s", label: "to report a problem" },
  { value: "24h", label: "SLA on high-severity issues" },
  { value: "2", label: "photos per ticket: before and after" },
  { value: "4", label: "kinds of places, one platform" },
];

/** Landing hero: masked headline reveal, CTAs, audiences and a metric strip. */
export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <div className="relative mx-auto flex w-full max-w-[1240px] flex-col items-center px-4 text-center sm:px-6">
      {/* dot grid, fading out toward the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -bottom-10 -z-10 bg-[radial-gradient(var(--border)_1.2px,transparent_1.2px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
      />

      <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground shadow-xs">
        <Sparkles className="h-3.5 w-3.5 text-primary dark:text-chart-1" />
        AI-tagged reports · live tracking · proof of cleanup
      </span>

      <h1 className="mt-7 font-sans text-[44px] leading-[1.02] font-semibold tracking-[-0.045em] text-foreground sm:text-[68px] lg:text-[84px] short:mt-5 short:!text-[60px]">
        {LINES.map((line, i) => (
          <span key={line} className="-mb-[6px] block overflow-hidden pb-[6px]">
            <span className="block animate-mask-up" style={{ animationDelay: `${0.1 + i * 0.15}s` }}>
              {i === 1 ? (
                <>
                  with <span className="text-primary dark:text-chart-1">one photo.</span>
                </>
              ) : (
                line
              )}
            </span>
          </span>
        ))}
      </h1>

      <p className="mt-6 max-w-[560px] animate-fade-up text-[16px] leading-relaxed text-muted-foreground [animation-delay:0.35s] sm:text-[17px] short:mt-4">
        SafaiSetu connects residents, societies, campuses and public places with the municipality. Report overflowing
        bins, dumping or missed pickups, and follow every complaint until it&apos;s actually clean.
      </p>

      <div className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-4 [animation-delay:0.45s] short:mt-6">
        <Link
          href={ctaHref}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-px hover:bg-primary/90"
        >
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/login"
          className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-7 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Try a demo account <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-2 [animation-delay:0.55s] short:mt-6">
        {[
          { i: Building2, l: "Societies" },
          { i: GraduationCap, l: "Colleges" },
          { i: Store, l: "Public places" },
          { i: Landmark, l: "Municipalities" },
        ].map(({ i: Icon, l }) => (
          <span key={l} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground">
            <Icon className="h-4 w-4" /> {l}
          </span>
        ))}
      </div>

      <dl className="mt-12 grid w-full max-w-[920px] animate-fade-up grid-cols-2 overflow-hidden rounded-3xl border border-border bg-card shadow-sm [animation-delay:0.65s] sm:grid-cols-4 short:mt-8">
        {METRICS.map((m, i) => (
          <div
            key={m.label}
            className={
              "flex flex-col items-center gap-1 px-4 py-5 " +
              (i % 2 === 1 ? "border-l border-border " : "") +
              (i >= 2 ? "border-t border-border sm:border-t-0 " : "") +
              (i === 2 ? "sm:border-l" : "")
            }
          >
            <dt className="order-2 text-[13px] text-muted-foreground">{m.label}</dt>
            <dd className="order-1 font-sans text-[32px] leading-none font-semibold tracking-[-0.04em] text-foreground">
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
