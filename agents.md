# Neptino Project - AI Agent Configuration

## Project Overview

Neptino is an interactive learning platform built with TypeScript, PIXI.js, Vite, and Supabase.

## Setup Requirements

### Prerequisites
- Node.js 18+ or 20+
- npm or yarn
- Chromium browser (for Playwright tests)

### Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install Playwright Browsers**
   ```bash
   npx playwright install chromium --with-deps
   ```

3. **Set Environment Variables**
   ```bash
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   VITE_APP_ENV=development
   NODE_ENV=development
   ```

4. **Build (Optional)**
   ```bash
   npm run build
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## Common Commands

```bash
# Development
npm run dev              # Start dev server with Arc browser
npm run dev:strict       # Start dev server for testing (localhost only)

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
- `src/scripts/coursebuilder/` - Canvas engine and drawing tools (PIXI.js)
- `src/scripts/backend/` - Supabase integration (auth, database)
- `tests/` - Playwright E2E tests

### Tech Stack
- **Frontend:** TypeScript, Vite, PIXI.js 8.13
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Testing:** Playwright with Chromium
- **Styling:** Tailwind CSS utilities (no SCSS/BEM)
- **Canvas:** PIXI.js for high-performance 2D rendering

## Troubleshooting

### Issue: Cannot find package '@playwright/test'
**Solution:** Run `npm install` to install all dependencies including @playwright/test

### Issue: Tests fail to connect to dev server
**Solution:** Playwright auto-starts dev server. Check playwright.config.ts and ensure port 3000 is available

### Issue: Supabase connection errors
**Solution:** Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly

## Canvas System

- Canvas dimensions: 1200x1800 (2:3 aspect ratio)
- Zoom range: 25% to 500%
- Lazy loading: Viewport-based with 200px pre-load buffer
- Max loaded canvases: 5 simultaneous
- Canvas spacing: Fixed 40px gaps

## For AI Assistants

### Critical Setup Steps
1. Always run `npm install` before any other commands
2. Install Playwright browsers: `npx playwright install chromium --with-deps`
3. Ensure environment variables are set (especially Supabase credentials)
4. Tests require dev server (auto-started by Playwright config)

### Common Error Patterns
- "Cannot find package" → Run `npm install`
- "Browser not found" → Run `npx playwright install chromium`
- "Connection refused" → Check if dev server is running
- "Missing env variables" → Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### Testing Notes
- Tests use Chromium (not Arc browser)
- Dev server runs on port 3000
- Tests are in `tests/` directory with `.spec.ts` extension
- Playwright config: `playwright.config.ts`

## Documentation Files

- `README.md` - Main project documentation
- `JULES_QUICK_START.md` - Quick setup for Jules AI
- `JULES_MEMORY.md` - Memory entries for Jules AI
- `JULES_SETUP_GUIDE.md` - Comprehensive setup guide
- `.env.example` - Environment variable template

## Support

For detailed setup and troubleshooting, see:
- `JULES_QUICK_START.md` - 5-minute quick start
- `JULES_SETUP_GUIDE.md` - Complete setup documentation
- `JULES_MEMORY.md` - AI assistant memory entries
