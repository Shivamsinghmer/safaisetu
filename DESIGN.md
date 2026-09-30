# SafaiSetu — Design System

> Hardworking dashboard on white marble. SafaiSetu is an operations tool for societies, campuses,
> public places and municipalities, so the visual language borrows from productivity software:
> dense lists, status pills, compact controls and bold typographic claims.

**Theme:** light only. **Implementation:** Tailwind v4 tokens in `src/app/globals.css` (`@theme`).

## Principles
1. **Grayscale first, color is information.** The canvas is white and neutral grays. Color appears only where it means something: ticket status, severity, bin type, brand mark.
2. **Everything interactive is a pill.** Buttons, chips, tags, nav items and badges all use `rounded-full` (9999px). Cards are 12px (`rounded-xl`), large panels 20px (`rounded-[20px]`), inputs 9px (`rounded-[9px]`).
3. **Flat elevation.** Surfaces are separated by 1px `border-bone` (#e8e8e8) borders and `bg-mist` shifts, not shadows. At most two elevation levels per section.
4. **Heavy, tight headlines; compact everything else.** Display text uses Plus Jakarta Sans 650–800 with negative tracking. Controls are 14px/700.
5. **One dramatic moment per view.** The animated rainbow conic border (`.ring-rainbow`) is reserved for a single hero CTA. Don't use it anywhere else.

## Color tokens
| Token (Tailwind) | Hex | Use |
|---|---|---|
| `white` | #ffffff | Canvas, cards |
| `ink` | #202020 | Primary text, **primary CTA fill** |
| `onyx` | #090c1d | Display headlines 34px+ |
| `carbon` | #2a2a2a | Strong borders, text on light fills |
| `slate` | #646464 | Secondary text, nav labels |
| `ash` | #838383 | Tertiary text, meta, disabled |
| `fog` | #b3b3b3 | Low-contrast borders, placeholders |
| `cloud` | #d4d4d4 | Hairlines, input outlines |
| `bone` | #e8e8e8 | **Default border** |
| `mist` | #f8f9fa | Card surface level 2, ghost fills |
| `plaster` | #e9ebf0 | Section band / app background |
| `mercury` | #eeeeee | Neutral chip background |
| `violet` | #6647f0 | **Brand identity only** (logo, brand badges). Never a CTA fill |
| `blue` | #0091ff | Links, active tabs, outlined interactive accents, "in progress" |
| `mint` | #6ee7b7 | "Resolved" pill fill |
| `emerald` | #00c07a | Success edges, "closed", wet-waste bin |
| `teal` | #16c0a4 | Low severity, positive stats |
| `amber` | #fd9a46 | Medium severity, SLA warning |
| `coral` | #fc6d7b | High severity, SLA breach, destructive |
| `pink` | #fa24ce | "Reopened" |

Gradients (the only ones allowed):
- `--gradient-rainbow-conic`: the animated border on a single hero CTA.
- `--gradient-primary`: 83deg cyan to violet to magenta, for one hero word or a premium badge.
- `--gradient-dark-fade`: dark feature panels.

## Semantic mappings

**Ticket status** (`src/lib/constants.ts` → `STATUS_META`):
| Status | Pill |
|---|---|
| submitted | mercury bg / carbon text |
| assigned | violet/10 bg / violet text |
| in_progress | blue bg / white text |
| resolved | mint bg / onyx text |
| closed | white bg / emerald border + text |
| reopened | pink bg / white text |
| rejected | mist bg / ash text, strikethrough-free |

**Severity:** low = teal, medium = amber, high = coral (dot + mono label).

**Waste streams (Indian SWM Rules 2016 color code):** Wet = green (emerald), Dry = blue, Hazardous/sanitary = red (coral), E-waste = ink/black.

## Typography
| Role | Family | Size / weight | Tracking | Class |
|---|---|---|---|---|
| Display | Plus Jakarta Sans | 56–80px / 700–800 | -0.04em | `font-display text-display` |
| Heading L | Plus Jakarta Sans | 48px / 650 | -0.035em | `font-display text-heading` |
| Heading | Plus Jakarta Sans | 34px / 650 | -0.04em | `font-display text-heading-sm` |
| Title | Plus Jakarta Sans | 20–26px / 650 | -0.03em | `font-display text-xl font-[650]` |
| Body | Inter | 14–16px / 400–500 | -0.01em | `font-sans` (default) |
| Button | Plus Jakarta Sans | 14px / 700 | 0 | built into `<Button>` |
| Meta label | Sometype Mono | 10–12px / 500, UPPERCASE | +0.08em | `.label-mono` |
| Codes / IDs | Sometype Mono | 12–14px / 500 | 0 | `font-mono` |

Rules: never use Plus Jakarta below 14px (use Inter). Never use Inter for display. Positive tracking only on uppercase mono labels.

## Spacing & layout
- 4px base unit, which is Tailwind's default scale (`p-1` = 4px, `p-7` = 28px). The reference's `--spacing-N` tokens are deliberately **not** registered because they would collide with Tailwind's scale.
- Page max width 1200px. Marketing section gap 80px. Card padding 28px on desktop, 20px on mobile. Element gap 12px.
- App shell: left sidebar (240px) on desktop, bottom tab bar on mobile. The citizen/member experience is designed mobile-first.

## Components (`src/components/ui`)
- **Button**: variants `primary` (ink fill, white text), `secondary` (white, bone border), `outline-blue` (blue border + text), `ghost` (transparent, hover `black/4`), `danger` (coral). Sizes `sm` (h-8, px-3), `md` (h-10, px-5), `lg` (h-12, px-6). Always pill.
- **Pill / StatusPill / SeverityDot**: 10–12px, weight 600, `px-2.5 py-0.5`, pill.
- **Card**: white, `border border-bone`, `rounded-xl`, no shadow. `CardHeader` uses a mono meta label and a Jakarta title.
- **StatCard**: large Jakarta number (34–48px, 700, -0.04em, onyx) with an Inter 14px slate caption.
- **Input / Select / Textarea**: h-10, `rounded-[9px]`, `border-cloud`, focus ring `blue/30` with blue border.
- **Timeline**: vertical hairline with status-colored dots, mono timestamps.
- **Avatar cluster**: 24–32px circles, 2px white ring, -8px overlap.
- **Map card**: `rounded-xl` with a hairline border; markers use status colors.

## Motion
- Default ease `cubic-bezier(0.33, 1, 0.68, 1)` (`ease-settle`), 0.3–0.45s for entrance, 0.15s for hover.
- The conic ring rotates continuously, once per page.
- Respect `prefers-reduced-motion`: the ring stops and entrance animations are disabled.

## Do / Don't
- ✅ Near-black `ink` for CTAs and headlines, never pure #000 text.
- ✅ `border-bone` 1px as the structural baseline.
- ✅ Real product UI (the dashboard, the map, tickets) as imagery, never stock photos.
- ❌ Violet on a primary button.
- ❌ Decorative gradients on cards or section backgrounds.
- ❌ Mixed radii within one component family.
- ❌ Shadows stacked more than one level.
