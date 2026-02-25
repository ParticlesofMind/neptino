"use client"

import { useMemo, useState } from "react"
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

type AreaKey = "instruction" | "student" | "teacher"

type LibraryItem = {
  id: string
  title: string
  category: "audio" | "video" | "image" | "text"
  description: string
}

type DroppedItem = LibraryItem & {
  placedAt: number
}

type PageData = {
  id: string
  areas: Record<AreaKey, DroppedItem[]>
}

const AREA_ORDER: AreaKey[] = ["instruction", "student", "teacher"]
const AREA_LABEL: Record<AreaKey, string> = {
  instruction: "Instruction",
  student: "Student",
  teacher: "Teacher",
}
const PER_AREA_LOAD_CAPACITY = 3.2
const PER_GROUP_LOAD_CAPACITY = 6.0

const LIBRARY_ITEMS: LibraryItem[] = [
  { id: "audio-1", title: "Ancient timeline audio", category: "audio", description: "Narrated timeline with key events." },
  { id: "video-1", title: "Roman Empire short", category: "video", description: "6-minute contextual explainer." },
  { id: "image-1", title: "Historical map", category: "image", description: "Annotated political map." },
  { id: "text-1", title: "Source excerpt", category: "text", description: "Primary source reading excerpt." },
]

function createEmptyPage(id: string): PageData {
  return {
    id,
    areas: {
      instruction: [],
      student: [],
      teacher: [],
    },
  }
}

function estimateLoad(item: LibraryItem | DroppedItem): number {
  if (item.category === "video") return 2.4
  if (item.category === "audio") return 1.2
  if (item.category === "image") return 1.4
  return 1.0
}

function areaLoad(items: DroppedItem[]): number {
  return items.reduce((sum, item) => sum + estimateLoad(item), 0)
}

function groupLoad(page: PageData): number {
  return AREA_ORDER.reduce((sum, area) => sum + areaLoad(page.areas[area]), 0)
}

function DraggableLibraryCard({ item }: { item: LibraryItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library:${item.id}`,
    data: { item },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition hover:bg-muted/40"
      type="button"
    >
      <p className="font-medium text-foreground">{item.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{item.category.toUpperCase()} · {item.description}</p>
    </button>
  )
}

function DropZone({
  pageIndex,
  area,
  items,
  onRemove,
}: {
  pageIndex: number
  area: AreaKey
  items: DroppedItem[]
  onRemove: (pageIndex: number, area: AreaKey, itemId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${pageIndex}:${area}`,
    data: { pageIndex, area },
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{AREA_LABEL[area]} Area</p>
        <span className="text-[10px] text-muted-foreground">load {areaLoad(items).toFixed(1)}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-20 rounded-md border border-dashed p-2 transition ${isOver ? "border-primary bg-primary/5" : "border-border bg-muted/10"}`}
      >
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Drop media here</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={`${item.id}-${item.placedAt}`} className="rounded border border-border bg-background px-2 py-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-foreground">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(pageIndex, area, item.id)}
                    className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function DomFirstCanvasSpike() {
  const [pages, setPages] = useState<PageData[]>([createEmptyPage("page-1")])

  const totalLoad = useMemo(
    () => pages.reduce((sum, page) => sum + groupLoad(page), 0),
    [pages],
  )

  const placeWithChainOverflow = (targetArea: AreaKey, libraryItem: LibraryItem) => {
    const nextPages = [...pages]
    const itemLoad = estimateLoad(libraryItem)

    for (let pageIndex = 0; pageIndex < nextPages.length; pageIndex += 1) {
      const page = nextPages[pageIndex]
      const nextAreaLoad = areaLoad(page.areas[targetArea]) + itemLoad
      const nextGroupLoad = groupLoad(page) + itemLoad

      if (nextAreaLoad <= PER_AREA_LOAD_CAPACITY && nextGroupLoad <= PER_GROUP_LOAD_CAPACITY) {
        page.areas[targetArea] = [...page.areas[targetArea], { ...libraryItem, placedAt: Date.now() }]
        setPages(nextPages)
        return
      }
    }

    const appended = createEmptyPage(`page-${nextPages.length + 1}`)
    appended.areas[targetArea] = [{ ...libraryItem, placedAt: Date.now() }]
    setPages([...nextPages, appended])
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const overData = event.over?.data.current as { area?: AreaKey } | undefined
    const activeData = event.active?.data.current as { item?: LibraryItem } | undefined
    if (!overData?.area || !activeData?.item) return
    placeWithChainOverflow(overData.area, activeData.item)
  }

  const handleRemove = (pageIndex: number, area: AreaKey, itemId: string) => {
    setPages((prev) => {
      const next = [...prev]
      const page = next[pageIndex]
      if (!page) return prev
      page.areas[area] = page.areas[area].filter((item) => item.id !== itemId)
      return next
    })
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">DOM-first Spike · Media</h2>
          <p className="mt-1 text-xs text-muted-foreground">Drag into one of the three allowed areas. Overflow chains to next page automatically.</p>
          <div className="mt-4 space-y-2">
            {LIBRARY_ITEMS.map((item) => (
              <DraggableLibraryCard key={item.id} item={item} />
            ))}
          </div>
          <div className="mt-4 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
            Pages: {pages.length} · Total load: {totalLoad.toFixed(1)}
          </div>
        </aside>

        <section className="space-y-4">
          {pages.map((page, pageIndex) => (
            <article key={page.id} className="mx-auto w-full max-w-[840px] rounded-xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">Canvas Page {pageIndex + 1}</h3>
                <span className="text-xs text-muted-foreground">group load {groupLoad(page).toFixed(1)}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {AREA_ORDER.map((area) => (
                  <DropZone
                    key={`${page.id}:${area}`}
                    pageIndex={pageIndex}
                    area={area}
                    items={page.areas[area]}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </DndContext>
  )
}
