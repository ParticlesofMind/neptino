/**
 * Canvas Store — ephemeral UI state
 *
 * Intentionally NOT persisted. All values reset when the editor is closed.
 * Contains: zoom, pan, active tool, selection, active canvas.
 */

import { create } from "zustand"
import type { CanvasId } from "../types"

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

export type EditorMode = "build" | "animate"

const ZOOM_MIN = 25
const ZOOM_MAX = 400
const ZOOM_STEP_DEFAULT = 5

// ─── Shape ────────────────────────────────────────────────────────────────────

interface CanvasState {
  mode: EditorMode
  zoomLevel: number
  panOffset: { x: number; y: number }
  activeTool: BuildTool | AnimateTool
  activeCanvasId: CanvasId | null
  selectedIds: string[]
  /** IDs of canvas pages whose content is currently overflowing */
  overflowingCanvasIds: Set<CanvasId>
  /** Whether a media drag from the sidebar is in progress */
  mediaDragActive: boolean

  // ── Viewport ───────────────────────────────────────────────────────────────

  setMode:     (mode: EditorMode) => void
  setZoom:     (zoom: number) => void
  stepZoom:    (delta?: number) => void
  setPan:      (offset: { x: number; y: number }) => void
  resetView:   () => void

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

  setMode: (mode) => set({ mode }),

  setZoom: (zoom) =>
    set({ zoomLevel: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(zoom))) }),

  stepZoom: (delta = ZOOM_STEP_DEFAULT) =>
    set((s) => ({
      zoomLevel: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, s.zoomLevel + delta)),
    })),

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
      const next = new Set(s.overflowingCanvasIds)
      overflowing ? next.add(id) : next.delete(id)
      return { overflowingCanvasIds: next }
    }),

  setMediaDragActive: (active) => set({ mediaDragActive: active }),
}))
