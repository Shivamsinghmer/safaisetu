"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/app/actions/account";
import { useT } from "@/components/i18n-provider";
import { Select } from "@/components/ui";
import { LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SHORT: Record<string, string> = { en: "EN", hi: "हि" };

/** English / हिन्दी dropdown for navs. Saves the choice and re-renders the page in it.
 *  `compact` is a borderless trigger showing a short code ("EN" / "हि"), for use inside a nav bar. */
export function LanguageSwitcher({
  className,
  align = "end",
  compact = false,
}: {
  className?: string;
  align?: "start" | "end";
  compact?: boolean;
}) {
  const { locale, t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Select
      variant={compact ? "ghost" : "pill"}
      align={align}
      triggerLabel={compact ? (o) => SHORT[o?.value ?? "en"] : undefined}
      ariaLabel={t("Language")}
      className={cn(pending && "opacity-60", className)}
      icon={
        <Languages
          className={cn("h-4 w-4 shrink-0", compact ? "text-current" : "text-muted-foreground")}
          aria-hidden
        />
      }
      value={locale}
      options={LOCALES.map((l) => ({ value: l.value, label: l.label, hint: l.value === "hi" ? "Hindi" : undefined }))}
      onChange={(v) =>
        start(async () => {
          await setLocaleAction(v);
          router.refresh();
        })
      }
    />
  );
}
