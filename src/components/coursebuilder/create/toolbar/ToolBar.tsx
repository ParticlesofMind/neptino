"use client"

/**
 * Tool Bar
 *
 * Two-row strip at the bottom of the canvas area:
 *   Row 1 (tool-options): context-sensitive controls for the active tool
 *   Row 2 (main bar):     mode switcher + centred tool buttons
 */

import { useState } from "react"
import {
  MousePointer2,
  PenTool,
  Paintbrush,
  Type,
  Shapes,
  Table2,
  Eraser,
  Wand2,
  Clapperboard,
  Play,
  Route,
  SlidersHorizontal,
  Minus,
  Plus,
} from "lucide-react"
import type { BuildTool, AnimateTool } from "../store/canvasStore"
import { useCanvasStore } from "../store/canvasStore"
import { ToolOptionsStrip } from "./toolbar-options"

// ─── Tool definitions ─────────────────────────────────────────────────────────

interface ToolItem<T extends string> {
  id:    T
  label: string
  Icon:  React.ComponentType<{ size?: number; strokeWidth?: number }>
}

const BUILD_TOOLS: ToolItem<BuildTool>[] = [
  { id: "selection", label: "Select",   Icon: MousePointer2   },
  { id: "pen",       label: "Pen",      Icon: PenTool         },
  { id: "brush",     label: "Brush",    Icon: Paintbrush      },
  { id: "text",      label: "Text",     Icon: Type            },
  { id: "shapes",    label: "Shapes",   Icon: Shapes          },
  { id: "tables",    label: "Tables",   Icon: Table2          },
  { id: "generate",  label: "Generate", Icon: Wand2           },
  { id: "eraser",    label: "Eraser",   Icon: Eraser          },
]

const ANIMATE_TOOLS: ToolItem<AnimateTool>[] = [
  { id: "selection", label: "Select",  Icon: MousePointer2     },
  { id: "scene",     label: "Scene",   Icon: Clapperboard      },
  { id: "path",      label: "Path",    Icon: Route             },
  { id: "modify",    label: "Modify",  Icon: SlidersHorizontal },
]

function ToolButton<T extends string>({
  tool,
  isActive,
  onSelect,
}: {
  tool:     ToolItem<T>
  isActive: boolean
  onSelect: (id: T) => void
}) {
  return (
    <button
      onClick={() => onSelect(tool.id)}
      title={tool.label}
      className={[
        "flex flex-col items-center gap-0.5 w-9 py-1 rounded transition-colors",
        isActive
          ? "bg-neutral-900 text-white"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
      ].join(" ")}
    >
      <tool.Icon size={14} strokeWidth={1.75} />
      <span className="text-[8px] leading-none">{tool.label}</span>
    </button>
  )
}

// ─── Tool Bar ─────────────────────────────────────────────────────────────────

export function ToolBar() {
  const mode          = useCanvasStore((s) => s.mode)
  const activeTool    = useCanvasStore((s) => s.activeTool)
  const setMode       = useCanvasStore((s) => s.setMode)
  const setActiveTool = useCanvasStore((s) => s.setActiveTool)

  const tools = (mode === "build" ? BUILD_TOOLS : ANIMATE_TOOLS) as ToolItem<string>[]

  return (
    <div className="flex flex-col shrink-0 bg-white border-t border-neutral-200">
      {/* Row 1 — context-sensitive tool options (above tool buttons) */}
      <ToolOptionsStrip activeTool={activeTool} />

      {/* Row 2 — mode switcher + centred tool buttons */}
      <div className="flex items-center justify-center gap-1 h-10 px-2">
        {/* Mode switcher */}
        <div className="flex items-center gap-px rounded border border-neutral-200 p-0.5">
          <button
            onClick={() => setMode("build")}
            className={[
              "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
              mode === "build" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100",
            ].join(" ")}
          >
            Build
          </button>
          <button
            onClick={() => setMode("animate")}
            className={[
              "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
              mode === "animate" ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100",
            ].join(" ")}
          >
            <Play size={9} />
            Animate
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-neutral-200 mx-1.5" />

        {/* Tool buttons */}
        <div className="flex items-center gap-0.5">
          {tools.map((t) => (
            <ToolButton
              key={t.id}
              tool={t}
              isActive={activeTool === t.id}
              onSelect={(id) => setActiveTool(id as BuildTool & AnimateTool)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
