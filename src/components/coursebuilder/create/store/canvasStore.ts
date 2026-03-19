/**
 * Canvas Store — ephemeral UI state
 *
 * Intentionally NOT persisted. All values reset when the editor is closed.
 * Contains: zoom, pan, active tool, selection, active canvas.
 */

import { create } from "zustand"
import type { CanvasId } from "../types"
import { appendLog } from "../canvas/debugLog"

export type BuildTool =
  | "selection"
  | "pan"
  | "pen"
  | "brush"
  | "text"
  | "shapes"
  | "tables"
  | "generate"
  | "eraser"

export type AnimateTool = "selection" | "scene" | "path" | "modify"

export type CanvasMode = "build" | "animate"

const ZOOM_MIN = 25
const ZOOM_MAX = 400
const ZOOM_STEP_DEFAULT = 5

// ─── Shape ────────────────────────────────────────────────────────────────────

interface CanvasState {
  mode: CanvasMode
  zoomLevel: number
  panOffset: { x: number; y: number }
  activeTool: BuildTool | AnimateTool
  activeCanvasId: CanvasId | null
  selectedIds: string[]
  /** IDs of canvas pages whose content is currently overflowing */
  overflowingCanvasIds: Set<CanvasId>
  /** Whether a media drag from the sidebar is in progress */
  mediaDragActive: boolean
  /**
   * Base fit-to-container scale written by CanvasVirtualizer.
   * effectiveScale = fitScale * (zoomLevel / 100)
   * 0 until the first ResizeObserver fires.
   */
  fitScale: number
  /**
   * Debug-only switch to force the virtualizer to mount all rows so that
   * every canvas can be measured before exporting debug data.
   */
  debugMountAllCanvases: boolean
  /** Ephemeral editor notice shown in the curate viewport. */
  editorNotice: string | null

  // ── Viewport ───────────────────────────────────────────────────────────────

  setMode:     (mode: CanvasMode) => void
  setZoom:     (zoom: number) => void
  stepZoom:    (delta?: number) => void
  setPan:      (offset: { x: number; y: number }) => void
  resetView:   () => void
  setFitScale: (scale: number) => void
  setDebugMountAllCanvases: (enabled: boolean) => void
  setEditorNotice: (message: string | null) => void
  clearEditorNotice: () => void

  // ── Tool & selection ───────────────────────────────────────────────────────

  setActiveTool:  (tool: BuildTool | AnimateTool) => void
  setActiveCanvas: (id: CanvasId | null) => void
  selectId:       (id: string, additive?: boolean) => void
  clearSelection: () => void

  // ── Overflow tracking ─────────────────────────────────────────────────────

  markCanvasOverflow: (id: CanvasId, overflowing: boolean) => void

  // ── Drag state ────────────────────────────────────────────────────────────

  setMediaDragActive: (active: boolean) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasState>()((set) => ({
  mode: "build",
  zoomLevel: 100,
  panOffset: { x: 0, y: 0 },
  activeTool: "selection",
  activeCanvasId: null,
  selectedIds: [],
  overflowingCanvasIds: new Set(),
  mediaDragActive: false,
  fitScale: 0,
  debugMountAllCanvases: false,
  editorNotice: null,

  setMode: (mode) => set({ mode }),
  setFitScale: (scale) => set({ fitScale: scale }),
  setDebugMountAllCanvases: (enabled) => set({ debugMountAllCanvases: enabled }),
  setEditorNotice: (message) => set({ editorNotice: message }),
  clearEditorNotice: () => set({ editorNotice: null }),

  setZoom: (zoom) => {
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(zoom)))
    set({ zoomLevel: next })
    appendLog({ level: "info", event: "zoom:set", data: { zoom: next } })
  },

  stepZoom: (delta = ZOOM_STEP_DEFAULT) =>
    set((s) => {
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, s.zoomLevel + delta))
      appendLog({ level: "info", event: "zoom:step", data: { from: s.zoomLevel, delta, to: next } })
      return { zoomLevel: next }
    }),


  setPan: (offset) => set({ panOffset: offset }),

  resetView: () => set({ zoomLevel: 100, panOffset: { x: 0, y: 0 } }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setActiveCanvas: (id) => set({ activeCanvasId: id }),

  selectId: (id, additive = false) =>
    set((s) => ({
      selectedIds: additive ? [...s.selectedIds.filter((x) => x !== id), id] : [id],
    })),

  clearSelection: () => set({ selectedIds: [] }),

  markCanvasOverflow: (id, overflowing) =>
    set((s) => {
      const wasOverflowing = s.overflowingCanvasIds.has(id)
      if (overflowing !== wasOverflowing) {
        appendLog({
          level:    overflowing ? "warn" : "info",
          event:    overflowing ? "overflow:start" : "overflow:clear",
          canvasId: id,
        })
      }
      const next = new Set(s.overflowingCanvasIds)
      overflowing ? next.add(id) : next.delete(id)
      return { overflowingCanvasIds: next }
    }),

  setMediaDragActive: (active) => set({ mediaDragActive: active }),
}))
