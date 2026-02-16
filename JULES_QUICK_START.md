# Jules AI - Neptino Quick Start

## 🚀 5-Minute Setup

### 1. Setup Script (Copy-Paste to Jules)

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

### 2. Environment Variables (Add to Jules)

**REQUIRED (Get from Supabase Dashboard → Settings → API):**

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ENV=development
NODE_ENV=development
```

### 3. Run Setup

1. Click "Run Setup Script" in Jules
2. Wait 3-5 minutes for first run
3. Verify success: Look for "✅ Setup complete"
4. Click "Create Snapshot" to save environment

### 4. Test Commands

```bash
# Run all tests
npm test

# Run specific test
npm test tests/auth-and-messaging.spec.ts

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

---

## 🔧 If Setup Fails

### Error: Cannot find package '@playwright/test'

**Fix:**
```bash
cd /app
npm install
npx playwright install chromium --with-deps
```

### Error: npm install fails

**Fix:**
```bash
cd /app
rm -rf node_modules package-lock.json
npm install
```

### Error: Tests can't connect

**Check:**
1. Are VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set?
2. Is Supabase project running?
3. Test connection: `curl $VITE_SUPABASE_URL/rest/v1/`

---

## 📝 Essential Memory Entries

Add these 3 critical memories to Jules:

### Memory 1: Testing
**Title:** Running Tests  
**Content:** Always run `npm install` before tests. Tests need @playwright/test package and chromium browser. Install with: `npm install && npx playwright install chromium --with-deps`. Run tests: `npm test` or `npm test tests/auth-and-messaging.spec.ts`

### Memory 2: Dependencies  
**Title:** npm install Required  
**Content:** If seeing "Cannot find package '@playwright/test'" error, dependencies aren't installed. Always run `npm install` first, then `npx playwright install chromium --with-deps`. The repo must be in /app directory.

### Memory 3: Environment
**Title:** Required Environment Variables  
**Content:** Neptino requires: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_ENV=development, NODE_ENV=development. Get Supabase credentials from https://supabase.com/dashboard → Project → Settings → API

---

## ✅ Success Checklist

- [ ] Setup script runs without errors
- [ ] All 4 environment variables added
- [ ] `npm test` command works
- [ ] At least 3 memory entries added
- [ ] Environment snapshotted
- [ ] Tests run in <30 seconds (after snapshot)

---

## 🎯 Expected Results

**First Run:** 3-5 minutes  
**With Snapshot:** <30 seconds  
**Test Execution:** 30-60 seconds  

**Success Output:**
```
🚀 Neptino Setup
✅ Setup complete - Ready to run: npm test

Running 3 tests using 1 worker
  3 passed (45s)
```

---

## 📚 Full Documentation

- `JULES_MEMORY.md` - Complete memory entries (8 total)
- `JULES_SETUP_GUIDE.md` - Comprehensive setup guide
- `jules-setup-optimized.sh` - The setup script
- `JULES_ENVIRONMENT.md` - Environment variable details

---

**Last Updated:** January 2025  
**Tested With:** Jules AI (Google)  
**Status:** ✅ Working
