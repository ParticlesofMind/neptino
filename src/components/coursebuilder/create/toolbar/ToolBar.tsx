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

// ─── Option primitives ────────────────────────────────────────────────────────

const STROKE_COLORS = ["#171717", "#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6"]

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  )
}

function OptionPill({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-2 py-0.5 text-[10px] rounded transition-colors border",
        active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400",
      ].join(" ")}
    >
      {label}
    </button>
  )
}

function ColorSwatch({ color, active, onClick }: { color: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      title={color}
      onClick={onClick}
      style={{ background: color }}
      className={[
        "w-4 h-4 rounded-sm transition-transform hover:scale-110",
        active ? "ring-2 ring-offset-1 ring-neutral-600 scale-110" : "ring-1 ring-neutral-300",
      ].join(" ")}
    />
  )
}

function OptDivider() {
  return <div className="w-px h-4 bg-neutral-200 mx-0.5" />
}

// ─── Tool options strip ───────────────────────────────────────────────────────

function ToolOptionsStrip({ activeTool }: { activeTool: BuildTool | AnimateTool }) {
  const [strokeColor, setStrokeColor] = useState("#171717")
  const [strokeSize,  setStrokeSize]  = useState(2)
  const [fontSize,    setFontSize]    = useState("M")
  const [brushSize,   setBrushSize]   = useState("M")
  const [shape,       setShape]       = useState("rect")
  const [tableRows,   setTableRows]   = useState(3)
  const [tableCols,   setTableCols]   = useState(3)
  const [eraserSize,  setEraserSize]  = useState("M")

  const row = "flex items-center justify-center gap-3 px-4 h-8 border-b border-neutral-200 bg-neutral-50"

  if (activeTool === "selection") return (
    <div className={row}>
      <OptionGroup label="Mode">
        <OptionPill label="Single" active onClick={() => {}} />
        <OptionPill label="Multi"        onClick={() => {}} />
        <OptionPill label="Column"       onClick={() => {}} />
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Snap">
        <OptionPill label="Grid"   onClick={() => {}} />
        <OptionPill label="Guides" onClick={() => {}} />
      </OptionGroup>
    </div>
  )

  if (activeTool === "pen") return (
    <div className={row}>
      <OptionGroup label="Color">
        {STROKE_COLORS.map((c) => (
          <ColorSwatch key={c} color={c} active={strokeColor === c} onClick={() => setStrokeColor(c)} />
        ))}
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Size">
        {[1, 2, 4, 8].map((s) => (
          <OptionPill key={s} label={`${s}px`} active={strokeSize === s} onClick={() => setStrokeSize(s)} />
        ))}
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Style">
        <OptionPill label="Solid"  active onClick={() => {}} />
        <OptionPill label="Dashed"        onClick={() => {}} />
        <OptionPill label="Dotted"        onClick={() => {}} />
      </OptionGroup>
    </div>
  )

  if (activeTool === "brush") return (
    <div className={row}>
      <OptionGroup label="Color">
        {STROKE_COLORS.map((c) => (
          <ColorSwatch key={c} color={c} active={strokeColor === c} onClick={() => setStrokeColor(c)} />
        ))}
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Size">
        {["S", "M", "L"].map((s) => (
          <OptionPill key={s} label={s} active={brushSize === s} onClick={() => setBrushSize(s)} />
        ))}
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Opacity">
        {["25%", "50%", "75%", "100%"].map((o) => (
          <OptionPill key={o} label={o} active={o === "100%"} onClick={() => {}} />
        ))}
      </OptionGroup>
    </div>
  )

  if (activeTool === "text") return (
    <div className={row}>
      <OptionGroup label="Size">
        {["S", "M", "L", "XL"].map((s) => (
          <OptionPill key={s} label={s} active={fontSize === s} onClick={() => setFontSize(s)} />
        ))}
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Style">
        <OptionPill label="B" onClick={() => {}} />
        <OptionPill label="I" onClick={() => {}} />
        <OptionPill label="U" onClick={() => {}} />
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Align">
        <OptionPill label="L" onClick={() => {}} />
        <OptionPill label="C" onClick={() => {}} />
        <OptionPill label="R" onClick={() => {}} />
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Color">
        {STROKE_COLORS.map((c) => (
          <ColorSwatch key={c} color={c} active={strokeColor === c} onClick={() => setStrokeColor(c)} />
        ))}
      </OptionGroup>
    </div>
  )

  if (activeTool === "shapes") return (
    <div className={row}>
      <OptionGroup label="Shape">
        {["Rect", "Circle", "Line", "Arrow", "Triangle"].map((s) => (
          <OptionPill
            key={s}
            label={s}
            active={shape === s.toLowerCase()}
            onClick={() => setShape(s.toLowerCase())}
          />
        ))}
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Fill">
        {STROKE_COLORS.map((c) => (
          <ColorSwatch key={c} color={c} active={strokeColor === c} onClick={() => setStrokeColor(c)} />
        ))}
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Stroke">
        {[1, 2, 4].map((s) => (
          <OptionPill key={s} label={`${s}px`} active={strokeSize === s} onClick={() => setStrokeSize(s)} />
        ))}
      </OptionGroup>
    </div>
  )

  if (activeTool === "tables") return (
    <div className={row}>
      <OptionGroup label="Rows">
        <button onClick={() => setTableRows(Math.max(1, tableRows - 1))} className="w-5 h-5 flex items-center justify-center rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600"><Minus size={9} /></button>
        <span className="text-[11px] font-medium w-5 text-center text-neutral-800">{tableRows}</span>
        <button onClick={() => setTableRows(Math.min(20, tableRows + 1))} className="w-5 h-5 flex items-center justify-center rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600"><Plus size={9} /></button>
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Cols">
        <button onClick={() => setTableCols(Math.max(1, tableCols - 1))} className="w-5 h-5 flex items-center justify-center rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600"><Minus size={9} /></button>
        <span className="text-[11px] font-medium w-5 text-center text-neutral-800">{tableCols}</span>
        <button onClick={() => setTableCols(Math.min(20, tableCols + 1))} className="w-5 h-5 flex items-center justify-center rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600"><Plus size={9} /></button>
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Style">
        <OptionPill label="Default" active onClick={() => {}} />
        <OptionPill label="Striped"        onClick={() => {}} />
        <OptionPill label="Minimal"        onClick={() => {}} />
      </OptionGroup>
    </div>
  )

  if (activeTool === "eraser") return (
    <div className={row}>
      <OptionGroup label="Size">
        {["S", "M", "L", "XL"].map((s) => (
          <OptionPill key={s} label={s} active={eraserSize === s} onClick={() => setEraserSize(s)} />
        ))}
      </OptionGroup>
      <OptDivider />
      <OptionGroup label="Mode">
        <OptionPill label="Pixel"  active onClick={() => {}} />
        <OptionPill label="Object"        onClick={() => {}} />
      </OptionGroup>
    </div>
  )

  if (activeTool === "generate") return (
    <div className={row}>
      <span className="text-[10px] text-neutral-500">Click a canvas area to generate AI content</span>
      <OptDivider />
      <OptionGroup label="Mode">
        <OptionPill label="Text"   active onClick={() => {}} />
        <OptionPill label="Image"         onClick={() => {}} />
        <OptionPill label="Layout"        onClick={() => {}} />
      </OptionGroup>
    </div>
  )

  // "pan" / animate tools — no options
  return null
}

// ─── Tool button ──────────────────────────────────────────────────────────────

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
