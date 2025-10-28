#!/bin/bash
# Neptino Development Server Starter
# Starts Vite and opens Arc browser intelligently

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Neptino Development Server...${NC}"

# Kill any existing processes on port 3000
if lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is busy. Killing existing processes...${NC}"
    kill $(lsof -t -i:3000) 2>/dev/null || true
    sleep 1
fi

# Prevent browsers from auto-opening (Vite will be controlled by our script)
export BROWSER=none
export BROWSER_NO_OPEN=1

echo -e "${GREEN}✅ Server starting on http://localhost:3000${NC}"
echo -e "${YELLOW}📱 Arc will open automatically...${NC}"
echo ""

# Start Vite in background
npm run dev:strict &
VITE_PID=$!

# Wait for server to be ready, then open Arc
sleep 3
./scripts/open-arc.sh

# Bring Vite back to foreground
wait $VITE_PID
