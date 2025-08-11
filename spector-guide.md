# Spector.js WebGL Debugger Setup Guide

## What is Spector.js?

Spector.js is a powerful WebGL debugger that helps you inspect and troubleshoot WebGL contexts. It captures all WebGL commands from a frame and shows you the visual states and context information.

## Installation

✅ **Already completed:** `npm install spectorjs`

## How to Use Spector.js in Your Project

### 1. Automatic Setup (Recommended)

The devtools setup automatically initializes Spector.js when you visit the coursebuilder page:

```
/src/pages/teacher/coursebuilder.html
```

### 2. Access Methods

#### Method A: Browser Console Commands
Open Developer Tools (F12) → Console tab, then use:

```javascript
// Show the Spector.js UI overlay
window.spector.displayUI()

// Start monitoring all canvases automatically  
window.spector.spyCanvases()

// Capture a specific canvas
const canvas = document.querySelector('canvas');
window.spector.captureCanvas(canvas)

// Start/stop manual capture
window.spector.startCapture()
window.spector.stopCapture()
```

#### Method B: Visual Indicator
Look for the green "🔍 Spector.js Ready" indicator in the top-right corner of the page. Click it to open the Spector.js UI.

#### Method C: Browser Extension (Alternative)
Install the official browser extension:
- [Chrome Extension](https://chrome.google.com/webstore/detail/spectorjs/denbgaamihkadbghdceggmchnflmhpmk)
- [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/spector-js/)

### 3. Using the Spector.js Interface

Once you run `window.spector.displayUI()`, you'll see:

1. **Control Panel**: Start/stop capture, settings
2. **Command List**: All WebGL commands executed  
3. **Visual State**: See the result of each command
4. **Context Information**: Buffers, textures, shaders, etc.
5. **Performance Metrics**: Draw calls, memory usage

### 4. Key Features

- **Frame Capture**: Capture entire frames to see all WebGL calls
- **Command Inspection**: Click any WebGL command to see its parameters
- **Visual Debugging**: See exactly what each command draws
- **Texture Inspection**: View all textures and their contents
- **Shader Analysis**: Inspect vertex and fragment shaders
- **Performance Analysis**: Monitor draw calls and memory usage

### 5. Debugging PixiJS with Spector.js

For PixiJS applications specifically:

```javascript
// First, enable canvas monitoring
window.spector.spyCanvases()

// Then use your PixiJS app normally
// Spector will automatically track all WebGL calls

// To capture a frame:
window.spector.captureCanvas(app.view)

// Or use the UI for interactive debugging
window.spector.displayUI()
```

### 6. Troubleshooting

If Spector.js doesn't load:

1. **Check Console**: Look for initialization messages
2. **Manual Script**: Add to your HTML:
   ```html
   <script src="https://spectorcdn.babylonjs.com/spector.bundle.js"></script>
   ```
3. **Browser Extension**: Use the official extension as backup

### 7. Advanced Usage

#### Custom Metadata
Add custom names to WebGL objects for easier debugging:

```javascript
const buffer = gl.createBuffer();
buffer.__SPECTOR_Metadata = { name: "myVertexBuffer" };
```

#### Capture Events
Listen for capture completion:

```javascript
window.spector.onCapture.add((capture) => {
    console.log("Capture completed:", capture);
    // Process capture data
});
```

## Integration Status

✅ **Setup Complete**: Spector.js is configured in your coursebuilder
✅ **Auto-Loading**: Multiple fallback methods ensure it loads
✅ **Visual Indicators**: Green indicator shows when ready
✅ **Console Commands**: All debugging commands available

## Next Steps

1. Open `/src/pages/teacher/coursebuilder.html`
2. Look for the "🔍 Spector.js Ready" indicator
3. Click it or use `window.spector.displayUI()` in console
4. Start debugging your PixiJS canvas!
