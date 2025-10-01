# Neptino Copilot Instructions

Neptino is an interactive learning experience platform with a canvas-based course builder. Here's what you need to know to be productive immediately:

## Architecture Overview

**Core Technologies**: PIXI.js 8.12 canvas engine + TypeScript + Vite + Supabase backend
**Main Pattern**: Modular tool system with clean separation between canvas operations, database, and UI

### Key Directories
- `src/scripts/coursebuilder/` - Canvas engine, tools, and course builder logic
- `src/scripts/coursebuilder/tools/` - Drawing tools (text, brush, shapes, selection)
- `src/scripts/coursebuilder/canvas/` - PIXI.js canvas management (CanvasAPI, layers, events)
- `src/scripts/backend/` - Supabase integration for courses, templates, curriculum
- `supabase/migrations/` - Database schema and migrations
- `tests/` - Playwright end-to-end tests

## Canvas Architecture

**Primary API**: `CanvasAPI` class in `src/scripts/coursebuilder/canvas/CanvasAPI.ts`
- Entry point for all canvas operations
- Coordinates between PIXI app, layers, events, and tools
- Use `canvasAPI.setTool('toolName')` to switch tools
- Access via global `window.canvasAPI` in browser

**Tool System**: All tools extend `BaseTool` from `src/scripts/coursebuilder/tools/ToolInterface.ts`
- Tools: selection, text, brush, pen, shapes, eraser, tables
- Tool state managed by `ToolManager` class
- Each tool handles its own pointer events and settings

**Layers**: Managed by `CanvasLayers` class with predefined layer hierarchy:
- Background → Drawing → UI → Overlays
- Tools draw to appropriate layers automatically

## Database Schema (Supabase)

**Core Tables**:
- `profiles` - User accounts (extends auth.users)
- `courses` - Course metadata, settings, curriculum data
- `canvases` - PIXI scene data per lesson (JSONB canvas_data field)
- `templates` - Reusable course templates
- `enrollments` - Student-course relationships

**Key Pattern**: Heavy use of JSONB for flexible data storage (canvas drawings, curriculum structures, template configurations)

## Development Workflow

**Local Development**:
```bash
npm run dev          # Start dev server on port 3000
npm run lint         # ESLint with TypeScript
npm run format       # Prettier formatting
npm test             # Playwright e2e tests
```

**Build & Deploy**:
```bash
npm run build               # Production build
npm run build:analyze       # Bundle analysis
npm run preview             # Preview build locally
```

## Critical Patterns

### Canvas Tool Integration
```typescript
// Always use CanvasAPI for tool operations
const canvasAPI = new CanvasAPI('#canvas-container');
await canvasAPI.init(config);
canvasAPI.setTool('text');  // Switch to text tool
const activeTool = canvasAPI.getActiveTool();
```

### Database Operations
```typescript
// Use Supabase client from environment
import { supabase } from '../path/to/supabase';
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .eq('teacher_id', userId);
```

### Tool Development
```typescript
// All tools extend BaseTool
export class CustomTool extends BaseTool {
  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    // Use BoundaryUtils.getCanvasDrawingBounds() for boundaries
    // Use historyManager for undo/redo
  }
}
```

## Testing Approach

**Primary Test Framework**: Playwright for end-to-end testing
**Test Pattern**: Wait for `canvasAPI.isReady()` before tool interactions
**Key Test Helper**: Check `window.canvasAPI` and `window.toolStateManager` globals

## Common Gotchas

1. **Canvas Initialization**: Always wait for `canvasAPI.isReady()` before operations
2. **Tool State**: Tools maintain their own settings; use `updateSettings()` to modify
3. **Boundaries**: Use `BoundaryUtils.getCanvasDrawingBounds()` for draw constraints
4. **History**: Call `historyManager.saveState()` after major canvas changes
5. **PIXI Coordinates**: Canvas uses PIXI's coordinate system; convert via `container.toLocal()`

## Environment Setup

Required `.env` variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- Optional media API keys for Unsplash, Pixabay, etc.

## When Making Changes

- **Canvas Tools**: Test with multiple tools and boundary conditions
- **Database Schema**: Update migrations in `supabase/migrations/`
- **UI Components**: Follow BEM methodology in SCSS files
- **New Features**: Add Playwright tests in `tests/` directory
- **Performance**: Canvas operations should maintain 60fps; use `@pixi/devtools` for debugging