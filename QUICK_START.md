# Neptino Local Development - Quick Start Guide

## TL;DR - Get Started in 30 Seconds

```bash
# 1. Clone and navigate to project
cd ~/Neptino

# 2. One command to set everything up
make setup

# 3. In another terminal, start development
make dev

# 4. Open browser
open http://localhost:3000
```

**That's it!** Your development environment is ready.

---

## What You Just Set Up

| Component | Purpose | Access |
|-----------|---------|--------|
| **Vite Dev Server** | Frontend development with HMR | http://localhost:3000 |
| **PostgreSQL** | Local database | localhost:5432 |
| **Supabase (local)** | Backend API & Auth | http://127.0.0.1:54321 |

---

## Common Commands

```bash
# View help for all available commands
make help

# Docker Management
make ps              # See running containers
make logs            # View all logs
make logs-dev        # View dev server logs only
make restart         # Restart containers
make stop            # Stop containers
make down            # Stop and remove containers

# Development
make dev             # Start dev server
make test            # Run tests
make lint            # Check for errors
make format          # Auto-format code

# Database
make db-connect      # Open database shell
make db-backup       # Backup database
make db-restore      # Restore from backup

# Cleanup
make clean           # Clean build artifacts
make reset           # Full reset (stop Docker, clean, reinstall)
```

---

## File Structure

```
Neptino/
├── .env.local              # ← Create from .env.local.example
├── .env.local.example      # ← Template for environment variables
├── Makefile                # ← Contains all make commands
├── docker-compose.yml      # ← Container configuration
├── Dockerfile              # ← Image definitions
├── DOCKER_SETUP.md         # ← Detailed setup guide
├── DOCKER_TROUBLESHOOTING.md  # ← Problem solving
├── scripts/
│   └── setup-local.sh      # ← Initial setup script
└── src/
    └── scripts/backend/
        └── supabase.ts     # ← Supabase client configuration
```

---

## Environment Variables

Create `.env.local` (copy from `.env.local.example`):

```env
# Default values work out of the box for local development
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha2UiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTI2NzI5NjAwfQ.SSUAXI3sVrSkSETQejhg2QwO6ZXW_4nNQ07ts3wM2B0

VITE_APP_ENV=development
VITE_APP_NAME=Neptino Educational Platform
```

---

## First Time Setup Issues?

### Port Already in Use
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port - edit docker-compose.yml
```

### PostgreSQL Won't Start
```bash
# Check logs
docker-compose logs postgres

# Nuclear option
docker-compose down -v
docker-compose up -d postgres
```

### Environment Variables Not Loading
```bash
# Verify .env.local exists
ls -la .env.local

# Restart container after creating/editing
docker-compose restart neptino-dev
```

See **DOCKER_TROUBLESHOOTING.md** for more solutions.

---

## Next Steps

✅ **Setup Complete!**

### Learn the Codebase
- Read `.github/copilot-instructions.md` for architecture overview
- Explore `src/scripts/coursebuilder/` for canvas engine
- Check `src/scripts/backend/` for database operations

### Make Your First Change
```bash
# Start dev server
make dev

# Edit any file in src/
# Browser auto-refreshes (HMR)

# Before committing
make lint
make format
make test
```

### Deploy to Production
1. Update `.env` with cloud Supabase credentials
2. Run `npm run build`
3. Deploy `dist/` folder to your hosting

---

## Architecture Quick Reference

### Canvas System (PIXI.js + TypeScript)
- **Entry**: `src/scripts/coursebuilder/canvas/CanvasAPI.ts`
- **Tools**: `src/scripts/coursebuilder/tools/`
- **Layers**: Background → Drawing → UI → Overlays

### Database (Supabase + PostgreSQL)
- **Client**: `src/scripts/backend/supabase.ts`
- **Migrations**: `supabase/migrations/`
- **Tables**: courses, canvases, students, enrollments, profiles

### UI Framework
- **Frontend**: Vite (TypeScript) + SCSS (BEM)
- **Build**: ESBuild + Rollup
- **Dev Server**: Vite dev server with HMR

---

## Important Files

| File | Purpose |
|------|---------|
| `.env.local` | Local environment variables (not in git) |
| `docker-compose.yml` | Container & service configuration |
| `Dockerfile` | Multi-stage Docker build |
| `Makefile` | Development command shortcuts |
| `scripts/setup-local.sh` | Initial setup automation |
| `vite.config.ts` | Vite build configuration |
| `tsconfig.json` | TypeScript configuration |
| `supabase/config.toml` | Supabase local config |

---

## Key Concepts

### Hot Module Replacement (HMR)
- Save file → browser auto-refreshes
- Works for .ts, .tsx, .scss, .html files
- No need to restart dev server

### Docker Compose Network
- Containers communicate via service names
- From host: use localhost/127.0.0.1
- Between containers: use service name (e.g., postgres)

### Database Migrations
- Stored in `supabase/migrations/`
- Auto-run on container startup
- Name format: `[timestamp]_[description].sql`

### Environment Variables
- `VITE_*` prefix: exposed to frontend
- No prefix: backend only
- Loaded at container startup
- Restart container after changes

---

## Useful Links

- [Docker Documentation](https://docs.docker.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [PIXI.js Documentation](https://pixijs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

## Support

### Check Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f neptino-dev
docker-compose logs -f postgres
```

### Restart Everything
```bash
docker-compose restart
```

### Full Reset
```bash
make reset
```

### Read Documentation
- `DOCKER_SETUP.md` - Complete setup guide
- `DOCKER_TROUBLESHOOTING.md` - Problem solving
- `.github/copilot-instructions.md` - Architecture

---

## You're Ready! 🚀

Happy coding! If you need help, check the troubleshooting guide or review the documentation files.

**Questions?** Check the relevant documentation or review your docker logs:
```bash
docker-compose logs -f
```

