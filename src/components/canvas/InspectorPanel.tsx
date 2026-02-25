"use client"

import { useState } from "react"
import { Eye, EyeOff, Layers, Lock, Map as MapIcon, Unlock } from "lucide-react"
import type { InspectorPanelView, OverlayUi } from "@/components/canvas/create-view-types"

interface LessonSummary {
  moduleName: string
  lessonNumber: number
  lessonTitle: string
  templateType: string
}

interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  indent: number
}

function LayersPanel({
  overlayUi,
  currentLessonPage,
  droppedCount,
}: {
  overlayUi: OverlayUi
  currentLessonPage: LessonSummary | null
  droppedCount: number
}) {
  const [layers, setLayers] = useState<Layer[]>([
    { id: "meta", name: "Session Meta", visible: true, locked: true, indent: 0 },
    { id: "program", name: "Program", visible: true, locked: false, indent: 0 },
    { id: "resources", name: "Resources", visible: true, locked: false, indent: 0 },
    { id: "instruction", name: "Instruction Area", visible: true, locked: false, indent: 1 },
    { id: "student", name: "Student Area", visible: true, locked: false, indent: 1 },
    { id: "teacher", name: "Teacher Area", visible: true, locked: false, indent: 1 },
    { id: "footer", name: "Footer Meta", visible: true, locked: true, indent: 0 },
  ])

  function toggleVisible(id: string) {
    setLayers((ls) =>
      ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    )
  }

  function toggleLocked(id: string) {
    setLayers((ls) =>
      ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
    )
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
      <ol className="space-y-0.5">
        {layers.map((layer) => (
          <li
            key={layer.id}
            className={`flex items-center gap-1.5 rounded ${overlayUi.panelItemPadding} ${overlayUi.panelItemText} text-foreground hover:bg-muted/50`}
            style={{ paddingLeft: `${4 + layer.indent * 10}px` }}
          >
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
        ))}
      </ol>
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
