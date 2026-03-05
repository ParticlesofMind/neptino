"use client"

/**
 * useCanvasOverflow
 *
 * Monitors the body content area of a single canvas page with a ResizeObserver.
 *
 * When the rendered content height exceeds the available body height the hook:
 *
 *  1. Marks the canvas as overflowing in canvasStore (amber ring).
 *  2. Performs a DOM split: queries `[data-topic-idx]` elements inside
 *     contentRef, finds the last topic whose bottom fits within the available
 *     height, and then:
 *       a. Narrows this page\u2019s contentTopicRange to [currentStart, splitIdx).
 *       b. Appends a new continuation canvas page starting at splitIdx.
 *
 * A per-instance ref (`splitGuard`) prevents re-entrant splits.  Once a split
 * has been dispatched the guard is held for 600 ms to let React re-render the
 * trimmed content; if that render still overflows (e.g. a single topic is
 * larger than one page) the guard is released and the process repeats for the
 * next split candidate, always making progress.
 *
 * The check is debounced at 120 ms to avoid thrashing during rapid layout
 * changes (cards dropped, zoom changed, etc.).
 */

import { useEffect, useRef, useCallback } from "react"
import type { CanvasId, SessionId } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useCourseStore } from "../store/courseStore"

/**
 * Returns the element's top position in CSS pixels relative to `ancestor` by
 * walking up the offsetParent chain.  This is necessary because intermediate
 * `position: relative` elements (e.g. ContentBlock's root <section class="...relative">)
 * become offsetParents, so a bare `el.offsetTop` only gives the distance to
 * the nearest positioned ancestor — not to the body container we measure against.
 *
 * NOTE: Do NOT replace this with getBoundingClientRect — that returns
 * viewport-pixel values affected by `transform: scale()` on the canvas wrapper,
 * which produces incorrect split points at zoom levels other than 100 %.
 */
function offsetTopRelativeTo(el: HTMLElement, ancestor: HTMLElement): number {
  let top = 0
  let cur: HTMLElement | null = el
  while (cur && cur !== ancestor) {
    top += cur.offsetTop
    cur = cur.offsetParent as HTMLElement | null
    if (!cur) break
  }
  return top
}

/**
 * Scan ``content`` for card elements and return the first index (0-based)
 * where starting a new page would make the remaining cards fit within
 * ``available`` height inside ``body``.  Returns ``null`` if no sensible
 * split point was found.  This is a pure DOM helper used by both the
 * overflow hook and its test suite.
 */
export function findCardSplitPoint(
  body: HTMLElement,
  content: HTMLElement,
  available: number,
): number | null {
  const cardEls = Array.from(
    content.querySelectorAll<HTMLElement>("[data-card-idx]"),
  ).sort((a, b) => Number(a.dataset.cardIdx) - Number(b.dataset.cardIdx))

  if (cardEls.length < 2) return null
  for (let i = cardEls.length - 1; i >= 0; i--) {
    const el = cardEls[i]
    if (!el) continue
    const elBottom = offsetTopRelativeTo(el, body) + el.offsetHeight
    if (elBottom <= available) {
      return Number(el.dataset.cardIdx) + 1
    }
  }
  return null
}

interface UseCanvasOverflowOptions {
  canvasId:   CanvasId
  sessionId:  SessionId
  /** Ref to the body container \u2014 used for available height (clientHeight) */
  bodyRef:    React.RefObject<HTMLElement | null>
  /** Ref to the content inside the body \u2014 observed for natural height growth */
  contentRef: React.RefObject<HTMLElement | null>
  /** If false the hook is a no-op */
  enabled?:   boolean
}

export function useCanvasOverflow({
  canvasId,
  sessionId,
  bodyRef,
  contentRef,
  enabled = true,
}: UseCanvasOverflowOptions) {
  const markCanvasOverflow      = useCanvasStore((s) => s.markCanvasOverflow)
  const overflowingIds          = useCanvasStore((s) => s.overflowingCanvasIds)
  const setCanvasTopicRange     = useCourseStore((s) => s.setCanvasTopicRange)
  const setCanvasObjectiveRange = useCourseStore((s) => s.setCanvasObjectiveRange)
  const setCanvasCardRange      = useCourseStore((s) => s.setCanvasCardRange)
  const appendCanvasPage        = useCourseStore((s) => s.appendCanvasPage)

  // Read the current contentTopicRange for this canvas from the store snapshot.
  // We read via getState() inside the callback (not a selector) to always get
  // the latest value without creating a reactive dependency that causes
  // infinite check loops.
  const getTopicRangeStart = useCallback((): number => {
    const sessions = useCourseStore.getState().sessions
    const session = sessions.find((s) => s.id === sessionId)
    const canvas  = session?.canvases.find((c) => c.id === canvasId)
    return canvas?.contentTopicRange?.start ?? 0
  }, [canvasId, sessionId])

  const getObjectiveRangeStart = useCallback((): number => {
    const sessions = useCourseStore.getState().sessions
    const session = sessions.find((s) => s.id === sessionId)
    const canvas  = session?.canvases.find((c) => c.id === canvasId)
    return canvas?.contentObjectiveRange?.start ?? 0
  }, [canvasId, sessionId])

  const getCardRangeStart = useCallback((): number => {
    const sessions = useCourseStore.getState().sessions
    const session = sessions.find((s) => s.id === sessionId)
    const canvas  = session?.canvases.find((c) => c.id === canvasId)
    return canvas?.contentCardRange?.start ?? 0
  }, [canvasId, sessionId])

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Prevent re-entrant splits: held for ~600 ms after a split is dispatched.
  const splitGuard   = useRef(false)

  const check = useCallback(() => {
    const body    = bodyRef.current
    const content = contentRef.current
    if (!body || !content || !enabled) return

    const overflow = content.scrollHeight - body.clientHeight > 2
    markCanvasOverflow(canvasId, overflow)

    if (!overflow || splitGuard.current) return

    // ── Topic-split logic ────────────────────────────────────────────────────
    //
    // Query topic containers tagged with data-topic-idx.  Each element\u2019s
    // offsetTop + offsetHeight (relative to contentRef) tells us where it ends.
    // We walk from the last topic backwards to find the deepest one that still
    // fits inside the available body height.

    const available = body.clientHeight
    const topicEls  = Array.from(
      content.querySelectorAll<HTMLElement>("[data-topic-idx]"),
    ).sort((a, b) => Number(a.dataset.topicIdx) - Number(b.dataset.topicIdx))

    // Try to split the overflowing page by progressively finer-grained
    // units of structure.  We always attempt topic boundaries first, then
    // objective boundaries, and finally card boundaries.  Previously the card
    // step acted only as a "template-free" fallback; now it runs regardless
    // of how many topics/objectives are present so that dropped cards can be
    // paginated away instead of permanently overflowing.

    // helper that attempts to split the current canvas and return `true` if
    // a split was dispatched (in which case the check can return early).
    const trySplit = (): boolean => {
      // a) topic-level split
      if (topicEls.length >= 2) {
        for (let i = topicEls.length - 1; i >= 0; i--) {
          const el = topicEls[i]
          if (!el) continue
          const elBottom = offsetTopRelativeTo(el, body) + el.offsetHeight
          if (elBottom <= available) {
            const absIdx = Number(el.dataset.topicIdx)
            const splitAt = absIdx + 1
            const currentStart = getTopicRangeStart()
            if (splitAt > currentStart) {
              const sessions = useCourseStore.getState().sessions
              const sessionSnap = sessions.find((s) => s.id === sessionId)
              const canvasSnap = sessionSnap?.canvases.find((c) => c.id === canvasId)
              const currentEnd = canvasSnap?.contentTopicRange?.end
              const continuationAlreadyExists = sessionSnap?.canvases.some(
                (c) => c.id !== canvasId && c.contentTopicRange?.start === splitAt,
              )
              if (!(currentEnd === splitAt && continuationAlreadyExists)) {
                splitGuard.current = true
                setCanvasTopicRange(canvasId, { start: currentStart, end: splitAt })
                if (!continuationAlreadyExists) {
                  appendCanvasPage(sessionId, splitAt)
                }
                setTimeout(() => { splitGuard.current = false }, 600)
                return true
              }
            }
            break
          }
        }
      }

      // b) objective-level split
      const objEls = Array.from(
        content.querySelectorAll<HTMLElement>("[data-objective-idx]"),
      ).sort((a, b) => Number(a.dataset.objectiveIdx) - Number(b.dataset.objectiveIdx))
      if (objEls.length >= 2) {
        for (let i = objEls.length - 1; i >= 0; i--) {
          const el = objEls[i]
          if (!el) continue
          const elBottom = offsetTopRelativeTo(el, body) + el.offsetHeight
          if (elBottom <= available) {
            const splitAtObjIdx = Number(el.dataset.objectiveIdx) + 1
            const currentObjStart = getObjectiveRangeStart()
            if (splitAtObjIdx > currentObjStart) {
              const sessionSnap = useCourseStore.getState().sessions.find((s) => s.id === sessionId)
              const canvasSnap  = sessionSnap?.canvases.find((c) => c.id === canvasId)
              const currentObjEnd   = canvasSnap?.contentObjectiveRange?.end
              const currentTopicStart = canvasSnap?.contentTopicRange?.start ?? 0
              const currentTopicEnd   = canvasSnap?.contentTopicRange?.end

              const continuationObjExists = sessionSnap?.canvases.some(
                (c) => c.id !== canvasId && c.contentObjectiveRange?.start === splitAtObjIdx,
              )

              if (!(currentObjEnd === splitAtObjIdx && continuationObjExists)) {
                splitGuard.current = true
                setCanvasObjectiveRange(canvasId, { start: currentObjStart, end: splitAtObjIdx })
                if (!continuationObjExists) {
                  appendCanvasPage(sessionId, currentTopicStart, {
                    topicEnd: currentTopicEnd,
                    objectiveStart: splitAtObjIdx,
                  })
                }
                setTimeout(() => { splitGuard.current = false }, 600)
                return true
              }
            }
            break
          }
        }
      }

      // c) card-level split (always allowed)
      const splitAtCardIdx = findCardSplitPoint(body, content, available)
      if (splitAtCardIdx !== null) {
        const currentCardStart = getCardRangeStart()
        if (splitAtCardIdx > currentCardStart) {
          const sessionSnap = useCourseStore.getState().sessions.find((s) => s.id === sessionId)
          const canvasSnap  = sessionSnap?.canvases.find((c) => c.id === canvasId)
          const currentCardEnd = canvasSnap?.contentCardRange?.end

          const continuationCardExists = sessionSnap?.canvases.some(
            (c) => c.id !== canvasId && c.contentCardRange?.start === splitAtCardIdx,
          )

          if (!(currentCardEnd === splitAtCardIdx && continuationCardExists)) {
            splitGuard.current = true
            setCanvasCardRange(canvasId, { start: currentCardStart, end: splitAtCardIdx })
            if (!continuationCardExists) {
              appendCanvasPage(sessionId, undefined, {
                cardStart: splitAtCardIdx,
                cardEnd: currentCardEnd,
              })
            }
            setTimeout(() => { splitGuard.current = false }, 600)
            return true
          }
        }
      }

      return false
    }

    // call the helper; if it handled a split we stop
    if (trySplit()) return

    // Find the last topic whose bottom fits inside the available height.
    //
    // IMPORTANT: do NOT use getBoundingClientRect here.  That method returns
    // viewport-pixel coordinates which are affected by the canvas outer div's
    // `transform: scale()`.  At zoom != 100 %, elBottom would be
    // proportionally smaller than the CSS-pixel `available`, so every topic
    // would appear to fit — producing a split point of topics.length, a no-op
    // trim that still calls appendCanvasPage endlessly.
    //
    // `el.offsetTop` + `el.offsetHeight` returns CSS pixels relative to
    // el.offsetParent, which is the `position: absolute` bodyRef (the nearest
    // positioned ancestor).  These values are unaffected by CSS transforms.

    let splitAtAbsoluteIdx: number | null = null
    for (let i = topicEls.length - 1; i >= 0; i--) {
      const el       = topicEls[i]
      if (!el) continue
      const elBottom = offsetTopRelativeTo(el, body) + el.offsetHeight // CSS px from bodyRef top

      // The first element from the end that fits defines the split boundary.
      // splitAtAbsoluteIdx is the index of the FIRST topic that should appear
      // on the NEXT page (i.e. topic i+1).
      if (elBottom <= available) {
        const absIdx = Number(el.dataset.topicIdx)
        splitAtAbsoluteIdx = absIdx + 1 // next page starts after this topic
        break
      }
    }

    // If every single topic overflows even individually, we can't split further.
    if (splitAtAbsoluteIdx === null || splitAtAbsoluteIdx <= 0) return

    const currentStart = getTopicRangeStart()

    // Nothing to do if the split point equals the current start (degenerate).
    if (splitAtAbsoluteIdx <= currentStart) return

    // Resolve the current end of this page's range so we can detect whether
    // this would be a no-op split (splitAtAbsoluteIdx equals the existing end)
    // or a duplicate continuation page (a page with that start already exists).
    const sessions = useCourseStore.getState().sessions
    const session  = sessions.find((s) => s.id === sessionId)
    const canvas   = session?.canvases.find((c) => c.id === canvasId)
    const currentEnd = canvas?.contentTopicRange?.end

    // If the range wouldn't actually change, skip the store update but still
    // guard against appending another page for the same start index.
    const continuationAlreadyExists = session?.canvases.some(
      (c) => c.id !== canvasId && c.contentTopicRange?.start === splitAtAbsoluteIdx,
    )

    if (currentEnd === splitAtAbsoluteIdx && continuationAlreadyExists) return

    // Acquire the split guard to prevent re-entrancy.
    splitGuard.current = true

    // a) Narrow this page to [currentStart, splitAtAbsoluteIdx).
    setCanvasTopicRange(canvasId, { start: currentStart, end: splitAtAbsoluteIdx })

    // b) Append a continuation page starting from splitAtAbsoluteIdx, but only
    //    if one doesn't already exist (prevents duplicate pages on re-split).
    if (!continuationAlreadyExists) {
      appendCanvasPage(sessionId, splitAtAbsoluteIdx)
    }

    // Release the guard after React has had time to re-render the trimmed content.
    setTimeout(() => {
      splitGuard.current = false
    }, 600)
  }, [
    bodyRef,
    contentRef,
    enabled,
    canvasId,
    sessionId,
    markCanvasOverflow,
    setCanvasTopicRange,
    setCanvasObjectiveRange,
    setCanvasCardRange,
    appendCanvasPage,
    getTopicRangeStart,
    getObjectiveRangeStart,
    getCardRangeStart,
  ])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(check, 120)
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

