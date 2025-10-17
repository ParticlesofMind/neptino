# ⚡ Quick Reference - Neptino Local Development

## 🎯 First Time Setup (One Time Only)

```bash
cd ~/Neptino

# Terminal 1: Start the complete Supabase stack
supabase start

# Terminal 2: Start Neptino dev server
npm run dev

# Done! Visit http://localhost:3000
```

---

## 📍 URLs You'll Use

| What | URL | Purpose |
|------|-----|---------|
| **Neptino App** | http://localhost:3000 | Your main app |
| **Sign In** | http://localhost:3000/src/pages/shared/signin.html | User login |
| **Sign Up** | http://localhost:3000/src/pages/shared/signup.html | Create account |
| **Database GUI** | http://127.0.0.1:54323 | Manage data visually |
| **Emails** | http://127.0.0.1:54324 | See test emails |

---

## 🔧 Daily Commands

### Start (Every Day)
```bash
# Terminal 1
cd ~/Neptino && supabase start

# Terminal 2
cd ~/Neptino && npm run dev
```

### Stop (End of Day)
```bash
# Stop dev server: Ctrl+C in Terminal 2
# Stop Supabase: supabase stop
```

### Restart Database Only (Keep Dev Server Running)
```bash
supabase stop
supabase start
# Dev server keeps running - NO RESTART NEEDED
```

### Reset Database (Delete All Data, Start Fresh)
```bash
supabase db reset
# Dev server keeps running - NO RESTART NEEDED
```

---

## 🚀 What's Running

### Terminal 1: Supabase (Backend)
```
✅ PostgreSQL Database        (port 54322)
✅ Authentication Server       (port 54321)
✅ API Gateway                 (port 54321)
✅ Real-time Subscriptions     (port 54321)
✅ File Storage                (port 54321)
✅ Supabase Studio (GUI)       (port 54323)
✅ Mailpit (Email Testing)     (port 54324)
```

### Terminal 2: Neptino (Frontend)
```
✅ Vite Dev Server             (port 3000)
✅ Hot Module Reload (HMR)     (Auto-refresh on save)
✅ TypeScript Compiler         (Real-time checks)
```

---

## 📝 Database Schema Changes

### Create New Table/Modify Schema

1. Create migration file:
```bash
supabase migration new my_new_feature
```

2. Edit the generated file in `supabase/migrations/`

3. Stop and restart Supabase:
```bash
supabase stop
supabase start
# Migrations auto-apply!
```

4. Continue development - NO restart to Neptino needed!

---

## 🧪 Testing Your App

### Test Sign Up/Sign In
1. Visit http://localhost:3000/src/pages/shared/signup.html
2. Create an account
3. Check "emails" at http://127.0.0.1:54324
4. Return to http://localhost:3000 and sign in

### Check Database
1. Open http://127.0.0.1:54323
2. Click "SQL Editor" → choose a table
3. See all your data live

### Make Code Changes
1. Edit any file in `src/`
2. Save (Cmd+S)
3. Changes appear in browser automatically
4. No restart needed!

---

## 🆘 Common Issues

### "ERR_CONNECTION_REFUSED" on Sign Up
- Make sure `supabase start` is running in Terminal 1
- Check .env.local has `VITE_SUPABASE_URL=http://127.0.0.1:54321`

### Port 3000 Already in Use
```bash
# Kill it
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
npm run dev -- --port 3001
```

### Changes Not Showing Up
- Try hard refresh: Cmd+Shift+R (macOS) or Ctrl+Shift+R
- Check browser console for errors

### Database Connection Error
```bash
supabase status     # Check if running
supabase stop       # Stop
supabase start      # Restart
```

---

## 💡 Pro Tips

### Keep Data Between Sessions
```bash
supabase stop       # Keeps all data in Docker
supabase start      # Data still there!
```

### Fresh Start (Delete Everything)
```bash
supabase db reset   # Resets database only
# Dev server keeps running!
```

### View Database Logs
```bash
supabase logs       # See what's happening
```

### Multiple Development Terminals
Keep these always running:
- Terminal 1: `supabase start` (leave running)
- Terminal 2: `npm run dev` (leave running)
- Terminal 3: Your other work (git, migrations, etc.)

---

## 📊 Environment Files

Your `.env.local` should have:

```env
# Backend (Local PostgreSQL via Supabase)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Frontend (Local Supabase)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Settings
VITE_APP_ENV=development
VITE_APP_NAME=Neptino Educational Platform
```

---

**Ready to develop?** → Visit http://localhost:3000
