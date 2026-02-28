# Canvas JSON Template System

## Overview

Templates are now **pure JSON data structures**, not React components. This architectural shift provides:

- **Data-driven design**: Templates are storable in databases, version-controlled, and shareable without shipping React code
- **Infinite layout flexibility**: Change any layout by editing x/y coordinates
- **Simple rendering pipeline**: Canvas maps over blocks and renders each at its position
- **Zero component coupling**: Adding a template means adding a JSON file, not writing components

## Architecture

```
page.tsx
  └── CreateView.tsx (state, toolbar, panels)
        └── Canvas.tsx (pan, zoom, page container)
              └── Block.tsx (renders ANY block from its data)
```

### Component Responsibilities

- **Canvas.tsx**: Handles pan, zoom, viewport management, and maps over blocks
- **Block.tsx**: Single switch statement on `block.type` that renders the appropriate element
- **CreateView.tsx**: State management, toolbars, and panels (optional wrapper)

## Template Schema

A template is a JSON object with this structure:

```typescript
{
  id: "lesson-intro",
  name: "Lesson Introduction",
  description: "Standard lesson page with text and media blocks",
  version: "1.0.0",
  pageWidth: 794,   // Canvas width in px
  pageHeight: 1123, // Canvas height in px
  blocks: [
    { 
      id: "1", 
      type: "text", 
      x: 80, 
      y: 60, 
      width: 500, 
      height: 120, 
      content: "Introduction to Machine Learning",
      fontSize: 32,
      fontWeight: "bold",
      color: "#1a1a1a"
    },
    { 
      id: "2", 
      type: "image", 
      x: 640, 
      y: 60, 
      width: 400, 
      height: 300, 
      src: "/images/ml-hero.jpg",
      objectFit: "cover"
    },
    // ... more blocks
  ]
}
```

## Block Types

The system supports these block types:

- **text**: Simple text with font styling
- **richText**: HTML/Markdown content
- **image**: Images with object-fit control
- **video**: Video players with controls
- **embed**: iframes and embed codes
- **shape**: Rectangles, circles, lines, arrows
- **table**: Data tables with headers
- **bullet-list**: Unordered lists
- **numbered-list**: Ordered lists

Each block type has its own properties, but all share:
- `id`: Unique identifier
- `type`: Block type discriminator
- `x`, `y`: Position in pixels (from top-left)
- `width`, `height`: Dimensions in pixels
- `zIndex`: Optional stacking order

## Creating Templates

### 1. Define the JSON

Create a new file in `src/templates/json/`:

```typescript
// src/templates/json/my-template.ts
import type { TemplateSchema } from "@/types/canvas-block"

export const MY_TEMPLATE: TemplateSchema = {
  id: "my-template",
  name: "My Template",
  pageWidth: 794,
  pageHeight: 1123,
  blocks: [
    {
      id: "1",
      type: "text",
      x: 100,
      y: 100,
      width: 600,
      height: 80,
      content: "Hello World",
      fontSize: 24,
    },
  ],
}
```

### 2. Register the Template

Add it to the registry in `src/templates/json/index.ts`:

```typescript
import { MY_TEMPLATE } from "./my-template"

export const TEMPLATE_REGISTRY = {
  blank: BLANK_TEMPLATE,
  "lesson-intro": LESSON_INTRO_TEMPLATE,
  "quiz-basic": QUIZ_TEMPLATE,
  "my-template": MY_TEMPLATE,  // Add here
} as const
```

### 3. Use the Template

```typescript
import { Canvas } from "@/components/canvas/Canvas"
import { MY_TEMPLATE } from "@/templates/json/my-template"

export default function MyPage() {
  return <Canvas template={MY_TEMPLATE} zoom={100} />
}
```

## Coordinate System

All positions are absolute from the top-left corner of the page:

```
(0, 0) ─────────────────────────► x
  │
  │    (x: 80, y: 60)
  │    ┌──────────────┐
  │    │   Block 1    │
  │    └──────────────┘
  │
  │           (x: 400, y: 200)
  │           ┌──────────────┐
  │           │   Block 2    │
  │           └──────────────┘
  ▼
  y
```

## Block Rendering

The `Block.tsx` component renders any block type:

```typescript
<Block 
  block={blockData} 
  selected={isSelected}
  onSelect={handleSelect}
/>
```

Internally, it switches on `block.type` to render the appropriate element with the correct styling and positioning.

## Storing Templates

Templates can be:

1. **Hardcoded**: TypeScript files in `src/templates/json/`
2. **Database**: JSON column in Supabase/PostgreSQL
3. **File system**: JSON files loaded at runtime
4. **API**: Fetched from external services
5. **Marketplace**: Shared between users

Example Supabase schema:

```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  page_width INTEGER NOT NULL,
  page_height INTEGER NOT NULL,
  blocks JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Migration from Component-Based Templates

### Before (Component-based)
```tsx
<TemplateSurface 
  type="lesson"
  enabled={...}
  fieldEnabled={...}
  ...
/>
```

### After (JSON-based)
```tsx
<Canvas template={LESSON_INTRO_TEMPLATE} zoom={100} />
```

### Benefits of Migration

- **No prop drilling**: Template data is self-contained
- **Runtime editing**: Change templates without rebuilding
- **Version control**: Templates are pure data
- **Multi-tenant**: Different users can have different templates
- **A/B testing**: Easy to swap templates and compare
- **Export/Import**: Templates are portable

## Demo

Visit `/canvas-demo` to see the new system in action. You can:

- Switch between templates
- Zoom in/out
- Pan around the canvas
- Click blocks to select them

## Examples

See these files for complete examples:

- `src/templates/json/lesson-intro.ts` - Lesson page with mixed content
- `src/templates/json/quiz-basic.ts` - Quiz with questions and tables
- `src/templates/json/index.ts` - Template registry
- `src/app/canvas-demo/page.tsx` - Complete working demo

## Next Steps

1. **Add more block types**: PDFs, audio, interactive elements
2. **Block editing**: Allow users to modify blocks in the UI
3. **Template editor**: Visual editor for creating templates
4. **Template marketplace**: Share and discover templates
5. **AI generation**: Generate templates from descriptions
