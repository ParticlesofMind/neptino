# Migrating CreateView to JSON Templates

## Current Implementation

CreateView currently uses `TemplateSurface` which relies on `TemplateBlueprint` components:

```tsx
<DomCanvas ...>
  <TemplateSurface
    currentLessonPage={currentLessonPage}
    canvasConfig={effectiveCanvasConfig}
    // ... 20+ props
  />
</DomCanvas>
```

## Proposed Implementation

Replace with the new Canvas component:

```tsx
<Canvas 
  template={currentTemplate}
  zoom={zoom}
  onZoomChange={setZoom}
/>
```

## Migration Steps

### Step 1: Convert Template Data

Transform the current `TemplateBlueprintData` into `TemplateSchema`:

```typescript
// Before: Complex nested structure
const templateData: TemplateBlueprintData = {
  fieldValues: { ... },
  contentItems: {
    topicGroups: [ ... ]
  },
  // ...
}

// After: Flat block array
const template: TemplateSchema = {
  id: "current-lesson",
  pageWidth: 794,
  pageHeight: 1123,
  blocks: computeBlocksFromLessonData(currentLessonPage)
}
```

### Step 2: Create Block Generator

Convert lesson page data to blocks:

```typescript
function computeBlocksFromLessonData(
  lessonPage: LessonCanvasPageProjection
): CanvasBlock[] {
  const blocks: CanvasBlock[] = []
  
  // Header block
  blocks.push({
    id: "header",
    type: "text",
    x: 80,
    y: 60,
    width: 634,
    height: 80,
    content: `Lesson ${lessonPage.lessonNumber}: ${lessonPage.lessonTitle}`,
    fontSize: 24,
    fontWeight: "bold",
  })
  
  // Content blocks from topics/objectives
  let yOffset = 180
  lessonPage.topics.forEach((topic, idx) => {
    blocks.push({
      id: `topic-${idx}`,
      type: "richText",
      x: 80,
      y: yOffset,
      width: 634,
      height: 120,
      content: `<h3>${topic.title}</h3><p>${topic.description}</p>`,
    })
    yOffset += 140
  })
  
  return blocks
}
```

### Step 3: Replace TemplateSurface

In CreateView.tsx:

```diff
- import { TemplateSurface } from "@/components/canvas/TemplateSurface"
+ import { Canvas } from "@/components/canvas/Canvas"

  // Inside render:
- <DomCanvas ...>
-   <TemplateSurface
-     currentLessonPage={currentLessonPage}
-     // ... many props
-   />
- </DomCanvas>

+ <Canvas 
+   template={computedTemplate}
+   zoom={zoom}
+   onZoomChange={setZoom}
+ />
```

### Step 4: Handle Media Drops

Convert media drop areas to blocks:

```typescript
// Before: Drop areas in TemplateSurface
<DroppableTaskArea areaKey={areaKey} />

// After: Placeholder blocks in template
{
  id: "instruction-area",
  type: "shape",
  x: 80,
  y: 400,
  width: 634,
  height: 200,
  shape: "rectangle",
  fill: "#f3f4f6",
  stroke: "#d1d5db",
}

// Handle drops by adding new blocks
function onDrop(mediaAsset: MediaAsset, x: number, y: number) {
  const newBlock: ImageBlock = {
    id: `media-${Date.now()}`,
    type: "image",
    x,
    y,
    width: 400,
    height: 300,
    src: mediaAsset.url,
  }
  
  // Add to template.blocks
  setTemplate(prev => ({
    ...prev,
    blocks: [...prev.blocks, newBlock]
  }))
}
```

## Gradual Migration

You don't have to migrate everything at once. Both systems can coexist:

```tsx
// Use new system for simple pages
{currentLessonPage.templateType === "simple" && (
  <Canvas template={simpleTemplate} zoom={zoom} />
)}

// Keep old system for complex pages
{currentLessonPage.templateType === "complex" && (
  <DomCanvas>
    <TemplateSurface ... />
  </DomCanvas>
)}
```

## Benefits After Migration

1. **State simplification**: One `template` object instead of 20+ props
2. **Persistence**: Save templates directly to Supabase as JSONB
3. **Undo/redo**: Just store template history
4. **Collaboration**: Merge template changes like Git
5. **Testing**: Templates are plain objects—easy to test
6. **Performance**: No unnecessary React re-renders

## Example: Complete Integration

```tsx
export function CreateView({ courseId }: { courseId?: string }) {
  const [template, setTemplate] = useState<TemplateSchema>(BLANK_TEMPLATE)
  const [zoom, setZoom] = useState(100)
  
  // Load template from database
  useEffect(() => {
    async function loadTemplate() {
      const { data } = await supabase
        .from('templates')
        .select('*')
        .eq('course_id', courseId)
        .single()
        
      if (data) {
        setTemplate({
          id: data.template_id,
          name: data.name,
          pageWidth: data.page_width,
          pageHeight: data.page_height,
          blocks: data.blocks,
        })
      }
    }
    
    if (courseId) loadTemplate()
  }, [courseId])
  
  // Save template changes
  const saveTemplate = useCallback(async () => {
    await supabase
      .from('templates')
      .upsert({
        template_id: template.id,
        course_id: courseId,
        name: template.name,
        page_width: template.pageWidth,
        page_height: template.pageHeight,
        blocks: template.blocks,
      })
  }, [template, courseId])
  
  return (
    <div className="flex h-full">
      <MediaLibraryPanel ... />
      
      <Canvas 
        template={template}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      
      <InspectorPanel ... />
    </div>
  )
}
```

## When to Migrate

**Migrate now if:**
- You need runtime template editing
- You want to store templates in a database
- You're building a template marketplace
- You need better performance

**Wait if:**
- Current system works for your use case
- You need time to test the new system
- You have tight deadlines

The new system is ready to use whenever you are.
