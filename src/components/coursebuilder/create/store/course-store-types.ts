import type { StateCreator } from "zustand"

import type {
  BlockKey,
  CanvasId,
  CourseSession,
  DroppedCard,
  SessionId,
  TaskId,
} from "../types"
import type { PageAssignment } from "../layout/layoutEngine"

export interface CourseState {
  sessions: CourseSession[]
  activeSessionId: SessionId | null

  setActiveSession: (id: SessionId) => void

  upsertSession: (session: CourseSession) => void
  hydrateSessions: (sessions: CourseSession[]) => void

  addDroppedCard: (
    sessionId: SessionId,
    taskId: TaskId,
    card: DroppedCard,
    canvasId?: CanvasId | null,
  ) => void
  removeDroppedCard: (sessionId: SessionId, taskId: TaskId, cardId: string) => void

  addCardToLayoutSlot: (
    sessionId: SessionId,
    taskId: TaskId,
    layoutCardId: string,
    slotIndex: number,
    card: DroppedCard,
  ) => void
  removeCardFromLayoutSlot: (
    sessionId: SessionId,
    taskId: TaskId,
    layoutCardId: string,
    slotIndex: number,
    cardId: string,
  ) => void

  appendCanvasPage: (
    sessionId: SessionId,
    contentTopicStart?: number,
    options?: {
      topicEnd?: number
      objectiveStart?: number
      objectiveEnd?: number
      taskStart?: number
      taskEnd?: number
      cardStart?: number
      cardEnd?: number
      blockKeys?: BlockKey[]
    },
  ) => void

  setCanvasTopicRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  setCanvasObjectiveRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  setCanvasTaskRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  setCanvasCardRange: (
    canvasId: CanvasId,
    range: { start: number; end?: number },
  ) => void

  setCanvasMeasuredHeight: (canvasId: CanvasId, heightPx: number) => void

  syncPageAssignments: (sessionId: SessionId, assignments: PageAssignment[]) => void

  clearSessionCards: (sessionId: SessionId) => void

  getActiveSession: () => CourseSession | undefined
}

export type CourseStoreSet = Parameters<StateCreator<CourseState>>[0]
export type CourseStoreGet = Parameters<StateCreator<CourseState>>[1]