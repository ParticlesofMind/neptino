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

export function estimateTaskTableRowCount(topics: Topic[]): number {
  return totalTaskRows(topics)
}

export function estimateTableBlockBaseHeight(): number {
  return 2 + SECTION_HEADER + TABLE_HEADER
}

export const TABLE_ROW_HEIGHT = TABLE_ROW

// ─── Text-wrapping row height estimation ──────────────────────────────────────

/**
 * Usable inner canvas width in CSS pixels.
 * A4 page (794px) minus left (76px) and right (76px) margins.
 */
const CANVAS_INNER_WIDTH_PX = 642

/**
 * Average character width at text-[11px] in a typical sans-serif font.
 * Slightly conservative (larger than real) to avoid under-estimating line counts.
 */
const CHAR_WIDTH_PX = 7

/** Effective rendered line height at text-[11px] with ~1.5 line-height ratio */
const TEXT_LINE_HEIGHT_PX = 17

/**
 * Estimate the rendered height of a single table row by approximating how many
 * lines the dominant (widest) cell will wrap to.
 *
 * @param text       - Text content of the dominant column in this row.
 * @param colWidthPx - CSS pixel width of that column.
 */
function estimateWrappedRowHeight(text: string, colWidthPx: number): number {
  const charsPerLine = Math.max(1, Math.floor(colWidthPx / CHAR_WIDTH_PX))
  const lines = Math.max(1, Math.ceil((text.length || 0) / charsPerLine))
  return Math.max(TABLE_ROW, lines * TEXT_LINE_HEIGHT_PX + 8) // 8px = py-1 vertical padding
}

/**
 * Program table: approximate CSS pixel width of the Task column.
 * Column distribution: Topic(13%) Objective(25%) Task(32%) Method(13%) SocialForm(10%) Time(7%)
 */
const PROGRAM_TASK_COL_WIDTH_PX = Math.round(CANVAS_INNER_WIDTH_PX * 0.32)

/**
 * Resources table: approximate CSS pixel width of the Task column.
 * The task label carries the full "1.1.1 topic: obj — task" string (~55% of width).
 */
const RESOURCES_TASK_COL_WIDTH_PX = Math.round(CANVAS_INNER_WIDTH_PX * 0.55)

/**
 * Returns an array of estimated rendered row heights (CSS pixels) for every flat
 * task row in the given block type.
 *
 * Row order mirrors the iteration used in ProgramBlock and ResourcesBlock:
 * topics → objectives → tasks (1 row per task, or 1 placeholder row per empty objective).
 */
export function estimateBlockRowHeights(key: "program" | "resources", topics: Topic[]): number[] {
  const heights: number[] = []
  topics.forEach((topic, ti) => {
    topic.objectives.forEach((obj, oi) => {
      const tasks = obj.tasks.length > 0 ? obj.tasks : [{ label: "" }]
      tasks.forEach((task, ki) => {
        if (key === "program") {
          heights.push(estimateWrappedRowHeight(task.label, PROGRAM_TASK_COL_WIDTH_PX))
        } else {
          // Resources label mirrors ResourcesBlock: `${ti+1}.${oi+1}.${ki+1} topic: obj — task`
          const label = `${ti + 1}.${oi + 1}.${ki + 1} ${topic.label}: ${obj.label} \u2014 ${task.label}`
          heights.push(estimateWrappedRowHeight(label, RESOURCES_TASK_COL_WIDTH_PX))
        }
      })
    })
  })
  // Always at least one placeholder row
  if (heights.length === 0) heights.push(TABLE_ROW)
  return heights
}

export function estimateProgramHeight(topics: Topic[]): number {
  const rowHeights = estimateBlockRowHeights("program", topics)
  return 2 + SECTION_HEADER + TABLE_HEADER + rowHeights.reduce((s, h) => s + h, 0)
}

export function estimateResourcesHeight(topics: Topic[]): number {
  const rowHeights = estimateBlockRowHeights("resources", topics)
  return 2 + SECTION_HEADER + TABLE_HEADER + rowHeights.reduce((s, h) => s + h, 0)
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
