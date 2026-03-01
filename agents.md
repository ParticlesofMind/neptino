# Neptino — Agent Context

## What this project is

Neptino is an educational platform for tutors and teachers to create, manage, and deliver courses. It supports curriculum planning, live lesson delivery, student enrollment, and post-session feedback/payouts.

Built with:
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Supabase** (PostgreSQL database, Auth, Storage, Edge Functions)
- **Tailwind CSS v4**
- **TanStack Query v5** — server state and data fetching
- **Zustand v5** — client-side state management
- **dnd-kit** — drag-and-drop in the course builder UI
- **Vitest** — unit tests
- **Playwright** — end-to-end tests

---

## Key commands

```bash
npm run dev           # start Next.js dev server
npm run build         # production build
npm run test          # run all Vitest unit tests (single run)
npm run test:watch    # run Vitest in watch mode
npm run test:coverage # run tests with coverage report
npm run test:e2e      # run Playwright e2e tests (requires local Supabase running)
npm run lint          # run ESLint

# Supabase local dev
npx supabase start      # start local Supabase stack
npx supabase stop       # stop local Supabase stack
npx supabase db reset   # drop and re-apply all migrations (resets local DB)
npx supabase status     # show local service URLs and keys
```

---

## Environment variables

### Required for the app to run

```
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
```

### Also used (dev/test tooling)

```
VITE_SUPABASE_URL=                # same URL, used by Vitest + chrome extension
VITE_SUPABASE_ANON_KEY=           # same key, used by Vitest + chrome extension
NODE_ENV=development
VITE_APP_ENV=development
```

See `.env.example` and `.env.test.local.example` for full reference.

---

## Directory structure

```
src/
  app/
    (coursebuilder)/teacher/coursebuilder/  # teacher-facing course builder pages
    (dashboard)/                            # role-based dashboards (admin, teacher, student)
    api/                                    # Next.js API route handlers
    auth/                                   # auth callback routes
    login/ signup/                          # public auth pages
    page.tsx                                # public marketing homepage

  components/
    coursebuilder/    # all course builder UI primitives, hooks, and sections
    encyclopedia/     # encyclopedia item browsing/display
    layout/           # shell components (public shell, dashboard shell, etc.)
    providers/        # React context providers (QueryClient, auth, etc.)
    ui/               # shared design system primitives (buttons, inputs, etc.)

  lib/
    supabase/
      client.ts       # browser Supabase client
      server.ts       # server-side Supabase client (for Server Components / API routes)
    curriculum/       # curriculum domain logic: AI generation, template system, canvas projections
    page-config.ts    # route → page metadata mapping
    utils.ts          # shared utility functions (cn(), etc.)

  types/
    atlas.ts          # Atlas knowledge system types (EntityType, MediaType, etc.)

supabase/
  migrations/         # canonical source of truth for the DB schema — read before touching data models

e2e/                  # Playwright e2e tests
  helpers/
    auth.ts           # test auth helpers
    supabase-admin.ts # admin client for test setup/teardown

src/__tests__/        # Vitest unit tests (mirrors src/ structure)
```

---

## Domain model

```
users           — id, email, role (student | teacher | admin), institution
  |
  +-- courses   — id, teacher_id, course_name, curriculum_data (jsonb), layout (jsonb), ...
        |
        +-- enrollments  — student_id, course_id, status
        |
        +-- students     — course-scoped student records (separate from global users)
        |
        +-- lessons      — individual lesson/canvas documents within a course
        |
        +-- templates    — reusable course blueprints (can be shared)

encyclopedia_items   — standalone knowledge base entries (linked to Wikidata)
encyclopedia_media   — media attachments for encyclopedia items

atlas taxonomy:
  Layer 1: Entity Types  (Concept, Process, Person, Institution, ...)
  Layer 2: Media Types   (raw material formats)
  Layer 3: Products      (assembled passive-delivery content)
  Layer 4: Activities    (require student response)
```

Course content is primarily stored as JSONB (`curriculum_data`, `layout`) in the `courses` table. Lessons are stored in the `lessons` table. The `supabase/migrations/` folder is the authoritative schema reference.

---

## Curriculum system (`src/lib/curriculum/`)

- `template-source-of-truth.ts` — master list of all built-in course templates
- `template-blocks.ts` — atomic building blocks used to compose templates
- `template-json-blueprints.ts` — JSON-serialisable representations of templates
- `ai-generation-service.ts` — calls an AI model to generate curriculum content
- `canvas-projection.ts` — converts stored curriculum data into renderable canvas items
- `data-normalizer.ts` — normalises fetched data before use
- `content-load-service.ts` — orchestrates fetching and loading content into the builder

---

## Course builder component conventions (`src/components/coursebuilder/`)

- `*-primitives.tsx` — low-level presentational building blocks (no data fetching)
- `*-queries.ts` — TanStack Query hooks for reading data
- `*-mutations.ts` — TanStack Query hooks for writing data
- `use-*.ts` — custom React hooks for specific UI behaviour
- `sections/` — higher-level section components composed from primitives
- `index.ts` — barrel export for the whole coursebuilder component module

---

## Design rules

- **No emojis** anywhere — in UI, code comments, or commit messages
- Professional, minimal, business-appropriate interface
- Use SVG icons from `public/icons-coursebuilder/` or Lucide React
- Color system and spacing defined in `src/app/globals.css` via Tailwind CSS v4 custom properties

---

## Testing approach

### Unit tests (Vitest)
- Located in `src/__tests__/` mirroring `src/lib/` and `src/components/`
- Setup file: `src/__tests__/setup.ts`
- Run with: `npm run test`

### E2E tests (Playwright)
- Located in `e2e/`
- Requires local Supabase running (`npx supabase start`) and `.env.test.local` configured
- Run with: `npm run test:e2e`
- Main spec: `e2e/course-creation.spec.ts`

---

## Things to avoid / not modify

- Migration files with a `.disabled` suffix — these are intentionally disabled seed files
- The `private` Postgres schema — reserved for the RocketChat integration
- `supabase/migrations/` files that have already been applied — create new migrations instead of editing existing ones
- `node_modules/`, `.next/`, `.venv/` — build/runtime artefacts

---

## Chrome extension

A companion Chrome extension lives in `chrome-extension/`. It is a separate Vite project.

```bash
npm run ext:dev    # dev build with watch
npm run ext:build  # production build
npm run ext:icons  # regenerate extension icons
```

Source: `chrome-extension/src/` — `background.ts`, `content-script.ts`, `popup.ts`, `settings.ts`
