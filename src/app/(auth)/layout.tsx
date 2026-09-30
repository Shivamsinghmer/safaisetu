import { Logo } from "@/components/logo";
import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-[image:var(--gradient-dark-fade)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo className="[&_span]:text-white" />
        <div className="max-w-md">
          <h2 className="font-display text-heading leading-[1.1] font-bold text-white">
            Every complaint, <span className="text-gradient-primary">tracked to clean.</span>
          </h2>
          <ul className="mt-8 space-y-3 text-[15px] text-fog">
            {[
              "Report in 20 seconds with a photo. AI fills in the rest.",
              "Your society, campus or city in one place.",
              "Before and after proof on every resolved ticket.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-mint" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="label-mono !text-slate">Built for Swachh cities · 2026</p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
