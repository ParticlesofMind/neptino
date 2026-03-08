"use client"

/**
 * Layers Panel
 *
 * Matches the original coursebuilder design:
 *   - "Layers" / "Navigation" tab row
 *   - Session meta header (module · session title · dropped asset count)
 *   - Block-level layer rows with drag-handle, eye toggle, protect icon
 */

import { useState } from "react"
import { Eye, EyeOff, Lock, GripVertical, Map } from "lucide-react"
import type { CourseSession, BlockKey } from "../types"
import { useCanvasStore }         from "../store/canvasStore"

// ─── Block → layer label map ──────────────────────────────────────────────────

interface LayerEntry {
  id:     string
  label:  string
  indent: number
}

const BLOCK_LAYER_LABELS: Partial<Record<BlockKey, Array<{ suffix: string; label: string }>>> = {
  header:     [{ suffix: "header",      label: "Session Meta"     }],
  program:    [{ suffix: "program",     label: "Program"          }],
  resources:  [{ suffix: "resources",   label: "Resources"        }],
  content:    [
    { suffix: "instruction", label: "Instruction Area" },
    { suffix: "student",     label: "Student Area"     },
    { suffix: "teacher",     label: "Teacher Area"     },
  ],
  assignment: [{ suffix: "assignment",  label: "Assignment"       }],
  scoring:    [{ suffix: "scoring",     label: "Scoring"          }],
  project:    [{ suffix: "project",     label: "Project"          }],
  footer:     [{ suffix: "footer",      label: "Footer Meta"      }],
}

function deriveLayerEntries(session: CourseSession): LayerEntry[] {
  // Show only explicitly configured block keys.
  const keys = (session.canvases[0]?.blockKeys ?? []) as BlockKey[]
  return keys.flatMap((key) =>
    (BLOCK_LAYER_LABELS[key] ?? []).map(({ suffix, label }) => ({
      id:     `${session.id}-${suffix}`,
      label,
      indent: 0,
    })),
  )
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
              ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
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
              ? "border-[#9eb9da] text-[#233f5d]"
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
              ? "border-[#9eb9da] text-[#233f5d]"
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
              Session {session.order}
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

