"use client"

/**
 * useTaskHeight
 *
 * Attaches a ResizeObserver to a task-area DOM element and reports its
 * scrollHeight upward via the `onHeightChange` callback.
 *
 * Each canvas page mounts one instance per task area; the parent
 * `useCanvasOverflow` hook aggregates the heights to determine overflow.
 */

import { useEffect, useRef, useCallback } from "react"
import type { CanvasId, TaskId, TaskAreaKind } from "../types"

export interface TaskHeightReport {
  canvasId:  CanvasId
  taskId:    TaskId
  areaKind:  TaskAreaKind
  heightPx:  number
}

interface UseTaskHeightOptions {
  canvasId:      CanvasId
  taskId:        TaskId
  areaKind:      TaskAreaKind
  onHeightChange: (report: TaskHeightReport) => void
}

export function useTaskHeight({
  canvasId,
  taskId,
  areaKind,
  onHeightChange,
}: UseTaskHeightOptions) {
  const ref = useRef<HTMLElement | null>(null)
  const reportRef = useRef(onHeightChange)

  // Keep the callback ref fresh without re-subscribing the observer
  useEffect(() => {
    reportRef.current = onHeightChange
  })

  const setRef = useCallback((node: HTMLElement | null) => {
    if (ref.current === node) return
    ref.current = node
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const emit = () => {
      reportRef.current({
        canvasId,
        taskId,
        areaKind,
        heightPx: element.scrollHeight,
      })
    }

    emit() // initial measurement

    const observer = new ResizeObserver(emit)
    observer.observe(element)

    return () => observer.disconnect()
  }, [canvasId, taskId, areaKind])

  return setRef
}
