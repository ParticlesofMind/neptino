.PHONY: help setup dev logs stop down db-connect db-backup db-restore clean test build

# Default target
help:
	@echo "═════════════════════════════════════════════════════════════════════"
	@echo "  NEPTINO - Docker & Supabase Local Development"
	@echo "═════════════════════════════════════════════════════════════════════"
	@echo ""
	@echo "  QUICK START:"
	@echo "    make setup          Setup project and start Docker containers"
	@echo "    make dev            Start development server (npm run dev)"
	@echo ""
	@echo "  DOCKER MANAGEMENT:"
	@echo "    make logs           View Docker logs (all services)"
	@echo "    make stop           Stop all Docker services"
	@echo "    make down           Stop and remove all Docker services"
	@echo "    make restart        Restart all Docker services"
	@echo "    make ps             Show running containers"
	@echo ""
	@echo "  DATABASE:"
	@echo "    make db-connect     Connect to PostgreSQL shell"
	@echo "    make db-backup      Backup database to backup.sql"
	@echo "    make db-restore     Restore database from backup.sql"
	@echo "    make db-reset       Reset database (DELETES DATA!)"
	@echo ""
	@echo "  DEVELOPMENT:"
	@echo "    make test           Run Playwright tests"
	@echo "    make build          Build for production"
	@echo "    make lint           Run ESLint"
	@echo "    make format         Format code with Prettier"
	@echo ""
	@echo "  CLEANUP:"
	@echo "    make clean          Clean node_modules and dist"
	@echo "    make reset          Full reset (stop Docker, clean, reinstall)"
	@echo ""
	@echo "  DOCUMENTATION:"
	@echo "    make docs           Open DOCKER_SETUP.md documentation"
	@echo ""

# Setup and initialization
setup:
	@./scripts/setup-local.sh

setup-with-cli:
	@./scripts/setup-local.sh --with-supabase-cli

# Start development server
dev:
	@npm run dev

# Docker logs
logs:
	@docker-compose logs -f

logs-dev:
	@docker-compose logs -f neptino-dev

logs-db:
	@docker-compose logs -f postgres

# Stop/down Docker
stop:
	@echo "Stopping Docker services..."
	@docker-compose stop

down:
	@echo "Stopping and removing Docker services..."
	@docker-compose down

restart:
	@echo "Restarting Docker services..."
	@docker-compose restart

ps:
	@docker-compose ps

# Database operations
db-connect:
	@docker exec -it neptino-postgres psql -U postgres -d neptino

db-backup:
	@echo "Backing up database..."
	@docker exec neptino-postgres pg_dump -U postgres neptino > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✓ Database backed up"

db-restore:
	@echo "Restoring database from backup.sql..."
	@docker exec -i neptino-postgres psql -U postgres neptino < backup.sql
	@echo "✓ Database restored"

db-reset:
	@echo "WARNING: This will DELETE all data in the database!"
	@echo "Press Ctrl+C to cancel or Enter to continue..."
	@read confirm
	@docker-compose down -v
	@docker-compose up -d postgres
	@echo "✓ Database reset"

# Development tasks
test:
	@npm test

build:
	@npm run build

lint:
	@npm run lint

lint-fix:
	@npm run lint:fix

format:
	@npm run format

format-check:
	@npm run format:check

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	@npm run clean
	@echo "✓ Cleaned"

reset: down clean
	@echo "Full reset in progress..."
	@rm -rf node_modules
	@npm install
	@docker-compose up -d
	@echo "✓ Reset complete"

# Documentation
docs:
	@open DOCKER_SETUP.md || cat DOCKER_SETUP.md

# Advanced/Utility targets
.env.local:
	@cp .env.local.example .env.local
	@echo "✓ Created .env.local from example"

env-local: .env.local

# Docker compose shortcuts
build-dev:
	@docker-compose build neptino-dev

build-prod:
	@docker-compose build neptino-prod

up:
	@docker-compose up -d

logs-follow:
	@docker-compose logs --tail=50 -f

# Status check
status:
	@echo "════ Docker Status ════"
	@docker-compose ps
	@echo ""
	@echo "════ Services Health ════"
	@docker-compose ps | grep -E "neptino-dev|neptino-postgres" || echo "Services not running"
	@echo ""
	@echo "════ Available Ports ════"
	@echo "Frontend:    http://localhost:3000"
	@echo "PostgreSQL:  localhost:5432"
	@echo "API:         http://127.0.0.1:54321 (if using supabase CLI)"
	@echo "Studio:      http://localhost:54323 (if using supabase CLI)"
	@echo ""
