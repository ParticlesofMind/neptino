"use client"

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Eye, EyeOff, GripVertical, Layers, Lock, Map as MapIcon, Unlock } from "lucide-react"
import type { CanvasLayer, InspectorPanelView, OverlayUi } from "@/components/canvas/create-view-types"

interface LessonSummary {
  moduleName: string
  lessonNumber: number
  lessonTitle: string
  templateType: string
}

function SortableLayerRow({
  layer,
  overlayUi,
  onToggleVisible,
  onToggleLocked,
}: {
  layer: CanvasLayer
  overlayUi: OverlayUi
  onToggleVisible: (id: string) => void
  onToggleLocked: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id })

  return (
    <li
      ref={setNodeRef}
      className={`flex items-center gap-1.5 rounded ${overlayUi.panelItemPadding} ${overlayUi.panelItemText} text-foreground hover:bg-muted/50 ${isDragging ? "opacity-70" : ""}`}
      style={{
        paddingLeft: `${4 + layer.indent * 10}px`,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground transition cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
        aria-label={`Drag ${layer.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className={overlayUi.panelItemIcon} />
      </button>

      <button
        type="button"
        onClick={() => onToggleVisible(layer.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition"
        title={layer.visible ? "Hide layer" : "Show layer"}
      >
        {layer.visible
          ? <Eye className={overlayUi.panelItemIcon} />
          : <EyeOff className={`${overlayUi.panelItemIcon} opacity-30`} />}
      </button>

      <button
        type="button"
        onClick={() => onToggleLocked(layer.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition"
        title={layer.locked ? "Unlock layer" : "Lock layer"}
      >
        {layer.locked
          ? <Lock className={overlayUi.panelItemIcon} />
          : <Unlock className={`${overlayUi.panelItemIcon} opacity-30`} />}
      </button>

      <span className={`flex-1 truncate ${!layer.visible ? "opacity-40" : ""}`}>
        {layer.name}
      </span>
    </li>
  )
}

function LayersPanel({
  overlayUi,
  currentLessonPage,
  droppedCount,
  layers,
  onLayersChange,
}: {
  overlayUi: OverlayUi
  currentLessonPage: LessonSummary | null
  droppedCount: number
  layers: CanvasLayer[]
  onLayersChange: (next: CanvasLayer[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  )

  function toggleVisible(id: string) {
    onLayersChange(
      layers.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer)),
    )
  }

  function toggleLocked(id: string) {
    onLayersChange(
      layers.map((layer) => (layer.id === id ? { ...layer, locked: !layer.locked } : layer)),
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const unlocked = layers.filter((layer) => !layer.locked)
    const fromIndex = unlocked.findIndex((layer) => layer.id === active.id)
    const toIndex = unlocked.findIndex((layer) => layer.id === over.id)
    if (fromIndex < 0 || toIndex < 0) return

    const reorderedUnlocked = arrayMove(unlocked, fromIndex, toIndex)
    let unlockedCursor = 0
    const next = layers.map((layer) => {
      if (layer.locked) return layer
      const replacement = reorderedUnlocked[unlockedCursor]
      unlockedCursor += 1
      return replacement
    })
    onLayersChange(next)
  }

  if (layers.length === 0) {
    return (
      <p className={`px-2 py-4 ${overlayUi.panelItemText} text-muted-foreground italic`}>No layers yet.</p>
    )
  }

  return (
    <div className="space-y-2">
      {currentLessonPage && (
        <div className="rounded border border-border/70 bg-muted/20 px-2 py-1.5">
          <p className={`${overlayUi.panelItemText} font-semibold text-foreground`}>
            {currentLessonPage.moduleName} · Lesson {currentLessonPage.lessonNumber}
          </p>
          <p className={`${overlayUi.controlLabel} text-muted-foreground`}>
            {currentLessonPage.lessonTitle} · {currentLessonPage.templateType}
          </p>
          <p className={`${overlayUi.controlLabel} text-muted-foreground`}>
            Dropped assets: {droppedCount}
          </p>
        </div>
      )}
      <DndContext id="create-view-layers-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={layers.filter((layer) => !layer.locked).map((layer) => layer.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-0.5">
            {layers.map((layer) => (
              layer.locked ? (
                <li
                  key={layer.id}
                  className={`flex items-center gap-1.5 rounded ${overlayUi.panelItemPadding} ${overlayUi.panelItemText} text-foreground hover:bg-muted/50`}
                  style={{ paddingLeft: `${4 + layer.indent * 10}px` }}
                >
                  <span className="shrink-0 text-muted-foreground/50">
                    <GripVertical className={overlayUi.panelItemIcon} />
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleVisible(layer.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition"
                    title={layer.visible ? "Hide layer" : "Show layer"}
                  >
                    {layer.visible
                      ? <Eye className={overlayUi.panelItemIcon} />
                      : <EyeOff className={`${overlayUi.panelItemIcon} opacity-30`} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLocked(layer.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition"
                    title={layer.locked ? "Unlock layer" : "Lock layer"}
                  >
                    {layer.locked
                      ? <Lock className={overlayUi.panelItemIcon} />
                      : <Unlock className={`${overlayUi.panelItemIcon} opacity-30`} />}
                  </button>

                  <span className={`flex-1 truncate ${!layer.visible ? "opacity-40" : ""}`}>
                    {layer.name}
                  </span>
                </li>
              ) : (
                <SortableLayerRow
                  key={layer.id}
                  layer={layer}
                  overlayUi={overlayUi}
                  onToggleVisible={toggleVisible}
                  onToggleLocked={toggleLocked}
                />
              )
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function NavigationPanel({
  currentPage,
  totalPages,
  sections,
  onJump,
  overlayUi,
}: {
  currentPage: number
  totalPages: number
  sections: Array<{ label: string; start: number; end: number }>
  onJump: (page: number) => void
  overlayUi: OverlayUi
}) {
  return (
    <div className="space-y-1">
      <p className={`px-1 ${overlayUi.controlLabel} font-semibold uppercase tracking-widest text-muted-foreground mb-2`}>
        Course Structure
      </p>
      {sections.length === 0 && (
        <p className={`${overlayUi.panelItemText} px-1 text-muted-foreground italic`}>No lesson canvases yet.</p>
      )}
      {sections.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onJump(s.start)}
          className={`flex w-full items-center justify-between rounded ${overlayUi.panelItemPadding} ${overlayUi.panelItemText} text-foreground hover:bg-muted/60 transition`}
        >
          <span className="truncate">{s.label}</span>
          <span className={`ml-2 shrink-0 ${overlayUi.controlLabel} text-muted-foreground`}>
            {s.start === s.end ? String(s.start) : `${s.start}–${s.end}`}
          </span>
        </button>
      ))}
      <p className={`px-2 pt-2 ${overlayUi.controlLabel} text-muted-foreground`}>
        Page {currentPage} of {totalPages}
      </p>
    </div>
  )
}

interface InspectorPanelProps {
  width: number
  panelView: InspectorPanelView
  onPanelViewChange: (view: InspectorPanelView) => void
  overlayUi: OverlayUi
  layers: CanvasLayer[]
  onLayersChange: (next: CanvasLayer[]) => void
  currentLessonPage: LessonSummary | null
  droppedCount: number
  currentPage: number
  totalPages: number
  sections: Array<{ label: string; start: number; end: number }>
  onJump: (page: number) => void
}

export function InspectorPanel({
  width,
  panelView,
  onPanelViewChange,
  overlayUi,
  layers,
  onLayersChange,
  currentLessonPage,
  droppedCount,
  currentPage,
  totalPages,
  sections,
  onJump,
}: InspectorPanelProps) {
  if (width <= 0) return null

  return (
    <div className="flex shrink-0 flex-col border-l border-border bg-background overflow-hidden" style={{ width }}>
      <div className={`flex items-center border-b border-border ${overlayUi.panelHeaderPadding} shrink-0`}>
        {(["layers", "navigation"] as InspectorPanelView[]).map((p, i) => (
          <div key={p} className="flex items-center">
            {i > 0 && (
              <span className="mx-1.5 text-muted-foreground/30 select-none">
                |
              </span>
            )}
            <button
              type="button"
              onClick={() => onPanelViewChange(p)}
              className={`flex items-center gap-1 rounded px-1 py-0.5 ${overlayUi.panelHeaderText} font-medium capitalize transition ${
                panelView === p
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "layers" ? (
                <Layers className={overlayUi.panelHeaderIcon} />
              ) : (
                <MapIcon className={overlayUi.panelHeaderIcon} />
              )}
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          </div>
        ))}
      </div>

      <div className={`flex-1 overflow-y-auto ${overlayUi.panelContentPadding}`}>
        {panelView === "layers" ? (
          <LayersPanel
            overlayUi={overlayUi}
            currentLessonPage={currentLessonPage}
            droppedCount={droppedCount}
            layers={layers}
            onLayersChange={onLayersChange}
          />
        ) : (
          <NavigationPanel
            currentPage={currentPage}
            totalPages={totalPages}
            sections={sections}
            onJump={onJump}
            overlayUi={overlayUi}
          />
        )}
      </div>
    </div>
  )
}
