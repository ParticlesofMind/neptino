"use client"

/**
 * CreateEditorLayout
 *
 * The full canvas editor — toolbar, file browser, canvas viewport, layers panel —
 * composed as a pure prop-based component so it can be embedded inside the
 * teacher/coursebuilder wizard (view === "create") OR accessed directly via
 * the /teacher/coursebuilder/create route.
 *
 * Props
 *   courseId  — UUID string or null (Zustand store handles the null case gracefully)
 *   className — optional extra Tailwind classes applied to the root div
 */

import { useEffect, useMemo } from "react"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"

import { ToolBar }           from "@/components/coursebuilder/create/toolbar/ToolBar"
import { FilesBrowser }      from "@/components/coursebuilder/create/sidebar/FilesBrowser"
import { LayersPanel }       from "@/components/coursebuilder/create/layers/LayersPanel"
import { CanvasVirtualizer } from "@/components/coursebuilder/create/canvas/CanvasVirtualizer"
import { useCardDrop }             from "@/components/coursebuilder/create/hooks/useCardDrop"
import { useCourseSessionLoader }  from "@/components/coursebuilder/create/hooks/useCourseSessionLoader"
import { useCourseStore }          from "@/components/coursebuilder/create/store/courseStore"
import { useTemplateStore }  from "@/components/coursebuilder/create/store/templateStore"
import { DEFAULT_PAGE_DIMENSIONS } from "@/components/coursebuilder/create/types"
import type { CourseId, SessionId } from "@/components/coursebuilder/create/types"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateEditorLayoutProps {
  /** Course UUID — may be null when the wizard hasn't yet persisted a course. */
  courseId:   string | null
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateEditorLayout({ courseId, className }: CreateEditorLayoutProps) {
  const typedCourseId    = (courseId ?? "") as CourseId

  // Load sessions from Supabase whenever courseId changes
  const { loading } = useCourseSessionLoader(courseId)

  const sessions         = useCourseStore((s) => s.sessions)
  const activeSessionId  = useCourseStore((s) => s.activeSessionId)
  const setActiveSession = useCourseStore((s) => s.setActiveSession)
  const initSession      = useTemplateStore((s) => s.initSession)

  // Active session (first session as fallback)
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null,
    [sessions, activeSessionId],
  )

  // Initialise template-store entries for every session on load
  useEffect(() => {
    for (const session of sessions) {
      initSession(session.id as SessionId, { templateType: session.templateType })
    }
  }, [sessions, initSession])

  // Auto-select first session when none is active
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSession(sessions[0].id as SessionId)
    }
  }, [activeSessionId, sessions, setActiveSession])

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const { onDragEnd } = useCardDrop()

  // Field values are now computed per-session inside CanvasVirtualizer

  if (loading) {
    return (
      <div className={`flex items-center justify-center flex-1 h-full bg-neutral-100 ${className ?? ""}`}>
        <p className="text-sm text-neutral-400">Loading sessions&hellip;</p>
      </div>
    )
  }

  return (
    <DndContext id="course-editor-dnd" sensors={sensors} onDragEnd={onDragEnd}>
      <div className={`flex flex-col w-full h-full overflow-hidden bg-neutral-100 ${className ?? ""}`}>
        {/* Three-column layout — toolbar is now at the bottom of the canvas column */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar — file browser */}
          <div className="w-64 shrink-0 flex flex-col overflow-hidden">
            <FilesBrowser />
          </div>

          {/* Resize handle */}
          <div className="w-px bg-neutral-200 cursor-col-resize hover:bg-neutral-400 transition-colors" />

          {/* Center — canvas viewport + bottom toolbar */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-neutral-200">
            {sessions.length > 0 ? (
              <CanvasVirtualizer
                sessions={sessions}
                dims={DEFAULT_PAGE_DIMENSIONS}
              />
            ) : (
              <EmptyState courseId={typedCourseId} />
            )}
            {/* Bottom toolbar */}
            <ToolBar />
          </div>

          {/* Resize handle */}
          <div className="w-px bg-neutral-200 cursor-col-resize hover:bg-neutral-400 transition-colors" />

          {/* Right panel — layers */}
          <div className="w-48 shrink-0 flex flex-col overflow-hidden">
            <LayersPanel session={activeSession ?? undefined} />
          </div>
        </div>
      </div>
    </DndContext>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ courseId }: { courseId: CourseId }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-neutral-400">
      <p className="text-sm">No sessions found{courseId ? ` for course ${courseId}` : ""}.</p>
      <p className="text-xs max-w-xs text-center">
        Create a course in the setup wizard and return here to start building.
      </p>
    </div>
  )
}
