# SafaiSetu — Design System

> A calm, professional civic-tech look in the **Shopify** theme (tweakcn): fresh green primary on lightly
> green-tinted neutrals, Inter type, 8px-based radii, soft neutral shadows, full light and dark modes.
> The landing hero features an interactive low-poly 3D city block (React Three Fiber).

**Source of truth:** the theme variables in `src/app/globals.css` (`:root` and `.dark`, installed with
`npx shadcn@latest add https://tweakcn.com/r/themes/cmr2oqrzb000104ky3d4o23e0`). Project tokens are mapped onto
them in an `@theme inline` block, so every screen follows light/dark automatically.

## Principles
1. **Theme variables, never hex.** Use the project tokens below or the shadcn names (`bg-primary`, `text-muted-foreground`…).
   Only status colors and the constants (`snow`, `night`, `haze`) are fixed.
2. **Primary actions are green pills.** `bg-primary text-primary-foreground` (dark text on the light green),
   `rounded-full`. Only one primary per view. Never use `text-primary` for text: it's too light on white — use
   `text-brand` (readable dark green) instead.
3. **Color is information.** Neutral surfaces; color appears for ticket status, severity, bin type and the brand mark.
4. **Soft elevation.** Cards are `bg-white` (theme card) + `border-bone`; theme shadows (`shadow-sm`…) sparingly.
5. **One dramatic moment.** The interactive 3D city block in the landing hero. No glow, gradients or sparkle elsewhere.

## Token mapping (`@theme inline`)
| Project token | Theme variable | Use |
|---|---|---|
| `white` | `--card` | Cards, inputs, popovers |
| `mist` | `--muted` | App background, subtle fills, chips |
| `plaster` | `--secondary` | Section bands |
| `mercury` | muted ⊕ border | Neutral pill background |
| `bone` | `--border` | Default 1px border |
| `cloud` | input ⊕ 12% foreground | Stronger hairlines, dashed dropzones |
| `fog` / `ash` / `slate` | muted-foreground mixes | Placeholder → tertiary → secondary text |
| `carbon` / `ink` / `onyx` | `--foreground` (mixes) | Body text, headings |
| `brand` | `--brand` (dark green light / primary dark) | Brand text, highlighted words, icons on light surfaces |
| `violet` | `--violet` (muted violet) | "Assigned" status |
| `blue` | `--link` (real blue) | Links, active outlines, "in progress" |
| `primary` | `--primary` (fresh green) | CTAs, active nav, selected chips (always with `primary-foreground`) |

Fixed: `mint` / `emerald` / `teal` (success), `amber` (medium, SLA warning), `coral` (high, destructive), `pink`
(reopened). Constants: `snow` (#fff text on colored fills), `night` (dark text on mint), `haze` (copy on the
always-dark gradient panels).

**Ticket status:** submitted = mercury/carbon · assigned = violet/10 + violet · in_progress = blue + snow ·
resolved = mint + night · closed = emerald ring · reopened = pink + snow · rejected = mist + ash.
**Severity:** low teal · medium amber · high coral (dot + mono label).
**Waste streams (SWM Rules 2016):** wet emerald · dry blue · hazardous coral · e-waste night.

## Typography
- **Inter** (`font-sans`, `font-display`) for everything; headings 600–700 weight with negative tracking
  (`text-heading-sm` 34px, `text-heading` 48px, display 52–68px on the landing page).
- **JetBrains Mono** (`font-mono`, `.label-mono`) for ticket codes, numbers and 11px uppercase meta labels (+0.08em).
- Body tracking comes from the theme (`--tracking-normal: 0em`).

## Shape & spacing
- `--radius: 0.5rem`. Scale: `rounded-md` ≈6px (inputs, alerts), `rounded-lg` 8px, `rounded-xl` ≈11px (cards),
  `rounded-2xl` ≈14px (photos), `rounded-3xl` ≈18px (landing tiles). Buttons, chips, tabs and badges are `rounded-full`.
- 4px spacing base (Tailwind default). Page max width 1200px; landing sections are one viewport tall each.

## Motion
- **Page transitions:** "Blur". The old page blurs (12px), fades and scales to 1.02 while the new page sharpens in
  from 0.98 (500ms, ease-in-out). It's built on React's `<ViewTransition default="page-blur">` in the root layout, so it
  runs on every App Router navigation through the browser View Transitions API. Keyframes `blur-out` / `blur-in` live
  in `globals.css`. Browsers without the API simply navigate without animating.
- **Theme switch:** `BlurFadeThemeTransition` (great-ui) via `src/components/theme-toggle.tsx`. It blur-fades with
  the View Transitions API. The saved theme (`localStorage: safaisetu-theme`, else system) is applied before first
  paint by `InlineScript` in the root layout.
- Entrances use `animate-rise` (0.45s, `ease-settle`). Everything respects `prefers-reduced-motion`.

## Do / Don't
- ✅ `bg-primary` for the main action, `secondary` or `ghost` buttons for the rest.
- ✅ Test every new screen in light **and** dark.
- ❌ Hard-coded hex colors or `text-white` on theme surfaces (use `text-primary-foreground` / `snow`).
- ❌ `white/xx` alpha classes on fixed-dark panels. `white` is the theme card color and turns dark in dark mode. Use `snow/xx`.
- ❌ Decorative gradients on cards; more than one rainbow ring per page.
- ❌ Native `<select>`. Use `Select` from `@/components/ui` (themed listbox, keyboard accessible, works in forms via `name`).
- ❌ Hard-coded user-facing text on citizen, worker or guest screens. Pass it through `t()` (see Language below).

## Responsive & PWA
Every screen must work at **375px** (phone) in light and dark, with no sideways scroll.
- **Grids:** when a grid has breakpoint columns (`md:grid-cols-2`), always add `grid-cols-1` at the base size. Without it,
  implicit columns size to their content and push the page wider than the screen.
- **Tables:** on phones, render stacked cards (`sm:hidden`) and keep the table for `sm+` (`hidden sm:block`). See the
  municipality organization directory and ward hotspots.
- **Stat rows:** use `StatCard compact` in a `grid-cols-3 gap-2 sm:gap-3` row, so three stats sit on one line.
- **App shell:** the mobile header and drawer pad with `env(safe-area-inset-top)`. The bottom tab bar pads with
  `env(safe-area-inset-bottom)`. Its height is the CSS variable `--tabbar-h`. Sticky bottom bars use
  `bottom-[var(--tabbar-h)]` with an opaque background.
- **Tap targets:** at least 36px (icon buttons are `h-9 w-9`). Inputs use 16px text on phones so iOS doesn't zoom.
- **Maps:** `.leaflet-container` is isolated (`z-index: 0`) so it never covers the header or tab bar. Leaflet theme
  overrides are scoped under `.leaflet-container`, because `leaflet.css` loads later and would otherwise win.
- **Charts:** Recharts grid and ticks are themed in `globals.css`.
- **PWA:** `viewportFit: "cover"`, `appleWebApp`, generated icons and manifest shortcuts. See
  [docs/architecture.md](docs/architecture.md#pwa).

## Brand mark
- **Mark** (`LogoMark`, geometry in `src/lib/brand-mark.ts`): a deep-green (`#2f6b1f`) rounded square with a white
  check whose long stroke grows into a lime (`#b8e65c`) leaf. "Done, and kept green." The same paths drive
  `public/icon.svg`, `src/app/icon.svg` and the PNG/maskable PWA icons (`src/lib/pwa-icon.tsx`); change them together.
- **Wordmark** (`Wordmark`): Inter bold, -0.035em, "Safai" in `onyx` and "Setu" in `brand`. Always `lang="en"`.
- `Logo` = mark + wordmark; the mark tilts −6° on hover. Minimum mark size 16px (it reads as the check alone there).

## Landing nav
`LandingHeader` (`src/components/landing/landing-header.tsx`) is a 64px sticky band holding a floating 48px pill bar
(max 1200px, inset 8px on phones). At the top of the page the bar is flat on the background; after 8px of scroll it
lifts: `bg-card/90`, `border-bone`, a soft offset shadow and a light backdrop blur. Inside: logo · section links
with a gliding `bg-muted` pill (`LandingNav`, hidden below `md`) · a compact borderless language switcher ("EN" / "हि",
`Select variant="ghost"`) · theme toggle · a hairline divider · the CTA pill. On phones the chevron and the CTA arrow
drop so everything fits at 375px.

## App shell, notifications and settings
- **Sidebar fits without scrolling.** Notifications and Settings are not nav rows: the bell (and theme toggle) sit in
  the sidebar header, and the account row at the bottom opens Settings (gear on the right, sign-out beside it). When a
  person has a work role (officer, worker, society/campus staff) the citizen links are a `secondary` section that
  starts folded; any section can be folded by its header (chevron, coral badge sum while folded), and a section holding
  the current page always opens. Rows are 36px, 32px on short screens (`short:` = lg and ≤760px tall). Folding animates
  through `grid-template-rows`. A thin themed scrollbar remains only as a last resort for very short windows.
- Maps put their overlay controls inside a `relative isolate` wrapper, so `z-[500]` buttons never sit above the
  mobile drawer or headers.
- The **notification bell** (`src/components/notification-bell.tsx`) sits in the desktop sidebar header next to the
  theme toggle and in the mobile header before the theme toggle. It shows a coral count badge (99+ max), updates live, and links to
  `/app/notifications`, where unread rows have a coral dot and bold titles.
- **Settings** (`/app/settings`) is three cards: profile, email preferences (checkbox rows with a title and one-line
  explanation), and language (pill radios that fill with `primary` when chosen).

## Proof of cleanup
- **Ticket page:** once a worker uploads the after photo, the photos become a "Proof of cleanup" card: Before | After
  side by side (4:3, 1px `bone` gutter, white "Before" / mint "After" chips, time ago), a title that says where the
  approval stands ("Is it clean? Compare and approve" for the reporter, "Waiting for {name}'s approval" for everyone
  else, "Approved by …", "Reopened: not clean yet") and a footer strip: a primary "Approve or reopen" pill that jumps
  to the action card for the reporter, stars and date when approved, the reopen note in quotes when reopened.
- **Approval chip** (`ApprovalChip`, `src/components/proof.tsx`): amber "Awaiting approval" (resolved), emerald
  "Approved · ★n" (closed), pink "Reopened". In ticket lists it sits beside the status pill (the reopened chip is
  left out there, since the pill already says it).
- **List thumbnails** (`ProofThumbs`): a 40px before square overlapped by the after square, with tiny "Before" /
  "After" bands. When a list mixes rows with and without photos, rows without get a muted placeholder so titles align.
- **Cleanup gallery** (`CleanupGallery`, `src/components/cleanup-gallery.tsx`): cards with the before/after pair,
  category, code, ward, time and the approval chip. Used for "Recent cleanups" on the municipal dashboard and for
  the amber "Is it clean? Your approval is needed" callout on the citizen home.

## Ticket actions
- **Proof first:** whenever someone can resolve a ticket, the after-photo picker is shown and the success button stays
  disabled, reading "Add the after photo to resolve", until a photo is added.
- Pickups show a date input ("Collection date") with a secondary "Save collection date" button for the handler.
- A resident whose internal ticket is overdue gets a primary "Send to the municipality" button.
- Every ticket shows a blue outlined **Get directions** pill under its location.
- **Live tracking card** (top of the main column while a ticket is in progress): a header row with a mono label
  ("Navigate to the spot" / "Worker on the way · name"), the time in 22px display type plus the distance, and a
  status chip on the right (green pulsing "Sharing live location", blue "Live", grey "Connecting…", coral
  "Not sharing"). Below it a 340px map (300px for watchers) with the worker as a pulsing blue dot (grey when stale),
  the spot as a red pin and the route as a blue line with a white casing (dashed when there's no road route). A white
  "Recenter" pill appears bottom-right after the map is dragged. Amber strip for location errors with "Try again",
  green strip on arrival, then a solid blue "Turn-by-turn in Google Maps" pill and a privacy note.

## Report form extras
- **Already reported nearby:** an amber-tinted panel under the map lists open reports within ~80 m, each with a dark
  **Me too** pill. After pressing it, the row links to the ticket instead.
- If AI says the photo isn't waste, the amber warning includes a checkbox ("I'm sure this is a waste problem") that
  must be ticked before submitting.

## Public pages (guest QR, tracking, scorecard)
Pages a visitor reaches without an account (`/qr/[id]`, `/track/[token]`, `/scorecard`) use a plain single column
(`max-w-lg`, or `max-w-[1000px]` for the scorecard table) on `bg-background`, with the logo at the top and no app shell.
The guest QR page has an English/हिन्दी pill top-right. Photo capture is one large tappable 4:3 card; categories are
a two-column grid of 44px buttons, so the whole report is a few thumb taps. While AI reads the photo, a dark pill
sits on the photo ("AI is reading the photo…"); the result shows as the same "AI triage" card as the app's report form,
and pre-selects the category and fills in the details (or shows the amber "doesn't look like waste" note).

## Dropdowns
`Select` (`src/components/ui/select.tsx`) replaces the native select everywhere. The trigger is a button styled like
an input (`variant="field"`) or a compact rounded pill for navs (`variant="pill"`). The list opens on the `popover`
surface with a `border`, `rounded-xl` and `shadow-lg`, pops in over 140ms (no motion with reduced-motion), highlights
the active row with `bg-muted`, marks the chosen one with a brand-green check, and can show a second line (`hint`).
Keyboard: Enter, Space or ↓ opens; ↑/↓/Home/End move; Enter picks; Esc or Tab closes.

## Language
English and Hindi (`src/lib/i18n.ts`). The landing nav, guest QR page and tracking page have a `LanguageSwitcher`
pill (globe icon + current language) built on `Select`; the app uses the language setting in `/app/settings`. Write user-facing text in plain English and wrap it in `t("…")`: the English
string is the key, and a missing Hindi entry falls back to English. Use `getT()` in server components and `useT()` in
client components. Statuses, severities and categories have helpers (`statusText`, `severityText`, `categoryText`);
`StatusPill` and `SeverityTag` already translate themselves.
**Devanagari typography.** Hindi uses Noto Sans Devanagari (`--font-devanagari`, after Inter in every font stack), and
its marks sit above and below the letter line, so tight Inter tuning clips it. Pages set `lang={locale}` on their root
(landing, app shell, guest pages), and `globals.css` applies `:lang(hi)` rules: normal letter-spacing, line-height 1.4
on headings and `leading-tight`/`leading-snug`/`leading-[…]`, and 1.6 on `truncate`/`line-clamp-*`. Reveal masks
(`overflow-hidden` wrappers around `animate-mask-up` lines) need the `text-mask` class; in Hindi they clip only the
bottom edge. Prefer wrapping over `truncate` for short labels in narrow spots, since Hindi strings run longer. Mark
brand-only text that must keep its English styling with `lang="en"` (e.g. the footer wordmark).

## Footer
The landing footer's bin legend uses one card per stream: a tinted header band in the bin's color with the bin glyph
and a chip ("Green bin", "Blue bin", "Red bin", "Drop-off point" for e-waste), then the stream name and three example
chips. Two per row on phones, a row of four after the intro on `lg+`. The oversized wordmark is clipped by the bottom bar.

## Auth pages
A split layout (`src/app/(auth)/layout.tsx`). On `lg+`, the left side is a sticky, always-dark forest-green brand panel
(`oklch(0.22 0.035 140)`, dot-grid texture, one soft green glow). It holds a headline, a product preview card (a
complaint moving through Reported, Assigned, In progress and Resolved) and audience chips. It has no testimonials or
invented stats. The right side is the themed form (max 400px).
**Demo accounts** (`src/app/(auth)/demo-roles.tsx`, one shared role list):
- **`2xl+` (≥1536px):** `DemoRolesPanel` sits on the right side of the brand panel. It has a heading, a line saying one click signs you in with sample data, and five full rows (icon, role, description, arrow) in a glass card. The form column then shows only the form.
- **Below `2xl`:** `DemoRolesTiles` sits under the form after an "or" divider. It is a muted panel with the same heading and a row of five equal tiles.
Both pages must fit one screen with no scroll on desktop. Use the `tight` variant (lg+ and ≤820px tall) to trim spacing, and hide the panel paragraph on short screens.

## Landing hero 3D scene
- `src/components/landing/city-scene/`: a procedural low-poly city block (no model files): road loop with a municipal
  truck that stops at the segregated bin point, three sanitation workers in hi-vis vests, society buildings, trees, lamps.
- Drag to rotate (bounded), gentle pointer parallax, hover labels on the truck, workers and bins.
- Lazy-loaded client-only; renders only while on screen; a single still frame for `prefers-reduced-motion`.
- Scene colors are fixed (a real object, like a model) and read well on both light and dark backgrounds.
