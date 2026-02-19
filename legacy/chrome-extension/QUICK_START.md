# Quick Start Guide

## Installation

1. **Install dependencies:**
   ```bash
   cd chrome-extension
   npm install
   ```

2. **Build the extension:**
   ```bash
   npm run build
   ```

3. **Add icons (required):**
   - Create or download three PNG icon files:
     - `dist/icons/icon16.png` (16x16 pixels)
     - `dist/icons/icon48.png` (48x48 pixels)
     - `dist/icons/icon128.png` (128x128 pixels)
   - You can use simple colored squares as placeholders for testing

4. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension/dist` directory

## Usage

1. **Activate:** Hold `Alt` (or your configured hotkey) and hover over any element
2. **Inspect:** Move your mouse to see element information in the tooltip
3. **Copy:** Click on an element to copy its selector to clipboard
4. **Exit:** Release the hotkey or press `Escape`

## Settings

Click the extension icon in the toolbar to open settings and customize:
- Hotkey (Alt, Ctrl, Meta/Cmd, or Shift)
- Highlight color
- Display format (what shows in tooltip)
- Copy format (what gets copied to clipboard)

## Development

- `npm run build` - Build once
- `npm run watch` - Build and watch for changes
- `npm run dev` - Alias for watch

After building, reload the extension in `chrome://extensions/` to see changes.

