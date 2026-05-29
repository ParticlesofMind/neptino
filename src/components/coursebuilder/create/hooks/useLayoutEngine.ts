"use client"

/**
 * useLayoutEngine
 *
 * React wrapper around the pure layout engine.
 *
 * Computes page assignments whenever the session's content (topics, template
 * type, field visibility) changes, then writes the result to the course store
 * via syncPageAssignments — atomically replacing the session's canvas list
 * with correctly-sized, correctly-keyed pages.
 *
 * This hook is mounted once per session (in CanvasVirtualizer). It handles all
 * structural pagination (topic / objective / task / fixed-block splits).
 * useCanvasOverflow remains active per page as a fallback safety net: it provides
 * the overflow ring indicator and corrects any cases where height estimates drift
 * from what the browser actually renders.
 */

import { useMemo, useEffect, useRef } from "react"
import type { CourseSession, PageDimensions } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { computePageAssignments } from "../layout/layoutEngine"
import { useCourseStore } from "../store/courseStore"

interface UseLayoutEngineOptions {
  session: CourseSession
  dims?:   PageDimensions
  /** If true, skip layout computation and page assignment */
  disabled?: boolean
}

export function useLayoutEngine({
  session,
  dims = DEFAULT_PAGE_DIMENSIONS,
  disabled = false,
}: UseLayoutEngineOptions): void {
  const syncPageAssignments = useCourseStore((s) => s.syncPageAssignments)

  // Derive a stable content key from all session fields that influence layout,
  // including dropped cards and their dimensions.
  const contentKey = useMemo(() => {
    type Dropped = CourseSession["topics"][number]["objectives"][number]["tasks"][number]["droppedCards"][number]
    const serializeCard = (c: Dropped): unknown => {
      const slots = (c.content.slots ?? {}) as Record<string, Dropped[]>
      return {
        blockKey: c.blockKey ?? "",
        areaKind: c.areaKind,
        cardType: c.cardType,
        h: c.dimensions?.height ?? 0,
        w: c.dimensions?.width ?? 0,
        order: c.order,
        title: typeof c.content.title === "string" ? c.content.title : "",
        text: typeof c.content.text === "string" ? c.content.text : "",
        slots: Object.fromEntries(
          Object.entries(slots).map(([slotIndex, cards]) => [
            slotIndex,
            cards.map(serializeCard),
          ]),
        ),
      }
    }

    const topicStructure = session.topics.map((t) => ({
      label: t.label,
      objectives: t.objectives.map((o) => ({
        label: o.label,
        tasks: o.tasks.map((k) => ({
          label: k.label,
          cards: k.droppedCards.map(serializeCard),
        })),
      })),
    }))
    return JSON.stringify({
      templateType:  session.templateType,
      fieldEnabled:  session.fieldEnabled,
      topicStructure,
    })
  }, [session.topics, session.templateType, session.fieldEnabled])

  const assignments = useMemo(
    () => computePageAssignments(session, dims, session.fieldEnabled),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentKey, dims],
  )

  // Serialise assignments to detect genuine changes without triggering on
  // reference inequality when the computed result is identical.
  const assignmentsKey = useMemo(
    () => JSON.stringify(assignments),
    [assignments],
  )

  const prevKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (disabled) return

    if (assignmentsKey === prevKeyRef.current) return

    prevKeyRef.current = assignmentsKey
    syncPageAssignments(session.id, assignments)
  }, [
    disabled,
    assignmentsKey,
    assignments,
    session.id,
    syncPageAssignments,
  ])
}
