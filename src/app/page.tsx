import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  GraduationCap,
  Landmark,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink, Pill, StatusPill } from "@/components/ui";
import { getViewer } from "@/lib/session";

export default async function Landing() {
  const viewer = await getViewer();
  const cta = viewer ? "/app" : "/signup";

  return (
    <div className="bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-transparent bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {[
              ["How it works", "#flow"],
              ["Who it's for", "#audiences"],
              ["For municipalities", "#municipality"],
            ].map(([l, h]) => (
              <a key={h} href={h} className="rounded-full px-3 py-1 text-[15px] text-carbon hover:bg-black/4">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {viewer ? (
              <ButtonLink href="/app" size="sm">
                Open app
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
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

      {/* Hero */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-20">
        <div className="animate-rise">
          <Pill className="bg-violet/10 text-violet">
            <Sparkles className="h-3 w-3" /> AI-tagged reports · live tracking
          </Pill>
          <h1 className="mt-5 font-display text-[44px] leading-[1.02] font-extrabold tracking-[-0.045em] text-onyx sm:text-[64px] lg:text-display">
            Every bin, <br />
            every street, <br />
            <span className="text-gradient-primary">tracked to clean.</span>
          </h1>
          <ul className="mt-7 space-y-2.5 text-[16px]">
            {[
              ["Report in 20 seconds.", "Snap a photo. AI fills in the category and severity."],
              ["Routed to the right desk.", "Your society, campus or the municipality."],
              ["Proof, not promises.", "Before and after photos on every resolved ticket."],
            ].map(([b, t]) => (
              <li key={b} className="flex gap-2.5">
                <Check className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue" strokeWidth={2.5} />
                <span>
                  <b className="font-semibold text-ink">{b}</b> <span className="text-slate">{t}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <span className="ring-rainbow rounded-full">
              <Link
                href={cta}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 font-display text-[15px] font-bold text-white"
              >
                Get started. It&apos;s free <ArrowRight className="h-4 w-4" />
              </Link>
            </span>
            <ButtonLink href="/login" variant="secondary" size="lg">
              Try the demo
            </ButtonLink>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              [Building2, "Societies"],
              [GraduationCap, "Colleges"],
              [Store, "Public places"],
              [Landmark, "Municipalities"],
            ].map(([Icon, l]) => {
              const I = Icon as typeof Building2;
              return (
                <span key={l as string} className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3.5 py-1.5 text-sm font-bold text-ink">
                  <I className="h-4 w-4 text-slate" /> {l as string}
                </span>
              );
            })}
          </div>
        </div>

        <ProductMock />
      </section>

      {/* Problem strip */}
      <section className="border-y border-bone bg-mist">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
          {[
            ["Overflowing bins & missed pickups", "Collection runs on phone calls and registers. Problems stay invisible until they pile up."],
            ["No way to report or follow up", "Residents don't know who to tell, and never hear back once they do."],
            ["No data at the top", "Municipalities can't see hotspots, response times or which areas keep failing."],
          ].map(([t, d], i) => (
            <div key={t}>
              <div className="label-mono">Problem 0{i + 1}</div>
              <h3 className="mt-2 font-display text-xl font-bold tracking-[-0.03em]">{t}</h3>
              <p className="mt-2 text-[15px] text-slate">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section id="flow" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <div className="label-mono">How it works</div>
          <h2 className="mt-3 font-display text-[36px] leading-[1.1] font-bold tracking-[-0.04em] sm:text-heading">
            From photo to clean street, with every step on record.
          </h2>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {[
            [Camera, "Report", "Photo, auto GPS, and AI-suggested category. Or scan a QR code on the bin."],
            [MapPin, "Route", "Inside a society or campus it goes to that admin. On public roads it goes to the ward's municipality."],
            [Truck, "Resolve", "The municipality assigns a field worker, who cleans up and uploads an after photo."],
            [ShieldCheck, "Verify", "The reporter confirms it's clean or reopens it. Past-SLA tickets are flagged red."],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof Camera;
            return (
              <li key={t as string} className="rounded-xl border border-bone p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white">
                    <I className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-sm text-fog">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-display text-lg font-bold tracking-[-0.02em]">{t as string}</h3>
                <p className="mt-1.5 text-[15px] text-slate">{d as string}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Audiences */}
      <section id="audiences" className="bg-plaster/60">
        <div className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
          <div className="label-mono">Who it&apos;s for</div>
          <h2 className="mt-3 max-w-2xl font-display text-[36px] leading-[1.1] font-bold tracking-[-0.04em] sm:text-heading">
            One platform. Every place that makes waste.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {[
              [Building2, "Residential societies", "The secretary registers the society and invites residents by email or a 6-letter code. Internal issues stay internal. Bulk pickups go to the municipality as one batch."],
              [GraduationCap, "Colleges & campuses", "Students join automatically with their college email. Hostels and buildings become units, and QR codes on campus bins take reports straight to facilities."],
              [Store, "Public places", "Markets, malls, stations and parks print QR codes for their bins. Visitors scan to report. No app install needed."],
              [Landmark, "Municipalities", "Verify organizations, assign field workers, watch SLAs and see hotspots ward by ward on a live map."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Building2;
              return (
                <div key={t as string} className="rounded-[20px] bg-white p-7">
                  <I className="h-6 w-6 text-violet" />
                  <h3 className="mt-4 font-display text-xl font-bold tracking-[-0.03em]">{t as string}</h3>
                  <p className="mt-2 text-[15px] text-slate">{d as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Municipality dark panel */}
      <section id="municipality" className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <div className="grid gap-10 rounded-[20px] bg-[image:var(--gradient-dark-fade)] p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <div className="label-mono !text-fog">For the municipality</div>
            <h2 className="mt-3 font-display text-[34px] leading-[1.1] font-bold tracking-[-0.04em] text-white sm:text-heading">
              See the whole city&apos;s waste in one place.
            </h2>
            <p className="mt-4 max-w-md text-fog">
              Every society, campus and public place in your region, with complaint hotspots, SLA breaches, worker load
              and resolution times. Live.
            </p>
            <ButtonLink href="/login" variant="secondary" size="lg" className="mt-8 border-0">
              Open the officer demo
            </ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Hotspot heatmap", "Ward-level density of open complaints"],
              ["SLA tracking", "24h / 48h / 72h by severity, auto-flagged"],
              ["Org verification", "Approve societies, colleges, public places"],
              ["Worker assignment", "Before and after proof on every task"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
                <div className="font-display font-bold text-white">{t}</div>
                <div className="mt-1 text-sm text-fog">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-bone">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="text-sm text-ash">Built for cleaner cities · Hackathon 2026</p>
        </div>
      </footer>
    </div>
  );
}

/** Product UI mock, built from the real components, shown instead of a screenshot. */
function ProductMock() {
  const rows = [
    { code: "SS-1042", t: "Overflowing bin", where: "Green Valley Residency · B-Block gate", s: "in_progress" as const, sev: "bg-coral" },
    { code: "SS-1041", t: "Illegal dumping", where: "Ward 7 · Near Habibganj drain", s: "assigned" as const, sev: "bg-coral" },
    { code: "SS-1039", t: "Missed collection", where: "Lakeview Apartments", s: "submitted" as const, sev: "bg-amber" },
    { code: "SS-1036", t: "E-waste pickup", where: "Institute Campus · Hostel 3", s: "resolved" as const, sev: "bg-teal" },
  ];
  return (
    <div className="relative animate-rise [animation-delay:120ms]">
      <div className="overflow-hidden rounded-2xl border border-bone bg-white shadow-product">
        <div className="flex items-center gap-1.5 border-b border-bone bg-mist px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cloud" />
          <span className="h-2.5 w-2.5 rounded-full bg-cloud" />
          <span className="h-2.5 w-2.5 rounded-full bg-cloud" />
          <span className="ml-3 font-mono text-[11px] text-ash">safaisetu.app/muni</span>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {[
            ["Open", "38", ""],
            ["Past SLA", "4", "text-coral"],
            ["Avg resolution", "19h", ""],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-xl border border-bone p-3">
              <div className="label-mono !text-[9px]">{l}</div>
              <div className={`mt-1 font-display text-2xl font-bold tracking-[-0.04em] text-onyx ${c}`}>{v}</div>
            </div>
          ))}
        </div>
        <ul className="divide-y divide-bone border-t border-bone">
          {rows.map((r) => (
            <li key={r.code} className="flex items-center gap-3 px-4 py-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${r.sev}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-ash">{r.code}</span>
                  <span className="truncate text-sm font-bold text-ink">{r.t}</span>
                </div>
                <div className="truncate text-xs text-slate">{r.where}</div>
              </div>
              <StatusPill status={r.s} />
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-6 -left-4 hidden w-60 rounded-xl border border-bone bg-white p-3.5 shadow-float sm:block">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet" />
          <span className="label-mono">AI triage</span>
        </div>
        <div className="mt-1.5 text-sm font-semibold text-ink">Overflowing bin · high severity</div>
        <div className="mt-0.5 text-xs text-slate">Waste spilling onto the footpath near the gate.</div>
      </div>
      <div className="absolute -top-5 -right-3 hidden items-center gap-2 rounded-full border border-bone bg-white px-3 py-2 shadow-float sm:flex">
        <QrCode className="h-4 w-4 text-ink" />
        <span className="text-xs font-bold text-ink">Scanned at Gate 2</span>
      </div>
    </div>
  );
}
