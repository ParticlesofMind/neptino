"use client"

import { FilesBrowser } from "@/components/coursebuilder/create/sidebar/FilesBrowser"
import { CreateAtlasSidebar } from "@/components/coursebuilder/create/sidebar/create-atlas-sidebar"

const HANDLE_INSET = 16

interface CurateOverlayPanelsProps {
  filesWidth: number
  atlasWidth: number
  onResizeFilesStart: (event: React.MouseEvent) => void
  onResizeAtlasStart: (event: React.MouseEvent) => void
}

export function getCurateOverlayInset(width: number): number {
  return width + HANDLE_INSET
}

export function CurateOverlayPanels({
  filesWidth,
  atlasWidth,
  onResizeFilesStart,
  onResizeAtlasStart,
}: CurateOverlayPanelsProps) {
  return (
    <>
      <div className="absolute inset-y-0 left-0 z-20 flex">
        <div
          style={{ width: filesWidth }}
          className="relative flex h-full flex-col overflow-hidden bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
        >
          <FilesBrowser />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize blocks panel"
          className="group relative -mx-1 w-3 cursor-col-resize"
          onMouseDown={onResizeFilesStart}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-neutral-300/70 transition-all group-hover:w-2.5 group-hover:ring-neutral-500/60" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300/90 transition-colors group-hover:bg-neutral-600/80" />
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 z-20 flex">
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Atlas panel"
          className="group relative -mx-1 w-3 cursor-col-resize"
          onMouseDown={onResizeAtlasStart}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-neutral-300/70 transition-all group-hover:w-2.5 group-hover:ring-neutral-500/60" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300/90 transition-colors group-hover:bg-neutral-600/80" />
        </div>

        <div
          style={{ width: atlasWidth }}
          className="h-full overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
        >
          <CreateAtlasSidebar />
        </div>
      </div>
    </>
  )
}