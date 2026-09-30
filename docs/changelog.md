# Changelog

Newest first. Add an entry under **Unreleased** with every change, and move it under a dated heading when it's pushed.

## Unreleased
- Landing "Live intake" bucket: the box body's outline now shows in light mode too (a hairline `stroke-cloud`), matching the edges the white inner glow draws in dark mode.

## 2026-09-30 — Mobile, theming, PWA, auth redesign and QR fixes
- Fixed sideways overflow on phones. Grids that only had breakpoint columns now start with `grid-cols-1` (32 grids,
  21 files). As a safety net, `overflow-x: clip` is set on `html` and `body`.
- Maps sit under the sticky header and tab bar (`.leaflet-container { isolation: isolate; z-index: 0 }`). Zoom buttons,
  attribution and tooltips follow the theme. The picker pin is brand green.
- The report page's sticky "Add a photo" bar sits exactly on the tab bar (`bottom-[var(--tabbar-h)]`), with an opaque background.
- The worker's "My tasks" stats show in one symmetrical 3-column row (`StatCard compact`).
- On phones, the municipality's organization directory and ward hotspot table become stacked cards.
- Delete buttons have 36px tap targets. Form fields use 16px text on phones, so iOS doesn't zoom in on focus.
- Recharts grid lines and axis labels follow the theme.
- PWA:
  - `viewportFit: cover` and safe-area padding in the app shell.
  - `appleWebApp` metadata.
  - Generated PNG icons (192, 512, maskable) and an apple-touch icon.
  - Manifest `id`, `scope`, orientation and shortcuts.
- Redesigned the login and signup pages. The left brand panel shows a product preview (complaint lifecycle) and
  the audiences served. Demo accounts sit in a labeled "Just exploring? Try a demo account" panel that explains one-click sign-in with sample data, followed by one even row of five role tiles with full role names.
- On wide screens (≥1536px) the demo accounts move into the empty right side of the brand panel as full rows with descriptions. Narrower screens keep the tiles under the form.
- Login and signup fit one screen with no scroll, down to 1366×768 laptops (new `tight` variant: lg+ and ≤820px tall).
- **Fix:** QR codes and invite links encoded `NEXT_PUBLIC_SITE_URL`, which was `localhost`, so scanning with a phone failed. Links now come from `publicSiteUrl()`: the configured URL, else the request host, and in dev the machine's LAN IP.
- QR codes are now available to society admins too (previously only campuses and public places). Each code shows its link underneath for testing.
- **Fix:** the proxy treated `/apple-icon` as part of the signed-in `/app` area and redirected it to login.
- Docs: added `docs/architecture.md`, `docs/deployment.md` and this changelog.

## 2026-09-30 — Earlier
- Fixed AI photo tagging. Moved to `qwen/qwen3.8-27b` after Groq retired Llama 4 vision. Better AI error messages.
  Restored the hero cursor effect.
- Applied the Shopify tweakcn theme. Added an interactive low-poly 3D city hero (truck, workers, bins).
- Made the full website responsive and added tile shadows.
- Matched the hero trail and auth panels to the green theme.
- Fixed the "Document hidden" view-transition error. The page blur now runs only on page navigations.
- Added the ASCII fluid hero background, blur page transitions, smooth nav links and a new footer with a bin legend.
- Applied the Vescrow theme, dark mode, theme blur-fade and a landing redesign (bento feature flow).
- Landing sections fit one screen. Hardened the demo seed.
- Added the backend: Supabase schema, RLS, routing and state-machine triggers, storage, and the role-based app.
