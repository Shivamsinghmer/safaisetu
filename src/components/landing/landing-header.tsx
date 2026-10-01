"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The landing nav: a floating bar inset from the edges. At the top of the page it sits flat on the
 * background; once the page scrolls it lifts (card surface, hairline and shadow) so it reads over the sections.
 */
export function LandingHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center px-2 sm:px-5">
      <div
        data-scrolled={scrolled || undefined}
        className={cn(
          "mx-auto flex h-12 w-full max-w-[1200px] items-center justify-between gap-1 rounded-full border pr-1.5 pl-2.5 sm:gap-2 sm:pl-4",
          "transition-[background-color,border-color,box-shadow] duration-300 ease-settle",
          scrolled
            ? "border-bone bg-card/90 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.22)] backdrop-blur-md"
            : "border-transparent bg-transparent",
        )}
      >
        {children}
      </div>
    </header>
  );
}
