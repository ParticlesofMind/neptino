# Neptino Project - AI Agent Quick Reference

## Project Overview

Neptino is an interactive learning platform built with **Next.js 16 App Router**, **React 19**, **PIXI.js 8.13**, and **Supabase**.

## Tech Stack

- **Framework:** Next.js 16.x (App Router) + React 19
- **Styling:** Tailwind CSS v4 (no SCSS)
- **UI:** shadcn/ui + Radix UI
- **Canvas:** PIXI.js 8.13 for 2D rendering
- **Database:** Supabase (PostgreSQL, Auth, Storage)
- **ORM:** Drizzle ORM
- **Data Fetching:** TanStack Query
- **Forms:** React Hook Form + Zod
- **Testing:** Playwright (E2E)

## Setup (Quick Start)

### Prerequisites
- Node.js 18+ or 20+
- npm
- Chromium browser (for tests)

### Install & Run

```bash
# Install dependencies
npm install --legacy-peer-deps

# Install Playwright browsers
npx playwright install chromium --with-deps

# Set environment variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
VITE_SUPABASE_URL=<your-url>          # Legacy support
VITE_SUPABASE_ANON_KEY=<your-key>     # Legacy support

# Start dev server
npm run dev

# Run tests
npm test
```

## Common Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)

# Testing
npm test                 # Run all Playwright tests
npm test <file>          # Run specific test file

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Linting/Formatting
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors
npm run format           # Format code with Prettier
```

## Architecture

### Key Directories
- `app/` - Next.js App Router pages/layouts
- `src/scripts/coursebuilder/` - Canvas engine and drawing tools (PIXI.js)
- `src/scripts/backend/` - Supabase integration (auth, database)
- `tests/` - Playwright E2E tests

### Tech Stack
- **Frontend:** Next.js, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Canvas:** PIXI.js 8.13 for high-performance 2D rendering
- **Testing:** Playwright with Chromium

## Troubleshooting

### Issue: Cannot find package '@playwright/test'
**Solution:** Run `npm install --legacy-peer-deps` to install all dependencies including @playwright/test

### Issue: Tests fail to connect to dev server
**Solution:** Playwright auto-starts dev server. Check playwright.config.ts and ensure port 3000 is available

### Issue: Supabase connection errors
**Solution:** Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in .env.local

## Canvas System

- Canvas dimensions: 1200x1800 (2:3 aspect ratio)
- Zoom range: 25% to 500%
- Lazy loading: Viewport-based with 200px pre-load buffer
- Max loaded canvases: 5 simultaneous
- Canvas spacing: Fixed 40px gaps

## For AI Assistants

### Critical Setup Steps
1. Always run `npm install --legacy-peer-deps` before any other commands
2. Install Playwright browsers: `npx playwright install chromium --with-deps`
3. Ensure environment variables are set (especially Supabase credentials)
4. Tests require dev server (auto-started by Playwright config)

### Common Error Patterns
- "Cannot find package" → Run `npm install --legacy-peer-deps`
- "Browser not found" → Run `npx playwright install chromium`
- "Connection refused" → Check if dev server is running
- "Missing env variables" → Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

### Testing Notes
- Tests use Chromium (not Arc browser)
- Dev server runs on port 3000
- Tests are in `tests/` directory with `.spec.ts` extension
- Playwright config: `playwright.config.ts`
