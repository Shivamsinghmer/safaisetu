import Link from "@/components/nav-link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Camera,
  GraduationCap,
  Landmark,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { Hero } from "@/components/landing/hero";
import { HeroFluid } from "@/components/landing/hero-fluid";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import Bucket from "@/components/bucket";
import BentoCard from "@/components/bento-card";
import { getViewer } from "@/lib/session";
import { cn } from "@/lib/utils";

const SCREEN = "flex min-h-[auto] snap-start flex-col justify-center sm:min-h-[calc(100svh-4rem)]";

export default async function Landing() {
  const viewer = await getViewer();
  const cta = viewer ? "/app" : "/signup";

  return (
    <div className="landing-snap bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6">
          <Logo />
          <LandingNav />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {viewer ? (
              <ButtonLink href="/app" size="sm">
                Open app
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Log in
                </ButtonLink>
                <ButtonLink href="/signup" size="sm">
                  Sign up
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 1 · Hero */}
      <section className={cn(SCREEN, "relative isolate overflow-hidden py-10")}>
        {/* ASCII cursor trail behind the whole hero (text + 3D city card) */}
        <HeroFluid />
        <Hero ctaHref={cta} />
      </section>

      {/* 2 · Flow in three steps: MotionFlow feature grid */}
      <section id="flow" className={cn(SCREEN, "py-10 short:py-6")}>
        <FeatureShowcase />
      </section>

      {/* 3 · Collect: bento */}
      <section id="collect" className={cn(SCREEN, "bg-muted/50 py-14 short:py-8")}>
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <SectionHead
            eyebrow="How it works · collect"
            title="One bin for every complaint in the city."
            text="Reports from homes, hostels, markets and roads land in one place, already sorted by type, severity and ward."
          />
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-6 lg:grid-rows-2">
            <Tile className="lg:col-span-4 lg:row-span-2" pad={false}>
              <div className="flex h-full flex-col">
                {/* Above the bucket layer: falling chips pass behind the header, never over it */}
                <div className="relative z-30 bg-card p-6 pb-4">
                  <TileLabel>Live intake</TileLabel>
                  <TileTitle>Reports drop in as they happen</TileTitle>
                </div>
                <div className="flex flex-1 items-end justify-center px-4 pt-24 short:pt-20">
                  <div className="w-full max-w-[520px]">
                    <Bucket />
                  </div>
                </div>
              </div>
            </Tile>
            <Tile className="lg:col-span-2" icon={<Camera className="h-5 w-5" />}>
              <TileLabel>Report</TileLabel>
              <TileTitle>One photo, twenty seconds</TileTitle>
              <TileText>Snap it, and the pin, ward and AI category are filled in. Works on any phone browser.</TileText>
            </Tile>
            <Tile className="lg:col-span-2" icon={<QrCode className="h-5 w-5" />}>
              <TileLabel>Public places</TileLabel>
              <TileTitle>Scan the QR on the bin</TileTitle>
              <TileText>Markets, stations and campuses print codes. Visitors report the exact spot, no app needed.</TileText>
            </Tile>
          </div>
        </div>
      </section>

      {/* 4 · Resolve: bento */}
      <section id="resolve" className={cn(SCREEN, "py-14 short:py-8")}>
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <SectionHead
            eyebrow="How it works · resolve"
            title="Routed, assigned and proven clean."
            text="Every organization answers for its own premises. The municipality sees everything, assigns field workers and watches the clock."
          />
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-6 lg:grid-rows-2">
            <Tile className="lg:col-span-2" icon={<MapPin className="h-5 w-5" />}>
              <TileLabel>Route</TileLabel>
              <TileTitle>Society first, city when needed</TileTitle>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] font-medium">
                <Chip>Resident</Chip>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Chip>Secretary</Chip>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Chip strong>Municipality</Chip>
              </div>
              <TileText>Pickups are batched per society, so the city gets one request, not two hundred.</TileText>
            </Tile>
            <Tile className="lg:col-span-4 lg:row-span-2" pad={false} plain>
              <BentoCard />
            </Tile>
            <Tile className="lg:col-span-2" icon={<ShieldCheck className="h-5 w-5" />}>
              <TileLabel>Verify</TileLabel>
              <TileTitle>Clean, or reopened</TileTitle>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-medium">
                <div className="flex h-14 items-end rounded-xl bg-[#d9cfc3] p-2 text-night dark:bg-[#3b3a44] dark:text-snow">Before</div>
                <div className="flex h-14 items-end rounded-xl bg-mint/60 p-2 text-night">After</div>
              </div>
              <TileText>Workers upload proof. The reporter confirms, or reopens it with a note.</TileText>
            </Tile>
          </div>
        </div>
      </section>

      {/* 5 · Audiences + CTA */}
      <section id="audiences" className={cn(SCREEN, "bg-muted/50 py-14 short:py-8")}>
        <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
          <SectionHead
            eyebrow="Who it's for"
            title="Built for every place that makes waste."
            text="One account works everywhere. Join your society with a code, your campus with your college email, and report anything on the street."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { i: Building2, t: "Societies", d: "Secretaries invite residents, handle internal issues and batch bulk pickups." },
              { i: GraduationCap, t: "Colleges", d: "Students join automatically with their college email. Hostels become units." },
              { i: Store, t: "Public places", d: "Markets, malls and stations put QR codes on bins for instant reports." },
              { i: Landmark, t: "Municipalities", d: "Verify organizations, assign workers, and track SLAs and hotspots by ward." },
            ].map(({ i: Icon, t, d }) => (
              <Tile key={t} icon={<Icon className="h-5 w-5" />}>
                <TileTitle>{t}</TileTitle>
                <TileText>{d}</TileText>
              </Tile>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-2xl bg-primary p-5 text-primary-foreground sm:flex-row sm:items-center sm:gap-6 sm:rounded-3xl sm:p-8 short:mt-4 short:p-6">
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase opacity-70">
                <Sparkles className="h-3.5 w-3.5" /> Free for residents
              </div>
              <div className="mt-2 text-[22px] leading-tight font-medium tracking-[-0.03em] sm:text-[26px]">
                Report your first issue in under a minute.
              </div>
            </div>
            <Link
              href={cta}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary-foreground px-5 py-2.5 text-sm font-semibold text-primary transition-transform hover:-translate-y-px sm:px-6 sm:py-3"
            >
              Get started <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10 short:mb-5">
      <div className="lg:flex-[1.2]">
        <div className="mb-3 font-mono text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
          {eyebrow}
        </div>
        <h2 className="font-sans text-[26px] leading-[1.1] font-medium tracking-[-0.04em] text-foreground sm:text-[30px] md:text-[40px] short:text-[34px]">
          {title}
        </h2>
      </div>
      <p className="max-w-[380px] text-[13px] leading-relaxed text-muted-foreground sm:text-[14px] lg:flex-1">{text}</p>
    </div>
  );
}

function Tile({
  children,
  className,
  icon,
  pad = true,
  plain = false,
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  pad?: boolean;
  plain?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-3xl",
        !plain && "overflow-hidden border border-border bg-card shadow-md",
        pad && "p-6 short:p-5",
        className,
      )}
    >
      {icon && (
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground short:mb-3">
          {icon}
        </span>
      )}
      {children}
    </div>
  );
}

function TileLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 font-mono text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase">{children}</div>;
}

function TileTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-[19px] leading-[1.3] font-semibold tracking-[-0.02em] text-foreground">{children}</h3>;
}

function TileText({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{children}</p>;
}

function Chip({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1",
        strong ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </span>
  );
}
