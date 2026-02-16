# 🚀 Jules Quick Setup - Neptino

## Copy this setup script to Jules:

**File:** `jules-setup.sh`
**Location:** Upload to Jules as startup script
**Status:** ✅ Executable

```bash
#!/bin/bash
# Jules AI Environment Setup - Neptino Project
set -e

echo "🚀 Jules Environment Setup - Neptino"
cd /app || cd "$(dirname "$0")"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build || echo "⚠️ Build step skipped"

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install chromium --with-deps 2>/dev/null || echo "⚠️ Will install on first test"

echo "✅ Environment setup complete"
echo "🎯 Run: npm test"
```

---

## 🔐 Required Environment Variables (Copy to Jules)

### MINIMUM REQUIRED (Must have these!):

| Key | Value | Get it from |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | `https://yourproject.supabase.co` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase Dashboard → Settings → API → anon/public |
| `VITE_APP_ENV` | `development` | Fixed value |
| `NODE_ENV` | `development` | Fixed value |

### Optional (Add if testing media features):

| Key | Example |
|-----|---------|
| `VITE_UNSPLASH_KEY` | `your_key` |
| `VITE_PIXABAY_KEY` | `your_key` |
| `VITE_FREESOUND_KEY` | `your_key` |

---

## 📋 Jules Setup Checklist

### Step 1: Environment Variables
- [ ] Go to Jules → Environment Variables
- [ ] Click "Add Variable"
- [ ] Add `VITE_SUPABASE_URL` (from your Supabase project)
- [ ] Add `VITE_SUPABASE_ANON_KEY` (from your Supabase project)
- [ ] Add `VITE_APP_ENV` = `development`
- [ ] Add `NODE_ENV` = `development`
- [ ] Save all variables

### Step 2: Setup Script
- [ ] Copy `jules-setup.sh` content above
- [ ] Paste into Jules setup script editor
- [ ] Save the script

### Step 3: Run & Snapshot
- [ ] Click "Run Setup" (takes ~2-3 minutes first time)
- [ ] Wait for "✅ Environment setup complete"
- [ ] Click "Snapshot Environment" (caches for future runs)

### Step 4: Verify
- [ ] Run command: `npm test`
- [ ] Check that tests can access Supabase
- [ ] Verify canvas and PIXI.js tests pass

---

## 🆘 Quick Troubleshooting

**Problem:** `Missing Supabase environment variables`  
**Fix:** Check you added both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Problem:** Build fails  
**Fix:** Not critical - dev/test will still work. Build is optional.

**Problem:** Playwright can't find browsers  
**Fix:** Run manually: `npx playwright install chromium --with-deps`

**Problem:** Tests fail to connect to Supabase  
**Fix:** Verify your Supabase URL and key are correct in Jules environment variables

---

## 🎯 Post-Setup Commands

```bash
# Run all tests
npm test

# Run specific test
npm test -- tests/canvas.spec.ts

# Start dev server (if needed)
npm run dev

# Check environment variables
echo $VITE_SUPABASE_URL

# Lint code
npm run lint
```

---

## 📊 What Gets Installed

- **Node Modules:** All dependencies from `package.json`
  - PIXI.js 8.13 (canvas engine)
  - Supabase JS client
  - Playwright (testing)
  - TypeScript
  - Vite (build tool)
  
- **Playwright Browsers:** Chromium (for tests)

- **Build Output:** TypeScript compiled to JavaScript

---

## 💡 Pro Tips

1. **Snapshot after setup** - Saves 2-3 minutes on every future run
2. **Use remote Supabase** - Don't try to run Supabase locally in Jules
3. **Check logs** - If setup fails, check the Jules console output
4. **Test incrementally** - Run `npm test` to verify everything works
5. **Update variables** - If you change Supabase project, update the env vars

---

## 📁 Files Created

- ✅ `jules-setup.sh` - Main setup script (executable)
- ✅ `JULES_ENVIRONMENT.md` - Full documentation
- ✅ `JULES_QUICK_REFERENCE.md` - This file (quick reference)

---

**Ready to go?** Copy the setup script above into Jules and follow the checklist! 🚀
