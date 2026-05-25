import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ChatCard } from "@/components/coursebuilder/create/cards/card-types/ChatCard"
import type { CardId, DroppedCard, DroppedCardId, TaskId } from "@/components/coursebuilder/create/types"

function makeChatCard(height: number): DroppedCard {
  return {
    id: `chat-${height}` as DroppedCardId,
    cardId: "chat-source" as CardId,
    cardType: "chat",
    taskId: "task-1" as TaskId,
    areaKind: "practice",
    position: { x: 0, y: 0 },
    dimensions: { width: 420, height },
    content: {
      title: "Tutor chat",
      aiPersona: "AI Tutor",
      openingMessage: "Let's work through this together.",
      conversationStarters: ["Where should we begin?"],
    },
    order: 0,
  }
}

describe("ChatCard", () => {
  it("sizes from its field instead of writing an absolute inline height", () => {
    const { container } = render(<ChatCard card={makeChatCard(320)} fillAvailable />)
    const root = container.firstElementChild as HTMLElement

    expect(root.style.height).toBe("")
    expect(root.classList.contains("h-full")).toBe(true)
    expect(root.classList.contains("min-h-[inherit]")).toBe(true)
  })
})
