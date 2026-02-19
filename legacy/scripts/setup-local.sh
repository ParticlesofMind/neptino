#!/bin/bash

# ==============================================================================
# NEPTINO LOCAL SETUP SCRIPT
# ==============================================================================
# This script sets up Neptino locally with Docker and Supabase
# Usage: ./scripts/setup-local.sh [--with-supabase-cli]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WITH_SUPABASE_CLI=false
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Parse arguments
if [[ "$1" == "--with-supabase-cli" ]]; then
  WITH_SUPABASE_CLI=true
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  NEPTINO LOCAL DEVELOPMENT SETUP${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check prerequisites
echo -e "\n${YELLOW}✓ Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Please install Docker Desktop.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Docker installed${NC}"

if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}✗ Docker Compose not found.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Docker Compose installed${NC}"

if [ "$WITH_SUPABASE_CLI" = true ]; then
  if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI not found. Install with: brew install supabase/tap/supabase${NC}"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Supabase CLI installed${NC}"
fi

# Create .env.local if it doesn't exist
echo -e "\n${YELLOW}✓ Setting up environment...${NC}"
if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
  cp "$PROJECT_ROOT/.env.local.example" "$PROJECT_ROOT/.env.local"
  echo -e "${GREEN}  ✓ Created .env.local${NC}"
else
  echo -e "${GREEN}  ✓ .env.local already exists${NC}"
fi

# Stop existing containers (cleanup)
echo -e "\n${YELLOW}✓ Cleaning up existing containers...${NC}"
cd "$PROJECT_ROOT"
docker-compose down 2>/dev/null || true
echo -e "${GREEN}  ✓ Containers stopped${NC}"

# Build and start Docker containers
echo -e "\n${YELLOW}✓ Starting Docker services...${NC}"
docker-compose up -d
echo -e "${GREEN}  ✓ Docker services started${NC}"

# Wait for PostgreSQL to be healthy
echo -e "\n${YELLOW}✓ Waiting for PostgreSQL to be ready...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker-compose exec -T postgres pg_isready -U postgres -d neptino &> /dev/null; then
    echo -e "${GREEN}  ✓ PostgreSQL is ready${NC}"
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
  echo -n "."
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "${RED}\n✗ PostgreSQL failed to start${NC}"
  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo -e "  - Check if port 5432 is already in use: lsof -i :5432"
  echo -e "  - Check Docker logs: docker-compose logs postgres"
  exit 1
fi

# Install Node dependencies (if needed)
echo -e "\n${YELLOW}✓ Installing Node dependencies...${NC}"
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  npm install
  echo -e "${GREEN}  ✓ Dependencies installed${NC}"
else
  echo -e "${GREEN}  ✓ Dependencies already installed${NC}"
fi

# Optional: Start Supabase CLI
if [ "$WITH_SUPABASE_CLI" = true ]; then
  echo -e "\n${YELLOW}✓ Starting Supabase local development...${NC}"
  supabase start
  echo -e "${GREEN}  ✓ Supabase started${NC}"
  
  # Display Supabase status
  echo -e "\n${BLUE}Supabase Services:${NC}"
  supabase status
fi

# Display startup information
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  SETUP COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Start the dev server:"
echo -e "     ${YELLOW}npm run dev${NC}"
echo -e "\n  2. Open browser:"
echo -e "     ${YELLOW}http://localhost:3000${NC}"
echo -e "\n  3. View Supabase Studio (if using CLI):"
echo -e "     ${YELLOW}http://localhost:54323${NC}"

echo -e "\n${BLUE}Docker Services:${NC}"
docker-compose ps

echo -e "\n${BLUE}Useful Commands:${NC}"
echo -e "  View logs:        ${YELLOW}docker-compose logs -f${NC}"
echo -e "  Stop services:    ${YELLOW}docker-compose down${NC}"
echo -e "  Restart services: ${YELLOW}docker-compose restart${NC}"
echo -e "  Access database:  ${YELLOW}docker exec -it neptino-postgres psql -U postgres -d neptino${NC}"

if [ "$WITH_SUPABASE_CLI" = true ]; then
  echo -e "\n${BLUE}Supabase Commands:${NC}"
  echo -e "  Stop Supabase:    ${YELLOW}supabase stop${NC}"
  echo -e "  View logs:        ${YELLOW}supabase logs --local${NC}"
fi

echo ""
