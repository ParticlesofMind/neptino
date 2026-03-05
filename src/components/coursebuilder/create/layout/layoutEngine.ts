/**
 * Layout Engine
 *
 * Pure, deterministic function that computes page assignments for a session.
 * No DOM access — safe to call in useMemo, in tests, or in a Web Worker.
 *
 * Pagination hierarchy
 * ─────────────────────
 * Tier 1 — Block placement
 *   Fixed-height blocks (program, resources) either fit on the current page
 *   or are deferred to a new page as a unit.
 *
 * Tier 2 — Content split
 *   Content/Assignment blocks distribute topics across pages. The engine
 *   computes how many topics fit in the remaining space and emits
 *   continuation pages for the remainder.
 *
 * Tier 3 — Objective split (planned, not yet implemented)
 *   When a single topic is taller than a full page, split at objective
 *   boundaries. For now, oversized topics are placed on their own page.
 */

import type { BlockKey, CourseSession, PageDimensions, TaskAreaKind, Topic } from "../types"
import { bodyHeightPx } from "../types"
import { getDefaultBlocksForType, type TemplateType } from "@/lib/curriculum/template-blocks"
import {
  BLOCK_RENDERER_VERT,
  BLOCK_GAP,
  CONTENT_BLOCK_FIXED,
  TOPIC_SPACING,
  TOPIC_CHROME,
  TOPIC_LABEL,
  SPACE_Y_1_5,
  OBJ_CHROME,
  OBJ_LABEL,
  estimateProgramHeight,
  estimateResourcesHeight,
  estimateTopicHeight,
  isBootstrappedTopic,
  singleObjHeight,
  singleTaskHeight,
} from "./blockHeightModel"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageAssignment {
  /**
   * Body block keys to render on this page (no header/footer — those always
   * render in the margin bands regardless of this list).
   */
  blockKeys: BlockKey[]
  /**
   * Topic range for Content/Assignment blocks on this page.
   * undefined = all topics (no split).
   */
  topicRange?: { start: number; end?: number }
  /**
   * Objective range (session-global flat indices) for when a single oversized
   * topic must be split at objective boundaries across pages.
   * undefined = all objectives in the topic slice.
   */
  objectiveRange?: { start: number; end?: number }
  /**
   * Task range (session-global flat indices) for when a single oversized
   * objective must be split at task boundaries across pages.
   * undefined = all tasks in the objective slice.
   */
  taskRange?: { start: number; end?: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTENT_TYPE: ReadonlySet<BlockKey> = new Set(["content", "assignment", "scoring"])

function visibleAreas(
  blockKey: BlockKey,
  fieldEnabled?: Partial<Record<string, Record<string, boolean>>>,
): TaskAreaKind[] {
  const fe = fieldEnabled?.[blockKey]
  const i = fe ? (fe["instruction"] ?? true) : true
  const p = fe ? (fe["practice"]    ?? true) : true
  const f = fe ? (fe["feedback"]    ?? true) : true
  return [
    ...(i ? (["instruction"] as TaskAreaKind[]) : []),
    ...(p ? (["practice"] as TaskAreaKind[]) : []),
    ...(f ? (["feedback"] as TaskAreaKind[]) : []),
  ]
}

function estimateFixedBlockHeight(key: BlockKey, session: CourseSession): number {
  if (key === "program")   return estimateProgramHeight(session.topics)
  if (key === "resources") return estimateResourcesHeight(session.topics)
  if (key === "project")   return 180
  return 120 // generic fallback for unknown fixed blocks
}

/**
 * How many topics (starting at `startIdx`) fit within `budget` px, given
 * the content-type blocks all showing the same topic slice.
 *
 * The budget must still cover the per-block fixed overhead before any topics
 * are counted. Returns 0 when not even the overhead fits.
 *
 * Each block may have a different visible area count (e.g. content=instruction
 * only, assignment=practice+feedback), so per-block heights are summed rather
 * than using K * singleBlockHeight.
 */
function topicsInBudget(
  session: CourseSession,
  startIdx: number,
  budget: number,
  contentBlocks: BlockKey[],
  fieldEnabled: Partial<Record<string, Record<string, boolean>>> | undefined,
): number {
  const K = contentBlocks.length
  if (K === 0) return 0

  const baseCost = K * CONTENT_BLOCK_FIXED + Math.max(0, K - 1) * BLOCK_GAP
  let remaining = budget - baseCost
  if (remaining <= 0) return 0

  // Compute per-block visible areas once — used for per-block topic height estimates.
  const visibleAreasPerBlock = contentBlocks.map((b) => visibleAreas(b, fieldEnabled))
  let count = 0

  for (let i = startIdx; i < session.topics.length; i++) {
    const topic = session.topics[i]!
    const bootstrapped = isBootstrappedTopic(topic)
    // Sum heights across all blocks for this topic (each block stacks vertically)
    const topicCost = visibleAreasPerBlock.reduce((sum, blockAreas, bi) => {
      const h = estimateTopicHeight(
        topic,
        bootstrapped,
        blockAreas.length,
        contentBlocks[bi],
        blockAreas,
      )
      return sum + h + (count > 0 ? TOPIC_SPACING : 0)
    }, 0)
    if (remaining >= topicCost) {
      remaining -= topicCost
      count++
    } else {
      break
    }
  }

  return count
}

/**
 * How many objectives (starting at `startObjIdx` within the topic) fit within
 * `budget` px, given content-type blocks all showing the same objective slice.
 *
 * Returns 0 when nothing fits; the caller must ensure forward progress.
 */
function objectivesInBudget(
  topic: Topic,
  startObjIdx: number,
  budget: number,
  contentBlocks: BlockKey[],
  isBootstrapped: boolean,
  fieldEnabled: Partial<Record<string, Record<string, boolean>>> | undefined,
): number {
  const visibleAreasPerBlock = contentBlocks.map((b) => visibleAreas(b, fieldEnabled))
  let remaining = budget
  let count = 0
  for (let i = startObjIdx; i < topic.objectives.length; i++) {
    const obj = topic.objectives[i]!
    const objCost = visibleAreasPerBlock.reduce((sum, blockAreas, bi) => {
      return sum + singleObjHeight(
        obj,
        isBootstrapped,
        blockAreas.length,
        contentBlocks[bi],
        blockAreas,
      ) + (count > 0 ? SPACE_Y_1_5 : 0)
    }, 0)
    if (remaining >= objCost) {
      remaining -= objCost
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * How many tasks (starting at `startTaskIdx` within the objective) fit within
 * `budget` px, given content-type blocks all showing the same task slice.
 * The budget must already have the objective chrome/label subtracted.
 *
 * Returns 0 when nothing fits; the caller must ensure forward progress.
 */
function tasksInBudget(
  obj: Topic["objectives"][number],
  startTaskIdx: number,
  budget: number,
  contentBlocks: BlockKey[],
  isBootstrapped: boolean,
  fieldEnabled: Partial<Record<string, Record<string, boolean>>> | undefined,
): number {
  const visibleAreasPerBlock = contentBlocks.map((b) => visibleAreas(b, fieldEnabled))
  let remaining = budget
  let count = 0
  for (let i = startTaskIdx; i < obj.tasks.length; i++) {
    const task = obj.tasks[i]!
    const hasLabel = !isBootstrapped && task.label !== ""
    const taskCost = visibleAreasPerBlock.reduce((sum, blockAreas, bi) => {
      const cardsForBlock = task.droppedCards.filter((card) => {
        const blockMatch = !card.blockKey || card.blockKey === contentBlocks[bi]
        const areaMatch = blockAreas.includes(card.areaKind)
        return blockMatch && areaMatch
      })
      const cardsPerArea: Partial<Record<TaskAreaKind, typeof cardsForBlock>> = {
        instruction: cardsForBlock.filter((card) => card.areaKind === "instruction"),
        practice: cardsForBlock.filter((card) => card.areaKind === "practice"),
        feedback: cardsForBlock.filter((card) => card.areaKind === "feedback"),
      }
      return sum + singleTaskHeight(hasLabel, blockAreas.length, cardsPerArea, blockAreas) + (count > 0 ? SPACE_Y_1_5 : 0)
    }, 0)
    if (remaining >= taskCost) {
      remaining -= taskCost
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * Session-global flat task index of the first task of objective `objIdx`
 * within topic `topicIdx`.
 */
function computeFlatTaskOffset(
  session: CourseSession,
  topicIdx: number,
  objIdx: number,
): number {
  let offset = 0
  for (let ti = 0; ti < topicIdx; ti++) {
    for (const obj of session.topics[ti]!.objectives) {
      offset += obj.tasks.length
    }
  }
  for (let oi = 0; oi < objIdx; oi++) {
    offset += session.topics[topicIdx]!.objectives[oi]!.tasks.length
  }
  return offset
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Compute page assignments for a session.
 *
 * @param session      - The session whose canvas pages are being laid out.
 * @param dims         - Page dimensions (width, height, margins).
 * @param fieldEnabled - Per-block field visibility config (controls area count).
 * @returns            - One PageAssignment per required canvas page.
 */
export function computePageAssignments(
  session: CourseSession,
  dims: PageDimensions,
  fieldEnabled?: Partial<Record<string, Record<string, boolean>>>,
): PageAssignment[] {
  const available = bodyHeightPx(dims) - BLOCK_RENDERER_VERT

  const templateBlocks = getDefaultBlocksForType(
    (session.templateType ?? "lesson") as TemplateType,
  ) as BlockKey[]

  const bodyKeys = templateBlocks.filter((k) => k !== "header" && k !== "footer")
  if (bodyKeys.length === 0) return [{ blockKeys: [] }]

  const fixedKeys   = bodyKeys.filter((k) => !CONTENT_TYPE.has(k))
  const contentKeys = bodyKeys.filter((k) => CONTENT_TYPE.has(k))

  // No content blocks: place all fixed blocks on one page
  if (contentKeys.length === 0 || session.topics.length === 0) {
    return [{ blockKeys: bodyKeys }]
  }

  // ── Compute fixed block cost ────────────────────────────────────────────────

  let fixedCost = 0
  for (let i = 0; i < fixedKeys.length; i++) {
    fixedCost += estimateFixedBlockHeight(fixedKeys[i]!, session)
    if (i < fixedKeys.length - 1) fixedCost += BLOCK_GAP
  }
  const gapAfterFixed = fixedKeys.length > 0 ? BLOCK_GAP : 0
  const firstPageBudget = available - fixedCost - gapAfterFixed

  // ── Distribute topics across pages by block flow ───────────────────────────
  // Content-type blocks are independent container flows. We paginate one block
  // at a time in template order (e.g. content then assignment), so containers
  // do not ping-pong on continuation pages.

  const pages: PageAssignment[] = []
  let hasEmittedFirstPage = false

  for (const flowKey of contentKeys) {
    const activeContentKeys: BlockKey[] = [flowKey]
    const K = 1
    const contentBlockFixedCost = CONTENT_BLOCK_FIXED

    let topicIdx = 0
    let objStartWithinTopic = 0
    let taskStartWithinObj = 0

    while (topicIdx < session.topics.length) {
      const topic = session.topics[topicIdx]!
      const isBootstrapped = isBootstrappedTopic(topic)
      const topicChromeH = TOPIC_CHROME + (isBootstrapped ? 0 : TOPIC_LABEL)
      const flatObjOffset = session.topics
        .slice(0, topicIdx)
        .reduce((s, t) => s + t.objectives.length, 0)

      if (taskStartWithinObj > 0) {
        const obj = topic.objectives[objStartWithinTopic]!
        const hasObjLabel = !isBootstrapped && obj.label !== ""
        const objChromeH = OBJ_CHROME + (hasObjLabel ? OBJ_LABEL : 0)
        const objBudget  = available - contentBlockFixedCost - K * topicChromeH
        const taskBudget = Math.max(0, objBudget - K * objChromeH)
        const flatTaskBase = computeFlatTaskOffset(session, topicIdx, objStartWithinTopic)

        let taskCount = tasksInBudget(obj, taskStartWithinObj, taskBudget, activeContentKeys, isBootstrapped, fieldEnabled)
        taskCount = Math.max(1, taskCount)

        const newTaskEnd   = taskStartWithinObj + taskCount
        const allTasksDone = newTaskEnd >= obj.tasks.length
        const isLastObj    = objStartWithinTopic + 1 >= topic.objectives.length
        const isLastTopic  = topicIdx + 1 >= session.topics.length
        const isLastPage   = allTasksDone && isLastObj && isLastTopic
        const flatAbsObj   = flatObjOffset + objStartWithinTopic

        pages.push({
          blockKeys:     [...activeContentKeys],
          topicRange:     { start: topicIdx, end: isLastPage ? undefined : topicIdx + 1 },
          objectiveRange: { start: flatAbsObj, end: flatAbsObj + 1 },
          taskRange:      {
            start: flatTaskBase + taskStartWithinObj,
            end:   allTasksDone ? undefined : flatTaskBase + newTaskEnd,
          },
        })
        hasEmittedFirstPage = true

        if (allTasksDone) {
          objStartWithinTopic++
          taskStartWithinObj = 0
          if (objStartWithinTopic >= topic.objectives.length) {
            topicIdx++
            objStartWithinTopic = 0
          }
        } else {
          taskStartWithinObj = newTaskEnd
        }

      } else if (objStartWithinTopic > 0) {
        const objBudget = available - contentBlockFixedCost - K * topicChromeH

        const objCount = objectivesInBudget(
          topic, objStartWithinTopic, objBudget, activeContentKeys, isBootstrapped, fieldEnabled,
        )

        if (objCount === 0) {
          const obj = topic.objectives[objStartWithinTopic]!
          const hasObjLabel = !isBootstrapped && obj.label !== ""
          const objChromeH  = OBJ_CHROME + (hasObjLabel ? OBJ_LABEL : 0)
          const taskBudget  = Math.max(0, objBudget - K * objChromeH)
          const flatTaskBase = computeFlatTaskOffset(session, topicIdx, objStartWithinTopic)
          const flatAbsObj   = flatObjOffset + objStartWithinTopic

          let taskCount = tasksInBudget(obj, 0, taskBudget, activeContentKeys, isBootstrapped, fieldEnabled)
          taskCount = Math.max(1, taskCount)

          const newTaskEnd   = taskCount
          const allTasksDone = newTaskEnd >= obj.tasks.length
          const isLastObj    = objStartWithinTopic + 1 >= topic.objectives.length
          const isLastTopic  = topicIdx + 1 >= session.topics.length
          const isLastPage   = allTasksDone && isLastObj && isLastTopic

          pages.push({
            blockKeys:     [...activeContentKeys],
            topicRange:     { start: topicIdx, end: isLastPage ? undefined : topicIdx + 1 },
            objectiveRange: { start: flatAbsObj, end: flatAbsObj + 1 },
            taskRange:      { start: flatTaskBase, end: allTasksDone ? undefined : flatTaskBase + newTaskEnd },
          })
          hasEmittedFirstPage = true

          if (allTasksDone) {
            objStartWithinTopic++
            if (objStartWithinTopic >= topic.objectives.length) {
              topicIdx++
              objStartWithinTopic = 0
            }
          } else {
            taskStartWithinObj = newTaskEnd
          }
        } else {
          const newObjEnd  = objStartWithinTopic + objCount
          const allObjsDone = newObjEnd >= topic.objectives.length
          const isLastTopic = topicIdx + 1 >= session.topics.length
          const isLastPage  = allObjsDone && isLastTopic
          const flatStart   = flatObjOffset + objStartWithinTopic
          const flatEnd     = allObjsDone ? undefined : flatObjOffset + newObjEnd

          pages.push({
            blockKeys:     [...activeContentKeys],
            topicRange:     { start: topicIdx, end: isLastPage ? undefined : topicIdx + 1 },
            objectiveRange: { start: flatStart, end: flatEnd },
          })
          hasEmittedFirstPage = true

          if (allObjsDone) {
            topicIdx++
            objStartWithinTopic = 0
          } else {
            objStartWithinTopic = newObjEnd
          }
        }

      } else {
        const budget = hasEmittedFirstPage ? available : firstPageBudget
        const count = topicsInBudget(session, topicIdx, budget, activeContentKeys, fieldEnabled)

        if (count > 0) {
          const sliceEnd = Math.min(topicIdx + count, session.topics.length)
          const isLast   = sliceEnd >= session.topics.length
          pages.push({
            blockKeys: !hasEmittedFirstPage ? [...fixedKeys, flowKey] : [...activeContentKeys],
            topicRange: { start: topicIdx, end: isLast ? undefined : sliceEnd },
          })
          topicIdx = sliceEnd
          hasEmittedFirstPage = true
        } else {
          const rawObjBudget = budget - contentBlockFixedCost - K * topicChromeH
          const objBudget    = Math.max(0, rawObjBudget)

          const objCount = objectivesInBudget(topic, 0, objBudget, activeContentKeys, isBootstrapped, fieldEnabled)

          if (objCount === 0 && !hasEmittedFirstPage) {
            if (fixedKeys.length > 0) {
              pages.push({ blockKeys: fixedKeys })
              hasEmittedFirstPage = true
            }
          } else if (objCount === 0) {
            const obj = topic.objectives[0]!
            const hasObjLabel = !isBootstrapped && obj.label !== ""
            const objChromeH  = OBJ_CHROME + (hasObjLabel ? OBJ_LABEL : 0)
            const taskBudget  = Math.max(0, objBudget - K * objChromeH)
            const flatTaskBase = computeFlatTaskOffset(session, topicIdx, 0)

            let taskCount = tasksInBudget(obj, 0, taskBudget, activeContentKeys, isBootstrapped, fieldEnabled)
            taskCount = Math.max(1, taskCount)

            const newTaskEnd   = taskCount
            const allTasksDone = newTaskEnd >= obj.tasks.length
            const isLastObj    = topic.objectives.length <= 1
            const isLastTopic  = topicIdx + 1 >= session.topics.length
            const isLastPage   = allTasksDone && isLastObj && isLastTopic

            pages.push({
              blockKeys:     !hasEmittedFirstPage ? [...fixedKeys, flowKey] : [...activeContentKeys],
              topicRange:     { start: topicIdx, end: isLastPage ? undefined : topicIdx + 1 },
              objectiveRange: { start: flatObjOffset, end: flatObjOffset + 1 },
              taskRange:      { start: flatTaskBase, end: allTasksDone ? undefined : flatTaskBase + newTaskEnd },
            })
            hasEmittedFirstPage = true

            if (allTasksDone) {
              objStartWithinTopic = 1
              if (objStartWithinTopic >= topic.objectives.length) {
                topicIdx++
                objStartWithinTopic = 0
              }
            } else {
              taskStartWithinObj = newTaskEnd
            }

          } else {
            const allObjsFit   = objCount >= topic.objectives.length
            const isLastTopic  = topicIdx + 1 >= session.topics.length
            pages.push({
              blockKeys: !hasEmittedFirstPage ? [...fixedKeys, flowKey] : [...activeContentKeys],
              topicRange: { start: topicIdx, end: (isLastTopic && allObjsFit) ? undefined : topicIdx + 1 },
              ...(!allObjsFit
                ? { objectiveRange: { start: flatObjOffset, end: flatObjOffset + objCount } }
                : {}),
            })
            hasEmittedFirstPage = true

            if (allObjsFit) {
              topicIdx++
            } else {
              objStartWithinTopic = objCount
            }
          }
        }
      }
    }
  }

  return pages.length > 0 ? pages : [{ blockKeys: bodyKeys }]
}

// ─── Full blockKeys reconstruction ────────────────────────────────────────────

/**
 * Reconstruct the full page.blockKeys (including header/footer) for a given
 * PageAssignment, using the session's template type to determine which
 * peripheral blocks to include.
 */
export function fullPageBlockKeys(
  assignment: PageAssignment,
  session: CourseSession,
): BlockKey[] {
  const templateBlocks = getDefaultBlocksForType(
    (session.templateType ?? "lesson") as TemplateType,
  ) as BlockKey[]
  const hasHeader = templateBlocks.includes("header")
  const hasFooter = templateBlocks.includes("footer")
  return [
    ...(hasHeader ? (["header"] as BlockKey[]) : []),
    ...assignment.blockKeys,
    ...(hasFooter ? (["footer"] as BlockKey[]) : []),
  ]
}
