# 🚀 Optimal Local Development Setup

This guide explains the optimal setup for developing Neptino locally with maximum performance and developer experience.

## Quick Start (2 minutes)

```bash
# 1. Start PostgreSQL only (no Vite/frontend in Docker)
docker-compose -f docker-compose.local.yml up -d

# 2. Run development server on host (in another terminal)
npm run dev

# Done! Visit http://localhost:3000
```

## Why This Setup?

### ✅ Run Vite on Host (NOT in Docker)
- **Instant HMR** (Hot Module Reload) - changes appear immediately
- **Faster rebuilds** - no container layer overhead
- **Better debugging** - DevTools work perfectly
- **Direct file access** - IDE integration seamless
- **Node native modules** - No compatibility issues

### ✅ Run PostgreSQL in Docker
- **Data isolation** - Database state managed separately
- **Easy reset** - Just restart the container
- **Mirrors production** - Same version as deployed
- **No local installation** - Keep macOS clean

## Setup Instructions

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed locally
- npm packages installed: `npm install`

### 1. Start PostgreSQL Container

```bash
docker-compose -f docker-compose.local.yml up -d
```

**Verify it's running:**
```bash
docker-compose -f docker-compose.local.yml ps
# Should show postgres as "Up"
```

### 2. Start Development Server Locally

```bash
npm run dev
```

**You should see:**
```
VITE v6.3.6  ready in 298 ms

➜  Local:   http://localhost:3000/
➜  Network: http://127.0.0.1:3000/
```

### 3. Access the App

- Frontend: **http://localhost:3000**
- Database: **localhost:5432** (postgres/postgres)

## Common Development Tasks

### View Database Logs
```bash
docker-compose -f docker-compose.local.yml logs postgres
```

### Restart Database
```bash
docker-compose -f docker-compose.local.yml restart postgres
```

### Reset Database (Clear All Data)
```bash
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

### Stop Everything
```bash
docker-compose -f docker-compose.local.yml down
# (Data preserved in docker volume)
```

### Stop Everything & Clean
```bash
docker-compose -f docker-compose.local.yml down -v
# (WARNING: Deletes database!)
```

## Development Server Options

### Standard Dev Server (Recommended)
```bash
npm run dev
# Opens on 0.0.0.0:3000 (accessible from network)
```

### Localhost Only (More Secure)
```bash
npm run dev:strict
# Only accessible on localhost:3000
```

### With Monitoring
```bash
npm run dev:monitor
# Includes performance monitoring
```

## Environment Variables

Your `.env.local` should point to local PostgreSQL:

```env
# Backend
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/neptino

# Frontend
VITE_SUPABASE_URL=http://localhost:5432
VITE_SUPABASE_ANON_KEY=local-dev-key
```

## Troubleshooting

### Port 3000 Already in Use
```bash
# Option 1: Kill the process
lsof -i :3000
kill -9 <PID>

# Option 2: Run on different port
npm run dev -- --port 3001
```

### Port 5432 Already in Use
```bash
# Find what's using it
lsof -i :5432

# Stop it or restart Docker
docker-compose -f docker-compose.local.yml down
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.local.yml ps

# Check logs
docker-compose -f docker-compose.local.yml logs postgres

# Restart it
docker-compose -f docker-compose.local.yml restart postgres
```

### HMR Not Working (Changes Don't Reload)
1. Check that `npm run dev` is using `--host 0.0.0.0`
2. Verify file changes are detected (should see `[vite] hmr update ...`)
3. Try hard refresh: `Cmd+Shift+R` (macOS)

## Performance Tips

### 1. Use Makefile Commands
```bash
make dev              # Start dev server
make db              # Access PostgreSQL CLI
make logs            # View Docker logs
make restart-db      # Restart database
```

### 2. Monitor Resource Usage
```bash
# Check Docker resource usage
docker stats

# Check Node process memory
ps aux | grep node
```

### 3. Enable TypeScript Type Checking
```bash
npm run lint           # Check for errors
npm run lint:fix       # Auto-fix issues
```

## Full Stack Testing

When you need the complete Docker stack (for CI/CD testing):

```bash
# Use full docker-compose.yml instead
docker-compose up -d

# This runs:
# - Vite dev server in container (slower HMR)
# - PostgreSQL in container
# - Production build in container
```

**Use this only for:**
- Testing production builds
- CI/CD pipeline verification
- Docker-specific issues

## Optimal Workflow

1. **Start of day:**
   ```bash
   docker-compose -f docker-compose.local.yml up -d
   npm run dev
   ```

2. **Development:**
   - Edit files in your IDE
   - Changes auto-reload in browser (HMR)
   - Use DevTools normally

3. **Testing:**
   ```bash
   npm run test          # Playwright tests
   npm run lint          # Check code
   npm run build         # Build for production
   ```

4. **End of day:**
   ```bash
   # Keep database running (optional)
   docker-compose -f docker-compose.local.yml down

   # Or stop only dev server
   Ctrl+C (in npm run dev terminal)
   ```

## Next: Deploy & Production

When ready to deploy:
```bash
npm run build          # Creates optimized build in dist/
docker-compose up      # Full stack for production testing
```

---

**Questions?** Check `DOCKER_SETUP.md` for advanced topics.
