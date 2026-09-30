import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { WASTE_STREAMS, type WasteStream } from "@/lib/constants";
import { STREAM_GUIDE } from "@/lib/waste-guide";
import { cn } from "@/lib/utils";
import { BinClassifier, ItemSearch } from "./learn-client";

export const metadata: Metadata = { title: "Waste guide" };

export default function LearnPage() {
  return (
    <>
      <PageHeader
        label="Awareness"
        title="Segregate right, at the source"
        description="Mixed waste can't be recycled and ends up in landfills. Four bins, sorted at home, make collection work."
      />

      <BinClassifier />

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-bold tracking-[-0.03em]">The four streams</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(STREAM_GUIDE) as WasteStream[]).map((key) => {
            const s = WASTE_STREAMS[key];
            const g = STREAM_GUIDE[key];
            return (
              <Card key={key} className="p-6">
                <div className="flex items-center gap-3">
                  <span className={cn("h-9 w-9 rounded-full", s.swatch)} />
                  <div>
                    <div className="font-display text-lg font-bold tracking-[-0.02em]">{s.label}</div>
                    <div className="label-mono">{s.bin}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate">{g.what}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.examples.map((e) => (
                    <span key={e} className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-carbon">
                      {e}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <ul className="space-y-1.5">
                    {g.do.map((d) => (
                      <li key={d} className="flex gap-2 text-ink">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" /> {d}
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-1.5">
                    {g.dont.map((d) => (
                      <li key={d} className="flex gap-2 text-slate">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-coral" /> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-bold tracking-[-0.03em]">Which bin does it go in?</h2>
        <ItemSearch />
      </section>

      <section className="mt-10 rounded-[20px] bg-[image:var(--gradient-dark-fade)] p-8 text-snow sm:p-10">
        <div className="label-mono !text-haze">Why it matters</div>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          {[
            ["50%+", "of Indian city waste is wet, organic waste that can be composted"],
            ["4 bins", "wet, dry, hazardous and e-waste, as set by India's SWM Rules 2016"],
            ["1 photo", "is all it takes to report a problem to the right people"],
          ].map(([n, t]) => (
            <div key={n}>
              <div className="font-display text-[40px] leading-none font-bold tracking-[-0.04em] text-snow">{n}</div>
              <p className="mt-2 text-sm text-haze">{t}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
