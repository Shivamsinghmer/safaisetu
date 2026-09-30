"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import BlurFadeThemeTransition, { useBlurFadeThemeTransition } from "@/components/ui/BlurFadeThemeTransition";
import { cn } from "@/lib/utils";

export const THEME_STORAGE_KEY = "safaisetu-theme";
type Theme = "light" | "dark";

function persist(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode) — theme still applies for this visit
  }
}

// Single source of truth: the `dark` class on <html>, so every toggle stays in sync
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getTheme = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");
const getServerTheme = (): Theme => "light";

function ToggleButton({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const { theme, triggerTransition, isAnimating } = useBlurFadeThemeTransition();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => triggerTransition()}
      disabled={isAnimating}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-full text-slate transition-colors hover:bg-black/4 hover:text-ink",
        withLabel ? "px-3 text-[13px] font-semibold" : "w-8",
        className,
      )}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {withLabel && <span>{dark ? "Light" : "Dark"}</span>}
    </button>
  );
}

/**
 * Blur-fade theme switch. The provider renders nothing until mounted, so it
 * wraps only this button, never page content.
 */
export function ThemeToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  return (
    <span className="inline-flex h-8 min-w-8">
      <BlurFadeThemeTransition theme={theme} duration={450} maxBlur={12} onThemeChange={persist}>
        <ToggleButton className={className} withLabel={withLabel} />
      </BlurFadeThemeTransition>
    </span>
  );
}
