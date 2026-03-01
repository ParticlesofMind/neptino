# Neptino — Copilot Instructions

## File size limit

Every file must stay under **350 lines**. If a file grows beyond this limit, split it into smaller,
focused modules before adding more code. This is a hard rule, not a suggestion.

## File naming

Name files after what they **are** or what they **do**. Names must be concrete, direct, and
descriptive. Never use names that describe the file's history or how it came to exist.

**Good names:**
- `use-curriculum-loader.ts` — loads curriculum data from the database
- `curriculum-generation-runner.ts` — runs the AI generation pipeline
- `curriculum-structure-panel.tsx` — the structure configuration panel UI
- `schedule-section-utils.ts` — utility functions for the schedule section

**Forbidden patterns:**
- `refactored-curriculum.tsx` — describes a git action, not the file
- `corrected-schedule.ts` — describes a git action, not the file
- `reviewed-types.ts` — not descriptive
- `updated-generation-service.ts` — describes history, not purpose
- `new-classification-section.tsx` — "new" is not permanent

Names describe the module's role in the system, not the history of how it came to exist.

## Module conventions

### Components (`*.tsx`)
- One primary exported component per file (named exports preferred)
- `*-primitives.tsx` — low-level presentational building blocks with no data fetching
- `*-panel.tsx` — composed section panels that receive props and render UI
- `*-section.tsx` — top-level setup section components (orchestrators)

### Hooks (`use-*.ts`)
- One hook per file
- Name after the specific concern: `use-curriculum-loader.ts`, `use-curriculum-generation.ts`
- Hooks that manage a sub-concern are extracted from the main section hook

### Utilities (`*-utils.ts`, `*-service.ts`)
- Pure functions and types only — no JSX, no React hooks
- Constants, types, and helper functions live here

### Queries and mutations
- `*-queries.ts` — TanStack Query hooks for reading data
- `*-mutations.ts` — TanStack Query hooks for writing data

## Design rules

- **No emojis** anywhere — in UI, code comments, or commit messages
- Professional, minimal, business-appropriate interface
- Use SVG icons from `public/icons-coursebuilder/` or Lucide React
- Tailwind CSS v4 only — no inline styles unless absolutely necessary

## Testing

- Unit tests mirror `src/` structure under `src/__tests__/`
- E2E tests live in `e2e/`
- Run `npm run test` before committing logic changes
