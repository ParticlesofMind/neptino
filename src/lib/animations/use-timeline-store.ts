/**
 * React Hook: useTimelineStore
 *
 * Provides easy access to the global TimelineStore with change notifications.
 * Automatically triggers re-renders when animations are modified.
 */

"use client"

import { useCallback, useState } from "react"
import {
  timelineStore,
  type Keyframe,
  type PathPoint,
} from "@/lib/animations/timeline-store"

export function useTimelineStore() {
  const [version, setVersion] = useState(0)

  const notifyChange = useCallback(() => {
    setVersion((v) => v + 1)
  }, [])

  return {
    // Motion path methods
    setMotionPath: useCallback(
      (objectId: string, points: PathPoint[]) => {
        timelineStore.setMotionPath(objectId, points)
        notifyChange()
      },
      [notifyChange],
    ),
    getMotionPath: useCallback(
      (objectId: string) => timelineStore.getMotionPath(objectId),
      [],
    ),
    hasMotionPath: useCallback(
      (objectId: string) => timelineStore.hasMotionPath(objectId),
      [],
    ),
    deleteMotionPath: useCallback(
      (objectId: string) => {
        timelineStore.deleteMotionPath(objectId)
        notifyChange()
      },
      [notifyChange],
    ),

    // Keyframe methods
    addKeyframe: useCallback(
      (objectId: string, keyframe: Keyframe) => {
        timelineStore.addKeyframe(objectId, keyframe)
        notifyChange()
      },
      [notifyChange],
    ),
    getKeyframes: useCallback(
      (objectId: string) => timelineStore.getKeyframes(objectId),
      [],
    ),
    getKeyframeAtTime: useCallback(
      (objectId: string, time: number) =>
        timelineStore.getKeyframeAtTime(objectId, time),
      [],
    ),
    getKeyframesInRange: useCallback(
      (objectId: string, startTime: number, endTime: number) =>
        timelineStore.getKeyframesInRange(objectId, startTime, endTime),
      [],
    ),
    deleteKeyframe: useCallback(
      (objectId: string, time: number) => {
        timelineStore.deleteKeyframe(objectId, time)
        notifyChange()
      },
      [notifyChange],
    ),
    deleteAllKeyframes: useCallback(
      (objectId: string) => {
        timelineStore.deleteAllKeyframes(objectId)
        notifyChange()
      },
      [notifyChange],
    ),
    hasKeyframes: useCallback(
      (objectId: string) => timelineStore.hasKeyframes(objectId),
      [],
    ),
    getDuration: useCallback(
      (objectId: string) => timelineStore.getDuration(objectId),
      [],
    ),

    // Object management
    getAnimatedObjects: useCallback(
      () => timelineStore.getAnimatedObjects(),
      [],
    ),
    clearObject: useCallback(
      (objectId: string) => {
        timelineStore.clearObject(objectId)
        notifyChange()
      },
      [notifyChange],
    ),
    clear: useCallback(() => {
      timelineStore.clear()
      notifyChange()
    }, [notifyChange]),

    // Import/Export
    export: useCallback(() => timelineStore.export(), []),
    import: useCallback(
      (data: {
        paths?: Record<string, PathPoint[]>
        keyframes?: Record<string, Keyframe[]>
      }) => {
        timelineStore.import(data)
        notifyChange()
      },
      [notifyChange],
    ),

    // Version for dependency tracking
    version,
  }
}
