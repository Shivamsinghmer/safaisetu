"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OverviewMap, type MapOrg, type MapTicket } from "@/components/maps";
import { cn } from "@/lib/utils";

export function MapPanel({ tickets, orgs }: { tickets: MapTicket[]; orgs: MapOrg[] }) {
  const [mode, setMode] = useState<"heat" | "pins">("heat");
  const [showOrgs, setShowOrgs] = useState(true);
  const router = useRouter();

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-[500] flex gap-2">
        <div className="flex rounded-full border border-bone bg-white/95 p-0.5 shadow-subtle backdrop-blur">
          {(["heat", "pins"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                "h-7 cursor-pointer rounded-full px-3 text-[12px] font-bold",
                mode === m ? "bg-ink text-white" : "text-carbon hover:bg-black/4",
              )}
            >
              {m === "heat" ? "Hotspots" : "Complaints"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowOrgs((s) => !s)}
          aria-pressed={showOrgs}
          className={cn(
            "h-8 cursor-pointer rounded-full border px-3 text-[12px] font-bold shadow-subtle",
            showOrgs ? "border-blue bg-white text-blue" : "border-bone bg-white/95 text-carbon",
          )}
        >
          Organizations
        </button>
      </div>
      <OverviewMap
        tickets={tickets}
        orgs={showOrgs ? orgs : []}
        heat={mode === "heat"}
        height={440}
        onSelect={(id) => router.push(`/app/tickets/${id}`)}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-bone px-4 py-2.5 text-[11px] text-slate">
        {mode === "heat" ? (
          <>
            <span className="label-mono">Density</span>
            <span className="h-2 w-28 rounded-full bg-[linear-gradient(90deg,#6ee7b7,#fd9a46,#fc6d7b,#fa24ce)]" />
            <span>low → high (open tickets weigh more)</span>
          </>
        ) : (
          [
            ["#838383", "Submitted"],
            ["#6647f0", "Assigned"],
            ["#0091ff", "In progress"],
            ["#00c07a", "Resolved"],
            ["#fa24ce", "Reopened"],
          ].map(([c, l]) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: c }} />
              {l}
            </span>
          ))
        )}
        {showOrgs && (
          <span className="ml-auto inline-flex items-center gap-3">
            {[
              ["#6647f0", "Society"],
              ["#0091ff", "College"],
              ["#fd9a46", "Public place"],
            ].map(([c, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] border-2 bg-white" style={{ borderColor: c }} />
                {l}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
