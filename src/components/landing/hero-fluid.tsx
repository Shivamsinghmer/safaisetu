"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AsciiFluid } from "@/components/ui/ascii-fluid";

// The fluid engine takes hex colors, the theme is oklch: resolve through a canvas.
function cssColorToHex(css: string): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n!.toString(16).padStart(2, "0")).join("")}`;
}

function resolveVar(expr: string): string | null {
  const probe = document.createElement("span");
  probe.style.color = expr;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  return cssColorToHex(computed);
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

/** ASCII fluid background for the hero, colored from the active theme. */
export function HeroFluid() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const [colors, setColors] = useState<{ paper: string; ink: string } | null>(null);

  useEffect(() => {
    // Defer a tick so the theme class and CSS variables have applied
    const id = setTimeout(() => {
      const paper = resolveVar("var(--background)");
      // Soft ink: muted text mixed toward the background so the headline stays readable
      const ink = resolveVar(
        dark
          ? "color-mix(in oklab, var(--chart-1) 55%, var(--background))"
          : "color-mix(in oklab, var(--primary) 32%, var(--background))",
      );
      if (paper && ink) setColors({ paper, ink });
    });
    return () => clearTimeout(id);
  }, [dark]);

  if (!colors) return null;
  return (
    <AsciiFluid
      className="-z-10 [mask-image:radial-gradient(ellipse_at_center,rgba(0,0,0,0.45)_0%,black_70%)]"
      backgroundColor={colors.paper}
      color={colors.ink}
      cellSize={12}
      dissipation={0.05}
    />
  );
}
