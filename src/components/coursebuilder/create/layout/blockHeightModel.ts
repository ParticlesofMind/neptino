/**
 * Block Height Model
 *
 * Pure functions that estimate the rendered pixel height of each canvas block
 * from data alone — no DOM access required.
 *
 * All constants are derived from the Tailwind utility classes used in the
 * block components. When CSS changes, update the constants here.
 *
 * Values are CSS pixels at 100% zoom, before any canvas scale transform.
 *
 * Estimation strategy: lean slightly conservative (over-estimate) when uncertain
 * to avoid under-paginating. A small amber overflow ring is acceptable; an
 * infinite split loop is not.
 */

import type { DroppedCard, TaskAreaKind, Topic } from "../types"

// ─── CSS layout constants ─────────────────────────────────────────────────────

/** BlockRenderer outer wrapper: py-2 (8px top + 8px bottom) */
export const BLOCK_RENDERER_VERT = 16

/** gap-2 (8px) between block sections inside BlockRenderer */
export const BLOCK_GAP = 8

/** Block section header: border-b + py-1 + text-[9px] label row */
const SECTION_HEADER = 24

/** Table thead row: py-1 + text-[10px] font-medium */
const TABLE_HEADER = 24

/** Table tbody data row: py-1 + text-[11px] */
const TABLE_ROW = 25

/** Topic container border + p-1.5 chrome (top + bottom only): 1+6+6+1 = 14px */
export const TOPIC_CHROME = 14

/** Topic label: text-[11px] (17px line) + mb-1.5 (6px) */
export const TOPIC_LABEL = 23

/** Objective container border + p-1.5 chrome (top + bottom): 14px */
export const OBJ_CHROME = 14

/** Objective label: text-[10px] (15px line) + mb-1.5 (6px) */
export const OBJ_LABEL = 21

/** Task container border + p-1.5 chrome (top + bottom): 14px (only when has label) */
const TASK_CHROME = 14

/** Task label: text-[10px] (15px line) + mb-1.5 (6px) */
const TASK_LABEL = 21

/**
 * Single task area at rest (no cards, no drag):
 *   label(14) + space-y-0.5(2) + zone(border-2 + py-1.5-12 + inner-py-1.5-12 + h-6-24) = 66px
 */
const TASK_AREA = 66

/** gap-2 (8px) between task areas inside a task's flex flex-col gap-2 */
const AREA_GAP = 8

/** space-y-1.5 (6px) margin between objectives / between tasks */
export const SPACE_Y_1_5 = 6

/** space-y-2 (8px) margin between topics inside the content body */
export const TOPIC_SPACING = 8

/** Content block body: py-2 (8px top + 8px bottom) */
const CONTENT_BODY_VERT = 16

// ─── Program / Resources ──────────────────────────────────────────────────────

function totalTaskRows(topics: Topic[]): number {
  return Math.max(
    1,
    topics.reduce(
      (sum, t) =>
        sum + t.objectives.reduce((s, o) => s + Math.max(1, o.tasks.length), 0),
      0,
    ),
  )
}

export function estimateProgramHeight(topics: Topic[]): number {
  // section border (2) + section header (24) + table header (24) + N rows (25 each)
  return 2 + SECTION_HEADER + TABLE_HEADER + totalTaskRows(topics) * TABLE_ROW
}

export function estimateResourcesHeight(topics: Topic[]): number {
  return 2 + SECTION_HEADER + TABLE_HEADER + totalTaskRows(topics) * TABLE_ROW
}

// ─── Content / Assignment ─────────────────────────────────────────────────────

/** Fixed overhead of a content/assignment block regardless of topic count */
export const CONTENT_BLOCK_FIXED = 2 + SECTION_HEADER + CONTENT_BODY_VERT

/**
 * Estimated height of a single dropped card:
 *   InsertionLineSlot h-2 (8px) + card border+padding+text-line (~30px) = ~38px.
 * Used to inflate task-area height estimates when cards are present.
 */
export const DROPPED_CARD_HEIGHT = 38

/**
 * Base zone overhead when cards are present (the min-height constraint no longer
 * limits the zone): label (14px) + space-y-0.5 gap (2px) + zone chrome
 * (border 2px + py-1.5 12px) = 30px.  When zones are empty we use TASK_AREA
 * (66px) which includes the min-h-6 floor.
 */
const TASK_AREA_BASE_CARDS = 30

function estimateDroppedCardHeight(card: DroppedCard): number {
  const raw = typeof card.dimensions?.height === "number" ? card.dimensions.height : 0
  const base = raw > 0 ? raw : 120

  // Rich cards reserve most of their declared height; generic DOM cards use
  // less vertical space than their source dimensions suggest.
  const ratio = (
    card.cardType === "village-3d" ||
    card.cardType === "rich-sim" ||
    card.cardType === "interactive" ||
    card.cardType === "games" ||
    card.cardType === "chat" ||
    card.cardType === "model-3d"
  )
    ? 0.7
    : card.cardType === "image" || card.cardType === "video"
      ? 0.55
      : 0.35

  return Math.max(44, Math.min(420, Math.round(base * ratio) + 20))
}

function areaHeight(emptyAreaH: number, cards: DroppedCard[] = []): number {
  if (cards.length <= 0) return emptyAreaH
  const cardsH = cards.reduce((sum, card) => sum + estimateDroppedCardHeight(card), 0)
  // Include insertion slots between cards and one trailing slot.
  return TASK_AREA_BASE_CARDS + cardsH + cards.length * 8
}

function areaStackHeight(
  areaCount: number,
  cardsPerArea: Partial<Record<TaskAreaKind, DroppedCard[]>> = {},
  visibleAreas: TaskAreaKind[] = ["instruction", "practice", "feedback"],
): number {
  if (areaCount <= 0) return 0
  let total = 0
  for (let i = 0; i < areaCount; i++) {
    const area = visibleAreas[i] ?? "instruction"
    total += areaHeight(TASK_AREA, cardsPerArea[area] ?? [])
    if (i < areaCount - 1) total += AREA_GAP
  }
  return total
}

export function singleTaskHeight(
  hasLabel: boolean,
  areaCount: number,
  cardsPerArea: Partial<Record<TaskAreaKind, DroppedCard[]>> = {},
  visibleAreas: TaskAreaKind[] = ["instruction", "practice", "feedback"],
): number {
  return (hasLabel ? TASK_CHROME + TASK_LABEL : 0) + areaStackHeight(areaCount, cardsPerArea, visibleAreas)
}

export function singleObjHeight(
  obj: Topic["objectives"][number],
  isBootstrapped: boolean,
  areaCount: number,
  blockKey?: string,
  visibleAreas: TaskAreaKind[] = ["instruction", "practice", "feedback"],
): number {
  const tasks = obj.tasks.length > 0 ? obj.tasks : [{ label: "" }]
  const tasksH = (tasks as (Topic["objectives"][number]["tasks"][number] | { label: string })[]).reduce<number>((sum, task, ki) => {
    const hasLabel = !isBootstrapped && task.label !== ""
    const dropped = "droppedCards" in task
      ? task.droppedCards.filter((card) => {
          const blockMatch = !card.blockKey || card.blockKey === blockKey
          const areaMatch = visibleAreas.includes(card.areaKind)
          return blockMatch && areaMatch
        })
      : []
    const cardsPerArea: Partial<Record<TaskAreaKind, DroppedCard[]>> = {
      instruction: dropped.filter((card) => card.areaKind === "instruction"),
      practice: dropped.filter((card) => card.areaKind === "practice"),
      feedback: dropped.filter((card) => card.areaKind === "feedback"),
    }
    return sum + (ki > 0 ? SPACE_Y_1_5 : 0) + singleTaskHeight(hasLabel, areaCount, cardsPerArea, visibleAreas)
  }, 0)
  const hasObjLabel = !isBootstrapped && obj.label !== ""
  return (hasObjLabel ? OBJ_CHROME + OBJ_LABEL : 0) + tasksH
}

export function estimateTopicHeight(
  topic: Topic,
  isBootstrapped: boolean,
  areaCount: number,
  blockKey?: string,
  visibleAreas: TaskAreaKind[] = ["instruction", "practice", "feedback"],
): number {
  const objsH = topic.objectives.reduce<number>((sum, obj, oi) => {
    return sum + (oi > 0 ? SPACE_Y_1_5 : 0) + singleObjHeight(obj, isBootstrapped, areaCount, blockKey, visibleAreas)
  }, 0)
  return TOPIC_CHROME + (isBootstrapped ? 0 : TOPIC_LABEL) + objsH
}

export function isBootstrappedTopic(topic: Topic): boolean {
  return (
    topic.label === "" &&
    topic.objectives.length <= 1 &&
    (topic.objectives[0]?.label ?? "") === ""
  )
}
