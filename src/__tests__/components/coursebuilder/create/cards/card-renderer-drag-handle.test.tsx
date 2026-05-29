import { DndContext } from "@dnd-kit/core"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CardRenderer } from "@/components/coursebuilder/create/cards/CardRenderer"
import type { CardId, DroppedCard, DroppedCardId, TaskId } from "@/components/coursebuilder/create/types"

function makeTextCard(): DroppedCard {
  return {
    id: "dropped-text-1" as DroppedCardId,
    cardId: "library-text-1" as CardId,
    cardType: "text",
    taskId: "task-1" as TaskId,
    areaKind: "instruction",
    position: { x: 0, y: 0 },
    dimensions: { width: 320, height: 180 },
    content: {
      title: "Context note",
      text: "Students should be able to select this text without moving the card.",
    },
    order: 0,
  }
}

describe("CardRenderer drag handle", () => {
  it("renders a dedicated move handle for draggable cards", () => {
    const onRemove = vi.fn()

    render(
      <DndContext>
        <CardRenderer card={makeTextCard()} draggable onRemove={onRemove} />
      </DndContext>,
    )

    expect(screen.getByRole("button", { name: "Move card" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove card" })).toBeInTheDocument()
    expect(screen.getByText("Students should be able to select this text without moving the card.")).toBeInTheDocument()
  })

  it("does not render edit controls in preview mode", () => {
    render(
      <DndContext>
        <CardRenderer card={makeTextCard()} mode="preview" onRemove={vi.fn()} />
      </DndContext>,
    )

    expect(screen.queryByRole("button", { name: "Move card" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remove card" })).not.toBeInTheDocument()
  })
})
