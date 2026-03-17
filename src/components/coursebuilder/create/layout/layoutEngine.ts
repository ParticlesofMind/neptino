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

import type { BlockKey, CourseSession, PageDimensions } from "../types"
import { getDefaultBlocksForType, type TemplateType } from "@/lib/curriculum/template-blocks"
import {
  CONTENT_TYPE,
  CONTENT_BLOCK_FIXED,
  OBJ_CHROME,
  OBJ_LABEL,
  TOPIC_CHROME,
  TOPIC_LABEL,
  computeAvailableBodyHeight,
  computeFixedPlacement,
  computeFlatCardOffset,
  computeFlatTaskOffset,
  isBootstrappedTopic,
  objectivesInBudget,
  tasksInBudget,
  topicsInBudget,
} from "./layout-engine-helpers"
import type { PageAssignment } from "./layout-engine-types"

export type { PageAssignment } from "./layout-engine-types"

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
  const available = computeAvailableBodyHeight(dims)

  const templateBlocks = getDefaultBlocksForType(
    (session.templateType ?? "lesson") as TemplateType,
  ) as BlockKey[]

  const bodyKeys = templateBlocks.filter((k) => k !== "header" && k !== "footer")
  if (bodyKeys.length === 0) return [{ blockKeys: [] }]

  const fixedKeys   = bodyKeys.filter((k) => !CONTENT_TYPE.has(k))
  const contentKeys = bodyKeys.filter((k) => CONTENT_TYPE.has(k))

  const fixedPlacement = computeFixedPlacement(session, available, fixedKeys)

  // No content blocks: return fixed-block placement only.
  if (contentKeys.length === 0 || session.topics.length === 0) {
    if (fixedPlacement.preludePages.length > 0) return fixedPlacement.preludePages
    return [{ blockKeys: bodyKeys }]
  }

  // ── Distribute topics across pages by block flow ───────────────────────────
  // Content-type blocks are independent container flows. We paginate one block
  // at a time in template order (e.g. content then assignment), so containers
  // do not ping-pong on continuation pages.

  const pages: PageAssignment[] = [...fixedPlacement.preludePages]
  let hasEmittedFirstPage = fixedPlacement.preludePages.length > 0
  const firstPageFixedKeys = fixedPlacement.firstPageFixedKeys
  const firstPageBudget = fixedPlacement.firstPageBudget

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
        const flatCardStart = computeFlatCardOffset(session, topicIdx, objStartWithinTopic, taskStartWithinObj)
        const flatCardEnd = allTasksDone
          ? undefined
          : computeFlatCardOffset(session, topicIdx, objStartWithinTopic, newTaskEnd)

        pages.push({
          blockKeys:     [...activeContentKeys],
          topicRange:     { start: topicIdx, end: isLastPage ? undefined : topicIdx + 1 },
          objectiveRange: { start: flatAbsObj, end: flatAbsObj + 1 },
          taskRange:      {
            start: flatTaskBase + taskStartWithinObj,
            end:   allTasksDone ? undefined : flatTaskBase + newTaskEnd,
          },
          cardRange: {
            start: flatCardStart,
            ...(flatCardEnd !== undefined ? { end: flatCardEnd } : {}),
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
          const flatCardStart = computeFlatCardOffset(session, topicIdx, objStartWithinTopic, 0)
          const flatCardEnd = allTasksDone
            ? undefined
            : computeFlatCardOffset(session, topicIdx, objStartWithinTopic, newTaskEnd)

          pages.push({
            blockKeys:     [...activeContentKeys],
            topicRange:     { start: topicIdx, end: isLastPage ? undefined : topicIdx + 1 },
            objectiveRange: { start: flatAbsObj, end: flatAbsObj + 1 },
            taskRange:      { start: flatTaskBase, end: allTasksDone ? undefined : flatTaskBase + newTaskEnd },
            cardRange: {
              start: flatCardStart,
              ...(flatCardEnd !== undefined ? { end: flatCardEnd } : {}),
            },
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
            blockKeys: !hasEmittedFirstPage ? [...firstPageFixedKeys, flowKey] : [...activeContentKeys],
            topicRange: { start: topicIdx, end: isLast ? undefined : sliceEnd },
          })
          topicIdx = sliceEnd
          hasEmittedFirstPage = true
        } else {
          const rawObjBudget = budget - contentBlockFixedCost - K * topicChromeH
          const objBudget    = Math.max(0, rawObjBudget)

          const objCount = objectivesInBudget(topic, 0, objBudget, activeContentKeys, isBootstrapped, fieldEnabled)

          if (objCount === 0 && !hasEmittedFirstPage) {
            if (firstPageFixedKeys.length > 0) {
              pages.push({ blockKeys: firstPageFixedKeys })
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
            const flatCardStart = computeFlatCardOffset(session, topicIdx, 0, 0)
            const flatCardEnd = allTasksDone
              ? undefined
              : computeFlatCardOffset(session, topicIdx, 0, newTaskEnd)

            pages.push({
              blockKeys:     !hasEmittedFirstPage ? [...firstPageFixedKeys, flowKey] : [...activeContentKeys],
              topicRange:     { start: topicIdx, end: isLastPage ? undefined : topicIdx + 1 },
              objectiveRange: { start: flatObjOffset, end: flatObjOffset + 1 },
              taskRange:      { start: flatTaskBase, end: allTasksDone ? undefined : flatTaskBase + newTaskEnd },
              cardRange: {
                start: flatCardStart,
                ...(flatCardEnd !== undefined ? { end: flatCardEnd } : {}),
              },
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
              blockKeys: !hasEmittedFirstPage ? [...firstPageFixedKeys, flowKey] : [...activeContentKeys],
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
