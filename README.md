# SafaiSetu — Waste Management System

One platform connecting **residential societies, colleges, public places and the municipality** to report waste
issues, request pickups and track every complaint to resolution.

- **Citizens** report issues (photo → AI category/severity → GPS pin), request pickups, track status, confirm or reopen.
- **Org admins** (society secretary, campus facilities, public-place manager) register their organization, invite members
  (email / 6-letter code / college email domain), handle internal complaints, escalate, forward pickups in batches, post
  notices and print QR codes for bins.
- **Municipality** verifies organizations, assigns field workers, tracks SLAs and sees hotspots on a live map.
- **Field workers** work assigned tasks and upload an after photo as proof.

Design system: see [DESIGN.md](DESIGN.md).

## Stack
Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, Realtime, RLS)
· Groq (Llama 4 Scout vision) · Leaflet + OpenStreetMap · Recharts · Resend

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase keys, the Groq key, the Resend key and `DEMO_PASSWORD`.
3. Apply the database schema (`supabase/migrations/`) to your Supabase project:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
4. In the Supabase dashboard → Authentication → Providers → Email, turn **off** "Confirm email" for the demo, or configure
   Resend as custom SMTP.
5. Seed demo data: `npm run seed`
6. `npm run dev`, then open http://localhost:3000

### Demo accounts (password = `DEMO_PASSWORD`)
`citizen@`, `secretary@`, `campus@`, `market@`, `officer@`, `worker@` + `demo.safaisetu.in`. The login page has
one-click buttons for each. Green Valley's invite code is `GV4K2P`.

## How it's built
| Area | Where |
|---|---|
| Schema, RLS, routing and state-machine triggers, storage buckets | `supabase/migrations/` |
| Server actions (tickets, orgs, auth, AI) | `src/app/actions/` |
| Supabase clients, session, Groq, email, storage helpers | `src/lib/` |
| Role-based app | `src/app/app/` (`home`, `report`, `pickup`, `tickets`, `learn`, `orgs`, `org/[orgId]`, `muni`, `tasks`) |
| QR entry / invites | `src/app/r/[qrId]`, `src/app/invite/[token]` |

**Complaint routing:** a report inside an organization goes to that org's admin (scope `internal`). Public-area reports,
missed collections and illegal dumping go to the municipality of the nearest ward (scope `municipal`). Org admins can
escalate. Allowed status transitions per role are enforced in Postgres (`private.ticket_before_update`), so the UI can't
bypass them.
