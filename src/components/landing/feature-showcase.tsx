"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "@/components/nav-link";
import { ArrowRight, Check, MoreHorizontal, Zap } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building03Icon, Mortarboard01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/**
 * MotionFlow-style feature grid: split-line masked headline, staggered fade-up,
 * and three cards with live mockups of the SafaiSetu flow (report → route → resolve).
 * Animations stay paused on their first frame until the section scrolls into view.
 */
export function FeatureShowcase() {
  const lines = ["From one photo", "to a clean street."];
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("reveal mx-auto w-full max-w-[1240px] px-4 sm:px-6", inView && "in-view")}>
      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <h2 className="flex-[1.2] font-sans text-[28px] leading-[1.1] font-medium tracking-[-0.04em] text-foreground sm:text-[34px] md:text-[46px] short:text-[40px]">
          {lines.map((line, i) => (
            <span key={line} className="-mb-[5px] block overflow-hidden pb-[5px]">
              <span className="block animate-mask-up" style={{ animationDelay: `${i * 0.15}s` }}>
                {line}
              </span>
            </span>
          ))}
        </h2>
        <div className="flex max-w-[380px] flex-col items-start gap-4 lg:flex-1">
          <p className="animate-fade-up text-[14px] leading-relaxed text-muted-foreground [animation-delay:0.3s]">
            Three steps, one record. AI tags the report, routing sends it to whoever is responsible, and the
            ticket only closes when the reporter agrees it&apos;s clean.
          </p>
          <div className="flex animate-fade-up flex-wrap gap-2 [animation-delay:0.4s]">
            <Link
              href="/app/report"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-px hover:bg-primary/90"
            >
              Report an issue <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Try the demo
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          delay="0.5s"
          label="01 · Report"
          title="AI reads the photo for you"
          checks={["Category and severity filled in automatically", "GPS pin and ward attached, EXIF stripped"]}
        >
          <ReportVisual start={inView} />
        </FeatureCard>
        <FeatureCard
          delay="0.6s"
          label="02 · Route"
          title="Straight to the right desk"
          checks={["Inside a society → its secretary first", "Dumping and missed pickups → the city"]}
        >
          <RouteVisual />
        </FeatureCard>
        <FeatureCard
          delay="0.7s"
          label="03 · Resolve"
          title="Proof on every ticket"
          checks={["Before and after photos from the field", "Past-SLA tickets flagged in red"]}
          className="md:col-span-2 lg:col-span-1"
        >
          <ResolveVisual />
        </FeatureCard>
      </div>
    </div>
  );
}

function FeatureCard({
  delay,
  label,
  title,
  checks,
  children,
  className,
}: {
  delay: string;
  label: string;
  title: string;
  checks: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex min-h-[340px] animate-fade-up flex-col overflow-hidden rounded-2xl bg-muted px-5 pt-5 pb-6 sm:min-h-[400px] sm:rounded-3xl sm:px-6 sm:pt-6 sm:pb-7 short:min-h-[340px] md:h-[420px]",
        className,
      )}
      style={{ animationDelay: delay }}
    >
      <div className="mb-4">
        <div className="mb-2 font-mono text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
          {label}
        </div>
        <h3 className="text-[18px] leading-[1.3] font-semibold tracking-[-0.02em] text-foreground sm:text-[20px]">{title}</h3>
      </div>
      <div className="relative flex flex-1 items-center justify-center">{children}</div>
      <ul className="mt-auto flex flex-col gap-2.5">
        {checks.map((c) => (
          <li key={c} className="flex items-start gap-3 text-[13px] leading-[1.4] text-muted-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" strokeWidth={2.5} />
            {c}
          </li>
        ))}
      </ul>
    </article>
  );
}

/* Card 1: blurred report behind a floating AI-analysis progress pill with a synced counter */
function ReportVisual({ start }: { start: boolean }) {
  const target = 94;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!start) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const timer = setTimeout(
      () => {
        if (reduce) return setPct(target);
        const t0 = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - t0) / 1500);
          const eased = 1 - Math.pow(1 - t, 3);
          setPct(Math.round(eased * target));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      reduce ? 0 : 1200,
    );
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [start]);

  return (
    <>
      <div className="absolute top-[4%] w-[210px] scale-95 rounded-2xl bg-card p-4 opacity-60 blur-[2px]">
        <div className="text-[13px] font-semibold text-foreground">Overflowing bin near Gate 2</div>
        <div className="mt-1 text-[11px] text-muted-foreground">Green Valley Residency · B-Block</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="h-16 rounded-lg bg-[#d9cfc3] dark:bg-[#3b3a44]" />
          <div className="h-16 rounded-lg bg-[#cfd8cc] dark:bg-[#34403a]" />
        </div>
      </div>
      <div className="relative z-10 mt-16 w-full rounded-2xl bg-card px-6 py-5 shadow-lg md:w-[110%]">
        <div className="mb-3 flex items-center justify-between text-[13px] font-medium">
          <span className="text-foreground">AI reading your photo</span>
          <span className="font-mono text-muted-foreground tabular-nums">{pct}%</span>
        </div>
        <div className="relative h-4 rounded-lg bg-muted">
          <div
            className="relative h-full animate-fill-bar rounded-lg bg-linear-to-r from-primary to-chart-1 shadow-[0_6px_16px_color-mix(in_oklab,var(--chart-1)_40%,transparent)]"
            style={{ "--fill": `${target}%` } as CSSProperties}
          >
            <span className="absolute top-1/2 right-[3px] h-2.5 w-2.5 -translate-y-1/2 animate-pulse-glow rounded-full bg-white" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-coral/15 px-2 py-0.5 font-medium text-coral">High severity</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
            Overflowing bin
          </span>
        </div>
      </div>
    </>
  );
}

/* Card 2: organization chips + a society stat card with a bar chart */
function RouteVisual() {
  const bars = [40, 100, 60, 45];
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { l: "Society", i: Building03Icon },
          { l: "Campus", i: Mortarboard01Icon },
          { l: "Public place", i: Store01Icon },
        ].map(({ l, i }) => (
          <span key={l} className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-xs">
            <HugeiconsIcon icon={i} size={12} /> {l}
          </span>
        ))}
      </div>
      <div className="w-full rounded-2xl bg-card p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              GV
            </span>
            <span className="text-[13px] font-medium text-foreground">Green Valley Residency</span>
          </div>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-1 flex items-center gap-1 pl-[38px] text-[11px] text-muted-foreground">
          <Zap className="h-3 w-3" /> 240 flats · Ward 19
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="mb-1 text-[32px] leading-none font-semibold tracking-[-0.03em] text-foreground">19h</div>
            <div className="text-[11px] text-muted-foreground">avg. resolution</div>
          </div>
          <div className="flex h-12 items-end gap-1.5" aria-hidden>
            {bars.map((h, i) => (
              <span
                key={i}
                className={cn("w-4 rounded-lg", i === 1 ? "bg-primary dark:bg-chart-1" : "bg-secondary")}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Card 3: a staggered live feed of ticket events */
function ResolveVisual() {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <FeedPill offset="md:-translate-x-[10%]" tone="amber" title="Assigned" meta="Ramesh Y. · field worker · 2m ago" />
      <div className="flex w-[90%] items-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-primary-foreground shadow-[0_12px_24px_color-mix(in_oklab,var(--primary)_25%,transparent)]">
        <span className="text-[13px] font-semibold">173</span>
        <span className="text-[13px] opacity-80">complaints resolved this month</span>
      </div>
      <FeedPill offset="md:translate-x-[10%]" tone="emerald" title="Closed" meta="Verified by reporter · 1m ago" />
    </div>
  );
}

function FeedPill({ offset, tone, title, meta }: { offset: string; tone: "amber" | "emerald"; title: string; meta: string }) {
  return (
    <div className={cn("flex w-[85%] items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-md", offset)}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          tone === "amber" ? "bg-amber/15 text-amber" : "bg-emerald/15 text-emerald",
        )}
      >
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-foreground">{title}</div>
        <div className="truncate text-[11px] text-muted-foreground">{meta}</div>
      </div>
    </div>
  );
}
