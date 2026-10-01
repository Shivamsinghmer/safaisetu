"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

function SceneSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-[46%] w-[60%] animate-pulse rounded-[28%] bg-muted" />
    </div>
  );
}

// three.js only runs in the browser; keep it out of the server bundle
const Scene = dynamic(() => import("./scene"), { ssr: false, loading: SceneSkeleton });

const REDUCE = "(prefers-reduced-motion: reduce)";
function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Interactive low-poly city block: a municipal truck on its collection round,
 * sanitation workers and segregated bins. Renders only while on screen.
 */
export function CityScene({ className }: { className?: string }) {
  const { t, locale } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Scene active={inView} reduced={reduced} locale={locale} />
      <div className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/85 px-3 py-1 text-[12px] text-muted-foreground backdrop-blur">
        <MousePointer2 className="h-3.5 w-3.5" /> {t("Drag to explore · hover the truck or a worker")}
      </div>
    </div>
  );
}
