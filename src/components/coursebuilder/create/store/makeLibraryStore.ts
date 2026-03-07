import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CardType } from "../types"

export interface StudioCard {
  id: string
  cardType: CardType
  title: string
  content: Record<string, unknown>
  createdAt: number
}

interface MakeLibraryState {
  cards: StudioCard[]
  addCard: (cardType: CardType, content: Record<string, unknown>) => void
  removeCard: (id: string) => void
}

export const useMakeLibraryStore = create<MakeLibraryState>()(
  persist(
    (set) => ({
      cards: [],
      addCard: (cardType, content) =>
        set((state) => ({
          cards: [
            {
              id: `studio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              cardType,
              title:
                typeof content.title === "string" && content.title
                  ? content.title
                  : cardType,
              content,
              createdAt: Date.now(),
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
