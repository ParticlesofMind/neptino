"use client"

/**
 * Layers Panel
 *
 * Matches the original coursebuilder design:
 *   - "Layers" / "Navigation" tab row
 *   - Session meta header (module · session title · dropped asset count)
 *   - Block-level layer rows with drag-handle, eye toggle, protect icon
 *
 * Layers are derived from the active template's block list, expanded so the
 * Content block's three task areas appear as separate entries.
 */

import { useState } from "react"
import { Eye, EyeOff, Lock, GripVertical, Map } from "lucide-react"
import type { CourseSession } from "../types"
import { useCanvasStore }         from "../store/canvasStore"
import { TEMPLATE_DEFINITIONS }  from "../templates/definitions/index"

// ─── Block → layer label map ──────────────────────────────────────────────────

interface LayerEntry {
  id:     string
  label:  string
  indent: number
}

function deriveLayerEntries(session: CourseSession): LayerEntry[] {
  const def = TEMPLATE_DEFINITIONS[session.templateType]
  if (!def) return []

  const entries: LayerEntry[] = []
  for (const block of def.blocks) {
    switch (block.key) {
      case "header":
        entries.push({ id: `${session.id}-header`,      label: "Session Meta",      indent: 0 })
        break
      case "program":
        entries.push({ id: `${session.id}-program`,     label: "Program",           indent: 0 })
        break
      case "resources":
        entries.push({ id: `${session.id}-resources`,   label: "Resources",         indent: 0 })
        break
      case "content":
        entries.push({ id: `${session.id}-instruction`, label: "Instruction Area",  indent: 0 })
        entries.push({ id: `${session.id}-student`,     label: "Student Area",      indent: 0 })
        entries.push({ id: `${session.id}-teacher`,     label: "Teacher Area",      indent: 0 })
        break
      case "assignment":
        entries.push({ id: `${session.id}-assignment`,  label: "Assignment",        indent: 0 })
        break
      case "scoring":
        entries.push({ id: `${session.id}-scoring`,     label: "Scoring",           indent: 0 })
        break
      case "project":
        entries.push({ id: `${session.id}-project`,     label: "Project",           indent: 0 })
        break
      case "footer":
        entries.push({ id: `${session.id}-footer`,      label: "Footer Meta",       indent: 0 })
        break
    }
  }
  return entries
}

// ─── Layer row ────────────────────────────────────────────────────────────────

function LayerRow({ entry }: { entry: LayerEntry }) {
  const [visible, setVisible] = useState(true)
  const [locked,  setLocked]  = useState(false)

  return (
    <div
      className={[
        "flex items-center gap-1 px-2 py-1 text-[11px] hover:bg-neutral-50 group",
        entry.indent > 0 ? `pl-${4 + entry.indent * 4}` : "",
      ].join(" ")}
      style={{ paddingLeft: entry.indent > 0 ? `${8 + entry.indent * 12}px` : undefined }}
    >
      {/* Drag handle */}
      <GripVertical
        size={11}
        strokeWidth={1.5}
        className="text-neutral-300 group-hover:text-neutral-400 shrink-0 cursor-grab"
      />

      {/* Visibility toggle */}
      <button
        onClick={() => setVisible((v) => !v)}
        title={visible ? "Hide layer" : "Show layer"}
        className="text-neutral-400 hover:text-neutral-700 transition-colors shrink-0"
      >
        {visible
          ? <Eye size={11} strokeWidth={1.5} />
          : <EyeOff size={11} strokeWidth={1.5} />}
      </button>

      {/* Lock toggle */}
      <button
        onClick={() => setLocked((l) => !l)}
        title={locked ? "Unlock layer" : "Lock layer"}
        className={[
          "transition-colors shrink-0",
          locked ? "text-neutral-600" : "text-neutral-300 hover:text-neutral-500",
        ].join(" ")}
      >
        <Lock size={11} strokeWidth={1.5} />
      </button>

      {/* Label */}
      <span
        className={[
          "flex-1 truncate leading-tight",
          visible ? "text-neutral-700" : "text-neutral-400 line-through",
        ].join(" ")}
      >
        {entry.label}
      </span>
    </div>
  )
}

// ─── Navigation tab content ───────────────────────────────────────────────────

function NavigationTab({ session }: { session: CourseSession }) {
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas)
  const activeCanvasId  = useCanvasStore((s) => s.activeCanvasId)

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {session.canvases.map((canvas) => (
        <button
          key={canvas.id}
          onClick={() => setActiveCanvas(canvas.id)}
          className={[
            "w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors text-left",
            activeCanvasId === canvas.id
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:bg-neutral-100",
          ].join(" ")}
        >
          <span className="font-medium w-5 shrink-0 text-center">{canvas.pageNumber}</span>
          <span className="truncate">Page {canvas.pageNumber}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LayersPanelProps {
  session?: CourseSession
}

// ─── Layers Panel ─────────────────────────────────────────────────────────────

export function LayersPanel({ session }: LayersPanelProps) {
  const [activeTab, setActiveTab] = useState<"layers" | "navigation">("layers")

  const droppedAssetCount = session?.topics
    .flatMap((t) => t.objectives)
    .flatMap((o) => o.tasks)
    .reduce((sum, task) => sum + task.droppedCards.length, 0) ?? 0

  const layerEntries = session ? deriveLayerEntries(session) : []

  return (
    <aside className="flex flex-col h-full w-full border-l border-neutral-200 bg-white overflow-hidden">
      {/* Tab row */}
      <div className="flex border-b border-neutral-200 shrink-0">
        <button
          onClick={() => setActiveTab("layers")}
          className={[
            "flex items-center gap-1 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors",
            activeTab === "layers"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700",
          ].join(" ")}
        >
          <GripVertical size={11} strokeWidth={1.5} />
          Layers
        </button>
        <button
          onClick={() => setActiveTab("navigation")}
          className={[
            "flex items-center gap-1 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors",
            activeTab === "navigation"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-400 hover:text-neutral-700",
          ].join(" ")}
        >
          <Map size={11} strokeWidth={1.5} />
          Navigation
        </button>
      </div>

      {!session ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-neutral-400 italic">No session selected.</p>
        </div>
      ) : activeTab === "layers" ? (
        <>
          {/* Session meta header */}
          <div className="px-3 py-2 border-b border-neutral-100 shrink-0">
            <p className="text-[11px] font-semibold text-neutral-800 truncate">
              {session.title}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
              Session {session.order} &middot; {session.templateType}
            </p>
            <p className="text-[10px] text-neutral-400">
              Dropped assets: {droppedAssetCount}
            </p>
          </div>

          {/* Layer rows */}
          <div className="flex-1 overflow-y-auto py-1">
            {layerEntries.map((entry) => (
              <LayerRow key={entry.id} entry={entry} />
            ))}
            {layerEntries.length === 0 && (
              <p className="px-3 py-4 text-xs text-neutral-400 italic">No blocks defined.</p>
            )}
          </div>
        </>
      ) : (
        <NavigationTab session={session} />
      )}
    </aside>
  )
}

