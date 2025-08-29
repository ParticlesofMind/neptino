# Pure PIXI Drag-to-Create Text System

This module implements a comprehensive drag-to-create text system for PIXI.js canvases, following the specified requirements for interactive text area creation and management.

## Features

### ✅ Drag Creation Behavior
- **Blue-bordered rectangle preview** during mouse drag
- **Dynamic rectangle sizing** that follows mouse movement
- **Finalized text area** on mouse release with proper bounds

### ✅ Visual Text Area
- **Bordered container** with customizable blue outline using PIXI.Graphics
- **Transparent interior** with optional subtle background
- **Properly positioned PIXI.Text** objects inside containers
- **Responsive sizing** that matches dragged rectangle dimensions

### ✅ Text Cursor System
- **Blinking vertical line cursor** using PIXI.Graphics
- **500ms blink interval** for standard cursor behavior
- **Position-aware cursor** that follows text insertion point
- **Character-based positioning** within text content

### ✅ Interaction States
- **Creating mode** - While dragging to define text area
- **Active mode** - Ready for typing with visible blinking cursor
- **Inactive mode** - Display only, no cursor visible
- **Click activation** - Click text areas to make them active
- **Deactivation** - Click outside to deactivate all text areas

### ✅ Text Input Handling
- **Full keyboard capture** when text area is active
- **Character insertion** at cursor position
- **Backspace and delete** support
- **Arrow key navigation** for cursor movement
- **Special key handling** (Home, End, Enter, Tab)

### ✅ Text Flow Management
- **Automatic text wrapping** when exceeding area width
- **Line break recalculation** on content or size changes
- **Cursor line positioning** with proper vertical navigation
- **Word boundary detection** for natural text flow

### ✅ Modular Architecture
- **Focused components** with single responsibilities
- **Clear interfaces** for inter-component communication
- **Separation of concerns** between rendering, input, cursor, and flow management

## Architecture

### Core Components

#### `TextTool` - Main Tool Implementation
- Manages overall text tool functionality
- Handles drag-to-create interactions
- Coordinates between all sub-components
- Integrates with existing tool system

#### `TextArea` - Visual Container
- Renders bordered text containers
- Manages PIXI.Text objects
- Handles text content and styling
- Provides positioning utilities

#### `TextCursor` - Cursor Management
- Implements blinking cursor graphics
- Manages cursor positioning and visibility
- Handles cursor animation timing

#### `TextInputHandler` - Keyboard Input
- Captures and processes keyboard events
- Handles text editing operations
- Manages cursor movement commands

#### `TextFlowManager` - Text Layout
- Calculates text wrapping and line breaks
- Manages text positioning within boundaries
- Handles character position calculations

## Usage

### Basic Integration

```typescript
// Import the text tool
import { TextTool } from './coursebuilder/tools/text';

// The TextTool is automatically registered in ToolManager
// Set text tool as active
toolManager.setActiveTool('text');
```

### Programmatic Usage

```typescript
// Create text areas programmatically
const textTool = new TextTool();
const textArea = textTool.createTextArea({
  bounds: { x: 100, y: 100, width: 200, height: 100 },
  text: 'Hello World',
  settings: {
    fontFamily: 'Arial',
    fontSize: 16,
    color: '#000000'
  }
});
```

### Demo and Testing

```typescript
// Use the demo for testing
import { TextToolDemo } from './coursebuilder/tools/text';

const demo = new TextToolDemo();
await demo.init('#canvas-container');
demo.showFeatures();
```

## User Interactions

### Creating Text Areas
1. **Select text tool** from toolbar
2. **Click and drag** on canvas to draw rectangle
3. **Release mouse** to finalize text area
4. **Text area becomes active** with blinking cursor

### Editing Text
1. **Click text area** to activate
2. **Type normally** - text appears at cursor
3. **Use arrow keys** to navigate cursor
4. **Use Backspace/Delete** to remove text
5. **Click outside** to deactivate

### Navigation Keys
- **Arrow Left/Right** - Move cursor by character
- **Arrow Up/Down** - Move cursor by line
- **Home** - Move to line start
- **End** - Move to line end
- **Ctrl+Arrow** - Move by word boundaries

## Configuration

### Text Settings
```typescript
interface TextSettings {
  fontFamily: string;      // Font family name
  fontSize: number;        // Font size in pixels
  color: string;          // Text color (hex)
  backgroundColor?: string; // Optional background
  borderColor: string;     // Border color (hex)
  borderWidth: number;     // Border thickness
}
```

### Default Settings
- **Font**: Inter (fallback: Arial)
- **Size**: 16px
- **Color**: Dark charcoal (#333333)
- **Border**: Blue (#4a90e2)
- **Border Width**: 2px

## Integration Notes

### Canvas Boundaries
- **Respects canvas margins** - Cannot create in margin areas
- **Boundary clamping** - Drag operations stay within bounds
- **Content area protection** - Text areas only in valid regions

### Tool System Integration
- **Implements BaseTool interface** for consistency
- **Event handling coordination** with ToolManager
- **State management** aligned with other tools
- **Professional styling** using SharedResources

### Performance Considerations
- **Efficient text measurement** using temporary PIXI.Text objects
- **Cursor blinking optimization** with proper timer management
- **Event listener cleanup** to prevent memory leaks
- **Graphics reuse** where possible

## File Structure

```
text/
├── index.ts              # Main exports
├── types.ts              # TypeScript interfaces
├── TextTool.ts           # Main tool implementation
├── TextArea.ts           # Visual text container
├── TextCursor.ts         # Cursor management
├── TextInputHandler.ts   # Keyboard input handling
├── TextFlowManager.ts    # Text layout management
├── TextToolDemo.ts       # Demo and testing
└── README.md            # This documentation
```

## Testing

### Manual Testing
1. Open coursebuilder page with canvas
2. Select text tool from toolbar
3. Drag to create text areas
4. Click areas to activate and type
5. Test navigation keys and editing

### Automated Demo
```typescript
// Run automated tests
const demo = new TextToolDemo();
await demo.init();
await demo.testTextTool();
```

## Browser Compatibility

- **Modern browsers** with ES2020 support
- **WebGL support** for PIXI.js rendering
- **Full keyboard event support**
- **Mouse/pointer event compatibility**

## Future Enhancements

- **Rich text formatting** (bold, italic, underline)
- **Text alignment options** (left, center, right, justify)
- **Font size and family selectors** in UI
- **Copy/paste operations** with clipboard API
- **Undo/redo functionality** for text operations
- **Text search and replace** within areas
- **Export to various formats** (HTML, Markdown, etc.)

---

This implementation provides a complete, production-ready drag-to-create text system that integrates seamlessly with the existing PIXI.js coursebuilder application.
