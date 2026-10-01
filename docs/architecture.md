# Architecture

How SafaiSetu is put together. Keep this file in sync when routes, tables, triggers or integrations change.

## Roles
| Role | Where it comes from | Lands on |
|---|---|---|
| Citizen | Default `profiles.platform_role = citizen` | `/app/home` |
| Org admin (society secretary, campus manager, public-place manager) | `memberships.role = admin` on an approved organization | `/app/org/[orgId]` |
| Org member / staff | `memberships.role = member` / `staff` | `/app/home` |
| Municipal officer | `platform_role = municipal_admin`, scoped to one `municipality_id` | `/app/muni` |
| Field worker | `platform_role = worker` | `/app/tasks` |

One account can be a citizen and an org admin at the same time. `/app` redirects to the right landing page.

## Request flow
1. **`src/proxy.ts`** (Next 16's replacement for middleware) refreshes the Supabase session with `getClaims()`.
   Signed-out users hitting `/app` or `/app/...` go to `/login?next=…`. Signed-in users on `/login` and `/signup` go to `/app`.
   QR links (`/r/...`), guest pages (`/qr/...`, `/track/...`) and `/scorecard` are public.
   The matcher skips static files, `manifest.webmanifest`, `apple-icon` and `pwa-icon/`.
   Match `/app` exactly or `/app/` as a prefix, never plain `startsWith("/app")`, which also matches `/apple-icon`.
2. **Server components** read data with the user's Supabase client (`src/lib/supabase/server.ts`), so **RLS decides
   what each role sees**. The service-role client (`src/lib/supabase/admin.ts`) is used only for seeding, invitations, guest QR reports,
   notifications, rate limits and reading names of people on a ticket.
   If a session token outlives its account (e.g. after `npm run demo:reset`), `requireViewer()` sends the browser to
   `/auth/reset`, which signs it out, instead of bouncing between `/login` and `/app`.
3. **Server Actions** in `src/app/actions/` handle every mutation:

| File | Actions |
|---|---|
| `auth.ts` | `signInAction`, `signUpAction`, `demoSignInAction`, `signOutAction` |
| `tickets.ts` | `createTicketAction`, `updateTicketAction` (calls the `update_ticket` RPC; resolving needs a checked after photo), `checkAfterPhotoAction`, `forwardPickupsAction`, `findNearbyAction`, `supportTicketAction`, `createGuestReportAction` |
| `account.ts` | `updateSettingsAction` (name, phone, email preferences, language), `markNotificationsReadAction` |
| `orgs.ts` | Registering and reviewing orgs, joining by code or invite, inviting and approving members, notices, QR points |
| `ai.ts` | `analyzePhotoAction`, `analyzeGuestPhotoAction` (guest QR page), `classifyItemAction` |

   The body size limit is `2mb` (`next.config.ts`). Photos are compressed on the client first (`browser-image-compression`).
4. **Realtime:** `<LiveRefresh channel filter>` subscribes to `tickets` changes and calls `router.refresh()`.

## Data model (`supabase/migrations/`)
`municipalities` → `wards` → `organizations` (society | college | public_place; pending → approved/rejected)
→ `memberships`, `invitations`, `qr_points`, `notices`.
`profiles` (1:1 with `auth.users`; also `email_updates`, `email_notices`, `locale`). `tickets` (kind `issue` | `pickup`,
scope `internal` | `municipal`, source `app` | `qr` | `guest`, `scheduled_for`, `guest_contact`, `public_token`,
`after_check` (the after-photo check, server-written only: trigger `private.guard_after_check`))
→ `ticket_events` (audit log), `ticket_supporters` ("me too"), `worker_locations` (live worker position, one row per
ticket, only while it is in progress). `notifications` (in-app, per user).
`private.rate_limits` (fixed-window counters, server only).

### Complaint routing (`private.ticket_before_insert`)
- The ward comes from the org, or else from `private.nearest_ward(lat, lng)`, which only matches a ward within
  **15 km** of its centre. A report or organization outside every ward is refused (`22023`).
- Guest reports (`source = 'guest'`, inserted by the server) are routed the same way.
- Reports inside an org are `internal` (handled by the org admin). Public-area reports, `missed_collection` and
  `illegal_dumping` are `municipal`.
- SLA: high 24h, medium 48h, low 72h. A reopened ticket gets 24h.

### Status state machine (`private.ticket_before_update`)
| Who | Allowed |
|---|---|
| Reporter | `resolved → closed` (with rating) or `resolved → reopened`; escalate an internal ticket once its deadline has passed |
| Org staff (internal) | `submitted/reopened/in_progress → in_progress/resolved/rejected`, escalate to municipal, set a pickup's collection date |
| Municipality | `submitted/reopened/assigned/in_progress → assigned/in_progress/resolved/rejected`, set a collection date. Only the municipality assigns, and only a `worker` of its own municipality |
| Worker | `assigned → in_progress`, `assigned/in_progress → resolved` |

**No ticket can become `resolved` without `after_photo_path`**, whoever moves it. Any other transition raises
`42501`, so the UI can't bypass it. Every change is logged to `ticket_events` by a trigger.

### Automatic escalation (pg_cron)
`private.escalate_overdue_internal()` runs every 15 minutes (`cron.job` `escalate-overdue-internal`). Internal tickets
past their deadline move to the municipality with a 48-hour deadline, the move is logged, and the reporter, supporters
and the ward's officers get in-app notifications (emails can't be sent from inside Postgres).

### Privileges
All default table privileges for `anon` and `authenticated` are revoked; the migration grants only what the app uses.
Users can update only `full_name`, `phone`, `email_updates`, `email_notices` and `locale` on their own profile, and a
trigger (`private.profile_before_update`) also pins role, municipality and email. Row-level security decides which rows.

### Security helpers
The `private` schema holds security-definer functions used by RLS: `my_role`, `my_municipality`,
`is_org_member`, `is_org_admin`, `is_org_staff`, `is_muni_for_ward`, `is_muni_for_org`.

### Storage
| Bucket | Limit | Types | Notes |
|---|---|---|---|
| `complaint-photos` | 5 MB | jpeg/png/webp | Before and after photos. Private; served with signed URLs (`src/lib/storage.ts`) |
| `org-documents` | 10 MB | images + pdf | Registration proof (required by `registerOrgAction`). Private; shown to the municipality with 15-minute signed URLs |

Uploads must go into the uploader's own folder (`<uid>/...`). Guest QR photos are uploaded by the server into `guest/`.

### Database functions used by the app
| Function | Use |
|---|---|
| `update_ticket(...)` | Status, note, assignee, after photo, escalation, rating and `p_scheduled_for` in one call |
| `nearby_open_tickets(lat, lng, kind)` | Open reports within ~80 m the caller may support (public ones, or their own orgs') |
| `support_ticket(id)` / `ticket_support_count(id)` | "Me too" and its count. Supporters can read the ticket and get the reporter's updates |
| `share_worker_location(ticket, lat, lng, accuracy, heading, speed)` | Upserts the worker's live position. Only the assigned worker, only while the ticket is `in_progress` |
| `take_rate_limit(key, max, window)` | Fixed-window rate limit; service role only |
| `muni_ward_stats`, `muni_daily_counts`, `muni_breakdowns` | Dashboard aggregates (security invoker, so RLS scopes them to the officer's wards) |
| `public_ward_scorecard()` | Per-ward aggregates for the public `/scorecard` page (granted to `anon`) |

### Rate limits (`src/lib/rate-limit.ts`)
Counted in Postgres so they hold across serverless instances, and fail open if the check errors.
Reports 15/user/hour · AI calls 40/user/hour · guest AI calls 15/IP/hour · guest reports 5/IP/hour · "me too" 30/user/hour · sign-ups 10/IP/hour ·
invite batches 10/user/hour.

## AI (`src/lib/groq.ts`)
- The Groq vision model is `GROQ_VISION_MODEL`, falling back to `qwen/qwen3.8-27b`. Groq retired the Llama 4 vision models.
- The photo is analyzed and returns category, severity, a short description and the waste stream. The result prefills the report form, and the user can edit everything.
- Errors are classified as `AiError` kinds: `config | auth | rate_limit | model | bad_input | bad_output | network`.
  Only `model` falls through to the next model; that includes a missing model (404) and a retired one (Groq's 400
  "has been decommissioned"), so a stale `GROQ_VISION_MODEL` can't break AI. In dev, `failure()` in `actions/ai.ts`
  shows the real cause; in production the friendly message ends with the kind in brackets, e.g. "(auth)".
- The Learn page uses `classifyItemAction` ("which bin does this go in?").

## After-photo check (`src/lib/after-check.ts`)
When someone uploads the after photo to resolve a ticket, `checkAfterPhotoAction` runs `runAfterCheck` straight away:
- **AI** (`verifyCleanup` in `groq.ts`, before + after photos in one request): same place (permanent features, not
  the garbage), cleaned, the reported photo re-used, a photo of a screen, AI-generated or edited.
- **Device signals** sent with the photo: GPS distance from the pin (>250 m review, >2 km fail, allowing for GPS
  accuracy), the file timestamp vs the first assignment (older → review), and a 64-bit difference hash compared
  with every other recorded after photo (≤4 bits apart → "the same photo was already used as proof on SS-…").
- The verdict is the worst finding: `fail` > `review` > `pass`. It is saved on `tickets.after_check` with the
  photo path, reasons, the AI summary and the hash, by the service role only. A check whose `path` isn't the current
  `after_photo_path` is ignored (and dropped by the trigger when the photo changes).
- `updateTicketAction` re-uses the check for that photo (or runs it), and refuses `resolved` on a `fail` unless the
  worker gives an explanation (`flag_reason`, ≥10 chars), stored as `after_check.override`. AI can be wrong, so a
  flag never blocks for good; the reporter's approval and the officer still decide.
- Shown on the ticket's Proof of cleanup panel, as chips in lists (flags only) and the cleanup gallery, and in the
  municipal queue's "Flagged by AI" tab. AI calls share the 40/user/hour limit.

## Maps
- Leaflet + react-leaflet with OpenStreetMap tiles (no key). Components are in `src/components/maps/`, loaded
  client-only via `next/dynamic`.
- `OverviewMap` shows ticket dots, org squares and an optional heatmap (`leaflet.heat`). `PickerMap` has a draggable
  green pin.
- `LiveRouteMap` (`live-route-impl.tsx`) shows a worker's live position (pulsing blue dot, heading cone, accuracy
  circle), the reported spot (red pin) and the road route between them. Routes come from the public OSRM server
  (`router.project-osrm.org`, no key), refetched after ~60 m of movement or every 90 s; if it fails a dashed straight
  line is drawn. While following, the map keeps both points in view; dragging stops following until "Recenter".
- In dark mode the tiles are inverted with CSS. Controls and tooltips are themed in `globals.css`.

## Live worker tracking (`src/app/app/tickets/[id]/live-tracking.tsx`)
- When the assigned worker opens a ticket that is **in progress**, `WorkerNavigator` watches their GPS
  (`watchPosition`, high accuracy), shows distance and time to the spot, keeps the screen awake (Wake Lock, where
  supported), offers "Turn-by-turn in Google Maps", and sends the position through `share_worker_location` at most
  every 8 s (sooner after 25 m). Within 40 m it switches to "You've arrived" and points to the after photo.
- The reporter, the organization's staff and the ward's officer see `WorkerTracker` instead: the worker's position
  moving live (Realtime `postgres_changes` on `worker_locations`), distance and time, and "Last seen N min ago" once
  the position is over 2 minutes old.
- Privacy: RLS on `worker_locations` (`private.can_track`) lets only the worker, the reporter, supporters, the org's
  staff and the ward's municipality read it. The trigger `ticket_clear_worker_location` deletes the row as soon as the
  ticket leaves `in_progress` or is reassigned, so no location history is kept. An assigned worker who hasn't started
  sees a note explaining this.

## Notifications (`src/lib/notify.ts`)
Every recipient gets an **in-app notification** (bell in the app shell, `/app/notifications`, live via Realtime), and an
email unless they turned that kind off in `/app/settings` (`email_updates` for ticket/account updates, `email_notices`
for notices). Every email links to the settings page.

Server actions call `notify*()` inside `after()`, so emails go out after the response and a failed email never breaks
the action. Recipients are looked up with the service-role client, and the person who triggered an event is never emailed
about it. Emails are sent with Resend's batch API (100 per request) through `sendEmails()` in `src/lib/email.ts`, which
also renders the shared layout (`renderEmail()`).

| Event | Who is emailed |
|---|---|
| New report or pickup request | Reporter (confirmation) + org admins and staff (internal) **or** the ward's municipal officers (municipal) |
| Status change | Reporter and "me too" supporters, for every change they didn't make |
| Pickup collection date set | Reporter and supporters |
| Worker assigned | The worker + the reporter |
| Escalated to the city (by the org or the resident) | Municipal officers + the reporter and supporters |
| Pickups forwarded in a batch | Each reporter + one summary email to the officers |
| Reopened | Assigned worker + current handlers (org admins/staff or officers) |
| Closed (with rating) | Assigned worker |
| Resolved on an internal ticket | The org's other admins and staff |
| Organization registered | Officers of that ward's municipality |
| Organization approved or rejected | The person who registered it |
| Join request by code | Org admins |
| Member approved | The member |
| Notice posted | Org notice: all active members. City notice: the org admins in its wards |

In development, `sendEmails()` logs every sent batch as `[email] sent N: subject → address`.

## Public links (QR codes, invites)
`publicSiteUrl()` in `src/lib/site-url.ts` (server only) builds the absolute URL printed in QR codes and sent in
invite links:
1. It uses `NEXT_PUBLIC_SITE_URL`, unless that points at localhost.
2. Otherwise it uses the host of the current request, so a deployment works even without the variable.
3. In `next dev` on localhost, it swaps in the machine's Wi-Fi/LAN IP, so a phone on the same network can scan and open the dev server. `allowedDevOrigins` in `next.config.ts` allows private-network hosts.

Every org admin gets **QR codes** (`/app/org/[orgId]/qr`), including society, campus and public place admins. A code opens `/r/[qrId]`:
- **Signed in:** redirects to `/app/report?qr=…` with the spot prefilled. The RLS insert policy allows QR reports from non-members.
- **Signed out:** redirects to the guest page `/qr/[qrId]`: photo, category, optional phone or email, no account.
  After the photo is taken, `analyzeGuestPhotoAction` (in `ai.ts`) runs the same AI tagging as the app and fills in
  the category, severity and details. It only answers for an active QR code of an approved organization, and is
  limited per IP. `createGuestReportAction` uploads the photo and inserts the ticket with the service role (rate-limited per IP), then
  sends the visitor to `/track/[public_token]`, a private status page for that report.

## Duplicates ("me too")
The report form calls `findNearbyAction` whenever the pin moves. Open reports within ~80 m are shown with a **Me too**
button (`supportTicketAction`) instead of creating a duplicate. The ticket page shows "+N reported this too".

## Languages (`src/lib/i18n.ts`)
English and Hindi. The English text is the key; a missing Hindi entry falls back to English. The language comes from the
`ss-lang` cookie (set in `/app/settings` or by the `LanguageSwitcher` dropdown in the landing nav and on the guest
pages, through `setLocaleAction`, which also saves it to the profile when signed in), else `profiles.locale`. Server components use `getT()`
(`src/lib/i18n-server.ts`), client components `useT()` (`src/components/i18n-provider.tsx`). Translated: the whole landing
page (including the 3D scene's labels), navigation, statuses, categories, home, report, photo picker, location field,
ticket actions, tasks, settings, notifications, and the guest QR and tracking pages. Officer and org-admin screens, and
the mock app screens inside the landing visuals, are English only.

## Public ward scorecard
`/scorecard` lists every ward's open, overdue and 30-day resolved counts, average fix time and citizen rating, from
`public_ward_scorecard()`. No tickets or people are shown. Linked from the landing footer.

## Preloader
`<Preloader />` sits at the top of `<body>` in the root layout, outside the view-transition wrapper, so it mounts once
per full load. An inline script in `<head>` sets `html[data-preloader]` before paint: `"on"` the first time in a tab
(remembered in `sessionStorage` as `ss-preloaded`), `"skip"` afterwards; without JavaScript the overlay never shows.
`?preloader=replay` forces it (handy for demos) and, in development, `?preloader=hold` freezes it before the exit.
While it is up the page (`#app-root`) is `inert` and the document can't scroll; a CSS failsafe hides the overlay and
restores scrolling after 6s whatever happens to the script.

## PWA
- `src/app/manifest.ts`:
  - `start_url` and `id` are `/app`, with standalone display and portrait orientation.
  - Shortcuts: Report, Pickup, Tickets.
- Icons are generated with `next/og`: `src/lib/pwa-icon.tsx` feeds `src/app/pwa-icon/[variant]` (`192`, `512`,
  `maskable`) and `src/app/apple-icon.tsx`.
- The root layout sets `viewportFit: "cover"`, `appleWebApp` and a theme color per scheme. The app shell pads with
  `env(safe-area-inset-*)`. See [DESIGN.md](../DESIGN.md#responsive--pwa).
- There is no service worker or offline mode yet.

## Folder map
| Path | What |
|---|---|
| `src/app/(auth)` | Login and signup plus their shared split layout |
| `src/app/app/*` | Signed-in app: `home`, `report`, `pickup`, `tickets`, `learn`, `orgs`, `org/[orgId]/*`, `muni/*`, `tasks` |
| `src/app/r/[qrId]` | Bin QR entry: signed-in report form or the guest page |
| `src/app/qr/[qrId]`, `src/app/track/[token]` | Guest QR report and its private tracking page |
| `src/app/scorecard` | Public ward scorecard |
| `src/app/app/settings`, `src/app/app/notifications` | Account settings and in-app notifications |
| `src/app/auth/reset` | Clears a session whose account no longer exists |
| `src/app/invite/[token]` | Accepting an invitation |
| `src/components/landing` | Landing page: 3D city hero, ASCII fluid cursor, feature showcase, footer |
| `src/components/ui` | Design-system primitives (Card, StatCard, Pill, Field, Input…) |
| `src/lib` | Supabase clients, session, Groq, email (Resend), storage, constants, types |
| `scripts/seed.ts` | Demo data for Kanpur Nagar Nigam: 6 wards, orgs, users and tickets (`npm run seed` or `npm run demo:reset`) |
| `scripts/test-db.mjs` | Runs the database tests against the hosted project without Docker (`npm run test:db`) |
| `supabase/tests/database` | pgTAP tests for routing, proof, assignment, live location, escalation, privileges, guests, supporters, limits |
