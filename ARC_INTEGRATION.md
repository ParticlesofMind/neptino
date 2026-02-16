# 🎯 Neptino Arc Browser Integration

## Quick Start

```bash
npm run dev
```

That's it! The dev server will:
1. ✅ Start Vite on `http://localhost:3000`
2. ✅ Automatically open Arc browser
3. ✅ **Reuse existing localhost:3000 tab** (won't create new windows!)
4. ✅ Focus the tab if Arc is already running

## How It Works

### Smart Tab Reuse
The `scripts/open-arc.sh` script uses AppleScript to:
- Search for existing `localhost:3000` tabs
- Focus that tab if found
- Create a new tab in current window if not found
- Never creates new Arc windows

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | **Standard** - Start server + open Arc (reuses tabs) |
| `npm run dev:manual` | Start server only (no browser) |
| `npm run dev:strict` | Strict localhost binding (no external access) |

## How Tab Reuse Works

1. **Arc Already Running + Tab Exists**
   - Script finds your localhost:3000 tab
   - Focuses that tab
   - Refreshes the page (Arc auto-refresh)

2. **Arc Running + No Tab**
   - Opens new tab in **current window**
   - No new window created

3. **Arc Not Running**
   - Launches Arc
   - Opens localhost:3000

## Customize

### Change the Delay
Edit `scripts/open-arc.sh`:
```bash
# Wait for Vite to be ready
sleep 2  # <-- Change this number (seconds)
```

### Disable Arc Auto-Open
```bash
npm run dev:manual
```

Then manually open Arc to `http://localhost:3000`

## Troubleshooting

### Arc Opens New Window Each Time
The script is designed to prevent this, but if it happens:
1. Make sure you're using Arc (not Arc Beta)
2. Check that AppleScript has permission:
   - **System Settings** → **Privacy & Security** → **Automation**
   - Enable **Terminal** → **Arc**

### Arc Doesn't Open
```bash
# Test the script manually
./scripts/open-arc.sh
```

If this fails, Arc might not be installed or named differently.

### Want to Use Chrome/Brave Instead?
Edit `scripts/open-arc.sh` and replace `"Arc"` with your browser name:
```bash
open -a "Google Chrome" "$URL"
# or
open -a "Brave Browser" "$URL"
```

## Files

- `start-dev.sh` - Main startup script
- `scripts/open-arc.sh` - Smart Arc tab manager
- `package.json` - npm scripts configuration

## Why This Is Better

### Before:
- Multiple Firefox windows opening 🔥
- New browser window every time 😤
- Manual tab management 🤯

### Now:
- One Arc tab, always 🎯
- Smart tab reuse ♻️
- Just `npm run dev` ✨

---

**Pro Tip:** Keep Arc open while developing for instant tab reuse!
