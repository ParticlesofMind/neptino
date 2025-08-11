# Neptino Docker Setup

This directory contains Docker configuration for the Neptino project, enabling consistent development and production environments.

## Quick Start

### Development Mode
```bash
# Start development server with hot reload
docker-compose up neptino-dev

# Or build and run development container directly
docker build --target development -t neptino:dev .
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules neptino:dev
```

Access your development server at: http://localhost:3000

### Production Mode
```bash
# Build and serve production-ready application
docker-compose up neptino-prod

# Or build and run production container directly
docker build --target production -t neptino:prod .
docker run -p 8080:80 neptino:prod
```

Access your production server at: http://localhost:8080

## What Each Container Does

### Development Container (`neptino-dev`)
- Runs Vite dev server with hot reload
- Mounts your source code for live editing
- Includes all dev dependencies
- Perfect for active development

### Production Container (`neptino-prod`)
- Multi-stage build that compiles your TypeScript
- Serves optimized static files via nginx
- Minimal footprint for deployment
- **This is your ultimate refactoring validation test!**

## Testing Your Refactored Architecture

The production build is the **perfect test** for your SRP refactoring:

```bash
# This will validate EVERYTHING about your refactoring:
docker build --target production .
```

If this succeeds, it means:
- ✅ All import paths are correct
- ✅ TypeScript compilation works
- ✅ No circular dependencies
- ✅ All modules resolve properly
- ✅ Your modular architecture is bulletproof

## Advanced Usage

### Build-only test (no server)
```bash
# Just test the build process
docker build --target builder -t neptino:build-test .
```

### With Supabase Local Development
```bash
# Start everything including local Supabase
docker-compose up
```

### Clean builds
```bash
# Remove all containers and rebuild from scratch
docker-compose down
docker system prune -f
docker-compose up --build
```

## Files Created

- `Dockerfile` - Multi-stage build configuration
- `docker-compose.yml` - Orchestration for dev/prod/database
- `docker/nginx.conf` - Production web server configuration
- `.dockerignore` - Exclude unnecessary files from build context

## Why This Matters for Your Refactoring

Docker provides a **completely clean environment** to test your refactored codebase:

1. **No local cache pollution** - Fresh Node.js environment every time
2. **Dependency validation** - Ensures package.json is complete
3. **Import path verification** - Catches any broken module references
4. **Production readiness** - Tests if your code actually deploys
5. **Environment consistency** - Same results everywhere

Your architectural transformation from monolithic files to modular SRP-compliant structure will be thoroughly validated by a successful Docker build!
