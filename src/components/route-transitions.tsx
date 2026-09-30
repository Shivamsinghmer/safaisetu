"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { RouteTransitionProvider } from "@/components/ui/ColorWipePageTransition";

// Stops of the brand's rainbow-conic gradient (DESIGN.md)
const RAINBOW = ["#7d5be7", "#bc3fda", "#fa24ce", "#fb49a5", "#fc6d7b", "#fd8461", "#fd9a46", "#a3a0e0", "#4fb9fa", "#0091ff"];

export function RouteTransitions({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <RouteTransitionProvider
      navigate={(url) => router.push(url)}
      panelColor="var(--color-mist)"
      columns={8}
      duration={0.38}
      staggerDelay={0.025}
      direction="left"
      exitOpposite
      strokeWidth={6}
      leadingStrokeColors={RAINBOW}
      trailingStrokeColors={RAINBOW}
    >
      {children}
    </RouteTransitionProvider>
  );
}
