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

import { DEFAULT_PAGE_DIMENSIONS, bodyHeightPx } from "../types"
import type { DroppedCard, TaskAreaKind, Topic } from "../types"

// ─── CSS layout constants ─────────────────────────────────────────────────────

/** BlockRenderer outer wrapper: no vertical padding; the printable body owns the exact bounds. */
export const BLOCK_RENDERER_VERT = 0

/** gap-2 (8px) between block sections inside BlockRenderer */
export const BLOCK_GAP = 8

/** Block section header: border-b + py-1 + text-[9px] label row */
const SECTION_HEADER = 24

/** Table thead row: py-1 + text-[10px] font-medium */
const TABLE_HEADER = 24

/** Table tbody data row: py-1 + topic/objective/task hierarchy text scale */
const TABLE_ROW = 25

/** Topic container border + p-1.5 chrome (top + bottom only): 1+6+6+1 = 14px */
export const TOPIC_CHROME = 14

/** Topic label: text-[13px] leading-tight (~17px line) + mb-2 (8px) */
export const TOPIC_LABEL = 25

/** Objective container border + p-1.5 chrome (top + bottom): 14px */
export const OBJ_CHROME = 14

/** Objective label: text-[11px] leading-snug (~15px line) + mb-1.5 (6px) */
export const OBJ_LABEL = 21

/** Task container border + p-1.5 chrome (top + bottom): 14px (only when has label) */
const TASK_CHROME = 14

/** Task label: text-[9.5px] leading-snug (~13px line) + mb-1.5 (6px), over-estimated slightly */
const TASK_LABEL = 21

/** Single task area at rest: fixed empty drop-zone height h-12. */
const TASK_AREA = 48

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
 * The task label carries only the task name (~55% of width).
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
  topics.forEach((topic) => {
    topic.objectives.forEach((obj) => {
      const tasks = obj.tasks.length > 0 ? obj.tasks : [{ label: "" }]
      tasks.forEach((task) => {
        if (key === "program") {
          heights.push(estimateWrappedRowHeight(task.label, PROGRAM_TASK_COL_WIDTH_PX))
        } else {
          heights.push(estimateWrappedRowHeight(task.label, RESOURCES_TASK_COL_WIDTH_PX))
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

/** Base zone overhead when cards are present: border + p-1 top/bottom. */
const TASK_AREA_BASE_CARDS = 10
const FIELD_FILL_CARD_BODY_RATIO = 0.72
const DEFAULT_FIELD_FILL_CARD_HEIGHT = Math.round(bodyHeightPx(DEFAULT_PAGE_DIMENSIONS) * FIELD_FILL_CARD_BODY_RATIO)

const LAYOUT_ROW_GAP = 2

const LAYOUT_SLOT_MIN_HEIGHTS: Record<string, number[]> = {
  split: [120, 120],
  stack: [150, 100],
  feature: [220, 84, 120],
  sidebar: [120, 120],
  quad: [110, 110, 110, 110],
  mosaic: Array.from({ length: 9 }, () => 72),
  triptych: [120, 120, 120],
  trirow: [56, 180, 56],
  banner: [72, 140, 140],
  broadside: [64, 120, 120, 120],
  tower: [240, 72, 72, 72],
  pinboard: [56, 100, 100, 100, 100],
  annotated: [200, 100, 100, 100, 100],
  sixgrid: Array.from({ length: 6 }, () => 88),
  comparison: [54, 54, 140, 140],
  stepped: Array.from({ length: 4 }, () => 88),
  hero: [190, 64, 64, 72],
  dialogue: [170, 170],
  gallery: Array.from({ length: 6 }, () => 90),
  spotlight: [92, 220, 92, 92],
  flipcard: [170, 170],
  "resizable-grid": Array.from({ length: 4 }, () => 120),
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function estimateTextCardHeight(card: DroppedCard): number {
  const rawText = typeof card.content.text === "string" ? card.content.text : ""
  const title = typeof card.content.title === "string" ? card.content.title : ""
  const text = stripHtml(rawText)
  const charsPerLine = 42
  const textLines = Math.max(1, Math.ceil(text.length / charsPerLine))
  const titleHeight = title ? 18 : 0
  return Math.max(44, 18 + titleHeight + textLines * 18)
}

function stackedCardsHeight(cards: DroppedCard[]): number {
  if (cards.length === 0) return 0
  return cards.reduce((sum, card) => sum + estimateDroppedCardHeight(card), 0)
    + Math.max(0, cards.length - 1) * 2
}

function rowMax(slotHeights: number[], indices: number[]): number {
  return Math.max(...indices.map((idx) => slotHeights[idx] ?? 0), 0)
}

function estimateLayoutCardHeight(card: DroppedCard): number {
  const kind = card.cardType.replace("layout-", "")
  const slotMins = LAYOUT_SLOT_MIN_HEIGHTS[kind] ?? [120, 120]
  const slots = (card.content.slots ?? {}) as Record<string, DroppedCard[]>
  const slotHeights = slotMins.map((slotMin, index) => Math.max(slotMin, stackedCardsHeight(slots[index] ?? [])))

  const rowsHeight = (rows: number[][]) =>
    rows.reduce((sum, row, index) => sum + rowMax(slotHeights, row) + (index > 0 ? LAYOUT_ROW_GAP : 0), 0)

  const contentHeight = (() => {
    switch (kind) {
      case "split":
      case "sidebar":
      case "triptych":
      case "dialogue":
      case "flipcard":
        return rowMax(slotHeights, slotHeights.map((_, index) => index))
      case "stack":
      case "trirow":
      case "stepped":
        return rowsHeight(slotHeights.map((_, index) => [index]))
      case "quad":
        return rowsHeight([[0, 1], [2, 3]])
      case "mosaic":
        return rowsHeight([[0, 1, 2], [3, 4, 5], [6, 7, 8]])
      case "sixgrid":
      case "gallery":
        return rowsHeight([[0, 1, 2], [3, 4, 5]])
      case "banner":
      case "broadside":
      case "pinboard":
      case "comparison":
        return rowsHeight([[0], slotHeights.map((_, index) => index).slice(1)])
      case "feature":
        return Math.max(slotHeights[0] ?? 0, (slotHeights[1] ?? 0) + LAYOUT_ROW_GAP + (slotHeights[2] ?? 0))
      case "tower":
        return Math.max(
          slotHeights[0] ?? 0,
          (slotHeights[1] ?? 0) + LAYOUT_ROW_GAP + (slotHeights[2] ?? 0) + LAYOUT_ROW_GAP + (slotHeights[3] ?? 0),
        )
      case "annotated":
        return Math.max(slotHeights[0] ?? 0, rowsHeight([[1, 2], [3, 4]]))
      case "spotlight":
        return Math.max(slotHeights[1] ?? 0, rowsHeight([[0, 2], [3]]))
      case "hero":
        return rowsHeight([[0], [1, 2], [3]])
      case "resizable-grid": {
        const layout = Array.isArray(card.content.gridLayout) ? card.content.gridLayout : []
        const maxBottomRow = layout.reduce((max, item) => {
          if (!item || typeof item !== "object") return max
          const row = Number((item as Record<string, unknown>).y)
          const height = Number((item as Record<string, unknown>).h)
          if (!Number.isFinite(row) || !Number.isFinite(height)) return max
          return Math.max(max, row + height)
        }, 8)
        return Math.max(rowsHeight([[0, 1], [2, 3]]), maxBottomRow * 34 + Math.max(0, maxBottomRow - 1) * 8)
      }
      default:
        return rowMax(slotHeights, slotHeights.map((_, index) => index))
    }
  })()

  return contentHeight + 2
}

export function estimateDroppedCardHeight(card: DroppedCard): number {
  if (card.cardType.startsWith("layout-")) {
    return estimateLayoutCardHeight(card)
  }

  if (card.cardType === "text") {
    return estimateTextCardHeight(card)
  }

  const raw = typeof card.dimensions?.height === "number" ? card.dimensions.height : 0

  if (card.cardType === "chat") {
    return Math.max(DEFAULT_FIELD_FILL_CARD_HEIGHT, raw || DEFAULT_FIELD_FILL_CARD_HEIGHT)
  }

  // These canvas products render at (or very close to) their declared height.
  // Treating them like light preview cards underestimates page demand and leaves
  // real canvases overflowed even after layout has "finished".
  if (
    card.cardType === "text-editor" ||
    card.cardType === "code-editor" ||
    card.cardType === "whiteboard" ||
    card.cardType === "rich-sim" ||
    card.cardType === "village-3d" ||
    card.cardType === "interactive"
  ) {
    return Math.max(160, Math.min(520, raw || 160))
  }

  // Media-backed cards occupy substantially more of their declared height than
  // lightweight DOM previews. Bias conservative here so pagination errs on the
  // side of an extra continuation page rather than persistent footer overflow.
  if (card.cardType === "video") {
    return Math.max(180, Math.min(360, raw > 0 ? raw : 270))
  }

  if (card.cardType === "image") {
    return Math.max(160, Math.min(340, raw > 0 ? Math.round(raw * 0.9) : 240))
  }

  if (card.cardType === "audio") {
    return Math.max(120, Math.min(220, raw > 0 ? Math.round(raw * 0.85) : 160))
  }

  if (card.cardType === "model-3d") {
    return Math.max(180, Math.min(320, raw > 0 ? Math.round(raw * 0.9) : 260))
  }

  const base = raw > 0 ? raw : 120

  // Rich cards reserve most of their declared height; generic DOM cards use
  // less vertical space than their source dimensions suggest.
  const ratio = card.cardType === "games"
    ? 0.7
    : 0.35

  return Math.max(44, Math.min(420, Math.round(base * ratio) + 20))
}

function areaHeight(emptyAreaH: number, cards: DroppedCard[] = []): number {
  if (cards.length <= 0) return emptyAreaH
  const cardsH = cards.reduce((sum, card) => sum + estimateDroppedCardHeight(card), 0)
  // Include insertion slots between cards and one trailing slot.
  return TASK_AREA_BASE_CARDS + cardsH + cards.length * 8
}

function cardsByArea(cards: DroppedCard[], visibleAreas: TaskAreaKind[]): Partial<Record<TaskAreaKind, DroppedCard[]>> {
  return Object.fromEntries(
    visibleAreas.map((area) => [area, cards.filter((card) => card.areaKind === area)]),
  ) as Partial<Record<TaskAreaKind, DroppedCard[]>>
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
    const cardsPerArea = cardsByArea(dropped, visibleAreas)
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
