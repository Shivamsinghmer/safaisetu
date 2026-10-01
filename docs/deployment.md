# Deployment

## Vercel
1. Import the GitHub repo. The framework preset is **Next.js**. No build settings need changing.
2. Add these **environment variables**. Use the same names as `.env.example`, and never commit the real values:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable |
| `SUPABASE_SECRET_KEY` | Supabase secret key (server only, never `NEXT_PUBLIC_`) |
| `GROQ_API_KEY` | https://console.groq.com/keys |
| `GROQ_VISION_MODEL` | `qwen/qwen3.8-27b` |
| `RESEND_API_KEY`, `MAIL_FROM` | For invitation emails |
| `NEXT_PUBLIC_SITE_URL` | The production URL, e.g. `https://safaisetu.vercel.app`, with no trailing slash. Used in QR codes and invite links. If it is unset or points at localhost, the request host is used instead. Set it to your custom domain so printed codes never change |
| `DEMO_PASSWORD` | The same password used when seeding demo accounts |
| `DEMO_LOGIN` | Optional. Set to `off` to hide the one-click demo accounts and refuse demo sign-ins (for a real deployment) |

3. Deploy. Environment variable changes only take effect after a **redeploy**.

## Supabase
- Apply the migrations with `npx supabase link --project-ref <ref>` and then `npx supabase db push`.
  The migrations enable `pg_cron` and schedule the 15-minute auto-escalation job.
- Reset the demo data at any time with `npm run demo:reset` (removes previous demo users and their data, including the
  old Bhopal demo city, and recreates Kanpur).
- Authentication → URL Configuration: set the **Site URL** to the production URL and add it to the redirect URLs.
- Authentication → Providers → Email: turn off "Confirm email" for demos, or set up Resend as custom SMTP.
- Run `npm run seed` once against the target project for the demo data.

## Checks before shipping
```bash
npm run typecheck
```
```bash
npm run lint
```
```bash
npm run test:db
```
`test:db` runs the pgTAP tests against the linked hosted project through `supabase db query`, so it needs no Docker.
Each file runs in one transaction that is rolled back. With Docker running, `npm run test:db:local` runs them on a
local database instead, and CI does that on every push.
```bash
npm run build
```
- Test at 375px (phone) in light **and** dark, as a citizen, secretary, municipal officer and worker.
- QR codes are generated fresh on every visit to the QR page. Codes printed while the site URL was wrong (e.g. `localhost`) must be reprinted.
- To test a QR scan from a phone during development, both devices must be on the same Wi-Fi. `npm run dev` listens on the network address, and Windows Firewall may ask to allow Node.
- Install as a PWA (Chrome → Install app, or iOS Share → Add to Home Screen) and check that the safe areas look right.
