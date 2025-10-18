# Rocket.Chat Iframe Integration - Quick Fix Guide

## The Problem
- ❌ Error: `GET http://localhost:3100/api/v1/info 404 (Not Found)`
- ❌ Error: `Refused to display 'http://localhost:3100/' in a frame because it set 'X-Frame-Options' to 'sameorigin'`
- ❌ Iframe shows: "localhost refused to connect"

## The Solution (3 Steps)

### 1️⃣ Complete Rocket.Chat Setup
```bash
# Open in browser
open http://localhost:3100

# Follow the setup wizard:
# - Create admin account
# - Set organization name
# - Confirm site URL: http://localhost:3100
```

### 2️⃣ Configure Iframe Integration
```bash
# Run the automated configuration script
./scripts/configure-rocketchat-iframe.sh

# Enter your admin credentials when prompted
```

### 3️⃣ Restart Vite
```bash
# Stop current server (Ctrl+C if running)
npm run dev
```

## Test It Works
1. Open http://localhost:3000/src/pages/teacher/home.html
2. Login to Neptino
3. Click "Messages" in the sidebar
4. ✅ You should see Rocket.Chat embedded (no "refused to connect" error)

## What Was Fixed

### Environment Configuration
- ✅ Updated `rocketchat.env` with iframe integration settings
- ✅ Updated `.env.local` with correct Rocket.Chat URLs
- ✅ Restarted Docker containers and Vite server

### Files Modified
- `rocketchat.env` - Added iframe CORS settings
- `.env.local` - Added ROCKETCHAT_EMBED_URL
- `scripts/configure-rocketchat-iframe.sh` - New automated setup script

## Troubleshooting

### "localhost refused to connect"
→ **Rocket.Chat isn't running**
```bash
docker compose up -d
```

### Iframe shows blank screen
→ **X-Frame-Options not configured**
```bash
# Run the configuration script again
./scripts/configure-rocketchat-iframe.sh
```

### "Messaging session is not active"
→ **Admin credentials not set**
1. Complete setup wizard at http://localhost:3100
2. Run `./scripts/configure-rocketchat-iframe.sh`
3. Restart Vite: `npm run dev`

## Current Status

✅ Docker containers running
✅ Vite dev server running on port 3000
✅ Rocket.Chat running on port 3100
⏳ **YOU NEED TO**: Complete setup wizard + run config script

## Quick Commands

```bash
# Check if Rocket.Chat is running
curl -I http://localhost:3100/home

# Check Docker services
docker compose ps

# View Rocket.Chat logs
docker compose logs -f rocketchat

# Restart everything
docker compose restart && npm run dev
```

---

📖 **Full Documentation**: See `ROCKETCHAT_IFRAME_FIX.md`
