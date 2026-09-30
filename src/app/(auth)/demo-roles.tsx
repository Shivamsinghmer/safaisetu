import {
  ArrowRight,
  Building2,
  GraduationCap,
  HardHat,
  Landmark,
  PlayCircle,
  User,
} from "lucide-react";
import { demoSignInAction } from "@/app/actions/auth";

// Seeded demo accounts (scripts/seed.ts); `role` is what demoSignInAction expects
const DEMOS = [
  {
    role: "citizen",
    short: "Citizen",
    label: "Citizen",
    desc: "Report issues, request pickups",
    icon: User,
  },
  {
    role: "secretary",
    short: "Society admin",
    label: "Society secretary",
    desc: "Manage members and society tickets",
    icon: Building2,
  },
  {
    role: "college",
    short: "Campus admin",
    label: "Campus manager",
    desc: "Run a college or institute",
    icon: GraduationCap,
  },
  {
    role: "municipality",
    short: "Municipal officer",
    label: "Municipal officer",
    desc: "Monitor wards, assign crews",
    icon: Landmark,
  },
  {
    role: "worker",
    short: "Field worker",
    label: "Field worker",
    desc: "Clear tasks with proof photos",
    icon: HardHat,
  },
] as const;

/** Brand-panel version: always-dark surface, full rows with descriptions. */
export function DemoRolesPanel() {
  return (
    <section
      aria-labelledby="demo-panel-heading"
      className="w-[360px] shrink-0"
    >
      <h2
        id="demo-panel-heading"
        className="flex items-center gap-2 text-[15px] font-semibold text-snow"
      >
        <PlayCircle className="h-4 w-4 text-mint" aria-hidden />
        Just exploring? Try a demo account
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-snow/55">
        Pick a role to sign in instantly with sample data. No sign-up or
        password needed.
      </p>
      <form action={demoSignInAction} className="mt-4">
        <ul className="overflow-hidden rounded-2xl border border-snow/10 bg-snow/[0.035] backdrop-blur-sm">
          {DEMOS.map(({ role, label, desc, icon: Icon }) => (
            <li
              key={role}
              className="border-b border-snow/[0.07] last:border-b-0"
            >
              <button
                name="role"
                value={role}
                aria-label={`Sign in as demo ${label}. ${desc}`}
                className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-snow/[0.06] focus-visible:bg-snow/[0.06] focus-visible:outline-none tight:py-2.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-snow/[0.07] text-snow/70 ring-1 ring-snow/10 transition-colors group-hover:bg-[#3f7a28] group-hover:text-snow">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-snow">
                    {label}
                  </span>
                  <span className="block truncate text-xs text-snow/50">
                    {desc}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-snow/30 transition-all group-hover:translate-x-0.5 group-hover:text-mint"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </form>
    </section>
  );
}

/**
 * Form-column version: compact row of five tiles. Shown below 1536px (2xl); wider screens
 * show DemoRolesPanel in the brand panel instead (see (auth)/layout.tsx).
 */
export function DemoRolesTiles({ next }: { next?: string }) {
  return (
    <section
      className="rounded-2xl border border-bone bg-mist/60 p-4"
      aria-labelledby="demo-heading"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <PlayCircle className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div>
          <h2 id="demo-heading" className="text-sm font-semibold text-ink">
            Just exploring? Try a demo account
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate">
            Pick a role to sign in instantly with sample data. No sign-up or
            password needed.
          </p>
        </div>
      </div>
      <form action={demoSignInAction} className="mt-3.5">
        <input type="hidden" name="next" value={next ?? ""} />
        <ul className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {DEMOS.map(({ role, short, label, desc, icon: Icon }) => (
            <li key={role} className="min-w-0">
              <button
                name="role"
                value={role}
                title={`Sign in as ${label}: ${desc}`}
                aria-label={`Sign in as demo ${label}. ${desc}`}
                className="group flex h-full w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-bone bg-card px-1 pt-2.5 pb-2 transition-colors hover:border-brand/50 focus-visible:border-brand focus-visible:outline-none"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-slate transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-center text-[11px] leading-tight font-semibold text-carbon group-hover:text-ink">
                  {short}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </form>
    </section>
  );
}
