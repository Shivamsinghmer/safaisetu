import NextLink from "next/link";
import type { ComponentProps } from "react";

/** Transition type that turns on the page-blur view transition (see root layout). */
export const PAGE_NAV = "page-nav";

/**
 * `next/link` that tags its navigation as a page change, so only real
 * navigations blur — not live refreshes or server-action revalidations.
 */
export default function Link({ transitionTypes, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink transitionTypes={transitionTypes ?? [PAGE_NAV]} {...props} />;
}
