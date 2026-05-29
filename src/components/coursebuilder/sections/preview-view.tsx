"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { DndContext, DragOverlay, MeasuringStrategy } from "@dnd-kit/core"
import type { CourseCreatedData } from "@/components/coursebuilder/builder-types"
import { CanvasVirtualizer } from "@/components/coursebuilder/create/canvas/CanvasVirtualizer"
import { PageNavStrip } from "@/components/coursebuilder/create/canvas/CanvasPageNavStrip"
import { CreateAtlasSidebar } from "@/components/coursebuilder/create/sidebar/create-atlas-sidebar"
import { DEFAULT_PAGE_DIMENSIONS } from "@/components/coursebuilder/create/types"
import { useIsMobile } from "@/components/coursebuilder/create/hooks/useIsMobile"
import { useCourseSessionLoader } from "@/components/coursebuilder/create/hooks/useCourseSessionLoader"
import { useCourseStore } from "@/components/coursebuilder/create/store/courseStore"
import { useSteadyLoading } from "@/components/coursebuilder"

export function PreviewView({ courseId }: { courseId: string | null; courseData?: CourseCreatedData | null }) {
  const [atlasWidth, setAtlasWidth] = useState(520)
  const atlasWidthRef = useRef(atlasWidth)
  const isMobile = useIsMobile()

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
      setAtlasWidth(Math.max(380, Math.min(760, startWidth - (ev.clientX - startX))))
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
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-sm font-medium text-foreground">No course selected</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Create or select a course to preview.
        </p>
      </div>
    )
  }

  if (showLoading && sessions.length === 0) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-muted/20 p-6">
        <div className="w-full max-w-4xl rounded-xl border border-border bg-background/90 p-5 shadow-sm">
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
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-sm font-medium text-foreground">No content yet</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
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
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-neutral-100">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-neutral-200">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 md:px-8">
              <CanvasVirtualizer
                sessions={sessions}
                dims={DEFAULT_PAGE_DIMENSIONS}
                rightOverlayInset={isMobile ? 0 : 72}
                disableOverflow
                renderMode="preview"
              />
            </div>

            <div className="pointer-events-none absolute inset-y-0 right-3 z-30 hidden items-center md:flex">
              <div className="pointer-events-auto">
                <PageNavStrip sessions={sessions} />
              </div>
            </div>
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Atlas panel"
            className="group relative hidden w-3 shrink-0 cursor-col-resize bg-background md:block"
            onMouseDown={handleAtlasResizeStart}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-neutral-300/70 transition-all group-hover:ring-neutral-500/60" />
          </div>

          <div
            style={{ width: atlasWidth }}
            className="relative hidden h-full shrink-0 flex-col overflow-hidden border-l border-border bg-background md:flex"
          >
            <CreateAtlasSidebar />
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null} />
    </DndContext>
  )
}
