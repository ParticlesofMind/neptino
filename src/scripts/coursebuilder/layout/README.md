# Layout System

A scalable, grid-based layout system for the Course Builder canvas that maps perfectly onto the PIXI.js canvas coordinate system.

## Overview

The layout system provides a structured approach to positioning and managing UI components on the course builder canvas. It uses a 12-column grid system that perfectly maps to the A4-sized canvas (794×1123 pixels).

## Core Components

### LayoutManager
- **Purpose**: Core grid system and layout orchestration
- **Responsibilities**: 
  - Define 12-column grid system
  - Calculate positioning and dimensions
  - Manage layout regions and templates
  - Provide debug grid visualization

### HeaderComponent
- **Purpose**: Always-present header area
- **Features**:
  - Text, logo, or mixed content support
  - Configurable styling and positioning
  - Multiple alignment options (left, center, right)
  - Dynamic content updates

### FooterComponent
- **Purpose**: Always-present footer area  
- **Features**:
  - Page numbers, copyright, navigation
  - Three-section layout (left, center, right)
  - Dynamic page number updates
  - Configurable styling

## Grid System Specifications

```typescript
Canvas: 794×1123 pixels (A4 at 96 DPI)
Columns: 12
Header Height: 80px (~7% of canvas)
Footer Height: 60px (~5% of canvas)
Gutters: 16px between columns
Margins: 20px top/bottom, 30px left/right
```

## Quick Start

### 1. Basic Setup

```typescript
import { CanvasAPI } from '../canvas/CanvasAPI';
import { LayoutManager, HeaderComponent, FooterComponent } from './layout';

// Initialize canvas (existing)
const canvas = new CanvasAPI('#canvas-container');
await canvas.init();

// Initialize layout system
const layoutManager = new LayoutManager();
const uiLayer = canvas.getLayer('ui');
layoutManager.initialize(uiLayer);

// Optional: Show debug grid during development
layoutManager.toggleDebugGrid(true);
```

### 2. Create Basic Template

```typescript
// Create template with header and footer
const template = layoutManager.createBasicTemplate();
layoutManager.applyTemplate(template);
```

### 3. Add Header

```typescript
const headerRegion = layoutManager.createHeaderRegion();
const header = new HeaderComponent(headerRegion, {
  backgroundColor: 0xf8f9fa,
  textStyle: {
    fontSize: 28,
    fill: 0x333333,
    fontWeight: 'bold'
  }
});

header.setContent({
  type: 'text',
  title: 'My Course Title',
  subtitle: 'Chapter 1: Introduction',
  alignment: 'center'
});

uiLayer.addChild(header.getContainer());
```

### 4. Add Footer

```typescript
const footerRegion = layoutManager.createFooterRegion();
const footer = new FooterComponent(footerRegion);

footer.setContent({
  type: 'mixed',
  leftText: 'Course Name',
  centerText: '© 2025 My Institution', 
  rightText: 'Page 1 of 10'
});

uiLayer.addChild(footer.getContainer());
```

## Grid Positioning

The layout system provides precise positioning based on a 12-column grid:

### Column Calculations
```typescript
// Get column width (accounts for gutters and margins)
const columnWidth = layoutManager.getColumnWidth();

// Get position for specific grid cell
const position = layoutManager.getGridPosition(column, row);

// Get dimensions for multi-column span
const dimensions = layoutManager.getRegionDimensions(columnSpan, rowSpan);
```

### Grid Coordinates
- **Columns**: 1-12 (left to right)
- **Rows**: 
  - `0`: Header row
  - `1+`: Content rows  
  - `-1`: Footer row (special case)

## Content Areas

### Header Area
- **Position**: Top of canvas
- **Height**: 80px fixed
- **Spans**: All 12 columns
- **Usage**: Course title, logos, navigation

### Footer Area  
- **Position**: Bottom of canvas
- **Height**: 60px fixed
- **Spans**: All 12 columns
- **Usage**: Page numbers, copyright, metadata

### Content Area
- **Position**: Between header and footer
- **Height**: ~983px (flexible)
- **Spans**: All 12 columns (subdivided as needed)
- **Usage**: Main course content, lessons, activities

## Advanced Features

### Debug Grid
```typescript
// Show/hide grid overlay for development
layoutManager.toggleDebugGrid(true);

// Get layout information
const info = layoutManager.getLayoutInfo();
console.log('Column width:', info.columnWidth);
console.log('Content height:', info.contentHeight);
```

### Dynamic Updates
```typescript
// Update header content
header.updateContent({
  title: 'New Chapter Title',
  subtitle: 'Updated subtitle'
});

// Update page numbers
footer.updatePageNumber(5, 20);
```

### Configuration Updates
```typescript
// Update header styling
header.updateConfig({
  backgroundColor: 0xe3f2fd,
  textStyle: {
    fontSize: 32,
    fill: 0x1976d2
  }
});
```

## Layout Templates

The system supports extensible layout templates:

### Basic Template
- Header: Full width
- Footer: Full width  
- Content: Single column

### Future Templates (Roadmap)
- **Two-Column**: Header, two content columns, footer
- **Sidebar**: Header, sidebar + main content, footer
- **Three-Column**: Header, three equal columns, footer
- **Mixed**: Header, flexible content regions, footer

## Integration with Canvas

The layout system is designed to work seamlessly with the existing PIXI.js canvas:

### Layer Integration
- Uses the **UI layer** for layout components
- Preserves **drawing layer** for user content
- Respects **background layer** for canvas background

### Coordinate Mapping
- Layout positions map directly to PIXI container coordinates
- No transformation needed between layout and canvas coordinates
- Perfect pixel alignment with canvas dimensions

## Development Workflow

### 1. Enable Debug Mode
```typescript
layoutManager.toggleDebugGrid(true);
```

### 2. Test Responsiveness
```typescript
// Test different canvas sizes (future feature)
layoutManager.updateConfig({
  totalWidth: 900,
  totalHeight: 1200
});
```

### 3. Profile Performance
```typescript
// Get debug information
const debugInfo = {
  layout: layoutManager.getLayoutInfo(),
  header: header.getDebugInfo(),
  footer: footer.getDebugInfo()
};
```

## Next Steps

The layout system provides a solid foundation for:

1. **Content Templates**: Structured layouts for different course types
2. **Responsive Design**: Adapting to different screen sizes and orientations
3. **Dynamic Content**: Real-time updates and interactive elements
4. **Component Library**: Reusable UI components positioned using the grid
5. **Theme System**: Consistent styling across all layout components

## Usage

Use the `LayoutManager` directly for proper integration:

```typescript
import { LayoutManager } from './layout/LayoutManager';
import { HeaderComponent, FooterComponent } from './layout';

// Initialize layout manager
const layoutManager = new LayoutManager();
const uiLayer = canvasAPI.getLayer('ui');
layoutManager.initialize(uiLayer);

// Create and position components
const headerRegion = layoutManager.createHeaderRegion();
const headerComponent = new HeaderComponent(headerRegion);

// Apply template and add to canvas
const template = layoutManager.createBasicTemplate();
layoutManager.applyTemplate(template);
```

This creates a solid, scalable foundation for building more complex layout templates and components on top of the existing canvas system.
