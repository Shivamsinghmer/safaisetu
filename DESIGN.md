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
- ❌ Decorative gradients on cards; more than one rainbow ring per page.

## Landing hero 3D scene
- `src/components/landing/city-scene/`: a procedural low-poly city block (no model files): road loop with a municipal
  truck that stops at the segregated bin point, three sanitation workers in hi-vis vests, society buildings, trees, lamps.
- Drag to rotate (bounded), gentle pointer parallax, hover labels on the truck, workers and bins.
- Lazy-loaded client-only; renders only while on screen; a single still frame for `prefers-reduced-motion`.
- Scene colors are fixed (a real object, like a model) and read well on both light and dark backgrounds.
