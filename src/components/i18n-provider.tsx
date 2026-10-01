"use client";

import { createContext, useContext, type ReactNode } from "react";
import { translate, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Translations in client components. Outside a provider this is English. */
export function useT() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
