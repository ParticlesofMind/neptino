# Neptino

An educational platform for tutors and teachers to create, manage, and deliver courses.

## Tech stack

- [Next.js 16](https://nextjs.org/) — App Router, React 19, TypeScript
- [Supabase](https://supabase.com/) — PostgreSQL, Auth, Storage
- [Tailwind CSS v4](https://tailwindcss.com/)
- [TanStack Query v5](https://tanstack.com/query/latest) — server state
- [Zustand v5](https://zustand.pmnd.rs/) — client state
- [dnd-kit](https://dndkit.com/) — drag-and-drop
- [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) — testing

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project dashboard (or from `npx supabase status` for local dev).

### 3. Start local Supabase

```bash
npx supabase start
npx supabase db reset   # applies all migrations
```

### 4. Start the dev server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run lint` | ESLint |
| `npm run ext:dev` | Chrome extension dev build |
| `npm run ext:build` | Chrome extension production build |

## Project structure

```
src/
  app/                    # Next.js App Router pages and API routes
    (coursebuilder)/      # Teacher-facing course builder
    (dashboard)/          # Role-based dashboards
  components/
    coursebuilder/        # Course builder UI and hooks
    encyclopedia/         # Encyclopedia browsing
    layout/               # Shell components
    ui/                   # Shared design system primitives
  lib/
    supabase/             # Supabase clients (browser + server)
    curriculum/           # Curriculum domain logic and AI generation
  types/
    atlas.ts              # Atlas knowledge taxonomy types

supabase/
  migrations/             # Database schema (source of truth)

e2e/                      # Playwright end-to-end tests
src/__tests__/            # Vitest unit tests

chrome-extension/         # Companion browser extension (separate Vite project)
```

## Database

Schema is managed via Supabase migrations in `supabase/migrations/`. To reset the local database to the latest schema:

```bash
npx supabase db reset
```

Never edit existing migration files. Always create a new migration for schema changes.

## Design guidelines

- No emojis in the UI or codebase
- Professional, minimal aesthetic
- Use SVG icons from `public/icons-coursebuilder/` or Lucide React
