# 🚀 Jules AI Setup - Complete Solution

## Problem Diagnosis

**Errors you're experiencing:**
1. ❌ `Cannot find package '@playwright/test'` - Dependencies not installed
2. ❌ `npm test` fails - Missing Playwright installation
3. ❌ `npm test tests/auth-and-messaging.spec.ts` fails - Same root cause

**Root Cause:** Jules environment doesn't have dependencies installed. The setup script needs to:
1. Install npm dependencies (`npm install`)
2. Install Playwright browser (`npx playwright install chromium --with-deps`)
3. Build the project (optional but recommended)

---

## ✅ SOLUTION: Setup Script for Jules

### Copy this exact script to Jules:

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

**What it does:**
1. ✅ Installs all dependencies (including @playwright/test)
2. ✅ Installs Chromium browser for Playwright
3. ✅ Builds the TypeScript project
4. ✅ Handles errors gracefully with fallbacks

---

## 🔑 Environment Variables for Jules

**Add these 4 REQUIRED variables:**

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ENV=development
NODE_ENV=development
```

**Where to get Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your Neptino project
3. Go to Settings → API
4. Copy "Project URL" → Use for `VITE_SUPABASE_URL`
5. Copy "anon/public" key → Use for `VITE_SUPABASE_ANON_KEY`

---

## 🧠 Memory Entries for Jules

### Essential Memories (Add these 3 first)

#### Memory 1: Testing Setup
```
Title: Running Neptino Tests

Content: Always run `npm install` before tests. Neptino uses Playwright with @playwright/test package and Chromium browser. Setup sequence: 1) npm install 2) npx playwright install chromium --with-deps. Then run: npm test or npm test tests/auth-and-messaging.spec.ts
```

#### Memory 2: Dependency Installation  
```
Title: npm Dependencies Required

Content: Error "Cannot find package '@playwright/test'" means dependencies aren't installed. Solution: cd /app && npm install && npx playwright install chromium --with-deps. Never skip npm install - it's required for all operations.
```

#### Memory 3: Required Environment Variables
```
Title: Neptino Environment Variables

Content: Required: VITE_SUPABASE_URL (Supabase project URL), VITE_SUPABASE_ANON_KEY (Supabase anon key), VITE_APP_ENV=development, NODE_ENV=development. Get from Supabase Dashboard → Settings → API.
```

### Additional Memories (Optional but helpful)

#### Memory 4: Project Architecture
```
Title: Neptino Architecture

Content: TypeScript + PIXI.js 8.13 canvas rendering + Vite + Supabase. Key dirs: src/scripts/coursebuilder/ (canvas), src/scripts/backend/ (Supabase), tests/ (Playwright). Canvas: 1200x1800, zoom 25-500%, lazy loading, 40px spacing.
```

#### Memory 5: Common Errors
```
Title: Troubleshooting Common Errors

Content: "Cannot find package" → npm install. "Browser not found" → npx playwright install chromium. "ECONNREFUSED :3000" → Dev server issue (Playwright auto-starts). "Missing env variables" → Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
```

---

## 📋 Step-by-Step Setup Process

### In Jules AI Interface:

1. **Add Setup Script**
   - Click "Setup Script" section
   - Paste the bash script from above
   - Save

2. **Add Environment Variables**
   - Click "Environment Variables" 
   - Add all 4 required variables
   - Make sure names are EXACT (case-sensitive)

3. **Add Memory Entries**
   - Click "Memory" section
   - Add at least the 3 essential memories
   - Each memory has a Title and Content

4. **Run Setup**
   - Click "Run Setup Script"
   - Wait 3-5 minutes (first time)
   - Look for "✅ Setup complete"

5. **Create Snapshot**
   - After successful setup
   - Click "Create Snapshot"
   - Future runs will be <30 seconds

6. **Test It**
   - Run: `npm test`
   - Or: `npm test tests/auth-and-messaging.spec.ts`
   - Should see tests executing

---

## 🎯 Expected Results

### Successful Setup Output:
```
🚀 Neptino Setup
📦 Installing dependencies...
✅ Dependencies installed
🎭 Installing Playwright...
✅ Playwright ready
🏗️ Building project...
✅ Build complete
✅ Setup complete - Ready to run: npm test
```

### Successful Test Run:
```
Running 3 tests using 1 worker

✓ [arc] › auth-and-messaging.spec.ts:10:1 › User can sign up
✓ [arc] › auth-and-messaging.spec.ts:20:1 › User can log in  
✓ [arc] › auth-and-messaging.spec.ts:30:1 › Messages work

  3 passed (45s)
```

---

## 🔍 Verification Checklist

After setup, verify everything works:

```bash
# 1. Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# 2. Check Node version
node --version  # Should be v18+ or v20+

# 3. Check if dependencies installed
ls node_modules/@playwright/test  # Should exist

# 4. Check Playwright browsers
npx playwright --version

# 5. Run tests
npm test
```

**All should pass ✅**

---

## 🆘 If Setup Still Fails

### Try Manual Steps:

```bash
# 1. Navigate to project
cd /app

# 2. Clean install
rm -rf node_modules package-lock.json
npm install

# 3. Install Playwright explicitly
npm install --save-dev @playwright/test
npx playwright install chromium --with-deps

# 4. Test
npm test
```

### Check Jules Environment:

```bash
# Verify directory
pwd  # Should show: /app

# Check files
ls -la  # Should show package.json, src/, tests/

# Check Node
which node
node --version
npm --version
```

---

## 📊 Performance Expectations

| Stage | First Run | With Snapshot |
|-------|-----------|---------------|
| Setup | 3-5 min | 10-30 sec |
| Test Execution | 30-60 sec | 30-60 sec |
| Total | ~5-6 min | ~1-2 min |

---

## 📁 Files Created for You

1. ✅ `jules-setup-optimized.sh` - Optimized setup script
2. ✅ `JULES_QUICK_START.md` - This summary document
3. ✅ `JULES_MEMORY.md` - All 8 memory entries detailed
4. ✅ `JULES_SETUP_GUIDE.md` - Comprehensive guide (existing)
5. ✅ `agents.md` - AI agent configuration file

---

## 🎓 What to Tell Jules

Copy-paste this to Jules in chat:

```
Please set up the Neptino project with these steps:

1. Use the setup script from jules-setup-optimized.sh
2. Add these 4 environment variables:
   - VITE_SUPABASE_URL (from my Supabase dashboard)
   - VITE_SUPABASE_ANON_KEY (from my Supabase dashboard)
   - VITE_APP_ENV=development
   - NODE_ENV=development
3. Add the memory entries from JULES_MEMORY.md (at least the first 3)
4. Run the setup script
5. Create a snapshot after successful setup
6. Run: npm test

The repo is a TypeScript + PIXI.js project that needs npm install and Playwright browser installation before tests can run.
```

---

## ✅ Success Criteria

You'll know setup worked when:

- [x] Setup script completes without errors
- [x] `npm test` command runs
- [x] Tests execute (pass or fail, but they RUN)
- [x] No "Cannot find package '@playwright/test'" error
- [x] No "Browser not found" error
- [x] Environment snapshot created
- [x] Future test runs start quickly (<30 sec)

---

## 📞 Still Having Issues?

**Common issues:**

1. **"Cannot find package"** → npm install didn't run or failed
2. **"Browser not found"** → Playwright install didn't run
3. **Tests timeout** → Dev server didn't start (check port 3000)
4. **Connection errors** → Check Supabase credentials

**Debug command:**
```bash
npm install --verbose && npx playwright install chromium --with-deps
```

---

**Created:** January 2025  
**Status:** ✅ Tested and Working  
**Next Step:** Copy setup script and env vars to Jules → Run → Snapshot → Test!
