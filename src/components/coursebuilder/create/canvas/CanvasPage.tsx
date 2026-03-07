"use client"

/**
 * Canvas Page
 *
 * A single fixed-size page (A4 or custom dimensions) rendered using the
 * TemplateRenderer. The CanvasVirtualizer mounts/unmounts instances based
 * on scroll position — only the 2-3 visible pages are in the DOM at any time.
 *
 * Pagination is computed by the layout engine (useLayoutEngine / computePageAssignments)
 * and written into the store before render. This component does not observe
 * DOM overflow — it only renders what the store tells it to.
 */

import { useRef } from "react"
import { useDroppable } from "@dnd-kit/core"
import type {
  CanvasPage as CanvasPageModel,
  CourseSession,
  PageDimensions,
  SessionId,
  TaskId,
} from "../types"
import { DEFAULT_PAGE_DIMENSIONS } from "../types"
import { BlockRenderer } from "../renderer/BlockRenderer"
import { HeaderBlock } from "../blocks/Header"
import { FooterBlock } from "../blocks/Footer"
import { useCanvasStore } from "../store/canvasStore"
import { useCourseStore } from "../store/courseStore"
import { CardRenderer } from "../cards/CardRenderer"
import { useCanvasOverflow } from "../hooks/useCanvasOverflow"

function findFirstVisibleTaskId(session: CourseSession, page: CanvasPageModel): TaskId {
  const topicStart = page.contentTopicRange?.start ?? 0
  const topicEnd = page.contentTopicRange?.end ?? session.topics.length
  const objectiveStart = page.contentObjectiveRange?.start ?? 0
  const objectiveEnd = page.contentObjectiveRange?.end

  let flatObjectiveIdx = 0

  for (let topicIdx = 0; topicIdx < session.topics.length; topicIdx += 1) {
    const topic = session.topics[topicIdx]
    const inVisibleTopicRange = topicIdx >= topicStart && topicIdx < topicEnd
    for (const objective of topic.objectives) {
      const inVisibleObjectiveRange =
        flatObjectiveIdx >= objectiveStart &&
        (objectiveEnd === undefined || flatObjectiveIdx < objectiveEnd)

      if (inVisibleTopicRange && inVisibleObjectiveRange) {
        const firstTaskId = objective.tasks[0]?.id
        if (firstTaskId) return firstTaskId
      }

      flatObjectiveIdx += 1
    }
  }

  return (`${session.id}-default-task` as TaskId)
}

function findOwnerTaskIdForCard(session: CourseSession, cardId: string): TaskId | null {
  for (const topic of session.topics) {
    for (const objective of topic.objectives) {
      for (const task of objective.tasks) {
        if (task.droppedCards.some((card) => card.id === cardId)) {
          return task.id
        }
      }
    }
  }
  return null
}

function InsertionLineSlot({
  id,
  sessionId,
  canvasId,
  taskId,
  prevOrder,
  nextOrder,
}: {
  id: string
  sessionId: SessionId
  canvasId: string
  taskId: TaskId
  prevOrder?: number
  nextOrder?: number
}) {
  const mediaDragActive = useCanvasStore((s) => s.mediaDragActive)
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      sessionId,
      canvasId,
      taskId,
      areaKind: "instruction",
      prevOrder,
      nextOrder,
    },
  })

  return (
    <div
      ref={setNodeRef}
      data-testid="canvas-drop-insertion-line"
      className="relative h-2"
    >
      {(mediaDragActive || isOver) && (
        <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 border-t ${isOver ? "border-blue-400" : "border-blue-200"}`} />
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasNewPageProps {
  page:         CanvasPageModel
  session:      CourseSession
  isLastPage:   boolean
  dims?:        PageDimensions
  /** Pre-computed effective scale (fitScale * zoomLevel/100). When provided,
   *  the store zoomLevel is ignored so the virtualizer stays as the single
   *  source of truth for the rendered size. */
  scale?:       number
  /** Field values for header / footer rendering */
  fieldValues:  Record<string, string>
  /** Body data keyed by block key */
  bodyData?:    Record<string, Record<string, unknown>>
  /** 0-based virtual index — used only for aria labels */
  virtualIndex: number
  /** If true, disable automatic overflow detection (currently unused in this component) */
  disableOverflow?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CanvasPage({
  page,
  session,
  isLastPage,
  dims = DEFAULT_PAGE_DIMENSIONS,
  scale: scaleProp,
  fieldValues,
  bodyData = {},
  virtualIndex,
  disableOverflow = false,
}: CanvasNewPageProps) {
  const bodyRef    = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const zoomLevel      = useCanvasStore((s) => s.zoomLevel)
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId)
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas)

  // Use the pre-computed scale from the virtualizer when available; fall back
  // to store zoomLevel for standalone usage (tests, storybook, etc.).
  const scale = scaleProp ?? (zoomLevel / 100)

  const isActive = activeCanvasId === page.id
  const bodyDropTaskId = findFirstVisibleTaskId(session, page)
  const removeDroppedCard = useCourseStore((s) => s.removeDroppedCard)

  const isTemplateFreeCanvas = !page.blockKeys || page.blockKeys.length === 0

  useCanvasOverflow({
    canvasId:      page.id,
    sessionId:     session.id as SessionId,
    bodyRef,
    contentRef,
    pageBlockKeys: page.blockKeys,
    enabled:       !disableOverflow && !isTemplateFreeCanvas,
  })
  const flatDroppedCards = session.topics
    .flatMap((topic) => topic.objectives)
    .flatMap((objective) => objective.tasks)
    .flatMap((task) => task.droppedCards)
    .sort((a, b) => a.order - b.order)

  const useCardRange = session.canvases.length > 1
  const cardStart = useCardRange ? (page.contentCardRange?.start ?? 0) : 0
  const cardEnd = useCardRange ? (page.contentCardRange?.end ?? flatDroppedCards.length) : flatDroppedCards.length
  const visibleDroppedCards = flatDroppedCards.slice(cardStart, cardEnd)

  // Body-level droppable: covers the full canvas body area for template-free canvases.
  // Disabled on template canvases — ContentBlock's task-area droppables handle all drops
  // there, and a competing body droppable with no blockKey would previously cause cards
  // to be stored without a blockKey (and therefore render in both content + assignment).
  // The drop handler now prefers any collision that carries a blockKey, so even if the
  // body target is erroneously detected the card will still be routed correctly.
  const { setNodeRef: setBodyDropRef } = useDroppable({
    id:       `${session.id as SessionId}:body`,
    disabled: !isTemplateFreeCanvas,
    data: {
      sessionId: session.id  as SessionId,
      canvasId: page.id,
      taskId:    bodyDropTaskId,
      areaKind:  "instruction",
    },
  })

  return (
    // Outer wrapper: claims the scaled dimensions in document flow so that
    // the virtualizer's measureElement sees the correct row height without
    // any margin compensation hacks (wrapper-div pattern, per PDF spec).
    <div
      role="region"
      aria-label={`Page ${virtualIndex + 1}`}
      onClick={() => setActiveCanvas(page.id)}
      style={{
        width:    dims.widthPx * scale,
        height:   dims.heightPx * scale,
      }}
    >
    {/* Inner canvas: canonical dimensions, visually scaled */}
    <div
      style={{
        width:            dims.widthPx,
        height:           dims.heightPx,
        // Zones baked in as grid rows: header | body | footer
        display:          "grid",
        gridTemplateRows: `${dims.margins.top}px minmax(0, 1fr) ${dims.margins.bottom}px`,
        transform:        `scale(${scale})`,
        transformOrigin:  "top left",
      }}
      className={[
        "bg-white shadow-md select-none",
        "ring-1",
        isActive ? "ring-blue-400" : "ring-neutral-200",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header zone — top margin row, baked into grid */}
      <div className="overflow-hidden bg-white">
        <HeaderBlock
          sessionId={session.id as SessionId}
          fieldValues={fieldValues}
          fieldEnabled={session.fieldEnabled}
        />
      </div>

      {/* Body zone — middle row (1fr), padded by left/right margins */}
      <div
        ref={(el) => {
          bodyRef.current = el
          setBodyDropRef(el)
        }}
        style={{
          overflow:     "hidden",
          minHeight:    0,
          paddingLeft:  dims.margins.left,
          paddingRight: dims.margins.right,
        }}
      >
        {isTemplateFreeCanvas ? (
          <section className="h-full min-h-[240px] w-full rounded-lg border border-dashed border-neutral-300 bg-white p-3">
            {visibleDroppedCards.length === 0 ? (
              <div className="px-1">
                <InsertionLineSlot
                  id={`${session.id as SessionId}:body:${page.id}:slot:0`}
                  sessionId={session.id as SessionId}
                  canvasId={page.id}
                  taskId={bodyDropTaskId}
                />
                <div className="flex h-full min-h-[200px] items-center justify-center text-xs text-neutral-400">
                  Drop cards here
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleDroppedCards.map((card, idx) => {
                  const prevOrder = idx > 0 ? visibleDroppedCards[idx - 1]?.order : undefined
                  return (
                    <div key={card.id} data-card-idx={cardStart + idx}>
                      <InsertionLineSlot
                        id={`${session.id as SessionId}:body:${page.id}:slot:${idx}`}
                        sessionId={session.id as SessionId}
                        canvasId={page.id}
                        taskId={bodyDropTaskId}
                        prevOrder={prevOrder}
                        nextOrder={card.order}
                      />
                      <CardRenderer
                        card={card}
                        onRemove={() => {
                          const ownerTaskId = findOwnerTaskIdForCard(session, card.id) ?? card.taskId
                          removeDroppedCard(session.id as SessionId, ownerTaskId, card.id)
                        }}
                      />
                    </div>
                  )
                })}
                <InsertionLineSlot
                  id={`${session.id as SessionId}:body:${page.id}:slot:${visibleDroppedCards.length}`}
                  sessionId={session.id as SessionId}
                  canvasId={page.id}
                  taskId={bodyDropTaskId}
                  prevOrder={visibleDroppedCards[visibleDroppedCards.length - 1]?.order}
                />
              </div>
            )}
          </section>
        ) : (
          <div ref={contentRef}>
            <BlockRenderer
              sessionId={session.id as SessionId}
              canvasId={page.id}
              fieldValues={fieldValues}
              data={bodyData}
              blockKeys={page.blockKeys}
              fieldEnabled={session.fieldEnabled}
            />
          </div>
        )}
      </div>

      {/* Footer zone — bottom margin row, baked into grid */}
      <div className="overflow-hidden bg-white">
        <FooterBlock
          sessionId={session.id as SessionId}
          fieldValues={fieldValues}
          fieldEnabled={session.fieldEnabled}
        />
      </div>

    </div>
    </div>
  )
}
