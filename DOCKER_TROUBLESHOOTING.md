# Neptino Setup: Approach Comparison & Troubleshooting

This document compares different setup approaches and provides detailed troubleshooting.

## Setup Approaches Comparison

### Approach 1: Docker Compose Only (Simplest ⭐ RECOMMENDED)

**Best for:** Quick local development, CI/CD consistency

```bash
# One command to rule them all
make setup
make dev
```

**What you get:**
- ✅ Frontend dev server (Vite, HMR)
- ✅ PostgreSQL database
- ✅ Basic Supabase connectivity (REST API only)

**Limitations:**
- ❌ No Supabase Studio UI
- ❌ Limited Auth UI
- ❌ No real-time subscriptions (basic support only)

**Best used for:**
- API development
- Canvas/drawing features
- Course management
- Student functionality

---

### Approach 2: Docker Compose + Supabase CLI (Full Stack)

**Best for:** Complete local Supabase experience, testing Auth flows

```bash
# Install Supabase CLI first
brew install supabase/tap/supabase

# Then setup
make setup-with-cli
make dev
```

**What you get:**
- ✅ Everything from Approach 1
- ✅ Supabase Studio (http://localhost:54323)
- ✅ Full Auth UI
- ✅ Realtime subscriptions
- ✅ Email testing (Inbucket)
- ✅ Analytics dashboard
- ✅ Vector/pgvector support

**Overhead:**
- ⚠️ More containers running
- ⚠️ Higher memory/CPU usage (~3-4GB extra)
- ⚠️ Slightly slower startup (2-3 minutes)

**Best used for:**
- Testing Auth with UI
- Testing email flows
- Testing real-time features
- Testing full application workflows

---

### Approach 3: Host Node + Remote Supabase

**Best for:** Lightweight, testing against production data

```bash
cp .env.example .env.local
# Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# with your cloud Supabase credentials

npm install
npm run dev
```

**What you get:**
- ✅ Fastest startup
- ✅ Access to real data
- ✅ Full feature parity with production

**Limitations:**
- ❌ Requires internet connection
- ❌ Can't develop offline
- ❌ Network latency effects
- ❌ Risk of affecting shared database

**Best used for:**
- Final testing before deploy
- Quick bug fixes
- Demo/presentation
- NOT for development

---

## Quick Reference Matrix

| Feature | Docker Only | Docker + CLI | Remote | Host Only |
|---------|:-----------:|:------------:|:------:|:---------:|
| **Startup Speed** | ⚡⚡ | ⚡ | ⚡⚡⚡ | ⚡⚡⚡ |
| **Memory Usage** | ~2GB | ~5GB | ~1GB | ~500MB |
| **Setup Complexity** | Simple | Medium | Trivial | Trivial |
| **Auth Testing** | Basic | Full | Full | Full |
| **Real-time** | Limited | Full | Full | Full |
| **Offline Support** | ✅ | ✅ | ❌ | ✅ |
| **Database Isolation** | ✅ | ✅ | ❌ | ❌ |
| **Studio UI** | ❌ | ✅ | ❌ | ❌ |
| **Recommended** | ⭐⭐⭐ | ⭐⭐ | ❌ | ⭐ |

---

## Troubleshooting Guide

### Issue: Port Already in Use

**Problem:** Docker can't bind to port 3000, 5432, etc.

**Solution 1: Find and kill process**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Solution 2: Use different port**
```yaml
# Edit docker-compose.yml
services:
  neptino-dev:
    ports:
      - "3001:3000"  # Changed from 3000

  postgres:
    ports:
      - "5433:5432"  # Changed from 5432
```

**Solution 3: Stop conflicting services**
```bash
# If another Docker Compose is running
docker-compose down

# If Supabase CLI is running
supabase stop

# Clean up all Docker containers
docker system prune
```

---

### Issue: PostgreSQL Won't Start

**Problem:** Container crashes or stays unhealthy

**Debug Steps:**
```bash
# 1. Check logs
docker-compose logs postgres

# 2. Verify volume exists
docker volume ls | grep postgres

# 3. Check volume permissions
docker volume inspect neptino_postgres_data

# 4. Nuclear option: Delete and recreate
docker-compose down -v
docker-compose up -d postgres
```

**Common Causes:**
- Previous volume corrupted
- File permissions issue
- Port 5432 already in use
- Docker resource limits exceeded

---

### Issue: Can't Connect to Database

**Problem:** Application can't reach PostgreSQL

**Verify Connectivity:**
```bash
# 1. Check container is running
docker-compose ps postgres

# 2. Test connection from host
psql -h localhost -U postgres -d neptino

# 3. Test from another container
docker run --rm --network neptino-network postgres:15 \
  psql -h postgres -U postgres -c "SELECT 1"

# 4. Check network
docker network inspect neptino-network
```

**Configuration Check:**
```bash
# Inside dev container, these should work:
docker exec neptino-dev npm run dev

# Database URL in .env.local should use service name (Docker network):
# VITE_SUPABASE_URL=http://neptino-postgres:54321  (WRONG - inside container)
# VITE_SUPABASE_URL=http://127.0.0.1:54321         (CORRECT - from host)
```

---

### Issue: Vite Dev Server Not Accessible

**Problem:** Can't reach http://localhost:3000

**Debugging:**
```bash
# 1. Check container is running
docker-compose ps neptino-dev

# 2. View logs
docker-compose logs -f neptino-dev

# 3. Verify port binding
docker port neptino-dev

# 4. Check host firewall (macOS)
# System Preferences → Security & Privacy → Firewall
# Add Docker/Node to allowlist

# 5. Test from inside container
docker exec neptino-dev curl http://localhost:3000
```

**Common Causes:**
- Build errors (check logs)
- Port 3000 already in use
- Host firewall blocking
- .env.local not loaded (restart container)

---

### Issue: Module/Dependency Not Found

**Problem:** `Cannot find module 'xlsx'` or similar

**Solution:**
```bash
# 1. Reinstall dependencies in container
docker-compose exec neptino-dev npm install

# 2. Clear npm cache
docker-compose exec neptino-dev npm cache clean --force

# 3. Rebuild container
docker-compose down
docker-compose build --no-cache neptino-dev
docker-compose up -d

# 4. Last resort: Clean everything
make reset
```

**Prevention:**
```bash
# After git pull, always run
npm install
docker-compose restart neptino-dev
```

---

### Issue: Changes Not Hot-Reloading

**Problem:** File changes don't update in browser

**Causes & Solutions:**

1. **File not watched by Vite**
   ```bash
   # Check vite.config.ts watches all needed files
   # Restart dev server
   docker-compose restart neptino-dev
   ```

2. **Volume not mounted properly**
   ```bash
   # Check docker-compose.yml volumes section
   # Should have: - .:/app
   docker-compose exec neptino-dev ls /app/src
   ```

3. **Node modules issue**
   ```bash
   docker-compose exec neptino-dev npm run clean
   docker-compose restart neptino-dev
   ```

---

### Issue: Environment Variables Not Loading

**Problem:** Undefined environment variables in browser

**Checklist:**

1. **File exists and has correct name**
   ```bash
   ls -la .env.local          # Must exist
   grep VITE_ .env.local      # Must have VITE_ prefix
   ```

2. **Variables prefixed correctly**
   ```bash
   # Frontend sees these (prefixed with VITE_)
   VITE_SUPABASE_URL=http://...

   # Backend/Node only sees these (no prefix)
   DATABASE_URL=postgresql://...
   ```

3. **Restart container after changes**
   ```bash
   # Environment loaded at container startup
   docker-compose restart neptino-dev
   ```

4. **Verify they're loaded**
   ```bash
   # Check in browser console
   console.log(import.meta.env.VITE_SUPABASE_URL)
   ```

---

### Issue: Supabase CLI Won't Start

**Problem:** `supabase start` fails

**Solutions:**

1. **Check installation**
   ```bash
   which supabase
   supabase version
   ```

2. **Port conflicts**
   ```bash
   # Supabase uses many ports
   lsof -i :54321   # API
   lsof -i :54322   # DB
   lsof -i :54323   # Studio
   lsof -i :54324   # Inbucket
   ```

3. **Reinstall**
   ```bash
   brew uninstall supabase
   brew install supabase/tap/supabase
   ```

4. **Reset Supabase state**
   ```bash
   supabase stop
   rm -rf .supabase
   supabase start
   ```

---

### Issue: Database Migrations Not Applied

**Problem:** Tables missing or migrations not running

**Solutions:**

1. **Run migrations manually**
   ```bash
   # Via docker
   docker exec neptino-postgres psql -U postgres -d neptino \
     -f /docker-entrypoint-initdb.d/init_database.sql

   # Via supabase CLI
   supabase db push
   ```

2. **Check migration files exist**
   ```bash
   ls -la supabase/migrations/
   ```

3. **View applied migrations**
   ```bash
   docker exec -it neptino-postgres psql -U postgres -d neptino \
     -c "SELECT * FROM schema_migrations;"
   ```

4. **Reset database and retry**
   ```bash
   docker-compose down -v
   docker-compose up -d postgres
   # Wait for health check
   docker-compose exec postgres pg_isready -U postgres -d neptino
   ```

---

### Issue: Memory/CPU Warnings

**Problem:** Docker using excessive resources

**Solutions:**

1. **Adjust Docker resources** (Docker Desktop)
   ```
   Settings → Resources
   - CPUs: 4-6 (not max)
   - Memory: 6-8GB (not max)
   - Swap: 1-2GB
   ```

2. **Stop unused services**
   ```bash
   # If not using Supabase CLI
   supabase stop

   # Stop neptino-prod if not using
   docker-compose stop neptino-prod
   ```

3. **Clean up Docker**
   ```bash
   docker system prune        # Remove unused images/volumes
   docker image prune -a      # Remove all unused images
   ```

---

### Issue: HMR (Hot Module Reload) Not Working

**Problem:** Changes require full page refresh

**Cause:** Usually network/connection issue between Vite and browser

**Solution:**
```bash
# 1. Check vite.config.ts HMR settings
# Ensure using 0.0.0.0 for host
vite --host 0.0.0.0

# 2. Check browser console for errors
# Open DevTools → Console

# 3. Verify network connectivity
# The dev server sends updates over WebSocket
# Make sure not behind proxy blocking WebSocket

# 4. Restart dev server
docker-compose restart neptino-dev
docker-compose logs -f neptino-dev
```

---

## Performance Optimization

### For Apple Silicon (M1/M2/M3)

Your Mac has ARM64 architecture. Docker handles this automatically, but if issues:

```bash
# Verify ARM64 support
docker run --rm alpine uname -m
# Should output: aarch64

# Force platform if needed
docker run --platform linux/arm64 node:18-alpine node --version
```

### Reduce Memory Usage

```bash
# Option 1: Disable Supabase CLI extras
supabase stop

# Option 2: Stop production build container
docker-compose down neptino-prod

# Option 3: Disable hot reload (production testing)
npm run build && npm run preview
```

### Speed Up First Build

```bash
# Docker caches layers - subsequent builds faster
# Build only what changed:
docker-compose build --no-cache neptino-dev  # Forces rebuild

# Or mount node_modules from volume (already done in docker-compose.yml)
```

---

## Best Practices

### Daily Workflow

```bash
# Start day
make setup     # Ensures containers are fresh
make dev       # Start dev server

# Make changes - HMR updates browser automatically

# End day
make stop      # Or Ctrl+C to stop dev server
```

### Before Committing

```bash
make lint       # Check for errors
make format     # Auto-format code
make test       # Run tests
```

### Before Pushing to Production

```bash
# Test production build
make build                    # npm run build
npm run preview              # Local production preview

# Or in Docker
docker-compose build neptino-prod
docker run -p 8080:80 neptino-prod
# Open http://localhost:8080
```

### Database Management

```bash
# Backup before major changes
make db-backup

# Schedule regular backups
(crontab -l 2>/dev/null; echo "0 2 * * * cd ~/Neptino && make db-backup") | crontab -
```

---

## Getting Help

1. **Check logs first**
   ```bash
   make logs          # All services
   make logs-dev      # Just dev server
   make logs-db       # Just database
   ```

2. **Restart and retry**
   ```bash
   make restart       # Soft restart
   make down          # Hard stop
   make setup         # Full reset
   ```

3. **Check documentation**
   - `DOCKER_SETUP.md` - Setup guide
   - `.github/copilot-instructions.md` - Architecture
   - `docker-compose.yml` - Container config

4. **Common issues checklist**
   - Is Docker Desktop running? (`docker ps`)
   - Are ports free? (`lsof -i :3000`)
   - Is `.env.local` created? (`cat .env.local`)
   - Are migrations applied? (`make db-connect`)

