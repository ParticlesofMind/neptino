# Hybrid Table Solution

## Overview

The new TableTool implements a **hybrid approach** that combines the best of HTML tables and PIXI.js integration:

- ✅ **HTML tables** for easy text editing (type directly in cells)
- ✅ **PIXI.js proxy objects** for selection tool compatibility
- ✅ **Synchronized positioning** between HTML and PIXI representations
- ✅ **Predictable placement** exactly where you draw

## How It Works

### 1. Dual Representation System

Each table exists as two synchronized objects:

```typescript
interface HybridTableData {
    htmlElement: HTMLTableElement;  // For text editing
    pixiProxy: Graphics;           // For selection/manipulation
    id: string;                   // Unique identifier
    x: number, y: number;         // Position tracking
    width: number, height: number; // Size tracking
    container: Container;          // PIXI container reference
}
```

### 2. Creation Process

When you draw a table:
1. **Preview**: Visual feedback during drawing
2. **PIXI Proxy**: Creates a nearly-transparent Graphics object for selection
3. **HTML Table**: Creates editable HTML table positioned precisely
4. **Registration**: Registers PIXI proxy with DisplayManager for selection tool
5. **Synchronization**: Sets up event handlers to keep both in sync

### 3. Text Editing

- Click any cell to edit text directly
- Tab/Shift+Tab to navigate between cells
- Arrow keys for navigation
- Enter/Escape to confirm/cancel
- **No coordinate conversion needed** - native HTML behavior

### 4. Selection & Manipulation

- **Selection Tool works**: PIXI proxy appears as normal PIXI object
- **Drag to move**: Either HTML or PIXI proxy can initiate dragging
- **Visual feedback**: HTML table follows PIXI transformations
- **Context menu**: Right-click for table actions

### 5. Synchronization Events

```typescript
// PIXI proxy events → Update HTML position
pixiProxy.on('pointermove', updateHtmlPosition);

// HTML events → Update PIXI proxy position
htmlElement.addEventListener('mousemove', updatePixiPosition);
```

## Key Benefits

### ✅ Solves Your Issues

1. **Selection Tool**: Works perfectly - PIXI proxy integrates with selection system
2. **Predictable Placement**: Draw exactly where you want - precise positioning
3. **Easy Text Editing**: Native HTML editing - no complex overlay systems

### ✅ Additional Features

- **Drag from anywhere**: Drag the table border or PIXI proxy
- **Visual feedback**: Hover effects and selection indicators
- **Context menu**: Right-click for table operations
- **Keyboard navigation**: Tab through cells naturally
- **Auto-cleanup**: Both representations cleaned up together

## Usage

1. **Select Table Tool**: Choose from toolbar
2. **Draw Table**: Click and drag to define size and position
3. **Edit Text**: Click any cell to start typing
4. **Move Table**: Use selection tool or drag table borders
5. **Delete**: Right-click → Delete or use selection tool + Delete key

## Technical Integration

### With Selection Tool
```typescript
// Selection tool can find tables by PIXI proxy
const tableData = tableTool.getTableByPixiObject(selectedObject);
if (tableData) {
    // This is a table - handle accordingly
    tableTool.focusTable(tableData.id);
}
```

### With Display Manager
```typescript
// PIXI proxy is registered normally
if (this.displayManager) {
    this.displayManager.add(pixiProxy);
}
```

## Best of Both Worlds

| Feature | HTML Only | PIXI Only | Hybrid Solution |
|---------|-----------|-----------|----------------|
| Text Editing | ✅ Easy | ❌ Complex | ✅ Easy |
| Selection Tool | ❌ Incompatible | ✅ Works | ✅ Works |
| Precise Placement | ❌ Unpredictable | ✅ Predictable | ✅ Predictable |
| Drag & Drop | ❌ Limited | ✅ Full | ✅ Full |
| Performance | ✅ Fast | ✅ Fast | ✅ Fast |
| Maintenance | ✅ Simple | ❌ Complex | ✅ Manageable |

## Summary

This hybrid approach gives you:
- **Convenient text editing** (HTML tables)
- **Full tool integration** (PIXI proxy objects)
- **Predictable behavior** (exact positioning)
- **Best user experience** (native interactions)

The solution elegantly bridges the gap between DOM-based text editing and canvas-based graphics manipulation, providing a seamless experience for users while maintaining clean integration with your existing tool architecture.
