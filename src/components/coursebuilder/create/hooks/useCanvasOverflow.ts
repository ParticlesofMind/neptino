"use client"

/**
 * useCanvasOverflow
 *
 * Monitors the body content area of a single canvas page with a ResizeObserver.
 * When `scrollHeight > clientHeight`, the canvas is overflowing — the caller
 * should append a new canvas page to the session via the course store.
 *
 * The hook is debounced (100 ms) to avoid thrashing during rapid layout changes.
 */

import { useEffect, useRef, useCallback } from "react"
import type { CanvasId, SessionId } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useCourseStore } from "../store/courseStore"

interface UseCanvasOverflowOptions {
  canvasId:   CanvasId
  sessionId:  SessionId
  /** Ref to the body container — used for available height (clientHeight) */
  bodyRef:    React.RefObject<HTMLElement | null>
  /** Ref to the content inside the body — observed for natural height growth */
  contentRef: React.RefObject<HTMLElement | null>
  /** If false the hook is a no-op (e.g. last page — prevent infinite append) */
  enabled?:   boolean
}

export function useCanvasOverflow({
  canvasId,
  sessionId,
  bodyRef,
  contentRef,
  enabled = true,
}: UseCanvasOverflowOptions) {
  const markCanvasOverflow = useCanvasStore((s) => s.markCanvasOverflow)
  const appendCanvasPage   = useCourseStore((s) => s.appendCanvasPage)
  const overflowingIds     = useCanvasStore((s) => s.overflowingCanvasIds)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appendedRef = useRef(false)

  // Reset appended guard when canvasId changes (new page was added)
  useEffect(() => {
    appendedRef.current = false
  }, [canvasId])

  const check = useCallback(() => {
    const body    = bodyRef.current
    const content = contentRef.current
    if (!body || !content || !enabled) return

    const overflowing = content.scrollHeight - body.clientHeight > 1
    markCanvasOverflow(canvasId, overflowing)

    if (overflowing && !appendedRef.current) {
      appendedRef.current = true
      appendCanvasPage(sessionId)
    }
  }, [bodyRef, contentRef, enabled, canvasId, sessionId, markCanvasOverflow, appendCanvasPage])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(check, 100)
    }

    schedule() // initial check

    const observer = new ResizeObserver(schedule)
    observer.observe(content)

    return () => {
      observer.disconnect()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [contentRef, check])

  return overflowingIds.has(canvasId)
}
