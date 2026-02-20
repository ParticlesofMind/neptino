# Build Instructions

## Prerequisites

- Node.js 18+ or 20+
- npm

## Step 1: Install Dependencies

```bash
cd chrome-extension
npm install
```

## Step 2: Build the Extension

```bash
npm run build
```

This will:
1. Compile TypeScript files to JavaScript
2. Bundle everything with Vite
3. Copy `manifest.json` and `popup.html` to `dist/`
4. Create the `icons/` directory

## Step 3: Add Icons (Required)

The extension needs three icon files. You can:

**Option A: Use Placeholder Icons**
- Create three simple PNG files (16x16, 48x48, 128x128 pixels)
- Use any solid color or simple design
- Save them as:
  - `dist/icons/icon16.png`
  - `dist/icons/icon48.png`
  - `dist/icons/icon128.png`

**Option B: Create Proper Icons**
- Design a CSS selector icon (e.g., cursor with selector brackets)
- Export at the three required sizes
- Place in `dist/icons/`

## Step 4: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `chrome-extension/dist` directory
5. The extension should now appear in your extensions list

## Step 5: Test

1. Navigate to any webpage
2. Hold `Alt` (or your configured hotkey)
3. Hover over elements - they should highlight
4. Click an element to copy its selector
5. Check your clipboard - the selector should be there!

## Development Mode

For active development:

```bash
npm run watch
```

This will rebuild automatically when you make changes. After each rebuild:
1. Go to `chrome://extensions/`
2. Click the reload icon on the extension card
3. Refresh the page you're testing on

## Troubleshooting

**Build fails:**
- Make sure you're in the `chrome-extension` directory
- Run `npm install` first
- Check that Node.js version is 18+

**Extension doesn't load:**
- Check browser console for errors
- Verify all files are in `dist/` directory
- Make sure icons are present (even placeholders)

**Hotkey doesn't work:**
- Check extension settings (click extension icon)
- Try a different hotkey
- Some websites may prevent key event handling

**Selector not copying:**
- Check browser console for errors
- Verify clipboard permissions are granted
- Try clicking directly on the element (not its children)

