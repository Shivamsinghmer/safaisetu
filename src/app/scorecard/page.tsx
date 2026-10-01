import type { Metadata } from "next";
import Link from "@/components/nav-link";
import { ArrowLeft, Star } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { cn, formatHours } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ward scorecard",
  description: "How fast each ward clears waste complaints: open, overdue, resolved and average fix time.",
};

// Aggregates change as tickets move; refresh at most every 5 minutes
export const revalidate = 300;

interface Row {
  municipality: string;
  city: string;
  ward_id: string;
  ward: string;
  code: string;
  open: number;
  overdue: number;
  resolved_30d: number;
  avg_hours_30d: number | null;
  avg_rating: number | null;
}

/** Public transparency page: per-ward numbers only, never individual tickets or people. */
export default async function ScorecardPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_ward_scorecard");
  const rows = (data ?? []) as Row[];
  const cities = [...new Set(rows.map((r) => `${r.municipality}|${r.city}`))];

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex w-full max-w-[1000px] items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-[1000px] px-4 pb-16 sm:px-6">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> SafaiSetu
        </Link>
        <p className="label-mono">Public · updated every few minutes</p>
        <h1 className="mt-2 font-display text-[32px] leading-tight font-bold tracking-[-0.035em] sm:text-[40px]">Ward scorecard</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-slate">
          How each ward is doing on waste complaints. Overdue means a complaint has passed its deadline (24 to 72 hours,
          by severity) without being fixed.
        </p>

        {cities.map((c) => {
          const [municipality, city] = c.split("|");
          const wards = rows
            .filter((r) => r.municipality === municipality)
            .sort((a, b) => b.overdue - a.overdue || b.open - a.open);
          return (
            <section key={c} className="mt-10">
              <h2 className="font-display text-xl font-bold tracking-[-0.02em]">
                {city} <span className="text-base font-normal text-slate">· {municipality}</span>
              </h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-bone bg-card">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-bone text-left">
                      {["Ward", "Open", "Overdue", "Resolved (30 days)", "Avg fix time", "Citizen rating"].map((h) => (
                        <th key={h} className="label-mono px-4 py-3 font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bone">
                    {wards.map((w) => (
                      <tr key={w.ward_id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">{w.ward}</div>
                          <div className="font-mono text-[11px] text-ash">{w.code}</div>
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">{w.open}</td>
                        <td className={cn("px-4 py-3 font-mono tabular-nums", w.overdue > 0 && "font-semibold text-coral")}>
                          {w.overdue}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">{w.resolved_30d}</td>
                        <td className="px-4 py-3 font-mono tabular-nums">{formatHours(w.avg_hours_30d ?? NaN)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {w.avg_rating ? (
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Star className="h-3.5 w-3.5 fill-amber text-amber" /> {w.avg_rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-ash">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        {!rows.length && <p className="mt-10 text-slate">No wards yet.</p>}
      </main>
    </div>
  );
}
