# Custom Color Selector Implementation

## Overview

This implementation replaces Select2 color dropdowns with a custom color selector component that provides a better user experience with color cards similar to modern design tools.

## What Was Changed

### 1. HTML Structure
- Replaced `<select>` elements with `<div class="color-selector">` containers
- Added data attributes for configuration:
  - `data-color-selector`: Identifies the selector type (e.g., "pen-stroke", "pen-fill")
  - `data-initial-color`: Sets the initial selected color
  - `data-allow-transparent`: Enables transparent/no-fill option

### 2. CSS Components
- **Created**: `/src/scss/components/_color-selector.scss`
- **Updated**: `/src/scss/main.scss` to include the new component
- **Enhanced**: `/src/scss/layout/_engine.scss` for better tool layout

### 3. JavaScript Components
- **Created**: `/src/scripts/coursebuilder/tools/CustomColorSelector.ts` - Main color selector class
- **Created**: `/src/scripts/coursebuilder/tools/ColorSelectorInit.ts` - Initialization helper

### 4. Select2 Cleanup
- Removed Select2 color dropdown initialization code
- Kept Select2 for non-color dropdowns (shapes, fonts, text sizes)
- Removed color-specific Select2 event handlers

## Features

### Color Selector Interface
- **Trigger Button**: Shows selected color as a swatch
- **Popup Card**: Opens with organized color sections
- **Color Sections**:
  - Pen colors (primary palette)
  - Document colors (with custom color picker)
  - Brand colors
  - Transparent option (when enabled)

### User Experience
- Click trigger to open color palette
- Grid layout with hover effects
- Keyboard navigation support
- Selected color highlighted with checkmark
- Closes automatically after selection
- Positioned intelligently to stay in viewport

### Integration
- Seamlessly integrates with existing `uiEventHandler.handleColorChange()`
- Works with `toolStateManager.updateToolSettings()`
- Maintains all existing functionality

## Usage Example

```html
<!-- Pen stroke color selector -->
<div class="color-selector" 
     data-color-selector="pen-stroke" 
     data-initial-color="#1a1a1a" 
     title="Stroke Color">
</div>

<!-- Fill color selector with transparent option -->
<div class="color-selector" 
     data-color-selector="pen-fill" 
     data-initial-color="transparent" 
     data-allow-transparent="true" 
     title="Fill Color">
</div>
```

## Browser Support
- Modern browsers with ES6+ support
- CSS Grid and Flexbox support required
- Uses CSS custom properties (CSS variables)

## Customization
- Colors defined in `CustomColorSelector.ts`
- Styling in `_color-selector.scss`
- Easy to add new color sections or modify existing ones