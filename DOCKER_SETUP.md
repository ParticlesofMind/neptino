# Neptino Docker & Supabase Local Development Setup

This guide walks you through setting up Neptino locally with Docker and Supabase as the backend.

## Prerequisites

- **Docker Desktop** (includes Docker & Docker Compose)
  - [Download for Mac](https://www.docker.com/products/docker-desktop)
  - macOS Apple Silicon (M1/M2/M3): Make sure you're on the latest version
- **Git**
- **Node.js 18+** (for running the CLI commands outside Docker)

## Quick Start (Recommended)

### 1. Clone & Navigate to Project

```bash
cd ~/Neptino
```

### 2. Create Environment File

Copy the example environment file and update it for local development:

```bash
cp .env.example .env.local
```

**For local Supabase (via Docker):**
```env
# Supabase Configuration (Local Docker)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha2UiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTI2NzI5NjAwfQ.SSUAXI3sVrSkSETQejhg2QwO6ZXW_4nNQ07ts3wM2B0

# Development
VITE_APP_ENV=development
VITE_APP_NAME=Neptino Educational Platform
```

### 3. Build & Start Containers

```bash
# Build images and start services in background
docker-compose up -d

# Wait for PostgreSQL to be ready (check health status)
docker-compose ps

# Run migrations
docker exec neptino-postgres psql -U postgres -d neptino -f /docker-entrypoint-initdb.d/init_database.sql
```

### 4. Start Development Server

**Option A: Via Docker (recommended)**
```bash
# View logs
docker-compose logs -f neptino-dev

# Container already started with docker-compose up -d
# Open http://localhost:3000
```

**Option B: On Host Machine**
```bash
npm install
npm run dev

# Open http://localhost:3000
```

## Architecture Overview

### Docker Services

```
neptino-dev (Port 3000)
├─ Vite Dev Server
├─ TypeScript Build
└─ Hot Module Replacement (HMR)

postgres (Port 5432)
├─ PostgreSQL 15
├─ Neptune Database
└─ Migrations Auto-run

External Supabase Services (via Docker running locally)
├─ API Server (Port 54321)
├─ Auth (Port 54321)
├─ Realtime (Port 54321)
├─ Studio (Port 54323)
├─ Inbucket (Port 54324)
└─ Analytics (Port 54327)
```

### Using Local Supabase CLI (Alternative - Advanced)

If you want the full Supabase stack (with Studio UI, Auth, Realtime):

1. **Install Supabase CLI:**
```bash
brew install supabase/tap/supabase
```

2. **Start Local Supabase:**
```bash
# From project root
supabase start

# This starts:
# - PostgreSQL (port 54322)
# - API Gateway (port 54321)
# - Studio Dashboard (port 54323)
# - Inbucket (port 54324)
```

3. **Get Credentials:**
```bash
supabase status

# Copy API URL and anon key to .env.local
```

4. **Stop when done:**
```bash
supabase stop
```

## Common Tasks

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f neptino-dev
docker-compose logs -f postgres

# Last 50 lines
docker-compose logs --tail=50 neptino-dev
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it neptino-postgres psql -U postgres -d neptino

# Run migration manually
docker exec neptino-postgres psql -U postgres -d neptino -f /path/to/migration.sql

# Backup database
docker exec neptino-postgres pg_dump -U postgres neptino > backup.sql

# Restore database
docker exec -i neptino-postgres psql -U postgres neptino < backup.sql
```

### Stop/Start Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: Deletes database!)
docker-compose down -v

# Start again
docker-compose up -d

# Restart specific service
docker-compose restart neptino-dev
```

### View Running Containers

```bash
# List containers with status
docker-compose ps

# View specific container
docker ps | grep neptino
```

## Development Workflow

### 1. File Changes

- **Source code changes** (.ts, .tsx, .scss) → Vite HMR automatically reloads
- **Environment variables** (.env.local) → Restart container:
  ```bash
  docker-compose restart neptino-dev
  ```

### 2. Database Changes

Create migrations in `supabase/migrations/`:

```bash
# Create new migration
supabase migration new add_my_table

# Or manually create: supabase/migrations/[timestamp]_add_my_table.sql

# Push to local database
supabase db push
```

### 3. Testing

```bash
# Inside container
npm test

# Or on host
docker exec neptino-dev npm test
```

### 4. Build for Production

```bash
# Via docker-compose
docker-compose build neptino-prod
docker run -p 8080:80 neptino-prod

# Or manually
npm run build
# Static files in ./dist
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port in docker-compose.yml
```

### PostgreSQL Won't Start

```bash
# Check logs
docker-compose logs postgres

# Verify port is free
lsof -i :5432

# Check volume permissions
docker volume ls
docker volume inspect neptino_postgres_data
```

### Supabase Environment Variables Not Loading

```bash
# Check .env.local exists
ls -la .env.local

# Verify format (no quotes around values usually)
cat .env.local

# Restart dev container
docker-compose restart neptino-dev
```

### Can't Connect to Database

```bash
# Test database connection
docker exec neptino-dev npx pg \
  --host neptino-postgres \
  --port 5432 \
  --username postgres \
  --dbname neptino

# Or
docker exec neptino-postgres psql -U postgres -c "SELECT version();"
```

### Node Modules Issues

```bash
# Clear node_modules and reinstall
docker-compose exec neptino-dev npm run clean
docker-compose exec neptino-dev npm install

# Or rebuild container
docker-compose down
docker-compose build --no-cache neptino-dev
docker-compose up -d
```

## Performance Tips

### For Apple Silicon (M1/M2/M3)

The dockerfile uses `node:18-alpine` which supports ARM64. If you experience issues:

1. **Explicitly set platform:**
```bash
docker-compose --file docker-compose.yml up -d
```

2. **Check architecture:**
```bash
docker run --rm alpine uname -m
# Should output: aarch64
```

### Optimize Docker Resources

In Docker Desktop → Settings → Resources:
- **CPUs**: Allocate at least 4
- **Memory**: Allocate at least 6GB
- **Swap**: At least 1GB

## Environment Variables Reference

### Supabase (Local Docker)
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase (Remote Cloud)
```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

### Optional Media APIs
```env
VITE_UNSPLASH_API_KEY=your_key
VITE_PIXABAY_API_KEY=your_key
VITE_FREESOUND_API_KEY=your_key
```

## Next Steps

1. ✅ Docker and Supabase running
2. 📝 Create your first course
3. 🧪 Run tests: `npm test`
4. 📦 Deploy to production
5. 🔐 Connect to cloud Supabase

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Project Copilot Instructions](./.github/copilot-instructions.md)

