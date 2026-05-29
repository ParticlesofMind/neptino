# Neptino Style Guide

This guide documents the styles currently used across Neptino. It is based on a code sample from `src/app`, `src/components/ui`, `src/components/layout`, `src/components/coursebuilder`, and the Atlas components.

Use this as the working product style guide when adding or refactoring UI. The intent is to consolidate the strongest existing patterns, not to preserve every one-off style forever.

## Design Character

Neptino should feel professional, quiet, dense, and education-operations focused. The strongest existing surfaces are minimal white panels, thin neutral borders, compact controls, restrained blue/teal accents, and small typography built for scanning.

Avoid marketing-heavy or decorative treatments inside operational tools. The teacher dashboard, course builder, Atlas, and account surfaces should prioritize clarity, data density, and predictable controls.

## Source Tokens

The canonical global tokens live in `src/app/globals.css`.

### Core Colors

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#ffffff` | App background and primary surface |
| `--foreground` | `#171717` | Main text |
| `--primary` | `#4a94ff` | Primary actions, links, focus, active states |
| `--primary-foreground` | `#ffffff` | Text on primary-filled controls |
| `--secondary` | `#00ccb3` | Secondary action accent |
| `--secondary-foreground` | `#ffffff` | Text on secondary-filled controls |
| `--muted` | `#f5f5f5` | Muted backgrounds, empty states |
| `--muted-foreground` | `#737373` | Secondary text and helper text |
| `--accent` | `#f5f9ff` | Pale blue selection/accent surface |
| `--accent-foreground` | `#3a6ea0` | Text on pale blue accent |
| `--destructive` | `#ef4444` | Errors and destructive actions |
| `--border` | `#e5e5e5` | Default 1px borders and dividers |
| `--input` | `#e5e5e5` | Input border |
| `--ring` | `#4a94ff` | Focus ring |

Dark-mode tokens exist but most audited surfaces are light-mode first.

### Semantic Accent Colors

These colors recur often enough to treat as product accents:

| Color | Current use |
| --- | --- |
| `#5c9970` | Success, live state, approved/media green |
| `#a89450` | Warning, draft, derived/yellow-brown state |
| `#6b8fc4` | Atlas entity blue |
| `#b87c5c` | Atlas product orange |
| `#b87070` | Atlas activity/error-red accent |
| `#dbe8f6` | Pale entity blue pill background |
| `#d6ede3` | Pale success/media green pill background |
| `#f0e8cc` | Pale warning/derived pill background |
| `#f0d8d8` | Pale activity/error pill background |

Prefer tokenized Tailwind classes (`text-primary`, `border-border`, `bg-muted/30`) for general UI. Use direct hex colors only for stable semantic accents that are repeated across the product.

## Typography

### Font Families

| Role | Font |
| --- | --- |
| Body and content headings | Open Sans |
| UI chrome, labels, nav, buttons | Geist Sans via `font-sans` |
| Code, ids, compact technical values | Geist Mono via `font-mono` |

The body uses Open Sans at `1rem` with `line-height: 1.6`. Global headings use Open Sans, weight 600-700, with tight line heights.

### Heading Defaults

| Element | Weight | Line height | Tracking |
| --- | --- | --- | --- |
| `h1` | 700 | 1.1 | `-0.02em` |
| `h2` | 700 | 1.15 | `-0.015em` |
| `h3` | 600 | 1.2 | `-0.01em` |
| `h4` | 600 | 1.25 | `0` |

Use utility classes to tune headings inside dense panels. For example, dashboard panel titles commonly use `text-xl font-semibold`, while course-builder section titles use `text-sm font-semibold`.

### Common Text Sizes

The sampled code heavily favors compact UI text:

| Size | Common usage |
| --- | --- |
| `text-[9px]` | Dense editor metadata and uppercase micro-labels |
| `text-[10px]` | Canvas/editor chips, tiny controls, compact metadata |
| `text-[11px]` | Editor hints, small technical labels, mini buttons |
| `text-[12px]` | Atlas drawer text and dense editor inputs |
| `text-xs` | Dashboard labels, helper text, badges, nav metadata |
| `text-sm` | Primary form fields, row titles, buttons, body copy in app chrome |
| `text-base` | Card titles or comfortable body copy |
| `text-lg` | Compact card headings |
| `text-xl` | Page/panel titles in dashboard and auth |
| `text-2xl` | Metrics and larger page section headings |
| `text-4xl` to `text-5xl` | Public marketing pages only |

Operational product surfaces should usually stay between `text-xs` and `text-xl`. Reserve larger type for public pages or major landing-page moments.

### Text Color

Use:

- `text-foreground` for primary text.
- `text-muted-foreground` for descriptions, helper copy, inactive nav, metadata.
- `text-primary` for links and primary interactive emphasis.
- `text-destructive` for validation and destructive actions.
- `text-neutral-*` mainly inside dense editor and Atlas sub-surfaces.

## Layout And Spacing

### Containers

| Surface | Current pattern |
| --- | --- |
| Public shell | `max-w-7xl`, `px-5 lg:px-8` |
| Dashboard shell | `max-w-[1400px]`, `px-4 py-6 lg:px-8` |
| Dashboard content | White panels on `bg-muted/30` |
| Course builder | Full-height app shell, dense split panes |
| Atlas | Custom scoped surface with Atlas tokens |

### Spacing Scale

Most repeated spacing utilities:

| Utility | Typical usage |
| --- | --- |
| `gap-1`, `gap-1.5`, `gap-2` | Icons plus text, compact controls |
| `gap-3`, `gap-4` | Rows and form groups |
| `px-3 py-2` | Inputs and standard compact buttons |
| `px-4 py-2` | Primary action buttons |
| `px-5 py-4` | Card headers, dashboard rows |
| `p-5` | Card body padding |
| `p-6` to `p-8` | Larger cards, auth/public panels |

Keep repeated dashboard rows at `px-5 py-4`. Keep form controls at `h-9` or `h-10` unless a surface intentionally needs a taller touch target.

## Surfaces, Cards, And Panels

### Default Card

Use the shared card primitive pattern:

```tsx
rounded-xl border border-border bg-background shadow-sm
```

Header and footer dividers are usually `border-b border-border` and `border-t border-border`, with `px-5 py-4`. Body padding is usually `p-5`.

### Dashboard Panels

Dashboard panels currently use a larger shell:

```tsx
rounded-2xl border border-border bg-background overflow-hidden
```

This is common in teacher dashboard sections. Inside the panel, use thin dividers and avoid nesting full cards inside cards. Repeated list rows should be unframed rows divided by `divide-y divide-border`.

### Course Builder Panels

Course builder setup sections use a flatter split-pane system:

- Section header: `border-b border-border pb-3 mb-4`.
- Two-column layout with a `w-px bg-border` divider.
- Inputs at `h-9`, `rounded-md`, `border-border`.
- Action buttons use pale primary or secondary backgrounds instead of solid fills.

### Atlas Panels

Atlas uses its own scoped tokens:

```css
--atlas-bg: #ffffff;
--atlas-bg-elevated: #fafafa;
--atlas-surface: #f5f5f5;
--atlas-border: rgba(0, 0, 0, 0.08);
--atlas-text: #1a1a1a;
--atlas-text-dim: rgba(26, 26, 26, 0.55);
```

Atlas components are intentionally denser and more archival. They commonly use `text-[9px]` to `text-[12px]`, muted neutral borders, and semantic entity/media/product/activity colors.

## Borders, Lines, And Dividers

Default line thickness is 1px.

Use:

- `border border-border` for component outlines.
- `border-b border-border` or `border-t border-border` for panel sections.
- `divide-y divide-border` and `divide-x divide-border` for repeated rows/metrics.
- `w-px bg-border` for explicit vertical pane dividers.
- `border-dashed border-border` for empty states and upload/drop zones.

Use `border-2` sparingly: it appears mainly for upload drop zones, active avatars, or stronger focus/selection moments.

## Corners

Most common radius utilities in the sampled code:

| Radius | Usage |
| --- | --- |
| `rounded-md` | Inputs, compact buttons, segmented items |
| `rounded-lg` | Dashboard action buttons, row controls, nav buttons |
| `rounded` | Very small controls, icons, logo image |
| `rounded-full` | Badges, avatars, toggles, dots |
| `rounded-xl` | Standard cards |
| `rounded-2xl` | Large dashboard/auth panels |

Global base radius is `--radius: 0.5rem`. Prefer `rounded-md` for controls and `rounded-xl` for standalone cards. Use `rounded-2xl` only for large page-level panels already matching the teacher dashboard/auth pattern.

## Shadows

Shadows are restrained.

| Shadow | Usage |
| --- | --- |
| `shadow-sm` | Default cards and filled buttons |
| `shadow-md` | Hover elevation on cards |
| `shadow-lg`, `shadow-xl`, `shadow-2xl` | Modals, mobile overlay panels |
| `shadow-[0_2px_20px_rgba(0,0,0,0.06)]` | Auth cards |
| `shadow-[0_8px_28px_rgba(15,23,42,0.05)]` | Public marketing feature cards |

Avoid heavy shadows in the dashboard and course builder. Prefer borders and dividers.

## Buttons

Shared button variants live in `src/components/ui/button.tsx`.

### Sizes

| Size | Class shape |
| --- | --- |
| `sm` | `h-8 px-3 text-xs rounded` |
| `md` | `h-10 px-4 text-sm rounded-md` |
| `lg` | `h-11 px-6 text-sm rounded-md` |

### Variants

| Variant | Pattern |
| --- | --- |
| Primary | `bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm` |
| Secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm` |
| Outline | `border border-border bg-background hover:bg-muted/50 hover:border-primary/40 hover:text-primary` |
| Ghost | `bg-transparent hover:bg-muted/50` |
| Destructive | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |

Buttons use `font-sans font-semibold`, `gap-2`, `transition-all duration-150`, `active:scale-[0.97]`, and `focus-visible:outline-2`.

Course builder setup actions often use softer bordered actions:

```tsx
border border-primary/30 bg-primary/10 text-accent-foreground hover:bg-primary/15
```

Use icon plus text for clear commands. Use icon-only buttons for compact toolbar actions and provide `title` or `aria-label`.

## Forms

Default input pattern:

```tsx
w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-sans text-foreground
placeholder:text-muted-foreground
focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15
disabled:cursor-not-allowed disabled:opacity-50
transition-colors duration-150
```

Course builder form controls use `h-9`, `rounded-md`, `border-border`, and the same `focus:ring-[3px] focus:ring-primary/15`.

Labels:

- Default field label: `text-sm font-medium text-foreground`.
- Optional hint: `text-xs text-muted-foreground`.
- Dense editor label: `text-[9px]` or `text-[10px]`, `font-semibold` or `font-bold`, uppercase with wide tracking.

Validation and save state surfaces are thin bordered strips with `text-xs`. Error strips use `border-destructive/40 bg-destructive/5 text-destructive`.

## Badges, Pills, And Status

Default badge shape:

```tsx
inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-sans font-semibold
```

Common status patterns:

- Live/success: `border-[#5c9970]/30 bg-[#5c9970]/10 text-[#5c9970]`.
- Draft/warning: `border-[#a89450]/30 bg-[#a89450]/10 text-[#a89450]`.
- Review/primary: `border-primary/20 bg-primary/10 text-primary`.
- Destructive: `bg-destructive/10 text-destructive`.

Use uppercase only for small metadata labels, not ordinary readable copy.

## Navigation

Top bars are compact and sticky:

- Public header: `h-[3.75rem]`, `border-b border-border`, `bg-background/95 backdrop-blur-md`.
- Dashboard header: `h-12`, `border-b border-border`, `bg-background`.
- Course builder top bar: `h-9`, minimal text buttons and centered logo.

Teacher sidebar uses grouped nav buttons with:

```tsx
rounded-lg border px-3 py-2.5 text-sm font-medium
```

Active sidebar state is `border-primary/30 bg-primary/10 text-primary`.

## Motion

Defined animation tokens:

- `animate-fade-up`: 0.45s.
- `animate-fade-in`: 0.35s.
- `animate-float`: 3s infinite.
- `animate-slide-in-left`: 0.3s.

Global reduced-motion support disables non-essential motion. Keep operational transitions short, usually `duration-150` or `duration-200`.

## Icons

Use Lucide React where available. Current icon sizes:

- `h-3.5 w-3.5`: dense metadata and table actions.
- `h-4 w-4`: default button and nav icons.
- `h-5 w-5`: mobile menu and larger toolbar icons.
- Larger icons are reserved for empty states, modals, or public pages.

## Product Surface Notes

### Public Pages

Public pages can use larger typography, light gradients, and slightly more spacious cards. Keep them grounded in the same token system.

### Dashboard

Use white panels on a muted page background. Favor rows, metrics, and compact action buttons. Avoid decorative nested cards.

### Course Builder Setup

Use dense split panels, small headers, and persistent save feedback. Primary controls should be calm and not visually overpower the configuration fields.

### Course Builder Create Editor

This area currently uses a denser editor language with `neutral-*` colors, `text-[9px]` through `text-[12px]`, `rounded-md`, and many toolbar-like controls. Preserve density but avoid introducing new one-off colors unless they map to existing media/activity semantics.

### Atlas

Atlas has a distinct scholarly/knowledge-system style. Keep Atlas tokens scoped under `.atlas-page` or `.atlas-scope` and avoid leaking Atlas-specific colors into the general dashboard.

## Known Drift To Clean Up

The current codebase has several style systems that should be consolidated over time:

- `bg-background` and `bg-white` are both common. Prefer tokenized `bg-background` outside editor/Atlas internals.
- General UI uses `border-border`; editor internals often use `border-neutral-200`. Keep that split intentional.
- Some surfaces use `rounded-xl` cards while dashboard page panels use `rounded-2xl`. Treat `rounded-2xl` as page-panel only.
- Many direct hex colors are repeated for semantic statuses. Consider promoting the stable set to named CSS variables.
- Dashboard home, embedded course panel, messages, classes, settings, and marketplace currently include hard-coded demo data. When those become data-backed, preserve the visual shell but replace static values and inert controls.
- Some editor controls expose future actions such as generated media, storage upload, and rich canvas renderers. Keep "coming soon" or pending UI visually subdued.

## Implementation Checklist

When adding a new component:

1. Start with tokens from `globals.css`.
2. Use `text-sm` or smaller for operational UI.
3. Use `rounded-md` for controls, `rounded-xl` for cards, `rounded-2xl` only for large page panels.
4. Use 1px borders and dividers before adding shadows.
5. Use `focus-visible:outline` or `focus:ring-[3px] focus:ring-primary/15`.
6. Use Lucide icons at `h-4 w-4` by default.
7. Keep empty states quiet: dashed border, muted text, concise copy.
8. Avoid new hex colors unless they belong to the documented semantic accent set.
9. Avoid visible explanatory UI text about how a feature works unless it is necessary for the workflow.
10. Check mobile and desktop widths for text overflow, especially inside buttons, rows, and cards.
