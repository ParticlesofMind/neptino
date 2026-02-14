# Jules AI Memory Entries for Neptino

## Project Memory Entries

Add these memory entries to Jules to help it understand and work with the Neptino project:

---

### Memory Entry 1: Project Overview

**Title:** Neptino Project Architecture

**Content:**
Neptino is an interactive learning platform built with TypeScript, Vite, PIXI.js for canvas rendering, and Supabase for backend. The project uses:
- PIXI.js 8.13 for canvas-based coursebuilder
- Playwright for E2E testing with Chromium
- Vite for development and building
- Supabase for auth and database
- TypeScript with strict mode
- Tailwind CSS utilities for styling (SCSS/BEM removed)

Key directories:
- `src/scripts/coursebuilder/` - Canvas engine and tools
- `src/scripts/backend/` - Supabase integration
- `tests/` - Playwright E2E tests

---

### Memory Entry 2: Testing Setup

**Title:** Running Tests in Neptino

**Content:**
CRITICAL: Before running tests, ensure @playwright/test is installed:
1. Run: `npm install` (installs @playwright/test from package.json)
2. Run: `npx playwright install chromium --with-deps`
3. Tests require dev server: `npm run dev:strict` on port 3000
4. Run tests: `npm test` or `npm test tests/auth-and-messaging.spec.ts`

Playwright config (`playwright.config.ts`) automatically starts dev server before tests.

Common test commands:
- `npm test` - Run all tests
- `npm test tests/auth-and-messaging.spec.ts` - Run specific test
- `npx playwright test --ui` - Run with UI mode
- `npx playwright test --debug` - Run with debugger

---

### Memory Entry 3: Environment Requirements

**Title:** Required Environment Variables

**Content:**
Neptino requires these environment variables (minimum):

REQUIRED:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key
- `VITE_APP_ENV=development` - App environment
- `NODE_ENV=development` - Node environment

OPTIONAL (for media features):
- `VITE_UNSPLASH_KEY` - Unsplash API key
- `VITE_PIXABAY_KEY` - Pixabay API key
- `VITE_FREESOUND_KEY` - FreeSound API key
- `VITE_PEXELS_KEY` - Pexels API key

Get Supabase credentials from: https://supabase.com/dashboard → Your Project → Settings → API

---

### Memory Entry 4: Dependency Installation

**Title:** npm install Failures and Solutions

**Content:**
When `npm install` fails or @playwright/test is missing:

SOLUTION 1 (Preferred):
```bash
cd /app
rm -rf node_modules package-lock.json
npm install
npx playwright install chromium --with-deps
```

SOLUTION 2 (If deps exist):
```bash
cd /app
npm ci
npx playwright install chromium --with-deps
```

SOLUTION 3 (Install Playwright explicitly):
```bash
npm install --save-dev @playwright/test
npx playwright install chromium --with-deps
```

The error "Cannot find package '@playwright/test'" means dependencies weren't installed. Always run `npm install` first.

---

### Memory Entry 5: Canvas and Zoom System

**Title:** Neptino Canvas Zoom and Pan System

**Content:**
The canvas system uses HighQualityZoom for zoom/pan:
- Zoom range: 25% (0.25) to 500% (5.0)
- Zoom step: 20% (0.2)
- Default zoom: fit-to-view (~50-70% depending on viewport)
- Pan tool: Uses transform properties (not scroll position)
- Pan enabled: Only when zoom > fit-to-view level
- Canvas dimensions: 1200x1800 (2:3 aspect ratio)
- Canvas spacing: Fixed 40px between canvases

Key files:
- `src/scripts/coursebuilder/canvas/HighQualityZoom.ts`
- `src/scripts/coursebuilder/canvas/UnifiedZoomManager.ts`
- `src/scripts/coursebuilder/canvas/VerticalCanvasContainer.ts`

---

### Memory Entry 6: Build and Development

**Title:** Building and Running Neptino

**Content:**
Development workflow:
1. `npm install` - Install dependencies
2. `npm run dev` - Start dev server (port 3000, opens Arc browser)
3. `npm run dev:strict` - Dev server for testing (localhost only)
4. `npm run build` - Build for production
5. `npm test` - Run Playwright tests

Important:
- Build is optional for running tests
- Tests use `dev:strict` server (configured in playwright.config.ts)
- Dev server must be running for tests to work
- Arc browser is default, but tests use Chromium

Scripts:
- `dev` - Development with Arc browser auto-open
- `dev:strict` - Strict localhost for testing
- `build` - TypeScript compilation via Vite
- `test` - Playwright E2E tests

---

### Memory Entry 7: Common Error Solutions

**Title:** Troubleshooting Common Errors

**Content:**
ERROR: "Cannot find package '@playwright/test'"
SOLUTION: Run `npm install` then `npx playwright install chromium --with-deps`

ERROR: "ECONNREFUSED localhost:3000"
SOLUTION: Dev server not running. Playwright config auto-starts it, but verify with `npm run dev:strict`

ERROR: "Missing Supabase environment variables"
SOLUTION: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment

ERROR: "Browser not found"
SOLUTION: Run `npx playwright install chromium --with-deps`

ERROR: Test timeouts
SOLUTION: Check if dev server started (look for "Local: http://localhost:3000" in output)

ERROR: "playwright test not found"
SOLUTION: Install with `npm install --save-dev @playwright/test`

---

### Memory Entry 8: Lazy Loading System

**Title:** Canvas Lazy Loading and Performance

**Content:**
Neptino uses viewport-based lazy loading for canvases:

Loading triggers:
- Canvas loads when 30% visible (intersectionRatio > 0.3)
- Pre-loading: 200px before entering viewport
- Unloading: When completely out of viewport (intersectionRatio === 0)
- Maximum loaded: 5 canvases at once
- Debounce: 500ms on intersection events

Performance settings (VerticalCanvasContainer.ts):
```typescript
rootMargin: '200px 0px 200px 0px'  // Pre-load buffer
threshold: [0.1, 0.5, 0.9]  // Detection points
maxLoadedCanvases: 5
loadThrottleMs: 500
```

Each canvas is 1200x1800px with 40px spacing.
Uses IntersectionObserver API for efficient viewport detection.

---

## Setup Script (Copy to Jules)

**Setup Script Name:** `jules-setup-optimized.sh`

**Contents:**
```bash
#!/bin/bash
set -e
cd /app
echo "🚀 Neptino Setup"
npm ci --prefer-offline --no-audit 2>/dev/null || npm install
npx playwright install chromium --with-deps || {
    sudo npx playwright install-deps chromium
    npx playwright install chromium
}
npm run build 2>/dev/null || echo "Build skipped"
echo "✅ Setup complete - Ready to run: npm test"
```

---

## Quick Start Checklist for Jules

1. ✅ Add setup script above
2. ✅ Add 4 required environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_ENV, NODE_ENV)
3. ✅ Add all 8 memory entries above
4. ✅ Run setup script
5. ✅ Verify with: `npm test`
6. ✅ Create snapshot after successful setup

Expected setup time: 3-5 minutes (first run), <30 seconds (with snapshot)
