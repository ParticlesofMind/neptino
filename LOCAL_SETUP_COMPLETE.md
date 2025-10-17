# ✅ Local Setup Complete - Neptino Development

## 🚀 Your System is Ready!

### What's Running

| Service | Status | URL | Port |
|---------|--------|-----|------|
| **Neptino Frontend** | ✅ Running | http://localhost:3000 | 3000 |
| **Supabase API** | ✅ Running | http://127.0.0.1:54321 | 54321 |
| **PostgreSQL Database** | ✅ Running | 127.0.0.1:54322 | 54322 |
| **Supabase Studio** | ✅ Running | http://127.0.0.1:54323 | 54323 |
| **Mailpit (Email Testing)** | ✅ Running | http://127.0.0.1:54324 | 54324 |

---

## 📋 One-Time Setup Summary

### 1. ✅ Environment Configuration
- Created `.env.local` with local Supabase URLs
- Updated `VITE_SUPABASE_URL` to `http://127.0.0.1:54321`
- Updated database connection to local PostgreSQL at `127.0.0.1:54322`

### 2. ✅ Fixed Database Migrations
- Corrected permissions issue in storage migration
- All migrations applied successfully
- Database schema initialized

### 3. ✅ Started Supabase Local Stack
```bash
supabase start
```
This single command:
- Starts PostgreSQL locally
- Starts Authentication service
- Starts API gateway
- Starts Realtime subscriptions
- Starts Storage service
- Starts Studio dashboard

### 4. ✅ Started Neptino Dev Server
```bash
npm run dev
```
- Vite server running on port 3000
- Hot Module Reload enabled
- Ready for development

---

## 🔑 Authentication - Now Working!

Your app now has full authentication working locally:

### Sign Up
1. Go to http://localhost:3000/src/pages/shared/signup.html
2. Fill in your details (email, password, name, role)
3. Click "Sign Up"
4. You'll be logged in and redirected based on your role

### Sign In
1. Go to http://localhost:3000/src/pages/shared/signin.html
2. Use the credentials you just created
3. Click "Sign In"

### Check Emails
- Verification emails go to **Mailpit** at http://127.0.0.1:54324
- No real email sending in development!

---

## 📊 Database Management

### Access the Database Directly

**Option 1: Via Supabase Studio (GUI)**
- URL: http://127.0.0.1:54323
- Perfect for visual queries, seeing tables, editing data
- No login required for local development

**Option 2: Via Command Line**
```bash
supabase db pull          # Pull schema from local database
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Create Migrations

When you need to modify the schema:

```bash
# Create a new migration
supabase migration new my_feature_name

# A new file appears in supabase/migrations/
# Edit it, then the next `supabase start` will apply it
```

### Reset Database (Deletes Everything)
```bash
supabase db reset
```

This will:
1. Drop all tables
2. Re-run all migrations
3. Start fresh with clean data

---

## 🔄 Development Workflow

### Normal Development (No Restarts Needed!)

1. **Edit files** in your IDE
2. **Save changes** (Ctrl+S or Cmd+S)
3. **Changes auto-reload** in browser via HMR
4. **Test in browser** at http://localhost:3000

### If You Modify Database Schema

1. Edit or create migration file in `supabase/migrations/`
2. Save the file
3. Stop Supabase: `supabase stop`
4. Start Supabase: `supabase start` (applies new migrations)
5. No need to restart Neptino dev server!

### If You Change Environment Variables

1. Update `.env.local`
2. Save the file
3. Vite automatically restarts dev server
4. No manual restart needed!

---

## 🛠 Useful Commands

### Start Everything (One Command)
```bash
# Terminal 1: Start Supabase (one time)
supabase start

# Terminal 2: Start Neptino dev server
npm run dev
```

### View Supabase Status
```bash
supabase status
```

### View Logs
```bash
supabase logs # Backend logs
```

### Stop Everything (Keeps Data)
```bash
# Keep Supabase running, just stop dev server
Ctrl+C  # in the npm run dev terminal

# Or stop Supabase too (data stays in Docker)
supabase stop
```

### Reset Everything (WARNING: Deletes Data)
```bash
supabase db reset  # Resets database
# Neptino already running, no restart needed
```

---

## 🎯 Next Steps

### Try It Out
1. Visit http://localhost:3000
2. Go to Sign Up
3. Create an account
4. Check your "email" in Mailpit (http://127.0.0.1:54324)
5. Explore the dashboard based on your role!

### View Database Changes
- Open Supabase Studio: http://127.0.0.1:54323
- Click "SQL Editor" on the left
- See all your data in real-time

### Start Building
- Edit files in `src/`
- Changes appear instantly (HMR)
- No server restarts needed
- Database persists between sessions

---

## ⚠️ Important Notes

### Data Persistence
- **Database data persists** - Even after `supabase stop`, your data is saved
- When you `supabase start` again, all your data is still there
- This is for comfortable development

### For a Fresh Database
Only if you want to start over:
```bash
supabase db reset
```

### Production-Like Environment
- Your local setup mirrors production
- Same PostgreSQL version
- Same Supabase architecture
- Same authentication system

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill it if needed
kill -9 <PID>

# Or run on different port
npm run dev -- --port 3001
```

### Can't Connect to Database
```bash
# Check if Supabase is running
supabase status

# Restart if needed
supabase stop
supabase start
```

### Authentication Not Working
```bash
# Check your .env.local has correct URLs
cat .env.local

# Should show:
# VITE_SUPABASE_URL=http://127.0.0.1:54321
# VITE_SUPABASE_ANON_KEY=... (should be there)

# If not, update and restart Vite dev server
```

### Hot Module Reload Not Working
```bash
# Try hard refresh
Cmd+Shift+R  # macOS
Ctrl+Shift+R # Linux/Windows

# Or restart dev server
# Ctrl+C then npm run dev
```

---

## 📚 Related Documentation

- **Architecture**: See `.github/copilot-instructions.md`
- **Database Schema**: Check `supabase/migrations/`
- **Advanced Setup**: See `DOCKER_SETUP.md`
- **Deployment**: See production deployment docs

---

**You're all set! Happy coding! 🎉**

Start with: http://localhost:3000
