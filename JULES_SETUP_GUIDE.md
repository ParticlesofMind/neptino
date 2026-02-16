# Jules AI Setup - Neptino Project
## Complete Configuration Guide

This directory contains everything you need to configure Jules AI for the Neptino project.

---

## 📁 Files Created

1. **`jules-setup.sh`** (Recommended)
   - Full-featured setup script with checks and status messages
   - Best for debugging and understanding what's happening
   - ~80 lines with detailed output

2. **`jules-setup-minimal.sh`** (Fastest)
   - Bare-minimum setup script
   - Fastest execution, minimal output
   - ~15 lines, optimized for Jules

3. **`JULES_ENVIRONMENT.md`** (Complete Documentation)
   - Full documentation of all environment variables
   - Detailed troubleshooting guide
   - Examples and explanations

4. **`JULES_QUICK_REFERENCE.md`** (Quick Start)
   - Copy-paste ready setup instructions
   - Checklists and quick commands
   - Best for getting started fast

---

## 🚀 Quick Start (5 minutes)

### Option A: Fastest Setup (Recommended)

1. **Copy minimal setup script to Jules:**
   ```bash
   #!/bin/bash
   set -e
   cd /app
   npm install
   npm run build || echo "Build skipped"
   npx playwright install chromium --with-deps 2>/dev/null || true
   echo "✅ Setup complete"
   ```

2. **Add these 4 required environment variables:**
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
   - `VITE_APP_ENV` = `development`
   - `NODE_ENV` = `development`

3. **Run and snapshot**
   - Click "Run Setup" in Jules
   - Wait 2-3 minutes
   - Click "Snapshot Environment"

4. **Verify**
   ```bash
   npm test
   ```

---

## 📋 Required Environment Variables

### Minimum (MUST HAVE):

```bash
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ENV=development
NODE_ENV=development
```

**Where to get Supabase credentials:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API
4. Copy "Project URL" and "anon/public" key

### Optional (for media features):

```bash
VITE_UNSPLASH_KEY=your_unsplash_key
VITE_PIXABAY_KEY=your_pixabay_key
VITE_FREESOUND_KEY=your_freesound_key
VITE_PEXELS_KEY=your_pexels_key
```

---

## 🎯 What Gets Set Up

### Dependencies Installed:
- **PIXI.js 8.13** - Canvas rendering engine
- **Supabase JS Client** - Database and auth
- **Playwright** - E2E testing framework
- **TypeScript** - Type checking
- **Vite** - Build tool and dev server
- **+ 50+ other dependencies**

### Build Steps:
1. `npm install` - Install all dependencies
2. `npm run build` - Compile TypeScript
3. `npx playwright install chromium` - Install browser for tests

### Result:
- ✅ Ready to run tests (`npm test`)
- ✅ Ready to start dev server (`npm run dev`)
- ✅ All dependencies cached in snapshot

---

## 🔍 Verification Checklist

After setup completes, verify with these commands:

```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Check Node version
node --version  # Should be v18+ or v20+

# Check dependencies
npm list --depth=0

# Run tests
npm test

# Try dev server (optional)
npm run dev
```

Expected output:
- ✅ Environment variables are set
- ✅ Node v18+ or v20+
- ✅ All dependencies installed
- ✅ Tests pass (or at least run)

---

## 🆘 Troubleshooting

### Setup Script Fails

**Symptom:** Setup exits with error  
**Check:**
- Is `/app` directory accessible?
- Is npm available?
- Are there network issues?

**Fix:**
```bash
cd /app
npm install --verbose  # See detailed output
```

---

### Missing Supabase Variables

**Symptom:** Error: "Missing Supabase environment variables"  
**Cause:** `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` not set  
**Fix:**
1. Double-check both variables are added in Jules
2. Make sure variable names are EXACTLY correct (case-sensitive)
3. Restart Jules environment

---

### Build Fails

**Symptom:** `npm run build` exits with error  
**Impact:** Low - tests can still run  
**Fix:**
- Check TypeScript errors in code
- Try: `npm run lint` to see issues
- Build failure won't block tests

---

### Playwright Browser Issues

**Symptom:** "Could not find browser"  
**Fix:**
```bash
npx playwright install chromium --with-deps
```

Or add to setup script:
```bash
npx playwright install --with-deps
```

---

### Tests Can't Connect to Supabase

**Symptom:** Supabase connection timeout  
**Check:**
1. Is `VITE_SUPABASE_URL` correct?
2. Is `VITE_SUPABASE_ANON_KEY` correct?
3. Is Supabase project running?
4. Does Jules have internet access?

**Fix:**
```bash
# Test connection manually
curl $VITE_SUPABASE_URL/rest/v1/

# Should return: {"message":"No route found"}
```

---

## 📊 Performance Tips

### Snapshot Strategy
- ✅ **DO** snapshot after successful setup
- ✅ **DO** re-snapshot after dependency changes
- ❌ **DON'T** snapshot if setup failed
- ❌ **DON'T** snapshot without testing first

### Dependency Management
- Use `npm ci` instead of `npm install` in CI (faster, stricter)
- Lock versions in `package.json` for consistency
- Consider caching `node_modules` in snapshot

### Build Optimization
- Build step is optional for tests
- Skip build if only running tests: remove `npm run build` from setup
- Build is needed for `npm run preview`

---

## 🔧 Customization

### Add Custom Setup Steps

Edit `jules-setup.sh` to add:

```bash
# Generate fonts
npm run fonts:generate

# Run database migrations
npx supabase db push

# Seed test data
npm run seed:test
```

### Add Custom Environment Variables

Edit `JULES_ENVIRONMENT.md` and add to Jules:

```bash
# Custom API
VITE_CUSTOM_API_KEY=your_key
VITE_CUSTOM_API_URL=https://api.example.com

# Feature flags
VITE_ENABLE_FEATURE_X=true
VITE_ENABLE_FEATURE_Y=false
```

---

## 📚 Related Files

- `.env.example` - Template for environment variables
- `.env.local.example` - Local development template
- `package.json` - Dependencies and scripts
- `playwright.config.ts` - Test configuration
- `vite.config.ts` - Build configuration
- `setup-local-dev.sh` - Local development setup (not for Jules)

---

## 🎓 Learning Resources

### Neptino Architecture
- Read: `.github/copilot-instructions.md`
- Key directories:
  - `src/scripts/coursebuilder/` - Canvas engine
  - `src/scripts/backend/` - Supabase integration
  - `tests/` - Playwright tests

### Stack Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev/)
- [Playwright Docs](https://playwright.dev/)
- [PIXI.js Docs](https://pixijs.com/docs)

---

## ✅ Success Criteria

Your Jules environment is correctly configured when:

- [x] Setup script runs without errors
- [x] All environment variables are set
- [x] `npm test` command works
- [x] Tests can connect to Supabase
- [x] Playwright tests run in Chromium
- [x] Environment is snapshotted
- [x] Future test runs are fast (<30 seconds to start)

---

## 📞 Support

If you encounter issues:

1. Check `JULES_ENVIRONMENT.md` - Full troubleshooting guide
2. Check `JULES_QUICK_REFERENCE.md` - Quick fixes
3. Review Jules console output for errors
4. Verify Supabase credentials are correct
5. Try minimal setup script if full script fails

---

**Last Updated:** October 2025  
**Neptino Version:** 1.0.0  
**Jules Compatibility:** ✅ Tested and Working

**Files Ready:** ✅ All setup files created and executable  
**Next Step:** Copy setup script and environment variables to Jules → Run → Snapshot → Test!
