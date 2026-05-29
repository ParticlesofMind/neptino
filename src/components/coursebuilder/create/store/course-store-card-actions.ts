import {
  expandCanvasCardRangesForInsertion,
  normalizeCanvasCardRanges,
} from "./cardRangeUtils"
import { buildDefaultTopicChain, countDroppedCards, mapSession } from "./course-store-helpers"
import type { CourseState, CourseStoreSet, DroppedCardUpdate } from "./course-store-types"
import type { DroppedCard, Task } from "../types"

function patchDroppedCard(card: DroppedCard, cardId: string, patch: DroppedCardUpdate): DroppedCard {
  if (String(card.id) === cardId) {
    return {
      ...card,
      ...("areaKind" in patch ? { areaKind: patch.areaKind ?? card.areaKind } : {}),
      ...("blockKey" in patch ? { blockKey: patch.blockKey } : {}),
      ...("dimensions" in patch && patch.dimensions ? { dimensions: patch.dimensions } : {}),
      ...("order" in patch && typeof patch.order === "number" ? { order: patch.order } : {}),
      ...("position" in patch && patch.position ? { position: patch.position } : {}),
      ...("content" in patch && patch.content ? { content: { ...card.content, ...patch.content } } : {}),
    }
  }

  const slots = card.content.slots
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return card

  let changed = false
  const nextSlots = Object.fromEntries(
    Object.entries(slots as Record<string, DroppedCard[]>).map(([slotIndex, slotCards]) => {
      if (!Array.isArray(slotCards)) return [slotIndex, slotCards]
      const nextCards = slotCards.map((slotCard) => {
        const nextCard = patchDroppedCard(slotCard, cardId, patch)
        if (nextCard !== slotCard) changed = true
        return nextCard
      })
      return [slotIndex, nextCards]
    }),
  )

  if (!changed) return card

  return {
    ...card,
    content: {
      ...card.content,
      slots: nextSlots,
    },
  }
}

export function createCardActions(set: CourseStoreSet): Pick<
  CourseState,
  | "addDroppedCard"
  | "removeDroppedCard"
  | "updateDroppedCard"
  | "addCardToLayoutSlot"
  | "removeCardFromLayoutSlot"
  | "updateLayoutCardContent"
  | "clearSessionCards"
> {
  return {
    addDroppedCard: (sessionId, taskId, card, canvasId) =>
      set((state) => {
        const session = state.sessions.find((entry) => entry.id === sessionId)
        if (!session) return state

        const taskExists = session.topics.some((topic) =>
          topic.objectives.some((objective) => objective.tasks.some((task) => task.id === taskId)),
        )

        if (taskExists) {
          const nextTopics = session.topics.map((topic) => ({
            ...topic,
            objectives: topic.objectives.map((objective) => ({
              ...objective,
              tasks: objective.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      droppedCards: [...task.droppedCards, card].sort((left, right) => left.order - right.order),
                    }
                  : task,
              ),
            })),
          }))

          const totalCards = countDroppedCards(nextTopics)

          return {
            sessions: mapSession(state.sessions, sessionId, (current) => ({
              ...current,
              topics: nextTopics,
              canvases: normalizeCanvasCardRanges(
                expandCanvasCardRangesForInsertion(current.canvases, canvasId ?? null),
                totalCards,
              ),
            })),
          }
        }

        if (session.topics.length > 0) {
          return {
            sessions: mapSession(state.sessions, sessionId, (current) => ({
              ...current,
              topics: current.topics.map((topic, topicIndex) =>
                topicIndex !== 0
                  ? topic
                  : {
                      ...topic,
                      objectives: topic.objectives.map((objective, objectiveIndex) =>
                        objectiveIndex !== 0
                          ? objective
                          : {
                              ...objective,
                              tasks: objective.tasks.map((task, taskIndex) =>
                                taskIndex !== 0
                                  ? task
                                  : {
                                      ...task,
                                      droppedCards: [...task.droppedCards, card].sort((left, right) => left.order - right.order),
                                    },
                              ),
                            },
                      ),
                    },
              ),
            })),
          }
        }

        const defaultTask: Task = {
          id: taskId,
          objectiveId: "" as Task["objectiveId"],
          label: "",
          order: 0,
          droppedCards: [card],
        }

        return {
          sessions: mapSession(state.sessions, sessionId, (current) => ({
            ...current,
            topics: buildDefaultTopicChain(sessionId, taskId, defaultTask),
          })),
        }
      }),

    removeDroppedCard: (sessionId, taskId, cardId) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => {
          const nextTopics = session.topics.map((topic) => ({
            ...topic,
            objectives: topic.objectives.map((objective) => ({
              ...objective,
              tasks: objective.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      droppedCards: task.droppedCards.filter((entry) => entry.id !== cardId),
                    }
                  : task,
              ),
            })),
          }))

          return {
            ...session,
            topics: nextTopics,
            canvases: normalizeCanvasCardRanges(session.canvases, countDroppedCards(nextTopics)),
          }
        }),
      })),

    updateDroppedCard: (sessionId, taskId, cardId, patch) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => ({
          ...session,
          topics: session.topics.map((topic) => ({
            ...topic,
            objectives: topic.objectives.map((objective) => ({
              ...objective,
              tasks: objective.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      droppedCards: task.droppedCards
                        .map((card) => patchDroppedCard(card, cardId, patch))
                        .sort((left, right) => left.order - right.order),
                    }
                  : task,
              ),
            })),
          })),
        })),
      })),

    addCardToLayoutSlot: (sessionId, taskId, layoutCardId, slotIndex, card) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => ({
          ...session,
          topics: session.topics.map((topic) => ({
            ...topic,
            objectives: topic.objectives.map((objective) => ({
              ...objective,
              tasks: objective.tasks.map((task) => {
                if (task.id !== taskId) return task
                return {
                  ...task,
                  droppedCards: task.droppedCards.map((droppedCard) => {
                    if (droppedCard.id !== layoutCardId) return droppedCard
                    const slots = (droppedCard.content.slots ?? {}) as Record<string, DroppedCard[]>
                    return {
                      ...droppedCard,
                      content: {
                        ...droppedCard.content,
                        slots: {
                          ...slots,
                          [slotIndex]: [...(slots[slotIndex] ?? []), card],
                        },
                      },
                    }
                  }),
                }
              }),
            })),
          })),
        })),
      })),

    removeCardFromLayoutSlot: (sessionId, taskId, layoutCardId, slotIndex, cardId) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => ({
          ...session,
          topics: session.topics.map((topic) => ({
            ...topic,
            objectives: topic.objectives.map((objective) => ({
              ...objective,
              tasks: objective.tasks.map((task) => {
                if (task.id !== taskId) return task
                return {
                  ...task,
                  droppedCards: task.droppedCards.map((droppedCard) => {
                    if (droppedCard.id !== layoutCardId) return droppedCard
                    const slots = (droppedCard.content.slots ?? {}) as Record<string, DroppedCard[]>
                    return {
                      ...droppedCard,
                      content: {
                        ...droppedCard.content,
                        slots: {
                          ...slots,
                          [slotIndex]: (slots[slotIndex] ?? []).filter((entry) => entry.id !== cardId),
                        },
                      },
                    }
                  }),
                }
              }),
            })),
          })),
        })),
      })),

    updateLayoutCardContent: (sessionId, taskId, layoutCardId, contentPatch) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => ({
          ...session,
          topics: session.topics.map((topic) => ({
            ...topic,
            objectives: topic.objectives.map((objective) => ({
              ...objective,
              tasks: objective.tasks.map((task) => {
                if (task.id !== taskId) return task
                return {
                  ...task,
                  droppedCards: task.droppedCards.map((droppedCard) => {
                    if (droppedCard.id !== layoutCardId) return droppedCard
                    return {
                      ...droppedCard,
                      content: {
                        ...droppedCard.content,
                        ...contentPatch,
                      },
                    }
                  }),
                }
              }),
            })),
          })),
        })),
      })),

    clearSessionCards: (sessionId) =>
      set((state) => ({
        sessions: mapSession(state.sessions, sessionId, (session) => ({
          ...session,
          topics: session.topics.map((topic) => ({
            ...topic,
            objectives: topic.objectives.map((objective) => ({
              ...objective,
              tasks: objective.tasks.map((task) => ({ ...task, droppedCards: [] })),
            })),
          })),
          canvases: normalizeCanvasCardRanges(session.canvases, 0),
        })),
      })),
  }
}
