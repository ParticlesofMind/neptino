"use client"

import {
  Focus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
  MousePointer2,
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
  const grabActive = activeTool === "pan"
  const selectTool = () => setActiveTool("selection")
  const toggleGrabTool = () => setActiveTool(grabActive ? "selection" : "pan")

  return (
    <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 overflow-y-auto rounded-lg bg-white py-2">
      {/* Zoom % */}
      <button
        onClick={() => setZoom(100)}
        title="Reset zoom to 100% (Cmd/Ctrl + 0)"
        className="text-[10px] font-medium text-neutral-600 hover:text-neutral-900 leading-tight"
      >
        {zoomLevel}%
      </button>

      <div className="w-6 h-px bg-neutral-200 my-1" />

      <ControlBtn title="Reset zoom to 100% (Cmd/Ctrl + 0)" onClick={() => setZoom(100)}>
        <Focus size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn title="Zoom in (Cmd/Ctrl + +)" onClick={() => stepZoom(10)}>
        <ZoomIn size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn title="Zoom out (Cmd/Ctrl + -)" onClick={() => stepZoom(-10)}>
        <ZoomOut size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn title="Reset view (Cmd/Ctrl + 0)" onClick={resetView}>
        <RotateCcw size={13} strokeWidth={1.5} />
      </ControlBtn>

      <div className="w-6 h-px bg-neutral-200 my-1" />

      <ControlBtn
        title="Select tool (V or Esc)"
        active={activeTool === "selection"}
        onClick={selectTool}
      >
        <MousePointer2 size={13} strokeWidth={1.5} />
      </ControlBtn>

      <ControlBtn
        title="Grab / pan tool (H toggles)"
        active={grabActive}
        onClick={toggleGrabTool}
      >
        <Hand size={13} strokeWidth={1.5} />
      </ControlBtn>
    </div>
  )
}

function ControlBtn({
  title,
  active,
  onClick,
  children,
}: {
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
        "flex h-8 w-8 items-center justify-center rounded transition-colors",
        active
          ? "bg-neutral-100 text-neutral-800"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
      ].join(" ")}
    >
      {children}
    </button>
  )
}
