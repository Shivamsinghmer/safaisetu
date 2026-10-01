"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/app/actions/account";
import { useT } from "@/components/i18n-provider";
import { Select } from "@/components/ui";
import { LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Compact English / हिन्दी dropdown for navs. Saves the choice and re-renders the page in it. */
export function LanguageSwitcher({
  className,
  align = "end",
}: {
  className?: string;
  align?: "start" | "end";
}) {
  const { locale, t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Select
      variant="pill"
      align={align}
      ariaLabel={t("Language")}
      className={cn(pending && "opacity-60", className)}
      icon={
        <Languages
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      }
      value={locale}
      options={LOCALES.map((l) => ({ value: l.value, label: l.label }))}
      onChange={(v) =>
        start(async () => {
          await setLocaleAction(v);
          router.refresh();
        })
      }
    />
  );
}
