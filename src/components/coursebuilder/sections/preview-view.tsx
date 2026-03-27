"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { DndContext, DragOverlay, MeasuringStrategy } from "@dnd-kit/core"
import type { CourseCreatedData } from "@/components/coursebuilder/builder-types"
import { CanvasVirtualizer } from "@/components/coursebuilder/create/canvas/CanvasVirtualizer"
import { CreateAtlasSidebar } from "@/components/coursebuilder/create/sidebar/create-atlas-sidebar"
import { DEFAULT_PAGE_DIMENSIONS } from "@/components/coursebuilder/create/types"
import { useCourseSessionLoader } from "@/components/coursebuilder/create/hooks/useCourseSessionLoader"
import { useCourseStore } from "@/components/coursebuilder/create/store/courseStore"
import { useSteadyLoading } from "@/components/coursebuilder"

export function PreviewView({ courseId }: { courseId: string | null; courseData?: CourseCreatedData | null }) {
  const [atlasWidth, setAtlasWidth] = useState(360)
  const atlasWidthRef = useRef(atlasWidth)

  useEffect(() => {
    atlasWidthRef.current = atlasWidth
  }, [atlasWidth])

  // Load sessions when courseId changes
  const { loading } = useCourseSessionLoader(courseId)
  const showLoading = useSteadyLoading(loading)
  const sessions = useCourseStore((s) => s.sessions)

  const handleAtlasResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = atlasWidthRef.current
    const onMove = (ev: MouseEvent) => {
      setAtlasWidth(Math.max(200, Math.min(600, startWidth - (ev.clientX - startX))))
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [])

  if (!courseId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <p className="text-sm font-medium text-foreground">No course selected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create or select a course to preview.
        </p>
      </div>
    )
  }

  if (showLoading && sessions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-4xl rounded-xl border border-border bg-background/80 p-5">
          <div className="h-4 w-40 rounded bg-muted/70" />
          <div className="mt-4 space-y-3">
            <div className="h-12 rounded bg-muted/60" />
            <div className="h-12 rounded bg-muted/60" />
            <div className="h-12 rounded bg-muted/60" />
          </div>
        </div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <p className="text-sm font-medium text-foreground">No content yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Go to Create to add content to your course.
        </p>
      </div>
    )
  }

  return (
    <DndContext
      id="preview-dnd"
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <div className="flex flex-1 h-full overflow-hidden bg-neutral-200">
        {/* Canvas viewport — centered with padding */}
        <div className="flex-1 flex flex-col overflow-x-visible overflow-y-hidden bg-neutral-200 px-8">
          <CanvasVirtualizer
            sessions={sessions}
            dims={DEFAULT_PAGE_DIMENSIONS}
            rightOverlayInset={atlasWidth + 8}
            disableOverflow
          />
        </div>

        {/* Resize handle — atlas panel */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Atlas panel"
          className="group relative -mx-1 w-3 cursor-col-resize"
          onMouseDown={handleAtlasResizeStart}
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-neutral-300/70 transition-all group-hover:w-2.5 group-hover:ring-neutral-500/60" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300/90 transition-colors group-hover:bg-neutral-600/80" />
        </div>

        {/* Atlas sidebar */}
        <div
          style={{ width: atlasWidth }}
          className="relative flex h-full flex-col overflow-hidden bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
        >
          <CreateAtlasSidebar />
        </div>
      </div>

      <DragOverlay dropAnimation={null} />
    </DndContext>
  )
}
