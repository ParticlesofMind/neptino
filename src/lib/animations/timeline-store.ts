/**
 * Timeline Store for Animation Management
 *
 * Manages keyframes and motion paths for animated objects.
 * Stores object animations, deduplicates keyframes by time, and maintains sorted order.
 *
 * Ported from legacy architecture and refactored for React/TypeScript.
 * Can be used standalone or wrapped in a React hook for component state.
 */

export interface PathPoint {
  x: number
  y: number
}

export interface Keyframe {
  time: number
  position: { x: number; y: number }
  rotation: number
  scale: { x: number; y: number }
}

/**
 * In-memory store for animation timelines.
 * Thread-safe for single-threaded JavaScript environment.
 */
export class TimelineStore {
  private readonly paths = new Map<string, PathPoint[]>()
  private readonly keyframes = new Map<string, Keyframe[]>()

  /**
   * Set motion path for an object. Replaces any existing path.
   */
  setMotionPath(objectId: string, points: PathPoint[]): void {
    this.paths.set(objectId, points)
  }

  /**
   * Get motion path for an object. Returns deep copy to prevent accidental mutations.
   */
  getMotionPath(objectId: string): PathPoint[] {
    return this.paths.get(objectId)?.map((point) => ({ ...point })) ?? []
  }

  /**
   * Check if an object has a motion path.
   */
  hasMotionPath(objectId: string): boolean {
    return this.paths.has(objectId)
  }

  /**
   * Delete motion path for an object.
   */
  deleteMotionPath(objectId: string): void {
    this.paths.delete(objectId)
  }

  /**
   * Add or update a keyframe for an object.
   * Keyframes are deduplicated by time (±1ms tolerance) and kept sorted.
   */
  addKeyframe(objectId: string, keyframe: Keyframe): void {
    const frames = this.keyframes.get(objectId) ?? []

    // Check if a keyframe already exists at approximately this time
    const existingIndex = frames.findIndex(
      (frame) => Math.abs(frame.time - keyframe.time) < 1e-3,
    )

    if (existingIndex >= 0) {
      // Replace existing keyframe
      frames[existingIndex] = keyframe
    } else {
      // Add new keyframe and maintain sort order
      frames.push(keyframe)
      frames.sort((a, b) => a.time - b.time)
    }

    this.keyframes.set(objectId, frames)
  }

  /**
   * Get all keyframes for an object. Returns deep copies to prevent accidental mutations.
   */
  getKeyframes(objectId: string): Keyframe[] {
    return (
      this.keyframes.get(objectId)?.map((frame) => ({
        ...frame,
        position: { ...frame.position },
        scale: { ...frame.scale },
      })) ?? []
    )
  }

  /**
   * Get a keyframe at exact time (±1ms tolerance).
   * Returns null if not found.
   */
  getKeyframeAtTime(objectId: string, time: number): Keyframe | null {
    const frames = this.keyframes.get(objectId)
    if (!frames) {
      return null
    }

    const frame = frames.find((f) => Math.abs(f.time - time) < 1e-3)
    return frame
      ? {
          ...frame,
          position: { ...frame.position },
          scale: { ...frame.scale },
        }
      : null
  }

  /**
   * Get keyframes within a time range (inclusive).
   */
  getKeyframesInRange(
    objectId: string,
    startTime: number,
    endTime: number,
  ): Keyframe[] {
    const frames = this.keyframes.get(objectId) ?? []
    return frames
      .filter((f) => f.time >= startTime && f.time <= endTime)
      .map((frame) => ({
        ...frame,
        position: { ...frame.position },
        scale: { ...frame.scale },
      }))
  }

  /**
   * Delete a keyframe at exact time (±1ms tolerance).
   */
  deleteKeyframe(objectId: string, time: number): void {
    const frames = this.keyframes.get(objectId)
    if (!frames) {
      return
    }

    const filtered = frames.filter((f) => Math.abs(f.time - time) >= 1e-3)
    if (filtered.length === 0) {
      this.keyframes.delete(objectId)
    } else {
      this.keyframes.set(objectId, filtered)
    }
  }

  /**
   * Delete all keyframes for an object.
   */
  deleteAllKeyframes(objectId: string): void {
    this.keyframes.delete(objectId)
  }

  /**
   * Check if an object has keyframes.
   */
  hasKeyframes(objectId: string): boolean {
    return this.keyframes.has(objectId)
  }

  /**
   * Get duration (max keyframe time) for an object.
   * Returns 0 if no keyframes.
   */
  getDuration(objectId: string): number {
    const frames = this.keyframes.get(objectId)
    if (!frames || frames.length === 0) {
      return 0
    }
    return frames[frames.length - 1].time
  }

  /**
   * Get all object IDs that have animations.
   */
  getAnimatedObjects(): string[] {
    const objects = new Set([...this.paths.keys(), ...this.keyframes.keys()])
    return Array.from(objects)
  }

  /**
   * Clear all animations for an object (both paths and keyframes).
   */
  clearObject(objectId: string): void {
    this.paths.delete(objectId)
    this.keyframes.delete(objectId)
  }

  /**
   * Clear all stored animations.
   */
  clear(): void {
    this.paths.clear()
    this.keyframes.clear()
  }

  /**
   * Export store state for serialization/persistence.
   */
  export(): {
    paths: Record<string, PathPoint[]>
    keyframes: Record<string, Keyframe[]>
  } {
    return {
      paths: Object.fromEntries(this.paths),
      keyframes: Object.fromEntries(this.keyframes),
    }
  }

  /**
   * Import store state from serialized data.
   */
  import(data: {
    paths?: Record<string, PathPoint[]>
    keyframes?: Record<string, Keyframe[]>
  }): void {
    if (data.paths) {
      this.paths.clear()
      for (const [id, points] of Object.entries(data.paths)) {
        this.paths.set(id, points)
      }
    }
    if (data.keyframes) {
      this.keyframes.clear()
      for (const [id, frames] of Object.entries(data.keyframes)) {
        this.keyframes.set(id, frames)
      }
    }
  }
}

/**
 * Global singleton instance of TimelineStore.
 * Consider wrapping this in React context if multiple independent timelines are needed.
 */
export const timelineStore = new TimelineStore()
