"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AsciiFluid } from "@/components/ui/ascii-fluid";

// The fluid engine takes hex colors, the theme is oklch: resolve through a canvas.
function cssColorToHex(css: string): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (a === 0) return null;
  return `#${[r, g, b].map((n) => (n ?? 0).toString(16).padStart(2, "0")).join("")}`;
}

function resolveVar(expr: string): string | null {
  const probe = document.createElement("span");
  probe.style.color = expr;
  // Unsupported expression (e.g. color-mix on old browsers): assignment is ignored.
  if (!probe.style.color) return null;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return cssColorToHex(computed);
}

// Single external store: snapshot flips on light/dark toggles AND on
// compiled-CSS swaps (Tailwind HMR), so editing the theme re-resolves the
// trail instead of reusing the stale pre-edit color.
let rev = 0;
const revListeners = new Set<() => void>();
let observersStarted = false;

function bumpRev() {
  rev += 1;
  revListeners.forEach((l) => l());
}

function startObservers() {
  if (observersStarted || typeof document === "undefined") return;
  observersStarted = true;
  let headTimer: ReturnType<typeof setTimeout> | undefined;
  const htmlObserver = new MutationObserver(bumpRev);
  htmlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
  // Tailwind HMR swaps compiled CSS in <style> tags without touching <html>.
  const headObserver = new MutationObserver(() => {
    clearTimeout(headTimer);
    headTimer = setTimeout(bumpRev, 120);
  });
  if (document.head) {
    headObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

function subscribe(onChange: () => void) {
  startObservers();
  revListeners.add(onChange);
  return () => {
    revListeners.delete(onChange);
  };
}
const getSnapshot = () =>
  `${typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? 1 : 0}:${rev}`;
const getServerSnapshot = () => "0:0";

function readThemeColors(dark: boolean): {
  paper: string;
  ink: string;
  glow: string;
} | null {
  const paper = resolveVar("var(--background)");
  // Trail matches the theme's primary action color (headline "one photo.",
  // "Get started" CTA). Light: solid primary green. Dark: primary lifted
  // toward white so glyphs stay legible on the dark paper.
  const primary = resolveVar("var(--primary)");
  const chart = resolveVar("var(--chart-1)");
  const lightInk =
    primary ?? chart ?? resolveVar("var(--ring)") ?? resolveVar("var(--link)");
  const darkInk =
    resolveVar("color-mix(in oklab, var(--chart-1) 78%, white)") ??
    resolveVar("color-mix(in oklab, var(--primary) 78%, white)") ??
    chart ??
    primary;
  const ink = dark ? darkInk : lightInk;
  if (!paper || !ink) return null;
  return { paper, ink, glow: ink };
}

/** ASCII fluid background for the hero, colored from the active theme. */
export function HeroFluid() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dark = snap.startsWith("1:");
  const [colors, setColors] = useState<{ paper: string; ink: string; glow: string } | null>(null);

  useEffect(() => {
    // Defer a tick so the theme class and CSS variables have applied
    const id = setTimeout(() => {
      const next = readThemeColors(dark);
      if (next) setColors(next);
    });
    return () => clearTimeout(id);
  }, [dark, snap]);

  if (!colors) return null;
  return (
    <AsciiFluid
      className="-z-10 [mask-image:radial-gradient(ellipse_at_center,rgba(0,0,0,0.6)_0%,black_65%)]"
      backgroundColor={colors.paper}
      color={colors.ink}
      glowColor={colors.glow}
      glow={dark ? 0.7 : 0.35}
      theme={dark ? "dark" : "light"}
      cellSize={12}
      brush={0.7}
      dissipation={0.035}
    />
  );
}
