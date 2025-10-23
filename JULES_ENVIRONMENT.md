# Jules Environment Variables - Neptino Project

This document describes all environment variables needed for Neptino to run properly in the Jules AI environment.

## 🔐 Required Environment Variables

### Supabase Configuration (REQUIRED)

| Key | Example Value | Description |
|-----|---------------|-------------|
| `VITE_SUPABASE_URL` | `https://xyzcompany.supabase.co` | Your Supabase project URL (from Supabase Dashboard) |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase anonymous/public API key (safe for frontend) |

**How to get these:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy "Project URL" → `VITE_SUPABASE_URL`
5. Copy "anon/public" key → `VITE_SUPABASE_ANON_KEY`

---

## 🎨 Application Configuration

| Key | Value | Description |
|-----|-------|-------------|
| `VITE_APP_ENV` | `development` | Environment mode (development/staging/production) |
| `VITE_APP_NAME` | `Neptino Educational Platform` | Application display name |
| `NODE_ENV` | `development` | Node.js environment mode |

---

## 🔑 Optional API Keys (Media Services)

These are **optional** but enable media search features in the course builder:

### Image Services
| Key | Example | Description |
|-----|---------|-------------|
| `VITE_UNSPLASH_KEY` | `your_unsplash_access_key` | Unsplash API key for free stock photos |
| `VITE_PIXABAY_KEY` | `your_pixabay_api_key` | Pixabay API key for images/videos |
| `VITE_PEXELS_KEY` | `your_pexels_api_key` | Pexels API key for stock photos |

### Audio Services
| Key | Example | Description |
|-----|---------|-------------|
| `VITE_FREESOUND_KEY` | `your_freesound_api_key` | Freesound API key for audio clips |

### Cloud Storage (OAuth)
| Key | Example | Description |
|-----|---------|-------------|
| `VITE_GOOGLE_DRIVE_KEY` | `your_google_api_key` | Google Drive API key |
| `VITE_GOOGLE_DRIVE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google OAuth client ID |
| `VITE_DROPBOX_KEY` | `your_dropbox_api_key` | Dropbox API key |
| `VITE_DROPBOX_CLIENT_ID` | `your_dropbox_client_id` | Dropbox OAuth client ID |
| `VITE_OAUTH_REDIRECT` | `http://localhost:3000/oauth/callback` | OAuth redirect URI |

---

## 🗄️ Advanced Configuration (Optional)

### Service Role Key (Admin Operations)
| Key | Example | Description |
|-----|---------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **Admin-only** service role key (bypasses RLS). Use with caution! |

⚠️ **Warning:** Service role key should only be used for backend/admin operations. Never expose in frontend code.

### Database Direct Connection (Optional)
| Key | Example | Description |
|-----|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` | Direct Postgres connection string (for migrations/Prisma) |

---

## 🧪 Testing Configuration

### Playwright
| Key | Value | Description |
|-----|-------|-------------|
| `CI` | `true` | Set to `true` in CI environment for strict testing |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3000` | Base URL for Playwright tests |

---

## 📝 Complete Jules Configuration Example

Here's what your Jules environment variables should look like (with real values):

```bash
# ============================================================================
# REQUIRED - Supabase Backend
# ============================================================================
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXJwcm9qZWN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTk5NTU3NjAwMH0.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================================================
# Application Configuration
# ============================================================================
VITE_APP_ENV=development
VITE_APP_NAME=Neptino Educational Platform
NODE_ENV=development

# ============================================================================
# Optional - Media API Keys (comment out if not used)
# ============================================================================
# VITE_UNSPLASH_KEY=your_unsplash_key
# VITE_PIXABAY_KEY=your_pixabay_key
# VITE_PEXELS_KEY=your_pexels_key
# VITE_FREESOUND_KEY=your_freesound_key

# ============================================================================
# Optional - OAuth Configuration
# ============================================================================
# VITE_GOOGLE_DRIVE_KEY=your_google_key
# VITE_GOOGLE_DRIVE_CLIENT_ID=xxx.apps.googleusercontent.com
# VITE_DROPBOX_KEY=your_dropbox_key
# VITE_DROPBOX_CLIENT_ID=your_dropbox_client_id
# VITE_OAUTH_REDIRECT=http://localhost:3000/oauth/callback

# ============================================================================
# Optional - Admin/Backend (use with caution)
# ============================================================================
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# ============================================================================
# Testing Configuration
# ============================================================================
CI=false
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

---

## 🚀 Jules Setup Workflow

### Step 1: Add Environment Variables to Jules
1. Go to Jules environment settings
2. Add each key-value pair from the table above
3. At minimum, you MUST set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_ENV`
   - `NODE_ENV`

### Step 2: Upload Setup Script
1. Upload `jules-setup.sh` to Jules
2. Set it as the startup script
3. Make sure it's executable: `chmod +x jules-setup.sh`

### Step 3: Run Setup and Snapshot
1. Click **"Run Setup"** in Jules
2. Wait for dependencies to install (~2-3 minutes first time)
3. Click **"Snapshot Environment"** to cache the setup
4. Future test runs will use the cached environment ⚡️

### Step 4: Verify Setup
Run these commands to verify:
```bash
# Check environment variables
echo $VITE_SUPABASE_URL

# Run tests
npm test

# Start dev server (if needed)
npm run dev
```

---

## 🔍 Troubleshooting

### Missing Supabase Variables
**Error:** `Missing Supabase environment variables`
**Fix:** Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Jules environment variables.

### Build Failures
**Error:** `npm run build` fails
**Fix:** This is not critical for development. The setup script will continue even if build fails.

### Playwright Browser Issues
**Error:** Playwright can't find browsers
**Fix:** Jules will auto-install Chromium on first test run. If issues persist, run:
```bash
npx playwright install chromium --with-deps
```

### Port Conflicts
**Error:** Port 3000 already in use
**Fix:** Neptino's Vite config allows port fallback. It will automatically try 3001, 3002, etc.

---

## 📚 Additional Resources

- **Supabase Documentation:** https://supabase.com/docs
- **Vite Environment Variables:** https://vitejs.dev/guide/env-and-mode.html
- **Playwright Documentation:** https://playwright.dev/docs/intro
- **Neptino Repository:** Check `.env.local.example` for the latest variable list

---

## ⚡️ Quick Start Checklist

- [ ] Add `VITE_SUPABASE_URL` to Jules environment
- [ ] Add `VITE_SUPABASE_ANON_KEY` to Jules environment
- [ ] Add `VITE_APP_ENV=development` to Jules environment
- [ ] Add `NODE_ENV=development` to Jules environment
- [ ] Upload `jules-setup.sh` as startup script
- [ ] Run setup and wait for completion
- [ ] Snapshot the environment
- [ ] Run `npm test` to verify everything works
- [ ] (Optional) Add media API keys if testing media features

---

**Last Updated:** October 2025  
**Neptino Version:** 1.0.0  
**Jules Compatibility:** ✅ Fully Compatible
