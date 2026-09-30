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
   Signed-out users hitting `/app`, `/app/...` or `/r/...` go to `/login?next=…`. Signed-in users on `/login` and `/signup` go to `/app`.
   The matcher skips static files, `manifest.webmanifest`, `apple-icon` and `pwa-icon/`.
   Match `/app` exactly or `/app/` as a prefix, never plain `startsWith("/app")`, which also matches `/apple-icon`.
2. **Server components** read data with the user's Supabase client (`src/lib/supabase/server.ts`), so **RLS decides
   what each role sees**. The service-role client (`src/lib/supabase/admin.ts`) is used only for seeding,
   invitations and reading registrant profiles.
3. **Server Actions** in `src/app/actions/` handle every mutation:

| File | Actions |
|---|---|
| `auth.ts` | `signInAction`, `signUpAction`, `demoSignInAction`, `signOutAction` |
| `tickets.ts` | `createTicketAction`, `updateTicketAction` (calls the `update_ticket` RPC), `forwardPickupsAction` |
| `orgs.ts` | Registering and reviewing orgs, joining by code or invite, inviting and approving members, notices, QR points |
| `ai.ts` | `analyzePhotoAction`, `classifyItemAction` |

   The body size limit is `2mb` (`next.config.ts`). Photos are compressed on the client first (`browser-image-compression`).
4. **Realtime:** `<LiveRefresh channel filter>` subscribes to `tickets` changes and calls `router.refresh()`.

## Data model (`supabase/migrations/`)
`municipalities` → `wards` → `organizations` (society | college | public_place; pending → approved/rejected)
→ `memberships`, `invitations`, `qr_points`, `notices`.
`profiles` (1:1 with `auth.users`). `tickets` (kind `issue` | `pickup`, scope `internal` | `municipal`) → `ticket_events` (audit log).

### Complaint routing (`private.ticket_before_insert`)
- The ward comes from the org, or else from `private.nearest_ward(lat, lng)`.
- Reports inside an org are `internal` (handled by the org admin). Public-area reports, `missed_collection` and
  `illegal_dumping` are `municipal`.
- SLA: high 24h, medium 48h, low 72h. A reopened ticket gets 24h.

### Status state machine (`private.ticket_before_update`)
| Who | Allowed |
|---|---|
| Reporter | `resolved → closed` (with rating) or `resolved → reopened` |
| Org staff (internal) | `submitted/reopened/in_progress → in_progress/resolved/rejected`, and escalate to municipal |
| Municipality | `submitted/reopened/assigned/in_progress → assigned/in_progress/resolved/rejected`. It is the only role that can assign workers |
| Worker | `assigned → in_progress`, `assigned/in_progress → resolved` (with an after photo) |

Any other transition raises `42501`, so the UI can't bypass it. Every change is logged to `ticket_events` by a trigger.

### Security helpers
The `private` schema holds security-definer functions used by RLS: `my_role`, `my_municipality`,
`is_org_member`, `is_org_admin`, `is_org_staff`, `is_muni_for_ward`, `is_muni_for_org`.

### Storage
| Bucket | Limit | Types | Notes |
|---|---|---|---|
| `complaint-photos` | 5 MB | jpeg/png/webp | Before and after photos. Private; served with signed URLs (`src/lib/storage.ts`) |
| `org-documents` | 10 MB | images + pdf | Registration proof. Private; shown to the municipality with 15-minute signed URLs |

Uploads must go into the uploader's own folder (`<uid>/...`).

## AI (`src/lib/groq.ts`)
- The Groq vision model is `GROQ_VISION_MODEL`, falling back to `qwen/qwen3.8-27b`. Groq retired the Llama 4 vision models.
- The photo is analyzed and returns category, severity, a short description and the waste stream. The result prefills the report form, and the user can edit everything.
- Errors are classified as `AiError` kinds: `config | auth | rate_limit | model | bad_input | bad_output | network`.
  Only `model` falls through to the next model. In dev, `failure()` in `actions/ai.ts` shows the real cause.
- The Learn page uses `classifyItemAction` ("which bin does this go in?").

## Maps
- Leaflet + react-leaflet with OpenStreetMap tiles (no key). Components are in `src/components/maps/`, loaded
  client-only via `next/dynamic`.
- `OverviewMap` shows ticket dots, org squares and an optional heatmap (`leaflet.heat`). `PickerMap` has a draggable
  green pin.
- In dark mode the tiles are inverted with CSS. Controls and tooltips are themed in `globals.css`.

## Public links (QR codes, invites)
`publicSiteUrl()` in `src/lib/site-url.ts` (server only) builds the absolute URL printed in QR codes and sent in
invite links:
1. It uses `NEXT_PUBLIC_SITE_URL`, unless that points at localhost.
2. Otherwise it uses the host of the current request, so a deployment works even without the variable.
3. In `next dev` on localhost, it swaps in the machine's Wi-Fi/LAN IP, so a phone on the same network can scan and open the dev server. `allowedDevOrigins` in `next.config.ts` allows private-network hosts.

Every org admin gets **QR codes** (`/app/org/[orgId]/qr`), including society, campus and public place admins. A code opens `/r/[qrId]`, which
redirects to `/app/report?qr=…` with the spot prefilled. The RLS insert policy allows QR reports from non-members.

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
| `src/app/r/[qrId]` | Bin QR entry that opens a prefilled report |
| `src/app/invite/[token]` | Accepting an invitation |
| `src/components/landing` | Landing page: 3D city hero, ASCII fluid cursor, feature showcase, footer |
| `src/components/ui` | Design-system primitives (Card, StatCard, Pill, Field, Input…) |
| `src/lib` | Supabase clients, session, Groq, email (Resend), storage, constants, types |
| `scripts/seed.ts` | Demo municipality, wards, orgs, users and tickets (`npm run seed`) |
