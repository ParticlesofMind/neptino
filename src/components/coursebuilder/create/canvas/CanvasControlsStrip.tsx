"use client"

import {
  Focus,
  ZoomIn,
  RotateCcw,
  Hand,
  Grid3X3,
  Layers2,
} from "lucide-react"
import { useCanvasStore } from "../store/canvasStore"

// ─── Canvas controls strip (left sidebar) ────────────────────────────────────

export function CanvasControlsStrip() {
  const zoomLevel = useCanvasStore((s) => s.zoomLevel)
  const setZoom   = useCanvasStore((s) => s.setZoom)
  const stepZoom  = useCanvasStore((s) => s.stepZoom)
  const resetView = useCanvasStore((s) => s.resetView)
  const activeTool     = useCanvasStore((s) => s.activeTool)
  const setActiveTool  = useCanvasStore((s) => s.setActiveTool)

  return (
    <div className="flex flex-col items-center gap-1 w-14 shrink-0 bg-white border-r border-neutral-200 py-3 overflow-y-auto">
      {/* Zoom % */}
      <button
        onClick={() => setZoom(100)}
        title="Reset zoom to 100%"
        className="text-[10px] font-medium text-neutral-600 hover:text-neutral-900 leading-tight"
      >
        {zoomLevel}%
      </button>

      <div className="w-6 h-px bg-neutral-200 my-1" />

      <ControlBtn label="Focus" title="Zoom to fit" onClick={() => setZoom(75)}>
        <Focus size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn label="Exp." title="Explore (zoom in)" onClick={() => stepZoom(10)}>
        <ZoomIn size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn label="Reset" title="Reset view" onClick={resetView}>
        <RotateCcw size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn
        label="Grab"
        title="Grab / pan tool"
        active={activeTool === "pan"}
        onClick={() => setActiveTool("pan")}
      >
        <Hand size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn label="Grid" title="Toggle grid">
        <Grid3X3 size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn label="No." title="Non-destructive overlap mode">
        <Layers2 size={13} strokeWidth={1.5} />
      </ControlBtn>
    </div>
  )
}

function ControlBtn({
  label,
  title,
  active,
  onClick,
  children,
}: {
  label:    string
  title?:   string
  active?:  boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-0.5 w-10 py-1.5 rounded transition-colors",
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
      ].join(" ")}
    >
      {children}
      <span className="text-[7px] leading-none">{label}</span>
    </button>
  )
}
