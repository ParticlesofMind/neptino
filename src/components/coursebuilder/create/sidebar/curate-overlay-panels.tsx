"use client"

import { X } from "lucide-react"
import { FilesBrowser } from "@/components/coursebuilder/create/sidebar/FilesBrowser"
import { CreateAtlasSidebar } from "@/components/coursebuilder/create/sidebar/create-atlas-sidebar"

const HANDLE_INSET = 16

interface CurateOverlayPanelsProps {
  filesWidth: number
  atlasWidth: number
  onResizeFilesStart: (event: React.MouseEvent) => void
  onResizeAtlasStart: (event: React.MouseEvent) => void
  rightAttachedSlot?: React.ReactNode
  /** When true, show a close button inside each visible panel */
  isMobile?: boolean
  onCloseMobilePanel?: () => void
}

export function getCurateOverlayInset(width: number): number {
  return width + HANDLE_INSET
}

export function CurateOverlayPanels({
  filesWidth,
  atlasWidth,
  onResizeFilesStart,
  onResizeAtlasStart,
  rightAttachedSlot,
  isMobile,
  onCloseMobilePanel,
}: CurateOverlayPanelsProps) {
  return (
    <>
      <div className="absolute inset-y-0 left-0 z-20 flex">
        <div
          data-testid="curate-files-panel"
          style={{ width: filesWidth }}
          className="relative flex h-full flex-col overflow-hidden bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
        >
          {isMobile && filesWidth > 0 && (
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-3 py-2">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Files</span>
              <button
                onClick={onCloseMobilePanel}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                aria-label="Close files panel"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <FilesBrowser />
        </div>

        {/* Drag handle — desktop only */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize blocks panel"
          data-testid="resize-files-panel-handle"
          className="group relative -mx-1 hidden w-3 cursor-col-resize md:block"
          onMouseDown={onResizeFilesStart}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-neutral-300/70 transition-all group-hover:w-2.5 group-hover:ring-neutral-500/60" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300/90 transition-colors group-hover:bg-neutral-600/80" />
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 z-20 flex">
        {rightAttachedSlot ? (
          <div className="pointer-events-none absolute inset-y-0 right-full flex items-center pr-2 z-30">
            <div className="pointer-events-auto">{rightAttachedSlot}</div>
          </div>
        ) : null}

        {/* Drag handle — desktop only */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Atlas panel"
          data-testid="resize-atlas-panel-handle"
          className="group relative -mx-1 hidden w-3 cursor-col-resize md:block"
          onMouseDown={onResizeAtlasStart}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-neutral-300/70 transition-all group-hover:w-2.5 group-hover:ring-neutral-500/60" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300/90 transition-colors group-hover:bg-neutral-600/80" />
        </div>

        <div
          data-testid="curate-atlas-panel"
          style={{ width: atlasWidth }}
          className="relative flex h-full flex-col overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
        >
          {isMobile && atlasWidth > 0 && (
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-3 py-2 bg-white">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Atlas</span>
              <button
                onClick={onCloseMobilePanel}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                aria-label="Close Atlas panel"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <CreateAtlasSidebar />
        </div>
      </div>
    </>
  )
}