import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getViewer } from "@/lib/session";
import { LOCALE_COOKIE, isLocale, translate, type Locale } from "@/lib/i18n";

/** The viewer's language: the cookie set in settings, else their profile, else English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const viewer = await getViewer();
  return viewer?.profile.locale && isLocale(viewer.profile.locale) ? viewer.profile.locale : "en";
});

export async function getT() {
  const locale = await getLocale();
  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
