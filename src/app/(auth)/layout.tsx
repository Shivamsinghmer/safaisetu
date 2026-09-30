import {
  Building2,
  Camera,
  Check,
  GraduationCap,
  Landmark,
  MapPin,
  Store,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { DemoRolesPanel } from "./demo-roles";

const STEPS = [
  { label: "Reported", meta: "Photo + pin" },
  { label: "Assigned", meta: "Ward 12 crew" },
  { label: "In progress", meta: "On site" },
  { label: "Resolved", meta: "After photo" },
] as const;

const AUDIENCES = [
  { icon: Building2, label: "Societies" },
  { icon: GraduationCap, label: "Campuses" },
  { icon: Store, label: "Public places" },
  { icon: Landmark, label: "Municipality" },
] as const;

/**
 * Left: a fixed-dark brand panel that previews the product (a complaint moving
 * through its lifecycle) and, on wide screens, the one-click demo accounts.
 * Right: the form, themed with the rest of the app.
 */
function BrandPanel() {
  return (
    <aside className="sticky top-0 hidden h-dvh overflow-hidden bg-[oklch(0.22_0.035_140)] text-snow lg:block">
      {/* Quiet texture: dot grid fading out + a soft green glow behind the preview */}
      <div
        aria-hidden
        className="absolute inset-0 [mask-image:radial-gradient(120%_80%_at_20%_0%,black,transparent_75%)] bg-[radial-gradient(rgb(255_255_255/0.09)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div
        aria-hidden
        className="absolute -right-24 bottom-10 h-[420px] w-[420px] rounded-full bg-[#3f7a28] opacity-40 blur-[120px]"
      />

      <div className="relative flex h-full flex-col justify-between gap-8 p-12 tight:p-10 xl:p-16 xl:tight:p-10">
        <Logo className="[&_span]:text-snow" />

        <div className="flex items-center justify-between gap-14">
          <div className="max-w-[460px] min-w-0 flex-1">
            <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-mint uppercase">
              Waste management, end to end
            </p>
            <h2 className="mt-4 font-display text-[40px] leading-[1.08] font-bold tracking-[-0.03em] text-snow xl:text-[46px]">
              Every complaint,
              <br />
              tracked to clean.
            </h2>
            <p className="mt-4 max-w-[400px] text-[15px] leading-relaxed text-snow/65 tight:hidden">
              Residents report with a photo, the right crew is assigned
              automatically, and nothing closes without proof.
            </p>

            {/* Product preview */}
            <div className="mt-10 rounded-2xl border tight:mt-6 border-snow/10 bg-snow/[0.045] p-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)] backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-snow/[0.07] ring-1 ring-snow/10">
                  <Camera className="h-[18px] w-[18px] text-mint" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[15px] font-semibold text-snow">
                      Overflowing bin near Gate 2
                    </span>
                    <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-semibold text-mint">
                      Resolved
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-snow/50">
                    <span className="font-mono">SS-1042</span>
                    <span aria-hidden>·</span>
                    <MapPin className="h-3 w-3" aria-hidden />
                    <span className="truncate">Green Valley Society</span>
                  </div>
                </div>
              </div>

              <ol className="mt-5 grid grid-cols-4 gap-2">
                {STEPS.map((s) => (
                  <li key={s.label} className="min-w-0">
                    <div className="flex items-center">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3f7a28] ring-2 ring-[#3f7a28]/30">
                        <Check
                          className="h-3 w-3 text-snow"
                          strokeWidth={3}
                          aria-hidden
                        />
                      </span>
                      <span
                        aria-hidden
                        className="ml-1.5 h-px flex-1 bg-[#3f7a28]/70"
                      />
                    </div>
                    <div className="mt-2 truncate text-[12px] font-semibold text-snow/85">
                      {s.label}
                    </div>
                    <div className="truncate text-[11px] text-snow/45">
                      {s.meta}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Wide screens: the demo accounts fill the panel's empty right side (the form column hides its copy) */}
          <div className="hidden 2xl:block">
            <DemoRolesPanel />
          </div>
        </div>

        <div>
          <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-snow/40 uppercase">
            One platform for
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {AUDIENCES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-snow/10 bg-snow/[0.04] px-3 py-1.5 text-[13px] text-snow/75"
              >
                <Icon className="h-3.5 w-3.5 text-mint" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
      <BrandPanel />
      <main className="flex min-w-0 flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 lg:pt-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-8 sm:py-10 tight:py-4">
          {children}
        </div>
        <p className="text-center text-xs text-ash">
          Built for Swachh Bharat cities ·{" "}
          <span className="font-mono">2026</span>
        </p>
      </main>
    </div>
  );
}
