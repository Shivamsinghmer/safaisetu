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

## App shell, notifications and settings
- The **notification bell** (`src/components/notification-bell.tsx`) sits in the desktop sidebar header next to the logo
  and in the mobile header before the theme toggle. It shows a coral count badge (99+ max), updates live, and links to
  `/app/notifications`, where unread rows have a coral dot and bold titles.
- **Settings** (`/app/settings`) is three cards: profile, email preferences (checkbox rows with a title and one-line
  explanation), and language (pill radios that fill with `primary` when chosen).

## Ticket actions
- **Proof first:** whenever someone can resolve a ticket, the after-photo picker is shown and the success button stays
  disabled, reading "Add the after photo to resolve", until a photo is added.
- Pickups show a date input ("Collection date") with a secondary "Save collection date" button for the handler.
- A resident whose internal ticket is overdue gets a primary "Send to the municipality" button.
- Every ticket shows a blue outlined **Get directions** pill under its location.

## Report form extras
- **Already reported nearby:** an amber-tinted panel under the map lists open reports within ~80 m, each with a dark
  **Me too** pill. After pressing it, the row links to the ticket instead.
- If AI says the photo isn't waste, the amber warning includes a checkbox ("I'm sure this is a waste problem") that
  must be ticked before submitting.

## Public pages (guest QR, tracking, scorecard)
Pages a visitor reaches without an account (`/qr/[id]`, `/track/[token]`, `/scorecard`) use a plain single column
(`max-w-lg`, or `max-w-[1000px]` for the scorecard table) on `bg-background`, with the logo at the top and no app shell.
The guest QR page has an English/हिन्दी pill top-right. Photo capture is one large tappable 4:3 card; categories are
a two-column grid of 44px buttons, so the whole report is a few thumb taps.

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
`StatusPill` and `SeverityTag` already translate themselves. Devanagari needs no font change: Inter falls back to the
system Devanagari face.

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
