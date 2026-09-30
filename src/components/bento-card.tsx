"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Building03Icon,
  CircleArrowUpRight02Icon,
  Clock01Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  GarbageTruckIcon,
  Mortarboard01Icon,
  Store01Icon,
  Tick01Icon,
  UserGroupIcon,
  UserIcon,
  WasteIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

// Adapted from @uselayouts/bento-card: a miniature of the SafaiSetu municipal dashboard

interface TabConfig {
  id: string;
  label: string;
  icon: typeof DashboardSquare01Icon;
  badge?: string;
  header: string;
  description: string;
}

const TABS: TabConfig[] = [
  { id: "overview", label: "Overview", icon: DashboardSquare01Icon, header: "City overview", description: "Last 30 days across 6 wards." },
  { id: "queue", label: "Complaints", icon: WasteIcon, badge: "7", header: "Needs assignment", description: "Most severe and oldest first." },
  { id: "orgs", label: "Organizations", icon: Building03Icon, badge: "1", header: "Verified organizations", description: "Societies, campuses, public places." },
  { id: "workers", label: "Workers", icon: UserGroupIcon, header: "Field workers", description: "Live task load and proof photos." },
];

const BentoCard = ({
  label = "Municipal dashboard",
  title = "Every society, campus and street in one live view.",
  className,
}: {
  label?: string;
  title?: string;
  className?: string;
}) => {
  const [activeTab, setActiveTab] = useState(TABS[0]!);

  const content = useMemo(() => {
    switch (activeTab.id) {
      case "overview":
        return <OverviewPanel />;
      case "queue":
        return <QueuePanel />;
      case "orgs":
        return <OrgsPanel />;
      case "workers":
        return <WorkersPanel />;
      default:
        return null;
    }
  }, [activeTab.id]);

  return (
    <div className={cn("flex h-full w-full items-center justify-center antialiased", className)}>
      <div className="group relative h-full w-full overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-primary/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-primary/10">
        <div className="relative z-10 space-y-1.5 p-5 sm:p-6">
          <h2 className="font-mono text-xs text-muted-foreground uppercase">{label}</h2>
          <p className="max-w-[480px] text-base leading-snug font-medium text-foreground sm:text-lg md:text-2xl">{title}</p>
        </div>

        <div className="relative h-[220px] w-full overflow-hidden rounded-xl sm:h-[260px] sm:rounded-2xl md:h-[300px] md:rounded-[2rem]">
          <div className="absolute top-12 left-8 h-full w-full rounded-3xl border border-border/50 bg-muted opacity-80 sm:top-16 sm:left-16" />

          <div className="absolute top-4 left-4 flex h-full w-full flex-col overflow-hidden rounded-tl-2xl bg-background shadow-xl ring-4 ring-border sm:top-8 sm:left-10 sm:rounded-tl-3xl sm:ring-6 md:left-24">
            <div className="relative flex items-center rounded-tl-2xl border-b border-border/70 px-3 py-2.5 backdrop-blur-sm sm:rounded-tl-3xl sm:px-5 sm:py-4">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
                <span className="text-xs text-muted-foreground/50 uppercase">safaisetu · muni</span>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="hidden w-28 flex-col gap-1 border-r border-border/30 bg-muted/5 p-2 pt-6 sm:flex sm:w-36">
                <LayoutGroup>
                  {TABS.map((tab) => {
                    const isActive = activeTab.id === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "relative flex cursor-pointer items-center gap-1.5 rounded-xl p-2 text-xs transition-colors",
                          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <HugeiconsIcon icon={tab.icon} size={14} className="relative z-20 shrink-0" />
                        <span className="relative z-20 truncate font-medium">{tab.label}</span>
                        {tab.badge && (
                          <span
                            className={cn(
                              "relative z-20 ml-auto rounded-md px-1 py-0.5 text-[8px] leading-none tabular-nums transition-all",
                              isActive
                                ? "border border-primary/20 bg-primary/10 text-primary dark:text-foreground"
                                : "border border-transparent bg-muted text-muted-foreground",
                            )}
                          >
                            {tab.badge}
                          </span>
                        )}
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-pill"
                            className="absolute left-0 z-30 h-4 w-[2px] rounded-full border border-primary/20 bg-primary"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        {isActive && (
                          <motion.div
                            layoutId="backgroundIndicator"
                            className="absolute inset-0 rounded-lg border border-border/40 bg-muted"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </LayoutGroup>
              </div>

              <div className="relative flex flex-1 flex-col gap-4 overflow-hidden bg-background p-5 pt-6">
                <header className="flex flex-col gap-0.5">
                  <h3 className="line-clamp-1 text-xs font-semibold tracking-tight text-foreground uppercase opacity-60">
                    {activeTab.header}
                  </h3>
                  <p className="line-clamp-1 text-[10px] leading-tight font-normal text-muted-foreground">
                    {activeTab.description}
                  </p>
                </header>

                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={activeTab.id}
                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                    className="flex-1"
                  >
                    {content}
                  </motion.div>
                </AnimatePresence>

                <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 h-10 bg-linear-to-t from-background to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoCard;

const OverviewPanel = () => (
  <div className="flex h-full flex-col gap-3">
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-linear-to-br from-background to-muted/20 p-3.5">
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-medium text-muted-foreground">Resolved within SLA</span>
          <HugeiconsIcon icon={CircleArrowUpRight02Icon} size={12} className="text-primary dark:text-foreground" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-medium tracking-tight text-foreground">86.4%</span>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div initial={{ width: 0 }} animate={{ width: "86.4%" }} className="h-full rounded-full bg-primary dark:bg-chart-1" />
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground">Average resolution 19h · 4 past SLA</span>
      </div>
      <div className="absolute -right-2 -bottom-2 scale-150 rotate-12 opacity-5">
        <HugeiconsIcon icon={WasteIcon} size={64} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[
        { v: "38", l: "Open", icon: Alert02Icon },
        { v: "173", l: "This month", icon: Clock01Icon },
      ].map((s) => (
        <div key={s.l} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 p-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-foreground">{s.v}</span>
            <span className="text-[8px] font-medium text-muted-foreground uppercase">{s.l}</span>
          </div>
          <HugeiconsIcon icon={s.icon} size={14} className="opacity-20" />
        </div>
      ))}
    </div>
  </div>
);

const QueuePanel = () => (
  <div className="flex h-full flex-col">
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/40 bg-background/50">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-2">
        <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">Unassigned</span>
        <span className="rounded-md border border-border/40 bg-background px-1.5 py-0.5 text-[8px] font-medium text-muted-foreground">
          All wards
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-1">
        {[
          { t: "Illegal dumping", w: "Ward 31 · Habibganj", sev: "bg-coral" },
          { t: "Overflowing bin", w: "Ward 12 · MP Nagar", sev: "bg-coral" },
          { t: "Missed collection", w: "Ward 19 · Arera Colony", sev: "bg-amber" },
        ].map((r) => (
          <div key={r.t} className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/30">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-border/40 bg-muted">
              <HugeiconsIcon icon={Delete02Icon} size={10} className="text-muted-foreground" />
              <div className={cn("absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border border-background", r.sev)} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[10px] font-medium text-foreground">{r.t}</span>
              <span className="truncate text-[8px] text-muted-foreground">{r.w}</span>
            </div>
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[8px] font-semibold text-primary-foreground">Assign</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const OrgsPanel = () => (
  <div className="flex h-full flex-col gap-2">
    {[
      { n: "Green Valley Residency", t: "Society · 240 flats", icon: Building03Icon, s: "Verified", ok: true },
      { n: "Demo Institute of Technology", t: "College · @demo-institute.edu.in", icon: Mortarboard01Icon, s: "Verified", ok: true },
      { n: "Sunrise Heights", t: "Society · awaiting review", icon: Store01Icon, s: "Review", ok: false },
    ].map((o) => (
      <div key={o.n} className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/50 p-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/40 bg-muted/50 text-muted-foreground">
          <HugeiconsIcon icon={o.icon} size={12} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[10px] font-medium text-foreground">{o.n}</span>
          <span className="truncate text-[8px] text-muted-foreground">{o.t}</span>
        </div>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[8px] font-semibold",
            o.ok ? "bg-emerald/15 text-emerald" : "bg-amber/15 text-amber",
          )}
        >
          {o.s}
        </span>
      </div>
    ))}
  </div>
);

const WorkersPanel = () => (
  <div className="flex h-full flex-col gap-2">
    {[
      { n: "Ramesh Yadav", a: 3, d: 41 },
      { n: "Sunita Bai", a: 2, d: 37 },
      { n: "Imran Khan", a: 4, d: 29 },
    ].map((w) => (
      <div key={w.n} className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/50 p-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/40 bg-muted">
          <HugeiconsIcon icon={UserIcon} size={10} className="text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[10px] font-medium text-foreground">{w.n}</span>
          <span className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <HugeiconsIcon icon={GarbageTruckIcon} size={9} /> {w.a} active
            <HugeiconsIcon icon={Tick01Icon} size={9} className="ml-1" /> {w.d} resolved
          </span>
        </div>
      </div>
    ))}
  </div>
);
