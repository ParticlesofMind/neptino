"use client"

/**
 * useCanvasOverflow
 *
 * Monitors the body content area of a single canvas page with a ResizeObserver.
 * When `scrollHeight > clientHeight` the canvas is overflowing — the amber
 * ring indicator is shown and the caller receives `true`.
 *
 * Automatic page-append is intentionally disabled until ContentBlock supports
 * a range prop for slice-based pagination (rendering task[n..m] per page).
 * Without that, every continuation page renders all tasks, triggering another
 * overflow and creating an infinite append chain.
 *
 * The hook is debounced (100 ms) to avoid thrashing during rapid layout changes.
 */

import { useEffect, useRef, useCallback } from "react"
import type { CanvasId, SessionId } from "../types"
import { useCanvasStore } from "../store/canvasStore"

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
  sessionId: _sessionId,
  bodyRef,
  contentRef,
  enabled = true,
}: UseCanvasOverflowOptions) {
  const markCanvasOverflow = useCanvasStore((s) => s.markCanvasOverflow)
  const overflowingIds     = useCanvasStore((s) => s.overflowingCanvasIds)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback(() => {
    const body    = bodyRef.current
    const content = contentRef.current
    if (!body || !content || !enabled) return

    const overflowing = content.scrollHeight - body.clientHeight > 1
    markCanvasOverflow(canvasId, overflowing)

    // NOTE: automatic page-append is intentionally disabled.
    // ContentBlock renders all tasks on every page it appears on, so appending
    // a continuation page with the same blockKeys always overflows again —
    // creating an infinite append chain (observed as 100+ pages).
    // The amber ring overflow indicator is the current signal; proper
    // slice-based pagination (rendering task[n..m] per page) will re-enable
    // this once content blocks support a range prop.
  }, [bodyRef, contentRef, enabled, canvasId, markCanvasOverflow])

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
