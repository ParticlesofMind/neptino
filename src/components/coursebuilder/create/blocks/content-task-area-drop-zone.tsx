"use client"

import { useDroppable, useDndContext } from "@dnd-kit/core"
import { CardRenderer } from "../cards/CardRenderer"
import { isFieldFillCardType } from "../cards/cardSizing"
import type { BlockKey, CanvasId, CanvasRenderMode, DroppedCard, PageDimensions, SessionId, TaskAreaKind, TaskId } from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import type { DragSourceData } from "../hooks/useCardDrop"
import { computePageZones } from "../layout/pageZones"
import {
  getRecipeCardPlacement,
  getRecipeDeckStyle,
  getRecipeSlotOrder,
  getRecipeSlotStyle,
  selectLayoutRecipe,
  type LayoutRecipeSelection,
} from "../layout/layoutRecipes"

interface InsertionLineSlotProps {
  sessionId: SessionId
  canvasId?: CanvasId
  taskId: TaskId
  areaKind: TaskAreaKind
  blockKey?: BlockKey
  prevOrder?: number
  nextOrder?: number
  slotIndex: number
  disabled?: boolean
}

function InsertionLineSlot({
  sessionId,
  canvasId,
  taskId,
  areaKind,
  blockKey,
  prevOrder,
  nextOrder,
  slotIndex,
  disabled = false,
}: InsertionLineSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${sessionId}:${taskId}:${areaKind}:${blockKey ?? "content"}:slot:${slotIndex}`,
    data: { sessionId, canvasId, taskId, areaKind, blockKey, prevOrder, nextOrder },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      data-testid="drop-insertion-line"
      data-area-kind={areaKind}
      data-slot-index={slotIndex}
      className="pointer-events-none relative z-10 -my-3 h-6"
    >
      {isOver && (
        <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 border-t ${isOver ? "border-primary/60" : "border-primary/20"}`} />
      )}
    </div>
  )
}

interface TaskAreaDropZoneProps {
  sessionId: SessionId
  canvasId?: CanvasId
  pageDimensions?: PageDimensions
  taskId: TaskId
  areaKind: TaskAreaKind
  blockKey?: BlockKey
  label: string
  cards?: DroppedCard[]
  cardIndexById?: Map<string, number>
  onRemoveCard: (cardId: string) => void
  mode?: CanvasRenderMode
}

function shouldUseRecipeDeck(recipe: LayoutRecipeSelection, cards: DroppedCard[]): boolean {
  return recipe.id !== "standard-flow" && cards.length > 1
}

function groupCardsByRecipeSlot(cards: DroppedCard[], recipe: LayoutRecipeSelection) {
  const primaryComparisonTypes = new Set(["map", "table", "dataset", "chart", "source-excerpt", "document", "image"])
  let comparisonIndex = 0

  return cards.reduce<Record<string, DroppedCard[]>>((groups, card) => {
    const indexInRecipe = recipe.id === "comparison" && primaryComparisonTypes.has(card.cardType)
      ? comparisonIndex++
      : 0
    const placement = getRecipeCardPlacement(card, recipe, indexInRecipe)
    groups[placement.slot] = [...(groups[placement.slot] ?? []), card]
    return groups
  }, {})
}

function recipeIndexForCard(cards: DroppedCard[], card: DroppedCard, recipe: LayoutRecipeSelection): number {
  if (recipe.id !== "comparison") return 0
  const primaryComparisonTypes = new Set(["map", "table", "dataset", "chart", "source-excerpt", "document", "image"])
  let index = 0

  for (const entry of cards) {
    if (entry.id === card.id) return index
    if (primaryComparisonTypes.has(entry.cardType)) index += 1
  }

  return 0
}

export function TaskAreaDropZone({
  sessionId,
  canvasId,
  pageDimensions = DEFAULT_PAGE_DIMENSIONS,
  taskId,
  areaKind,
  blockKey,
  label,
  cards = [],
  cardIndexById,
  onRemoveCard,
  mode = "editor",
}: TaskAreaDropZoneProps) {
  const isEditor = mode === "editor"
  const dropId = `${sessionId}:${taskId}:${areaKind}:${blockKey ?? "content"}`
  const hasCards = cards.length > 0
  const pageZones = computePageZones(pageDimensions)
  const layoutRecipe = selectLayoutRecipe(cards, pageZones)
  const hasSingleLayoutCard = cards.length === 1 && cards[0]?.cardType.startsWith("layout-")
  const hasSingleFieldFillCard = cards.length === 1 && cards[0] != null && isFieldFillCardType(cards[0].cardType)
  const hasOnlyLayoutCards = hasCards && cards.every((c) => c.cardType.startsWith("layout-"))
  const hasSingleFullFieldCard = hasSingleLayoutCard || hasSingleFieldFillCard
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: { sessionId, canvasId, taskId, areaKind, blockKey },
    disabled: !isEditor,
  })

  // Detect whether the active drag source is a non-layout card (layout-first enforcement)
  const { active } = useDndContext()
  const activeDragType = (active?.data?.current as DragSourceData | undefined)?.cardType
  const dragIsNonLayout = activeDragType != null && !activeDragType.startsWith("layout-")
  // Show the layout-first hint whenever a non-layout card is dragged over a task
  // that has no cards at all, or whose top-level cards are only layout containers
  // (atomic cards must go into slots, not the bare task area).
  const showLayoutFirstHint = isEditor && dragIsNonLayout && (!hasCards || hasOnlyLayoutCards)
  const emptyMaterialText = `No ${label.toLowerCase()} material assigned`
  const emptyHintText = showLayoutFirstHint
    ? hasOnlyLayoutCards
      ? "Drop into a slot inside the layout block"
      : "Drop a layout block first"
    : emptyMaterialText
  const useRecipeDeck = shouldUseRecipeDeck(layoutRecipe, cards) && !hasSingleFullFieldCard
  const groupedRecipeCards = useRecipeDeck ? groupCardsByRecipeSlot(cards, layoutRecipe) : {}
  const recipeSlotOrder = useRecipeDeck ? getRecipeSlotOrder(layoutRecipe.id) : []

  return (
    <div
      data-testid={`task-area-${areaKind}`}
      data-layout-recipe-id={hasCards ? layoutRecipe.id : undefined}
      data-layout-recipe-label={hasCards ? layoutRecipe.label : undefined}
      data-layout-dominant-card-id={hasCards ? layoutRecipe.dominantCardId : undefined}
    >
      <div
        ref={setNodeRef}
        data-testid={`task-area-droppable-${areaKind}`}
        className={[
          "rounded-lg border border-border bg-background",
          hasSingleFieldFillCard ? "min-h-[min(72dvh,100%)] p-0" : hasCards ? "min-h-0 p-0" : "h-12 p-0",
          isOver && !showLayoutFirstHint ? "border-primary/30 bg-primary/5" : "",
          showLayoutFirstHint ? "border-[#a89450]/30 bg-[#a89450]/5" : "",
        ].join(" ")}
      >
        <div className={hasCards ? (hasSingleFieldFillCard ? "min-h-[inherit] space-y-0" : "space-y-0") : "h-full"}>
          {hasCards && useRecipeDeck && (
            <div
              className="min-w-0"
              data-layout-recipe-deck={layoutRecipe.id}
              style={getRecipeDeckStyle(layoutRecipe.id)}
            >
              {recipeSlotOrder.map((slot) => {
                const slotCards = groupedRecipeCards[slot] ?? []
                if (slotCards.length === 0) return null

                return (
                  <div
                    key={slot}
                    className="min-w-0 space-y-0"
                    data-layout-recipe-slot={slot}
                    style={getRecipeSlotStyle(slot)}
                  >
                    {slotCards.map((card) => {
                      const originalIndex = cards.findIndex((entry) => entry.id === card.id)
                      const prevOrder = originalIndex > 0 ? cards[originalIndex - 1]?.order : undefined
                      const cardIdx = cardIndexById?.get(String(card.id))
                      const placement = getRecipeCardPlacement(card, layoutRecipe, recipeIndexForCard(cards, card, layoutRecipe))

                      return (
                        <div
                          key={card.id}
                          className="w-full min-w-0"
                          data-card-id={card.id}
                          data-layout-placement-slot={placement.slot}
                          data-layout-placement-reason={placement.reason}
                          {...(cardIdx !== undefined ? { "data-card-idx": cardIdx } : {})}
                        >
                          {isEditor && (
                            <InsertionLineSlot
                              sessionId={sessionId}
                              canvasId={canvasId}
                              taskId={taskId}
                              areaKind={areaKind}
                              blockKey={blockKey}
                              prevOrder={prevOrder}
                              nextOrder={card.order}
                              slotIndex={originalIndex >= 0 ? originalIndex : 0}
                              disabled={!isEditor}
                            />
                          )}
                          <div className="w-full min-w-0">
                            <CardRenderer
                              card={card}
                              mode={mode}
                              pageDimensions={pageDimensions}
                              dragSourceBlockKey={blockKey}
                              onRemove={isEditor ? () => onRemoveCard(card.id) : undefined}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
              {isEditor && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <InsertionLineSlot
                    sessionId={sessionId}
                    canvasId={canvasId}
                    taskId={taskId}
                    areaKind={areaKind}
                    blockKey={blockKey}
                    prevOrder={cards[cards.length - 1]?.order}
                    slotIndex={cards.length}
                    disabled={!isEditor}
                  />
                </div>
              )}
            </div>
          )}
          {hasCards && !useRecipeDeck && (
            <div className="space-y-0">
              {cards.map((card, index) => {
                const prevOrder = index > 0 ? cards[index - 1]?.order : undefined
                const cardIdx = cardIndexById?.get(String(card.id))
                const fullFieldWrapperClass = hasSingleLayoutCard
                  ? "min-h-full w-full"
                  : hasSingleFieldFillCard
                    ? "min-h-[inherit] w-full"
                    : "w-full"
                const fullFieldInnerClass = hasSingleLayoutCard
                  ? "min-h-full w-full [&>div]:min-h-full"
                  : hasSingleFieldFillCard
                    ? "min-h-[inherit] w-full"
                    : "w-full"
                return (
                  <div
                    key={card.id}
                    className={fullFieldWrapperClass}
                    data-card-id={card.id}
                    {...(cardIdx !== undefined ? { "data-card-idx": cardIdx } : {})}
                  >
                    {isEditor && !hasSingleFullFieldCard && (
                      <InsertionLineSlot
                        sessionId={sessionId}
                        canvasId={canvasId}
                        taskId={taskId}
                        areaKind={areaKind}
                        blockKey={blockKey}
                        prevOrder={prevOrder}
                        nextOrder={card.order}
                        slotIndex={index}
                        disabled={!isEditor}
                      />
                    )}
                    <div className={fullFieldInnerClass}>
                      <CardRenderer
                        card={card}
                        mode={mode}
                        pageDimensions={pageDimensions}
                        className={hasSingleFieldFillCard ? "min-h-[inherit]" : undefined}
                        fillAvailable={hasSingleFieldFillCard}
                        dragSourceBlockKey={blockKey}
                        onRemove={isEditor ? () => onRemoveCard(card.id) : undefined}
                      />
                    </div>
                  </div>
                )
              })}
              {isEditor && !hasSingleFullFieldCard && (
                <InsertionLineSlot
                  sessionId={sessionId}
                  canvasId={canvasId}
                  taskId={taskId}
                  areaKind={areaKind}
                  blockKey={blockKey}
                  prevOrder={cards[cards.length - 1]?.order}
                  slotIndex={cards.length}
                  disabled={!isEditor}
                />
              )}
            </div>
          )}
          {!hasCards && (
            <div className="flex h-full items-center justify-center px-2">
              <span
                className={[
                  "text-[9px] italic",
                  showLayoutFirstHint ? "text-[#a89450]" : "text-muted-foreground/40",
                ].join(" ")}
              >
                {emptyHintText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
