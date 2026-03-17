import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CardType } from "../types"

export interface StudioCardProject {
  id: string
  title: string
}

export interface StudioCard {
  id: string
  cardType: CardType
  title: string
  content: Record<string, unknown>
  createdAt: number
  projectId?: string
  projectTitle?: string
}

interface MakeLibraryState {
  cards: StudioCard[]
  addCard: (cardType: CardType, content: Record<string, unknown>, project?: StudioCardProject) => void
  removeCard: (id: string) => void
}

function cloneContent(content: Record<string, unknown>) {
  if (typeof structuredClone === "function") return structuredClone(content)
  return JSON.parse(JSON.stringify(content)) as Record<string, unknown>
}

export const useMakeLibraryStore = create<MakeLibraryState>()(
  persist(
    (set) => ({
      cards: [],
      addCard: (cardType, content, project) =>
        set((state) => ({
          cards: [
            {
              id: `studio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              cardType,
              title:
                typeof content.title === "string" && content.title
                  ? content.title
                  : cardType,
              content: cloneContent(content),
              createdAt: Date.now(),
              projectId: project?.id,
              projectTitle: project?.title,
            },
            ...state.cards,
          ],
        })),
      removeCard: (id) =>
        set((state) => ({ cards: state.cards.filter((c) => c.id !== id) })),
    }),
    { name: "neptino-make-library" },
  ),
)
