# Rocket.Chat Iframe Integration Fix ✅

## Issue Summary

The Rocket.Chat iframe was failing to load in the Neptino teacher dashboard with these errors:
- `GET http://localhost:3100/api/v1/info 404 (Not Found)` - API endpoint not initialized
- `Refused to display 'http://localhost:3100/' in a frame because it set 'X-Frame-Options' to 'sameorigin'` - iframe blocking

## Root Causes

1. **Rocket.Chat not fully initialized**: Fresh Rocket.Chat installations don't have the `/api/v1/info` endpoint active until setup is completed
2. **Iframe configuration incomplete**: Missing proper iframe integration settings for cross-origin embedding
3. **Environment variables not reloaded**: Vite dev server needed restart to pick up updated environment variables

## Fixes Applied

### 1. Updated `rocketchat.env`

Added comprehensive iframe integration settings:

```bash
OVERWRITE_SETTING_Iframe_Integration_enabled=true
OVERWRITE_SETTING_Iframe_Integration_allowedDomains=http://localhost:3000
OVERWRITE_SETTING_Iframe_Integration_send_enable=true
OVERWRITE_SETTING_Iframe_Integration_send_target_origin=http://localhost:3000
OVERWRITE_SETTING_Iframe_Integration_receive_enable=true
OVERWRITE_SETTING_Iframe_Integration_receive_origin=http://localhost:3000
```
Restrict access inside any Iframe
### 2. Updated `.env.local`

Added explicit embed URL configuration:

```bash
VITE_ROCKETCHAT_URL=http://localhost:3100
VITE_ROCKETCHAT_EMBED_URL=http://localhost:3100
VITE_ROCKETCHAT_USE_REALTIME=true
```

### 3. Restarted Services

- Restarted Docker Compose containers to apply new settings
- Restarted Vite dev server to reload environment variables

## Next Steps (Required)

### Step 1: Complete Rocket.Chat Setup Wizard

1. **Access Rocket.Chat**: Open http://localhost:3100
2. **Complete Setup Wizard**:
   - Create admin account (remember these credentials!)
   - Set organization name (e.g., "Neptino")
   - Confirm site URL: `http://localhost:3100`
   - Skip optional steps or configure as needed

### Step 2: Configure Iframe Integration (Automated)

After completing the setup wizard, run our configuration script:

```bash
./scripts/configure-rocketchat-iframe.sh
```

This script will:
- ✅ Authenticate with your admin credentials
- ✅ Enable iframe integration settings
- ✅ Configure CORS and X-Frame-Options
- ✅ Save admin tokens to `.env.local`

**OR Manual Configuration:**

If you prefer to configure manually:

1. **Login as Admin**: http://localhost:3100
2. **Go to Administration** (≡ menu → Administration)
3. **Navigate to Settings → General → Iframe Integration**:
   - Enable: `Iframe Integration Send`
   - Set Target Origin: `http://localhost:3000`
   - Enable: `Iframe Integration Receive`
   - Set Receive Origin: `http://localhost:3000`
4. **Navigate to Settings → General → REST API**:
   - Disable CORS or add `http://localhost:3000` to allowed origins
5. **Create Personal Access Token**:
   - Profile → My Account → Security → Personal Access Tokens
   - Generate Token → Name: "Neptino Integration"
   - Copy token and user ID
6. **Update `.env.local`**:
   ```bash
   VITE_ROCKETCHAT_ADMIN_TOKEN=your_token_here
   VITE_ROCKETCHAT_ADMIN_USER_ID=your_user_id_here
   ```

### Step 3: Restart Vite Dev Server

```bash
# Stop current server (Ctrl+C) and restart
npm run dev
```

## Testing the Fix

### 1. Check Rocket.Chat is Running
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/home
# Should return: 200
```

### 2. Check Docker Services
```bash
docker compose ps
# All services should show "Up"
```

### 3. Test the Iframe

1. Open http://localhost:3000/src/pages/teacher/home.html
2. Login to Neptino
3. Navigate to the "Messages" section (sidebar)
4. You should see the Rocket.Chat interface embedded

### Expected Behavior

**Before Admin Setup**:
- Iframe loads the Rocket.Chat home/setup page
- No "localhost refused to connect" error
- May show "Messaging access is not ready" message in Neptino

**After Admin Setup + Token Configuration**:
- Iframe loads with authenticated Rocket.Chat session
- User search functionality works
- Can start direct messages with other users
- Full messaging interface embedded

## Troubleshooting

### Iframe Still Shows "Refused to Connect"

1. **Check Rocket.Chat is running**:
   ```bash
   docker compose ps rocketchat
   ```

2. **Check logs for errors**:
   ```bash
   docker compose logs -f rocketchat
   ```

3. **Verify port 3100 is accessible**:
   ```bash
   curl http://localhost:3100/home
   ```

### Iframe Loads but Shows Blank/White Screen

1. **Check browser console** for CORS or iframe errors
2. **Verify X-Frame-Options** in Rocket.Chat:
   ```bash
   docker compose logs rocketchat | grep -i "x-frame"
   ```

### "Messaging session is not active" Error

This means admin credentials are not configured yet:

1. Complete the Rocket.Chat setup wizard
2. Generate personal access token
3. Add token to `.env.local`
4. Restart Vite dev server

### API Returns 404

This is normal before Rocket.Chat setup is completed. The `/api/v1/info` endpoint becomes active after:
1. Setup wizard is completed
2. Admin user is created
3. Database is fully initialized

## Architecture Overview

### How the Iframe Integration Works

```
Neptino (localhost:3000)
    ↓
RocketChatService.ts
    ├─→ API Calls to localhost:3100/api/v1/*
    └─→ Iframe Embed: localhost:3100/channel/general?layout=embedded&token=...
         ↓
    Rocket.Chat (localhost:3100)
         ├─→ X-Frame-Options: ALLOWALL
         ├─→ Iframe Integration: Enabled
         └─→ Allowed Domains: http://localhost:3000
```

### Key Files

- **Frontend Integration**: `src/scripts/backend/rocketchat/MessagingInterface.ts`
- **API Service**: `src/scripts/backend/rocketchat/RocketChatService.ts`
- **HTML Template**: `src/pages/teacher/home.html`
- **Rocket.Chat Config**: `rocketchat.env`
- **Vite Config**: `.env.local`

## Configuration Summary

### Rocket.Chat Settings (rocketchat.env)
```bash
ROOT_URL=http://localhost:3100
HOST_PORT=3100
OVERWRITE_SETTING_HTTP_Header_X-Frame-Options=ALLOWALL
OVERWRITE_SETTING_Iframe_Integration_enabled=true
OVERWRITE_SETTING_Iframe_Integration_allowedDomains=http://localhost:3000
OVERWRITE_SETTING_Iframe_Integration_send_enable=true
OVERWRITE_SETTING_Iframe_Integration_send_target_origin=http://localhost:3000
OVERWRITE_SETTING_Iframe_Integration_receive_enable=true
OVERWRITE_SETTING_Iframe_Integration_receive_origin=http://localhost:3000
```

### Neptino Settings (.env.local)
```bash
VITE_ROCKETCHAT_URL=http://localhost:3100
VITE_ROCKETCHAT_EMBED_URL=http://localhost:3100
VITE_ROCKETCHAT_USE_REALTIME=true
```

## Status

✅ **Fixed**: Iframe configuration and environment setup
✅ **Fixed**: Docker Compose configuration
✅ **Fixed**: Vite environment variables
⏳ **Pending**: Complete Rocket.Chat setup wizard
⏳ **Pending**: Configure admin API credentials

---

**Date**: October 18, 2025
**Rocket.Chat Version**: 7.11.0
**Fix Status**: Configuration Complete - Awaiting Admin Setup
