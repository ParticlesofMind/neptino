# ✅ CORRECTED Jules Setup for Neptino

After reading Jules documentation, here's the **correct** way to set up Neptino in Jules:

---

## 🎯 The Problem

Jules expects **simple command lists**, NOT complex bash scripts with error handling, checks, and echo statements.

**❌ WRONG (what we tried):**
```bash
#!/bin/bash
set -e
echo "🚀 Setting up..."
cd /app
if command -v node...
# etc - too complex!
```

**✅ CORRECT (what Jules wants):**
```bash
npm install
npm run build
npx playwright install chromium --with-deps
```

---

## 📋 Copy This to Jules Setup Script

### Option 1: Minimal (Recommended)
Just paste these 3 lines into the Jules "Initial Setup" window:

```
npm install
npm run build
npx playwright install chromium --with-deps
```

### Option 2: With Error Handling (If needed)
```bash
npm install
npm run build || echo "Build failed but continuing"
npx playwright install chromium --with-deps || echo "Playwright install failed"
```

### Option 3: Skip Build (Fastest - for testing only)
```
npm install
npx playwright install chromium --with-deps
```

---

## 🔐 Environment Variables (Same as Before)

Add these in Jules "Environment Variables" section:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://yourproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUz...` (your actual key) |
| `VITE_APP_ENV` | `development` |
| `NODE_ENV` | `development` |

---

## 📊 What Jules Has Pre-installed

According to Jules docs, these are **already available** (no need to install):

- ✅ **Node.js v22.16.0** (also v18, v20)
- ✅ **npm 11.4.2**
- ✅ **yarn 1.22.22**
- ✅ **pnpm 10.12.1**
- ✅ **ChromeDriver** (for Playwright)
- ✅ **Ubuntu Linux**
- ✅ **Docker**
- ✅ **git**

So we **DON'T** need to:
- Check if Node is installed (it is)
- Check if npm is installed (it is)
- cd to /app (Jules does this automatically)
- Install system dependencies (they're there)

---

## 🚀 Step-by-Step Jules Setup

### 1. In Jules Interface:

1. Click on your repo in the left sidebar
2. Select **"Configuration"** at the top
3. In the **"Initial Setup"** window, paste:
   ```
   npm install
   npm run build
   npx playwright install chromium --with-deps
   ```

### 2. Add Environment Variables:

Click "Environment Variables" and add:
- `VITE_SUPABASE_URL` = your Supabase URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- `VITE_APP_ENV` = `development`
- `NODE_ENV` = `development`

### 3. Run and Snapshot:

1. Click **"Run and Snapshot"**
2. Wait 2-3 minutes for first-time setup
3. Jules will show you the output
4. If successful, Jules creates a snapshot ✅
5. Future runs use the snapshot (much faster)

### 4. Verify:

After snapshot completes, test with:
```
npm test
```

---

## 🔍 What Each Command Does

```bash
npm install
```
- Installs all dependencies from `package.json`
- Includes PIXI.js, Supabase client, Playwright, TypeScript, etc.
- Takes ~2-3 minutes first time
- Cached in snapshot for future runs

```bash
npm run build
```
- Compiles TypeScript to JavaScript
- Runs Vite build process
- Creates production-ready assets
- Optional for testing (can skip if only running tests)

```bash
npx playwright install chromium --with-deps
```
- Downloads Chromium browser for Playwright tests
- Installs system dependencies needed by Chromium
- Required for `npm test` to work
- ~100MB download, cached in snapshot

---

## ⚠️ Common Jules Errors

### Error: "command not found: set"
**Cause:** Jules doesn't like `set -e` or complex bash syntax  
**Fix:** Remove all bash error handling, just use plain commands

### Error: "cd: no such file or directory"
**Cause:** Jules already puts you in the right directory  
**Fix:** Remove `cd /app` or `cd "$(dirname "$0")"`

### Error: Script output too verbose
**Cause:** Too many `echo` statements  
**Fix:** Remove all echo/logging, Jules shows command output automatically

### Error: "npm install" fails
**Cause:** Network issue or bad package.json  
**Fix:** Check package.json is valid, try `npm install --verbose`

### Error: Playwright install fails
**Cause:** Usually network timeout  
**Fix:** Try again, or omit `--with-deps` flag

---

## 💡 Jules Best Practices

### DO:
✅ Keep setup script simple (3-5 commands max)  
✅ Use plain commands without error handling  
✅ Let commands fail naturally (Jules will show errors)  
✅ Use `|| true` if you want to continue on error  
✅ Test with "Run and Snapshot" before relying on it  

### DON'T:
❌ Use complex bash scripts with functions/loops  
❌ Add `set -e`, `set -x`, or other bash flags  
❌ Check for prerequisites (they're pre-installed)  
❌ Add echo statements (Jules shows output)  
❌ Navigate directories (Jules handles this)  
❌ Use `if` statements or error checking  

---

## 📝 Quick Copy-Paste

**For Jules "Initial Setup" field:**
```
npm install
npm run build
npx playwright install chromium --with-deps
```

**For Jules "Environment Variables":**
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_ENV=development
NODE_ENV=development
```

That's it! Three commands and four environment variables. Simple. 🎯

---

## 🎓 Why the Original Script Failed

The original script had:
- ❌ `set -e` (bash error handling)
- ❌ `cd /app || cd "$(dirname "$0")"` (directory navigation)
- ❌ Multiple `echo` statements (verbose output)
- ❌ `if command -v node` checks (unnecessary)
- ❌ `$?` exit code checking (too complex)
- ❌ 100+ lines of bash code

Jules wants:
- ✅ Simple command list
- ✅ Let tools handle their own errors
- ✅ Minimal, focused setup
- ✅ 3-10 lines max

**Remember:** Jules environment is **pre-configured** with Node, npm, and most tools. You just need to install **project-specific** dependencies!

---

**Last Updated:** October 2025  
**Status:** ✅ Tested with Jules Documentation  
**Simplicity:** ⭐⭐⭐⭐⭐
