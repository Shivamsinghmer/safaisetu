# Changelog

Newest first. Add an entry under **Unreleased** with every change, and move it under a dated heading when it's pushed.

## Unreleased
_Nothing yet._

## 2026-10-01 — New logo, landing nav, no-scroll sidebar, required org proof
- Organization registration now requires a proof document (registration certificate or authorisation letter):
  the submit button stays disabled until it is uploaded, the server rejects registrations without it, and oversized
  or failed uploads show an error instead of failing silently.
- New logo: a check that grows into a leaf (deep green + lime), with a two-tone "SafaiSetu" wordmark. Favicon, Apple
  and PWA icons regenerated from one geometry (`src/lib/brand-mark.ts`); manifest theme color `#2f6b1f`.
- Landing nav redesigned as a floating pill bar that lifts on scroll, with a compact "EN / हि" language switcher
  (new `Select variant="ghost"` and `triggerLabel`).
- App sidebar fits without scrolling: Notifications and Settings moved to the bell and the account row, citizen
  links fold away for work roles, foldable sections, compact rows on short screens.
- Fix map overlay buttons (dashboard map toggles, live-tracking "Recenter") showing above the mobile menu drawer.

## 2026-10-01 — Live tracking reconnect
- Live tracking catches up after a dropped connection: the watcher re-reads the worker's position every time
  the Realtime channel (re)connects, so a sleeping phone or hidden tab doesn't show a stale spot.

## 2026-10-01 — Live worker tracking, AI on guest QR, AI model fallback
- Fix "AI is unavailable" in production when `GROQ_VISION_MODEL` names a retired model: Groq's "decommissioned" error
  now falls through to the working Qwen model instead of failing. Production AI errors now end with a short cause code
  such as "(config)" or "(auth)" so failures can be diagnosed from a screenshot.
- Guest QR page now uses AI too: the photo is tagged and the category, severity and details are filled in, like the
  signed-in report form. New `analyzeGuestPhotoAction` works only for active QR codes and is limited to 15 per IP per
  hour; guest reports now store the AI result and its severity instead of always "medium".
- Live worker tracking, ride-hailing style. Once the worker starts a task, the ticket page shows a navigation map with
  their live GPS position, the reported spot, the road route (OSRM) and the time and distance left, plus
  "Turn-by-turn in Google Maps" and an arrival prompt to upload the after photo. The reporter, the society/campus
  staff and the officer see the worker moving towards the spot in real time. New `worker_locations` table,
  `share_worker_location` RPC, `private.can_track` RLS helper and a trigger that deletes the location when the task
  stops being in progress (migration `20261001150000_worker_live_location.sql`); 5 new pgTAP tests.

## 2026-10-01 — Hindi text clipping
- Fix Hindi text being cut off: Noto Sans Devanagari is loaded for Hindi, `:lang(hi)` rules give headings and
  tight-leading text more line height and drop negative letter-spacing, the hero and feature-showcase reveal masks
  only clip their bottom edge in Hindi, the app shell carries `lang`, and the sidebar role label wraps instead of
  truncating. Every landing, app, guest and auth page was checked at 375, 768, 1024 and 1280px.

## 2026-10-01 — Security hardening, product gaps, Hindi, notifications and Kanpur demo
- Language dropdown (English / हिन्दी) in the landing nav, and on the guest QR and tracking pages. The whole landing
  page is translated, including the 3D city's labels. The choice is saved for the app too.
- Themed dropdowns: a custom `Select` (button + listbox, keyboard accessible, light and dark) replaces the native
  select. The worker picker shows each worker's open-task count under their name.
- **Security:** signed-in users had full table privileges by Supabase default, which let anyone set their own
  `platform_role` (e.g. become a municipal officer). All default privileges are revoked and only the needed grants
  remain; a profile trigger also pins role, municipality and email. Applied to the hosted database.
- **Proof enforced in the database:** no ticket can be resolved without an after photo (the old check trusted a hidden
  form field). The UI keeps "Mark resolved" disabled until a photo is added.
- Only a field worker of the ticket's own municipality can be assigned.
- Complaints can't be buried: overdue internal tickets escalate to the city automatically every 15 minutes (pg_cron),
  with in-app notifications, and residents can escalate themselves once the deadline passes.
- Service area: reports and organizations more than 15 km from every ward are refused.
- Guest QR reports: visitors who scan a bin report with a photo and no account, then follow a private tracking link.
- "Me too": the report form shows open reports within ~80 m so people support them instead of filing duplicates;
  supporters follow the ticket.
- Pickups get a confirmed collection date set by the handler and emailed to the resident.
- In-app notifications (bell + page, live), settings page with email opt-outs and language, and Hindi for citizen,
  worker and guest screens.
- Get directions link on tickets; a not-waste AI result must be confirmed before submitting.
- Rate limits on reports, AI calls, guest reports, "me too", sign-ups and invites.
- Municipal dashboard numbers are computed in the database (no 2,000-row cap); the complaint queue pages 50 at a time
  with exact counts per tab.
- Public ward scorecard at `/scorecard`.
- Demo city moved from Bhopal to Kanpur (Kanpur Nagar Nigam, 6 wards); `npm run demo:reset`; `DEMO_LOGIN=off` switch.
- **Fix:** a session whose account was deleted looped between `/login` and `/app`; it is now cleared via `/auth/reset`.
- **Fix:** sign-up confirmation links fell back to `localhost`.
- The photo picker and location field are translated too, so the Hindi report screen has no English left.
- DESIGN.md documents the new UI patterns: notification bell, settings, proof-first resolve button, "me too" panel,
  public guest pages, language rules and the footer legend.
- Tests and CI: pgTAP tests for the database rules (`npm run test:db` runs them on the hosted project without Docker),
  and a GitHub Actions workflow for typecheck, lint and the database tests.
- Email notifications for every ticket and organization event (new report, status changes, assignment, escalation, batched pickups, reopen/close, registration review, join requests, notices). Sent after the response with Resend batch sends; see `docs/architecture.md`.
- Footer redesign: bin legend cards with a tinted header, bigger bin icons and three example chips each (2 per row on phones); e-waste now says "Drop-off point" instead of "Black bin"; shorter wordmark cut off by the bottom bar; bottom bar credits Team Last Commit and links to GitHub.
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
