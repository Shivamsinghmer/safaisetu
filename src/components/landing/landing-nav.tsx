"use client";

import { useEffect, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { cn } from "@/lib/utils";

const LINKS = [
  { id: "flow", label: "How it works" },
  { id: "resolve", label: "For municipalities" },
  { id: "audiences", label: "Who it's for" },
] as const;

/**
 * Landing nav with one shared highlight pill that glides to the hovered link,
 * and otherwise rests on the section currently in view. Clicks scroll smoothly.
 */
export function LandingNav() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [inView, setInView] = useState<string | null>(null);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setInView(visible.target.id);
        else if (window.scrollY < window.innerHeight * 0.5) setInView(null);
      },
      { threshold: [0.35, 0.6] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const active = hovered ?? inView;

  return (
    <LayoutGroup id="landing-nav">
      <nav className="hidden items-center gap-1 md:flex" onMouseLeave={() => setHovered(null)}>
        {LINKS.map((l) => {
          const on = active === l.id;
          return (
            <a
              key={l.id}
              href={`#${l.id}`}
              onMouseEnter={() => setHovered(l.id)}
              onFocus={() => setHovered(l.id)}
              onBlur={() => setHovered(null)}
              onClick={(e) => {
                const el = document.getElementById(l.id);
                if (!el) return;
                e.preventDefault();
                const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                history.replaceState(null, "", `#${l.id}`);
              }}
              aria-current={inView === l.id ? "true" : undefined}
              className={cn(
                "relative isolate rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300",
                on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {on && (
                <motion.span
                  layoutId="landing-nav-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-muted"
                  transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
                />
              )}
              {l.label}
            </a>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
