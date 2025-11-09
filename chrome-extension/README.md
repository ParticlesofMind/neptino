# CSS Selector Inspector Chrome Extension

A Chrome extension that lets you instantly inspect and copy CSS selectors by hovering over elements, without opening DevTools.

## Features

- **Hotkey Activation**: Press and hold a hotkey (default: Alt) to activate inspector mode
- **Visual Highlighting**: Elements are highlighted with a colored outline when hovering
- **Smart Tooltip**: Shows element tag, class names, ID, and full selector path
- **One-Click Copy**: Click any element to copy its selector to clipboard
- **Customizable Settings**: Configure hotkey, highlight color, and display/copy formats
- **Zero UI Clutter**: Works seamlessly without interrupting your workflow

## Installation

### Development Build

1. Install dependencies:
```bash
cd chrome-extension
npm install
```

2. Build the extension:
```bash
npm run build
```

3. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension/dist` directory

### Production Build

The extension will be built to the `dist` directory. You can zip this directory and publish it to the Chrome Web Store.

## Usage

1. **Activate Inspector**: Hold the hotkey (default: Alt) while hovering over elements
2. **Inspect Elements**: Move your mouse over any element to see its CSS information
3. **Copy Selector**: Click on an element to copy its selector to clipboard
4. **Exit**: Release the hotkey or press Escape

## Settings

Click the extension icon to open the settings popup where you can configure:

- **Activation Hotkey**: Choose between Alt, Ctrl, Meta (Cmd), or Shift
- **Highlight Color**: Customize the highlight border color
- **Display Format**: Choose what information to show in the tooltip
  - Class Name: Shows only the primary class
  - CSS Selector: Shows the generated selector
  - Full Info: Shows tag, classes, ID, selector, and full path
- **Copy Format**: Choose what gets copied to clipboard when clicking

## Development

### Project Structure

```
chrome-extension/
├── src/
│   ├── content-script.ts    # Main inspector logic
│   ├── background.ts         # Service worker for hotkey handling
│   ├── popup.ts              # Settings UI controller
│   ├── settings.ts           # Settings management
│   └── content-script.css   # Styles (minimal, mostly inline)
├── dist/                     # Built extension (generated)
├── manifest.json             # Extension manifest
├── popup.html                # Settings popup HTML
├── vite.config.ts            # Vite build configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

### Build Commands

- `npm run build` - Build the extension once
- `npm run watch` - Build and watch for changes
- `npm run dev` - Alias for watch

### Adding Icons

Replace the placeholder icons in `dist/icons/` with actual PNG files:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## Technical Details

- **Manifest Version**: 3
- **Build Tool**: Vite
- **Language**: TypeScript
- **Permissions**: 
  - `activeTab` - Access to current tab
  - `storage` - Save settings
  - `clipboardWrite` - Copy to clipboard

## License

MIT

