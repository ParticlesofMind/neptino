# Neptino: AI Agent Development Guide

Neptino is an interactive learning experience platform with a canvas-based course builder built using PIXI.js, TypeScript, and Supabase. This guide provides essential knowledge for AI agents working on this codebase.

## Core Architecture

### Technology Stack
- **Frontend**: TypeScript + Vite bundler, PIXI.js for canvas graphics
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Styling**: SASS with 7-1 architecture pattern (`src/scss/`)
- **Testing**: Playwright for end-to-end testing

### Key Dependencies
```json
// Critical libraries - avoid breaking changes
"pixi.js": "^8.12.0",           // Canvas graphics engine
"@pixi/layout": "^3.1.0",       // Layout system  
"pixi-viewport": "^6.0.3",      // Canvas zoom/pan
"@supabase/supabase-js": "^2.54.0" // Backend services
```

## Development Workflows

### Local Development
```bash
npm run dev              # Start dev server (port 3000)
npm run dev:strict       # Strict port mode (no fallback)
npm run lint            # ESLint TypeScript files
npm run format          # Prettier formatting
npm run build:analyze   # Bundle size analysis
```

### Testing & Quality
```bash
npm run test            # Run Playwright tests
npm run lint:fix        # Auto-fix linting issues
npm run format:check    # Check formatting without fixing
```

### Docker Environment
- Use `docker-compose.yml` for full-stack development
- Development: `neptino-dev` service (port 3000)
- Production: `neptino-prod` service (port 8080)
- Database: PostgreSQL 15 with Supabase migrations

## Canvas Architecture Patterns

### Tool System (Critical Pattern)
All drawing tools extend `BaseTool` from `src/scripts/coursebuilder/tools/ToolInterface.ts`:

```typescript
// Tool implementation pattern
export class YourTool extends BaseTool {
  onPointerDown(event: FederatedPointerEvent, container: Container): void
  onPointerMove(event: FederatedPointerEvent, container: Container): void  
  onPointerUp(event: FederatedPointerEvent, container: Container): void
  onActivate(): void
  onDeactivate(): void
  updateSettings(settings: any): void
}
```

**Key Tools:**
- `TextTool.ts`: Drag-to-create text areas with in-place editing
- `AABBSelectionTool.ts`: Object selection and transform handles
- `BrushTool.ts`: Pressure-sensitive drawing
- `ShapesTool.ts`: Geometric primitives

### Display Object Management
Use `DisplayObjectManager` for all PIXI object operations:
```typescript
// Add objects through DisplayObjectManager
this.displayManager.add(graphics, parentContainer);
this.displayManager.remove(objectId);
```

### Canvas Quality Standards
- **Minimum 2x resolution**: `Math.max(window.devicePixelRatio, 2)`
- **Anti-aliasing enabled**: Always true for production
- **Pixel-perfect alignment**: `Math.round()` coordinates
- **High-performance viewport**: Use `pixi-viewport` for zoom/pan

## File Organization Conventions

### Directory Structure
```
src/
├── scripts/
│   ├── coursebuilder/    # Canvas-based course builder
│   │   ├── canvas/       # Canvas initialization and managers
│   │   ├── tools/        # Drawing tools (text, brush, shapes, etc.)
│   │   ├── ui/           # UI components and panels  
│   │   └── utils/        # Canvas utilities
│   ├── backend/          # Supabase integration
│   ├── navigation/       # Page navigation logic
│   └── utils/            # Shared utilities
├── scss/                 # 7-1 SASS architecture
│   ├── abstracts/        # Variables, mixins, functions
│   ├── layout/           # Major layout components
│   ├── components/       # Reusable UI components
│   └── pages/           # Page-specific styles
└── pages/               # HTML pages
```

### Naming Conventions
- **Files**: PascalCase for classes (`TextTool.ts`), camelCase for utilities
- **CSS Classes**: BEM methodology with `__` and `--` separators
- **Canvas Objects**: Use descriptive IDs with manager registration
- **Event Handlers**: Prefix with `on` or `handle` (`onPointerDown`)

## Database Integration

### Supabase Schema (Key Tables)
```sql
-- Core entities
courses              # Course metadata and settings
canvases            # PIXI scene data (JSONB storage)
course_templates    # Reusable template system
profiles           # User accounts and preferences
```

### Canvas Data Storage
Canvas state is serialized to `canvases.canvas_data` as JSONB:
```typescript
// Canvas serialization pattern
const canvasData = {
  objects: [], // PIXI display objects
  settings: {}, // Tool configurations
  metadata: {} // Canvas properties
};
```

## Testing Patterns

### Playwright Test Structure
```typescript
// Standard test setup pattern
test.beforeEach(async ({ page }) => {
  await page.goto('/src/pages/teacher/coursebuilder.html#create');
  await page.waitForFunction(() => window.canvasAPI?.isReady());
  await page.evaluate(() => window.toolStateManager?.setTool('text'));
});

// Use CanvasAPI for safe canvas interactions
const bounds = await page.evaluate(() => window.canvasAPI?.getContentBounds());
```

### Test Categories by File
- `text-tool.spec.ts`: Text area creation, editing, cursor navigation
- `text-tool-basic.spec.ts`: Core text tool functionality
- `tool-infrastructure.spec.ts`: Tool switching and performance

## Performance Considerations

### Canvas Optimization
- **Object pooling**: Reuse graphics objects when possible
- **Layer separation**: Use containers for logical grouping
- **Texture management**: Clean up unused textures
- **Render culling**: Hide off-screen objects

### Memory Management
```typescript
// Cleanup pattern for tools
onDeactivate(): void {
  this.cleanup(); // Remove event listeners
  this.graphics?.destroy(); // Destroy PIXI objects
  this.displayManager?.remove(this.objectId);
}
```

### Bundle Size Monitoring
- Use `npm run build:analyze` for bundle visualization
- Manual chunks configured for vendor libraries
- Target: Keep individual chunks under 600KB

## Common Pitfalls

### Canvas Development
1. **Coordinate Systems**: Always convert between global and local coordinates
2. **Event Handling**: Use PIXI's `FederatedPointerEvent`, not DOM events
3. **Memory Leaks**: Always destroy PIXI objects in cleanup methods
4. **Z-Index Issues**: Use containers and proper parent-child relationships

### TypeScript Patterns  
1. **Path Mapping**: Use `@/*` imports, configured in `tsconfig.json`
2. **Strict Mode**: All code must pass strict TypeScript checks
3. **Interface Extensions**: Extend base interfaces rather than duplicating

### SASS Architecture
1. **Import Order**: Follow 7-1 pattern order in `main.scss`
2. **Variables**: Use abstracts layer, never hardcode values
3. **BEM Naming**: Consistent block__element--modifier pattern

## Integration Points

### External APIs
- **Supabase**: Authentication, database, storage, realtime updates
- **PIXI.js**: Canvas rendering, interaction events, graphics pipeline

### State Management
- **ToolManager**: Central tool switching and state
- **DisplayObjectManager**: Canvas object lifecycle
- **UIEventHandler**: UI component interactions

## Getting Started Checklist

1. **Environment**: Run `npm run dev` and verify localhost:3000 loads
2. **Canvas**: Check PIXI canvas renders and tools are clickable
3. **Database**: Verify Supabase connection in browser dev tools
4. **Tests**: Run `npm run test` to ensure Playwright works
5. **Code Quality**: Run `npm run lint` and `npm run format`

## Key Files to Understand

- `src/scripts/coursebuilder/canvasInit.ts` - Canvas setup and initialization
- `src/scripts/coursebuilder/tools/ToolManager.ts` - Tool lifecycle management
- `NEPTINO_COMPREHENSIVE_OVERVIEW.md` - Complete architectural documentation
- `playwright.config.ts` - Testing configuration and setup
- `vite.config.ts` - Build configuration and optimization

For detailed architectural information, see `NEPTINO_COMPREHENSIVE_OVERVIEW.md`.