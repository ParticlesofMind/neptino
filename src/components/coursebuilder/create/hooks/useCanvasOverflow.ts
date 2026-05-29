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
import type { BlockKey, CanvasId, CourseSession, SessionId } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useCourseStore } from "../store/courseStore"
import { writeMeasurement, deleteMeasurement } from "../canvas/debugMeasurements"
import { getDefaultBlocksForType, type TemplateType } from "@/lib/curriculum/template-blocks"

const CHECK_DEBOUNCE_MS = 120
const SPLIT_GUARD_MS = 600
const NON_CONTINUATION_BLOCKS: ReadonlySet<BlockKey> = new Set(["header", "footer", "program", "resources", "project"])
const CONTINUATION_CONTENT_BLOCKS: ReadonlySet<BlockKey> = new Set(["content", "assignment", "scoring"])
const TASK_ROW_SPLIT_FIXED_BLOCKS: ReadonlySet<BlockKey> = new Set(["program", "resources"])

function deriveContinuationBlockKeys(session: CourseSession, canvasId: CanvasId): BlockKey[] | undefined {
  const currentCanvas = session.canvases.find((canvas) => canvas.id === canvasId)
  const fromCurrent = (currentCanvas?.blockKeys ?? []).filter(
    (key): key is BlockKey => CONTINUATION_CONTENT_BLOCKS.has(key) && !NON_CONTINUATION_BLOCKS.has(key),
  )
  if (fromCurrent.length > 0) return [...new Set(fromCurrent)]

  const fromTemplate = getDefaultBlocksForType(
    (session.templateType ?? "lesson") as TemplateType,
  ).filter((key) => CONTINUATION_CONTENT_BLOCKS.has(key as BlockKey)) as BlockKey[]

  return fromTemplate.length > 0 ? [...new Set(fromTemplate)] : undefined
}

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

function rectRelativeTo(el: HTMLElement, ancestor: HTMLElement): { top: number; bottom: number; left: number } {
  const ancestorRect = ancestor.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const scaleY = ancestor.clientHeight > 0 && ancestorRect.height > 0
    ? ancestorRect.height / ancestor.clientHeight
    : 1
  const scaleX = ancestor.clientWidth > 0 && ancestorRect.width > 0
    ? ancestorRect.width / ancestor.clientWidth
    : scaleY

  if (elRect.height > 0 && ancestorRect.height > 0) {
    return {
      top: (elRect.top - ancestorRect.top) / scaleY,
      bottom: (elRect.bottom - ancestorRect.top) / scaleY,
      left: (elRect.left - ancestorRect.left) / scaleX,
    }
  }

  const top = offsetTopRelativeTo(el, ancestor)
  return {
    top,
    bottom: top + el.offsetHeight,
    left: el.offsetLeft,
  }
}

export function measureCanvasContentHeight(
  body: HTMLElement,
  content: HTMLElement,
): number {
  const markerEls = Array.from(
    content.querySelectorAll<HTMLElement>(
      [
        "[data-topic-idx]",
        "[data-objective-idx]",
        "[data-task-idx]",
        "[data-task-row-idx]",
        "[data-card-idx]",
        "[data-layout-slot-frame]",
      ].join(","),
    ),
  )

  const markerBottom = markerEls.reduce((max, el) => {
    const { bottom } = rectRelativeTo(el, body)
    return Number.isFinite(bottom) ? Math.max(max, bottom) : max
  }, 0)

  return markerEls.length > 0 ? Math.ceil(markerBottom) : content.scrollHeight
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

  if (cardEls.length < 1) return null

  // Preferred: split after the deepest fully fitting card.
  for (let i = cardEls.length - 1; i >= 0; i--) {
    const el = cardEls[i]
    if (!el) continue
    const elBottom = rectRelativeTo(el, body).bottom
    if (elBottom <= available) {
      return Number(el.dataset.cardIdx) + 1
    }
  }

  // Fallback: if no card fully fits, split at the first overflowing card.
  // This implements a strict "move overflowing row/card to next page" rule.
  const firstOverflow = cardEls.find((el) => {
    const { bottom } = rectRelativeTo(el, body)
    return bottom > available
  })

  if (!firstOverflow) return null

  const splitAt = Number(firstOverflow.dataset.cardIdx)

  // Guard: when the very first card starts near the top and still overflows,
  // the card itself is effectively too tall for a single page and splitting at
  // index 0 would recurse into empty leading pages.
  if (splitAt === 0) {
    const firstTop = rectRelativeTo(firstOverflow, body).top
    if (firstTop < 80) return null
  }

  return splitAt
}

export function findLayoutSlotSplitPoint(
  body: HTMLElement,
  content: HTMLElement,
  available: number,
): { cardId: string; cardIdx: number; splitAt: number; slotCount: number } | null {
  const cardEls = Array.from(
    content.querySelectorAll<HTMLElement>("[data-card-idx][data-card-id]"),
  ).sort((a, b) => Number(a.dataset.cardIdx) - Number(b.dataset.cardIdx))

  const overflowingCard = cardEls.find((el) => {
    const { bottom } = rectRelativeTo(el, body)
    return bottom > available
  })

  if (!overflowingCard) return null

  const cardId = overflowingCard.dataset.cardId
  const cardIdx = Number(overflowingCard.dataset.cardIdx)
  if (!cardId || !Number.isFinite(cardIdx)) return null

  const slotByIdx = new Map<number, { slotIdx: number; top: number; bottom: number; left: number }>()
  Array.from(
    overflowingCard.querySelectorAll<HTMLElement>("[data-layout-slot-frame][data-layout-slot-idx]"),
  ).forEach((el) => {
    const slotIdx = Number(el.dataset.layoutSlotIdx)
    const { top, bottom, left } = rectRelativeTo(el, body)
    if (!Number.isFinite(slotIdx) || !Number.isFinite(top) || !Number.isFinite(bottom)) return

    const existing = slotByIdx.get(slotIdx)
    slotByIdx.set(slotIdx, {
      slotIdx,
      top: existing ? Math.min(existing.top, top) : top,
      bottom: existing ? Math.max(existing.bottom, bottom) : bottom,
      left: existing ? Math.min(existing.left, left) : left,
    })
  })

  const slotEls = Array.from(slotByIdx.values())
    .sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top))

  if (slotEls.length < 2) return null

  let splitAt: number | null = null
  let fittingSlotCount = 0
  for (let index = 0; index < slotEls.length; index += 1) {
    const slot = slotEls[index]
    if (!slot || slot.bottom > available) break
    splitAt = slot.slotIdx + 1
    fittingSlotCount = index + 1
  }

  if (splitAt === null || fittingSlotCount >= slotEls.length) return null

  return { cardId, cardIdx, splitAt, slotCount: slotEls.length }
}

/**
 * Scan ``content`` for fixed-block row elements and return the first index
 * (0-based) where splitting after that row leaves the leading content inside
 * ``available`` height in ``body``.
 */
export function findTaskRowSplitPoint(
  body: HTMLElement,
  content: HTMLElement,
  available: number,
  currentRangeStart: number,
  currentRangeEnd: number | undefined,
): number | null {
  const rowEls = Array.from(content.querySelectorAll<HTMLElement>("[data-task-row-idx]"))
    .map((el) => {
      const idx = Number(el.dataset.taskRowIdx)
      return Number.isFinite(idx) ? { el, idx } : null
    })
    .filter((entry): entry is { el: HTMLElement; idx: number } => Boolean(entry))
    .map(({ el, idx }) => ({
      el,
      idx,
      top: offsetTopRelativeTo(el, body),
      bottom: offsetTopRelativeTo(el, body) + el.offsetHeight,
    }))
    .filter(({ idx, top, bottom }) => {
      if (idx < currentRangeStart) return false
      if (currentRangeEnd !== undefined && idx >= currentRangeEnd) return false
      if (!Number.isFinite(top) || !Number.isFinite(bottom)) return false
      return true
    })
    .sort((a, b) => (a.top === b.top ? a.idx - b.idx : a.top - b.top))

  if (rowEls.length < 1) return null

  for (let i = rowEls.length - 1; i >= 0; i--) {
    const row = rowEls[i]
    if (!row) continue
    if (row.bottom > available) continue

    const splitAt = row.idx + 1
    if (splitAt > currentRangeStart && !(currentRangeEnd !== undefined && splitAt >= currentRangeEnd)) {
      return splitAt
    }
  }

  const firstOverflow = rowEls.find((row) => {
    if (row.bottom <= available) return false
    if (row.idx <= currentRangeStart) return false
    if (currentRangeEnd !== undefined && row.idx >= currentRangeEnd) return false
    return true
  })

  if (!firstOverflow) return null

  let splitAt = firstOverflow.idx

  if (splitAt <= currentRangeStart) {
    const nextRowIdx = currentRangeStart + 1

    if (currentRangeEnd !== undefined && nextRowIdx >= currentRangeEnd) return null

    const hasNextRow = rowEls.some((row) => row.idx > currentRangeStart)
    if (!hasNextRow) return null

    splitAt = nextRowIdx
  }

  if (currentRangeEnd !== undefined && splitAt >= currentRangeEnd) return null

  return splitAt
}

interface UseCanvasOverflowOptions {
  canvasId:       CanvasId
  sessionId:      SessionId
  /** Ref to the body container — used for available height (clientHeight) */
  bodyRef:        React.RefObject<HTMLElement | null>
  /** Ref to the content inside the body — observed for natural height growth */
  contentRef:     React.RefObject<HTMLElement | null>
  /** If false the hook is a no-op */
  enabled?:       boolean
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
  const setCanvasTaskRange      = useCourseStore((s) => s.setCanvasTaskRange)
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

  const getTaskRangeStart = useCallback((): number => {
    const sessions = useCourseStore.getState().sessions
    const session = sessions.find((s) => s.id === sessionId)
    const canvas  = session?.canvases.find((c) => c.id === canvasId)
    return canvas?.contentTaskRange?.start ?? 0
  }, [canvasId, sessionId])

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Prevent re-entrant splits while continuation page updates are committed.
  const splitGuard   = useRef(false)
  const checkRef     = useRef<(() => void) | null>(null)

  const check = useCallback(() => {
    const body    = bodyRef.current
    const content = contentRef.current
    if (!body || !content || !enabled) return

    const measuredContentHeight = measureCanvasContentHeight(body, content)
    const overflow = measuredContentHeight - body.clientHeight > 2
    markCanvasOverflow(canvasId, overflow)

    // Write live measurements to debug registry (dev only)
    writeMeasurement({
      canvasId,
      sessionId,
      contentH:   measuredContentHeight,
      bodyH:      body.clientHeight,
      overflow,
      splitGuard: splitGuard.current,
      timestamp:  Date.now(),
    })

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
      const releaseSplitGuard = () => {
        setTimeout(() => {
          splitGuard.current = false
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => checkRef.current?.(), CHECK_DEBOUNCE_MS)
        }, SPLIT_GUARD_MS)
      }

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
              if (!sessionSnap) return false
              const canvasSnap = sessionSnap?.canvases.find((c) => c.id === canvasId)
              const continuationBlockKeys = deriveContinuationBlockKeys(sessionSnap, canvasId)
              const currentEnd = canvasSnap?.contentTopicRange?.end
              const continuationAlreadyExists = sessionSnap?.canvases.some(
                (c) => c.id !== canvasId && c.contentTopicRange?.start === splitAt,
              )
              if (!(currentEnd === splitAt && continuationAlreadyExists)) {
                splitGuard.current = true
                setCanvasTopicRange(canvasId, { start: currentStart, end: splitAt })
                if (!continuationAlreadyExists) {
                  appendCanvasPage(sessionId, splitAt, {
                    afterCanvasId: canvasId,
                    blockKeys: continuationBlockKeys,
                  })
                }
                releaseSplitGuard()
                return true
              }
            }
            break
          }
        }
      }

      // b) task-level split
      const taskEls = Array.from(
        content.querySelectorAll<HTMLElement>("[data-task-idx]"),
      ).sort((a, b) => Number(a.dataset.taskIdx) - Number(b.dataset.taskIdx))

      if (taskEls.length >= 2) {
        for (let i = taskEls.length - 1; i >= 0; i--) {
          const el = taskEls[i]
          if (!el) continue
          const elBottom = offsetTopRelativeTo(el, body) + el.offsetHeight
          if (elBottom <= available) {
            const splitAtTaskIdx = Number(el.dataset.taskIdx) + 1
            const currentTaskStart = getTaskRangeStart()
            if (splitAtTaskIdx > currentTaskStart) {
              const sessionSnap = useCourseStore.getState().sessions.find((s) => s.id === sessionId)
              if (!sessionSnap) return false
              const canvasSnap  = sessionSnap.canvases.find((c) => c.id === canvasId)
              const continuationBlockKeys = deriveContinuationBlockKeys(sessionSnap, canvasId)
              const currentTaskEnd = canvasSnap?.contentTaskRange?.end
              const currentTopicStart = canvasSnap?.contentTopicRange?.start ?? 0
              const currentTopicEnd = canvasSnap?.contentTopicRange?.end
              const currentObjStart = canvasSnap?.contentObjectiveRange?.start ?? 0
              const currentObjEnd = canvasSnap?.contentObjectiveRange?.end

              const continuationTaskExists = sessionSnap.canvases.some(
                (c) => c.id !== canvasId && c.contentTaskRange?.start === splitAtTaskIdx,
              )

              if (!(currentTaskEnd === splitAtTaskIdx && continuationTaskExists)) {
                splitGuard.current = true
                setCanvasTaskRange(canvasId, { start: currentTaskStart, end: splitAtTaskIdx })
                if (!continuationTaskExists) {
                  appendCanvasPage(sessionId, currentTopicStart, {
                    afterCanvasId: canvasId,
                    topicEnd: currentTopicEnd,
                    objectiveStart: currentObjStart,
                    objectiveEnd: currentObjEnd,
                    taskStart: splitAtTaskIdx,
                    taskEnd: currentTaskEnd,
                    blockKeys: continuationBlockKeys,
                  })
                }
                releaseSplitGuard()
                return true
              }
            }
            break
          }
        }
      }

      // c) row-level split for fixed tables (Program / Resources)
      const currentTaskStart = getTaskRangeStart()
      const canvasSnap = useCourseStore.getState().sessions
        .find((s) => s.id === sessionId)
        ?.canvases
        .find((c) => c.id === canvasId)
      const splitAtTaskRowIdx = findTaskRowSplitPoint(
        body,
        content,
        available,
        currentTaskStart,
        canvasSnap?.contentTaskRange?.end,
      )
      if (splitAtTaskRowIdx !== null) {
        if (splitAtTaskRowIdx > currentTaskStart) {
          const sessionSnap = useCourseStore.getState().sessions.find((s) => s.id === sessionId)
          if (!sessionSnap || !canvasSnap) return false
          const currentPageBlockKeys = canvasSnap?.blockKeys ?? []
          const continuationBlockKeys = currentPageBlockKeys.filter((key) => TASK_ROW_SPLIT_FIXED_BLOCKS.has(key))
          const currentTaskEnd = canvasSnap?.contentTaskRange?.end
          const currentTopicStart = canvasSnap?.contentTopicRange?.start ?? 0
          const currentTopicEnd = canvasSnap?.contentTopicRange?.end
          const currentObjStart = canvasSnap?.contentObjectiveRange?.start ?? 0
          const currentObjEnd = canvasSnap?.contentObjectiveRange?.end

          const sameMaybeNumber = (a: number | undefined, b: number | undefined): boolean => a === b
          const continuationTaskExists = sessionSnap.canvases.some(
            (c) =>
              c.id !== canvasId &&
              c.contentTaskRange?.start === splitAtTaskRowIdx &&
              (c.contentTopicRange?.start ?? 0) === currentTopicStart &&
              sameMaybeNumber(c.contentTopicRange?.end, currentTopicEnd) &&
              (c.contentObjectiveRange?.start ?? 0) === currentObjStart &&
              sameMaybeNumber(c.contentObjectiveRange?.end, currentObjEnd) &&
              sameMaybeNumber(c.contentTaskRange?.end, currentTaskEnd),
          )

          if (!continuationTaskExists) {
            splitGuard.current = true
            setCanvasTaskRange(canvasId, { start: currentTaskStart, end: splitAtTaskRowIdx })
            appendCanvasPage(sessionId, currentTopicStart, {
              afterCanvasId: canvasId,
              topicEnd: currentTopicEnd,
              objectiveStart: currentObjStart,
              objectiveEnd: currentObjEnd,
              taskStart: splitAtTaskRowIdx,
              taskEnd: currentTaskEnd,
              blockKeys: continuationBlockKeys.length > 0 ? continuationBlockKeys : deriveContinuationBlockKeys(sessionSnap, canvasId),
            })
            releaseSplitGuard()
            return true
          }
        }
      }

      // d) objective-level split
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
              if (!sessionSnap) return false
              const canvasSnap  = sessionSnap?.canvases.find((c) => c.id === canvasId)
              const continuationBlockKeys = deriveContinuationBlockKeys(sessionSnap, canvasId)
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
                    afterCanvasId: canvasId,
                    topicEnd: currentTopicEnd,
                    objectiveStart: splitAtObjIdx,
                    blockKeys: continuationBlockKeys,
                  })
                }
                releaseSplitGuard()
                return true
              }
            }
            break
          }
        }
      }

      // Composition cards stay atomic. If one does not fit, its declared size
      // needs correction; splitting internal slots makes products disappear
      // from the page where teachers expect to see the whole composition.

      // e) card-level split (always allowed)
      const splitAtCardIdx = findCardSplitPoint(body, content, available)
      if (splitAtCardIdx !== null) {
        const currentCardStart = getCardRangeStart()
        if (splitAtCardIdx > currentCardStart) {
          const sessionSnap = useCourseStore.getState().sessions.find((s) => s.id === sessionId)
          if (!sessionSnap) return false
          const canvasSnap  = sessionSnap?.canvases.find((c) => c.id === canvasId)
          const continuationBlockKeys = deriveContinuationBlockKeys(sessionSnap, canvasId)
          const currentCardEnd = canvasSnap?.contentCardRange?.end
          const currentTopicStart = canvasSnap?.contentTopicRange?.start ?? 0
          const currentTopicEnd = canvasSnap?.contentTopicRange?.end
          const currentObjStart = canvasSnap?.contentObjectiveRange?.start ?? 0
          const currentObjEnd = canvasSnap?.contentObjectiveRange?.end
          const currentTaskStart = canvasSnap?.contentTaskRange?.start ?? 0
          const currentTaskEnd = canvasSnap?.contentTaskRange?.end

          if (currentCardEnd !== undefined && splitAtCardIdx >= currentCardEnd) return false

          const sameMaybeNumber = (a: number | undefined, b: number | undefined): boolean => a === b

          const continuationCardExists = sessionSnap?.canvases.some(
            (c) =>
              c.id !== canvasId &&
              c.contentCardRange?.start === splitAtCardIdx &&
              (c.contentTopicRange?.start ?? 0) === currentTopicStart &&
              sameMaybeNumber(c.contentTopicRange?.end, currentTopicEnd) &&
              (c.contentObjectiveRange?.start ?? 0) === currentObjStart &&
              sameMaybeNumber(c.contentObjectiveRange?.end, currentObjEnd) &&
              (c.contentTaskRange?.start ?? 0) === currentTaskStart &&
              sameMaybeNumber(c.contentTaskRange?.end, currentTaskEnd),
          )

          if (!(currentCardEnd === splitAtCardIdx && continuationCardExists)) {
            splitGuard.current = true
            setCanvasCardRange(canvasId, { start: currentCardStart, end: splitAtCardIdx })
            if (!continuationCardExists) {
              appendCanvasPage(sessionId, currentTopicStart, {
                afterCanvasId: canvasId,
                topicEnd: currentTopicEnd,
                objectiveStart: currentObjStart,
                objectiveEnd: currentObjEnd,
                taskStart: currentTaskStart,
                taskEnd: currentTaskEnd,
                cardStart: splitAtCardIdx,
                cardEnd: currentCardEnd,
                blockKeys: continuationBlockKeys,
              })
            }
            releaseSplitGuard()
            return true
          }
        }
      }

      return false
    }

    // trySplit() covers structural split levels: topic (≥2 on page), row,
    // objective, and card.  For single-topic overflow, objective and
    // card splits already give finer granularity; a naked topic-boundary split
    // on one topic would only create an empty continuation page.
    trySplit()
  }, [
    bodyRef,
    contentRef,
    enabled,
    canvasId,
    sessionId,
    markCanvasOverflow,
    setCanvasTopicRange,
    setCanvasObjectiveRange,
    setCanvasTaskRange,
    setCanvasCardRange,
    appendCanvasPage,
    getTopicRangeStart,
    getObjectiveRangeStart,
    getTaskRangeStart,
    getCardRangeStart,
  ])

  useEffect(() => {
    checkRef.current = check
  }, [check])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const observedElements = new WeakSet<Element>()

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(check, CHECK_DEBOUNCE_MS)
    }

    schedule() // initial check

    const observer = new ResizeObserver(schedule)
    observer.observe(content)

    const observeSplitCandidates = () => {
      const candidates = content.querySelectorAll<HTMLElement>(
        "[data-topic-idx], [data-objective-idx], [data-task-idx], [data-task-row-idx], [data-card-idx]",
      )
      candidates.forEach((candidate) => {
        if (observedElements.has(candidate)) return
        observedElements.add(candidate)
        observer.observe(candidate)
      })
    }

    observeSplitCandidates()

    const mutationObserver = new MutationObserver(() => {
      observeSplitCandidates()
      schedule()
    })
    mutationObserver.observe(content, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-card-idx", "data-task-row-idx"],
    })

    const settleTimers = [350, 900, 1800, 3200, 5200].map((delay) =>
      setTimeout(schedule, delay),
    )

    return () => {
      mutationObserver.disconnect()
      observer.disconnect()
      settleTimers.forEach((timer) => clearTimeout(timer))
      if (timerRef.current) clearTimeout(timerRef.current)
      markCanvasOverflow(canvasId, false)
      deleteMeasurement(canvasId)
    }
  }, [contentRef, check, canvasId, markCanvasOverflow])

  return overflowingIds.has(canvasId)
}
