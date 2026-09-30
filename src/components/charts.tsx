"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const INK_MUTED = "#838383";
const GRID = "#eeeeee";

function TooltipBox({ title, rows }: { title: string; rows: [string, string | number][] }) {
  return (
    <div className="rounded-[9px] border border-bone bg-white px-3 py-2 text-xs shadow-float">
      <div className="mb-1 font-semibold text-ink">{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-slate">
          <span>{k}</span>
          <span className="font-mono text-ink tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Daily complaint volume: new reports as bars, resolved shown in the tooltip only. */
export function DailyVolumeChart({ data }: { data: { day: string; label: string; reported: number; resolved: number }[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap={3}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: INK_MUTED }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: INK_MUTED }} width={48} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={payload[0]!.payload.day}
                  rows={[
                    ["Reported", payload[0]!.payload.reported],
                    ["Resolved", payload[0]!.payload.resolved],
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="reported" fill="#202020" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal magnitude bars in plain HTML: category breakdown, single hue, direct-labeled. */
export function BreakdownBars({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${r.value}${r.sub ? ` · ${r.sub}` : ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-carbon">{r.label}</span>
            <span className="font-mono text-ink tabular-nums">
              {r.value}
              {r.sub && <span className="ml-1.5 text-ash">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-mist">
            <div
              className="h-2 rounded-full bg-blue transition-[width] duration-500 ease-settle group-hover:bg-ink"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
