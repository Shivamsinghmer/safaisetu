# SafaiSetu — Design System

> A hardworking operations dashboard in the **Vescrow** theme (tweakcn): deep-indigo primary on soft
> violet-tinted neutrals, Bricolage Grotesque type, generous 20px radii, soft shadows, full light and dark modes.

**Source of truth:** the theme variables in `src/app/globals.css` (`:root` and `.dark`, installed with
`npx shadcn@latest add https://tweakcn.com/r/themes/cml5dyjea000004jr66ytcg0l`). Project tokens are mapped onto
them in an `@theme inline` block, so every screen follows light/dark automatically.

## Principles
1. **Theme variables, never hex.** Use the project tokens below or the shadcn names (`bg-primary`, `text-muted-foreground`…).
   Only status colors and the constants (`snow`, `night`, `haze`) are fixed.
2. **Primary actions are indigo pills.** `bg-primary text-primary-foreground`, `rounded-full`. Only one primary per view.
3. **Color is information.** Neutral surfaces; color appears for ticket status, severity, bin type and the brand mark.
4. **Soft elevation.** Cards are `bg-white` (theme card) + `border-bone`; theme shadows (`shadow-sm`…) sparingly.
5. **One dramatic moment.** The rainbow conic ring (`.ring-rainbow`) only on the landing hero CTA.

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
| `violet` | `--chart-1` | Brand mark, "assigned" |
| `blue` | `--link` (`--ring` light, `--chart-1` dark) | Links, active outlines, "in progress" |
| `primary` | `--primary` | CTAs, active nav, selected chips |

Fixed: `mint` / `emerald` / `teal` (success), `amber` (medium, SLA warning), `coral` (high, destructive), `pink`
(reopened). Constants: `snow` (#fff text on colored fills), `night` (dark text on mint), `haze` (copy on the
always-dark gradient panels).

**Ticket status:** submitted = mercury/carbon · assigned = violet/10 + violet · in_progress = blue + snow ·
resolved = mint + night · closed = emerald ring · reopened = pink + snow · rejected = mist + ash.
**Severity:** low teal · medium amber · high coral (dot + mono label).
**Waste streams (SWM Rules 2016):** wet emerald · dry blue · hazardous coral · e-waste night.

## Typography
- **Bricolage Grotesque** (`font-sans`, `font-display`) for everything; headings 650–800 weight with negative tracking
  (`text-heading-sm` 34px, `text-heading` 48px, display 52–72px on the landing page).
- **JetBrains Mono** (`font-mono`, `.label-mono`) for ticket codes, numbers and 11px uppercase meta labels (+0.08em).
- Body tracking comes from the theme (`--tracking-normal: -0.01em`).

## Shape & spacing
- `--radius: 1.25rem`. Scale: `rounded-md` 12px (inputs, alerts), `rounded-lg` 16px, `rounded-xl` 20px (cards),
  `rounded-2xl` 24px (photos, large panels). Buttons, chips, tabs and badges are `rounded-full`.
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
