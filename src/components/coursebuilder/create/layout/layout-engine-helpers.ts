import type { BlockKey, CourseSession, PageDimensions, TaskAreaKind, Topic } from "../types"
import { bodyHeightPx } from "../types"
import { resolveTemplatePartitions } from "@/lib/curriculum/template-partitions"
import {
  BLOCK_GAP,
  BLOCK_RENDERER_VERT,
  CONTENT_BLOCK_FIXED,
  OBJ_CHROME,
  OBJ_LABEL,
  SPACE_Y_1_5,
  TOPIC_CHROME,
  TOPIC_LABEL,
  TOPIC_SPACING,
  TABLE_ROW_HEIGHT,
  estimateBlockRowHeights,
  estimateProgramHeight,
  estimateResourcesHeight,
  estimateTableBlockBaseHeight,
  estimateTaskTableRowCount,
  estimateDroppedCardHeight,
  estimateTopicHeight,
  isBootstrappedTopic,
  singleObjHeight,
  singleTaskHeight,
} from "./blockHeightModel"
import type { PageAssignment } from "./layout-engine-types"

const TASK_ROW_SPLIT_FIXED_KEYS: ReadonlySet<BlockKey> = new Set(["program", "resources"])

export const CONTENT_TYPE: ReadonlySet<BlockKey> = new Set(["content", "assignment", "scoring"])

export function visibleAreas(
  blockKey: BlockKey,
  fieldEnabled?: Partial<Record<string, Record<string, unknown>>>,
): TaskAreaKind[] {
  return resolveTemplatePartitions(fieldEnabled?.[blockKey], blockKey).map((partition) => partition.id)
}

function cardsByArea<T extends { areaKind: TaskAreaKind }>(
  cards: T[],
  areas: TaskAreaKind[],
): Partial<Record<TaskAreaKind, T[]>> {
  return Object.fromEntries(
    areas.map((area) => [area, cards.filter((card) => card.areaKind === area)]),
  ) as Partial<Record<TaskAreaKind, T[]>>
}

export function estimateFixedBlockHeight(key: BlockKey, session: CourseSession): number {
  if (key === "program") return estimateProgramHeight(session.topics)
  if (key === "resources") return estimateResourcesHeight(session.topics)
  if (key === "project") return 180
  return 120
}

export interface FixedPlacementResult {
  preludePages: PageAssignment[]
  firstPageFixedKeys: BlockKey[]
  firstPageBudget: number
}

export function computeAvailableBodyHeight(dims: PageDimensions): number {
  return bodyHeightPx(dims) - BLOCK_RENDERER_VERT
}

export function computeFixedPlacement(
  session: CourseSession,
  available: number,
  fixedKeys: BlockKey[],
): FixedPlacementResult {
  if (fixedKeys.length === 0) {
    return { preludePages: [], firstPageFixedKeys: [], firstPageBudget: available }
  }

  const rowSplitFixedKeys = fixedKeys.filter((key) => TASK_ROW_SPLIT_FIXED_KEYS.has(key))
  const rowSplitKeySet = new Set(rowSplitFixedKeys)
  const rowHeightsByBlock = new Map<BlockKey, number[]>(
    rowSplitFixedKeys.map((key) => [
      key,
      key === "program" || key === "resources"
        ? estimateBlockRowHeights(key, session.topics)
        : Array.from({ length: estimateTaskTableRowCount(session.topics) }, () => TABLE_ROW_HEIGHT),
    ]),
  )
  const taskRowCount = Math.max(
    estimateTaskTableRowCount(session.topics),
    ...Array.from(rowHeightsByBlock.values()).map((rows) => rows.length),
  )
  const rowBlocksPerPage = rowSplitFixedKeys.length

  const rowCostAt = (rowIndex: number): number =>
    rowSplitFixedKeys.reduce((sum, key) => {
      const rowHeights = rowHeightsByBlock.get(key)
      return sum + (rowHeights?.[rowIndex] ?? TABLE_ROW_HEIGHT)
    }, 0)

  const pageCostForRows = (startRow: number, endRow: number, includeNonRowFixed: boolean): number => {
    const keysOnPage = fixedKeys.filter((key) => includeNonRowFixed || rowSplitKeySet.has(key))
    let cost = 0

    for (let index = 0; index < keysOnPage.length; index++) {
      const key = keysOnPage[index]!
      if (rowSplitKeySet.has(key)) {
        const rowHeights = rowHeightsByBlock.get(key)
        const rowsCost = Array.from(
          { length: Math.max(0, endRow - startRow) },
          (_, offset) => rowHeights?.[startRow + offset] ?? TABLE_ROW_HEIGHT,
        ).reduce((sum, height) => sum + height, 0)
        cost += estimateTableBlockBaseHeight() + rowsCost
      } else {
        cost += estimateFixedBlockHeight(key, session)
      }
      if (index < keysOnPage.length - 1) cost += BLOCK_GAP
    }

    return cost
  }

  const accurateFullFixedCost = fixedKeys.reduce((sum, key, index) => {
    return sum + estimateFixedBlockHeight(key, session) + (index < fixedKeys.length - 1 ? BLOCK_GAP : 0)
  }, 0)
  const gapAfterFixed = fixedKeys.length > 0 ? BLOCK_GAP : 0
  const firstPageBudget = available - accurateFullFixedCost - gapAfterFixed

  if (rowBlocksPerPage === 0 || accurateFullFixedCost <= available) {
    return { preludePages: [], firstPageFixedKeys: fixedKeys, firstPageBudget }
  }

  const preludePages: PageAssignment[] = []
  let taskStart = 0

  while (taskStart < taskRowCount) {
    const includeNonRowFixed = taskStart === 0
    const keysOnPage = includeNonRowFixed ? fixedKeys : rowSplitFixedKeys
    const overhead = pageCostForRows(taskStart, taskStart, includeNonRowFixed)
    let rowsOnPage = 0
    let used = overhead

    while (taskStart + rowsOnPage < taskRowCount) {
      const nextCost = rowCostAt(taskStart + rowsOnPage)
      if (rowsOnPage > 0 && used + nextCost > available) break
      used += nextCost
      rowsOnPage += 1
      if (used > available) break
    }

    rowsOnPage = Math.max(1, Math.min(taskRowCount - taskStart, rowsOnPage))
    const taskEnd = taskStart + rowsOnPage

    preludePages.push({
      blockKeys: [...keysOnPage],
      taskRange: { start: taskStart, end: taskEnd >= taskRowCount ? undefined : taskEnd },
    })

    taskStart = taskEnd
  }

  return { preludePages, firstPageFixedKeys: [], firstPageBudget: available }
}

export function topicsInBudget(
  session: CourseSession,
  startIdx: number,
  budget: number,
  contentBlocks: BlockKey[],
  fieldEnabled: Partial<Record<string, Record<string, unknown>>> | undefined,
): number {
  const blockCount = contentBlocks.length
  if (blockCount === 0) return 0

  const baseCost = blockCount * CONTENT_BLOCK_FIXED + Math.max(0, blockCount - 1) * BLOCK_GAP
  let remaining = budget - baseCost
  if (remaining <= 0) return 0

  const visibleAreasPerBlock = contentBlocks.map((blockKey) => visibleAreas(blockKey, fieldEnabled))
  let count = 0

  for (let index = startIdx; index < session.topics.length; index++) {
    const topic = session.topics[index]!
    const bootstrapped = isBootstrappedTopic(topic)
    const topicCost = visibleAreasPerBlock.reduce((sum, blockAreas, blockIndex) => {
      const height = estimateTopicHeight(topic, bootstrapped, blockAreas.length, contentBlocks[blockIndex], blockAreas)
      return sum + height + (count > 0 ? TOPIC_SPACING : 0)
    }, 0)

    if (remaining < topicCost) break

    remaining -= topicCost
    count++
  }

  return count
}

export function objectivesInBudget(
  topic: Topic,
  startObjIdx: number,
  budget: number,
  contentBlocks: BlockKey[],
  isBootstrapped: boolean,
  fieldEnabled: Partial<Record<string, Record<string, unknown>>> | undefined,
): number {
  const visibleAreasPerBlock = contentBlocks.map((blockKey) => visibleAreas(blockKey, fieldEnabled))
  let remaining = budget
  let count = 0

  for (let index = startObjIdx; index < topic.objectives.length; index++) {
    const objective = topic.objectives[index]!
    const objectiveCost = visibleAreasPerBlock.reduce((sum, blockAreas, blockIndex) => {
      return sum + singleObjHeight(objective, isBootstrapped, blockAreas.length, contentBlocks[blockIndex], blockAreas) + (count > 0 ? SPACE_Y_1_5 : 0)
    }, 0)

    if (remaining < objectiveCost) break

    remaining -= objectiveCost
    count++
  }

  return count
}

export function tasksInBudget(
  objective: Topic["objectives"][number],
  startTaskIdx: number,
  budget: number,
  contentBlocks: BlockKey[],
  isBootstrapped: boolean,
  fieldEnabled: Partial<Record<string, Record<string, unknown>>> | undefined,
): number {
  const visibleAreasPerBlock = contentBlocks.map((blockKey) => visibleAreas(blockKey, fieldEnabled))
  let remaining = budget
  let count = 0

  for (let index = startTaskIdx; index < objective.tasks.length; index++) {
    const task = objective.tasks[index]!
    const hasLabel = !isBootstrapped && task.label !== ""
    const taskCost = visibleAreasPerBlock.reduce((sum, blockAreas, blockIndex) => {
      const cardsForBlock = task.droppedCards.filter((card) => {
        const blockMatch = !card.blockKey || card.blockKey === contentBlocks[blockIndex]
        const areaMatch = blockAreas.includes(card.areaKind)
        return blockMatch && areaMatch
      })
      const cardsPerArea = cardsByArea(cardsForBlock, blockAreas)
      return sum + singleTaskHeight(hasLabel, blockAreas.length, cardsPerArea, blockAreas) + (count > 0 ? SPACE_Y_1_5 : 0)
    }, 0)

    if (remaining < taskCost) break

    remaining -= taskCost
    count++
  }

  return count
}

export function topLevelCardsInTaskBudget(
  task: Topic["objectives"][number]["tasks"][number],
  startCardIdx: number,
  budget: number,
  blockKey: BlockKey,
  visibleTaskAreas: TaskAreaKind[],
  hasLabel: boolean,
): number {
  const cards = task.droppedCards
    .filter((card) => {
      const blockMatch = !card.blockKey || card.blockKey === blockKey
      const areaMatch = visibleTaskAreas.includes(card.areaKind)
      return blockMatch && areaMatch
    })
    .sort((left, right) => left.order - right.order)

  if (startCardIdx >= cards.length) return 0

  let count = 0
  for (let end = startCardIdx + 1; end <= cards.length; end++) {
    const visibleCards = cards.slice(startCardIdx, end)
    const cardsPerArea = cardsByArea(visibleCards, visibleTaskAreas)
    const estimated = singleTaskHeight(hasLabel, visibleTaskAreas.length, cardsPerArea, visibleTaskAreas)
    if (estimated > budget) break
    count = visibleCards.length
  }

  if (count > 0) return count

  const firstCard = cards[startCardIdx]
  if (!firstCard) return 0
  const firstCardHeight = estimateDroppedCardHeight(firstCard)
  return firstCardHeight > 0 ? 1 : 0
}

function buildFlatCardIndex(session: CourseSession): Map<string, number> {
  const flattened = session.topics
    .flatMap((topic) => topic.objectives)
    .flatMap((objective) => objective.tasks)
    .flatMap((task) => [...task.droppedCards].sort((left, right) => left.order - right.order))

  return new Map(flattened.map((card, index) => [String(card.id), index]))
}

function isIndexInRange(index: number, start: number, end?: number): boolean {
  return index >= start && (end === undefined || index < end)
}

function estimateContentAssignmentBlockHeight(
  session: CourseSession,
  assignment: PageAssignment,
  blockKey: BlockKey,
  fieldEnabled: Partial<Record<string, Record<string, unknown>>> | undefined,
): number {
  const blockAreas = visibleAreas(blockKey, fieldEnabled)
  const topicStart = assignment.topicRange?.start ?? 0
  const topicEnd = assignment.topicRange?.end ?? session.topics.length
  const objectiveStart = assignment.objectiveRange?.start ?? 0
  const objectiveEnd = assignment.objectiveRange?.end
  const taskStart = assignment.taskRange?.start ?? 0
  const taskEnd = assignment.taskRange?.end
  const cardStart = assignment.cardRange?.start ?? 0
  const cardEnd = assignment.cardRange?.end
  const flatCardIndex = buildFlatCardIndex(session)

  let flatObjectiveIndex = 0
  let flatTaskIndex = 0
  let renderedTopicCount = 0
  let topicsHeight = 0

  for (let topicIndex = 0; topicIndex < session.topics.length; topicIndex += 1) {
    const topic = session.topics[topicIndex]
    if (!topic) continue

    const topicObjectiveStart = flatObjectiveIndex
    const topicTaskStart = flatTaskIndex

    flatObjectiveIndex += topic.objectives.length
    flatTaskIndex += topic.objectives.reduce((sum, objective) => sum + objective.tasks.length, 0)

    if (topicIndex < topicStart || topicIndex >= topicEnd) continue

    const isBootstrapped = isBootstrappedTopic(topic)
    let renderedObjectiveCount = 0
    let objectivesHeight = 0
    let objectiveCursor = topicObjectiveStart
    let taskCursor = topicTaskStart

    for (const objective of topic.objectives) {
      const currentObjectiveIndex = objectiveCursor
      objectiveCursor += 1

      const objectiveTaskStart = taskCursor
      taskCursor += objective.tasks.length

      if (!isIndexInRange(currentObjectiveIndex, objectiveStart, objectiveEnd)) continue

      let renderedTaskCount = 0
      let tasksHeight = 0

      for (let taskIndex = 0; taskIndex < objective.tasks.length; taskIndex += 1) {
        const task = objective.tasks[taskIndex]
        if (!task) continue
        const currentTaskIndex = objectiveTaskStart + taskIndex
        if (!isIndexInRange(currentTaskIndex, taskStart, taskEnd)) continue

        const cardsForBlock = task.droppedCards.filter((card) => {
          const globalCardIndex = flatCardIndex.get(String(card.id))
          const blockMatch = !card.blockKey || card.blockKey === blockKey
          const areaMatch = blockAreas.includes(card.areaKind)
          const cardMatch = globalCardIndex !== undefined && isIndexInRange(globalCardIndex, cardStart, cardEnd)
          return blockMatch && areaMatch && cardMatch
        })

        const cardsPerArea = cardsByArea(cardsForBlock, blockAreas)
        const hasTaskLabel = !isBootstrapped && task.label !== ""
        tasksHeight += (renderedTaskCount > 0 ? SPACE_Y_1_5 : 0)
          + singleTaskHeight(hasTaskLabel, blockAreas.length, cardsPerArea, blockAreas)
        renderedTaskCount += 1
      }

      if (renderedTaskCount <= 0) continue

      const hasObjectiveLabel = !isBootstrapped && objective.label !== ""
      objectivesHeight += (renderedObjectiveCount > 0 ? SPACE_Y_1_5 : 0)
        + (hasObjectiveLabel ? OBJ_CHROME + OBJ_LABEL : 0)
        + tasksHeight
      renderedObjectiveCount += 1
    }

    if (renderedObjectiveCount <= 0) continue

    topicsHeight += (renderedTopicCount > 0 ? TOPIC_SPACING : 0)
      + TOPIC_CHROME
      + (isBootstrapped ? 0 : TOPIC_LABEL)
      + objectivesHeight
    renderedTopicCount += 1
  }

  return CONTENT_BLOCK_FIXED + topicsHeight
}

export function estimatePageAssignmentHeight(
  session: CourseSession,
  assignment: PageAssignment,
  fieldEnabled?: Partial<Record<string, Record<string, unknown>>>,
): number {
  return assignment.blockKeys.reduce((height, blockKey, index) => {
    const blockHeight = CONTENT_TYPE.has(blockKey)
      ? estimateContentAssignmentBlockHeight(session, assignment, blockKey, fieldEnabled)
      : estimateFixedBlockHeight(blockKey, session)

    return height + blockHeight + (index > 0 ? BLOCK_GAP : 0)
  }, 0)
}

export function computeFlatTaskOffset(session: CourseSession, topicIdx: number, objIdx: number): number {
  let offset = 0
  for (let topicIndex = 0; topicIndex < topicIdx; topicIndex++) {
    for (const objective of session.topics[topicIndex]!.objectives) {
      offset += objective.tasks.length
    }
  }
  for (let objectiveIndex = 0; objectiveIndex < objIdx; objectiveIndex++) {
    offset += session.topics[topicIdx]!.objectives[objectiveIndex]!.tasks.length
  }
  return offset
}

export function computeFlatCardOffset(session: CourseSession, topicIdx: number, objIdx: number, taskIdx: number): number {
  let offset = 0
  for (let topicIndex = 0; topicIndex < topicIdx; topicIndex++) {
    for (const objective of session.topics[topicIndex]!.objectives) {
      for (const task of objective.tasks) offset += task.droppedCards.length
    }
  }
  for (let objectiveIndex = 0; objectiveIndex < objIdx; objectiveIndex++) {
    for (const task of session.topics[topicIdx]!.objectives[objectiveIndex]!.tasks) {
      offset += task.droppedCards.length
    }
  }
  for (let taskIndex = 0; taskIndex < taskIdx; taskIndex++) {
    offset += session.topics[topicIdx]!.objectives[objIdx]!.tasks[taskIndex]!.droppedCards.length
  }
  return offset
}

export function computeScopedFlatCardRange(
  session: CourseSession,
  topicIdx: number,
  objIdx: number,
  taskIdx: number,
  scopedStartIdx: number,
  scopedEndIdx: number,
  blockKey: BlockKey,
  visibleTaskAreas: TaskAreaKind[],
): { start: number; end: number } | null {
  const task = session.topics[topicIdx]?.objectives[objIdx]?.tasks[taskIdx]
  if (!task) return null

  const sortedCards = [...task.droppedCards].sort((left, right) => left.order - right.order)
  const scopedCards = sortedCards.filter((card) => {
    const blockMatch = !card.blockKey || card.blockKey === blockKey
    const areaMatch = visibleTaskAreas.includes(card.areaKind)
    return blockMatch && areaMatch
  })

  const firstCard = scopedCards[scopedStartIdx]
  const lastIncludedCard = scopedCards[Math.max(scopedStartIdx, scopedEndIdx - 1)]
  if (!firstCard || !lastIncludedCard) return null

  const startInTask = sortedCards.findIndex((card) => card.id === firstCard.id)
  const endInTask = sortedCards.findIndex((card) => card.id === lastIncludedCard.id) + 1
  if (startInTask < 0 || endInTask <= startInTask) return null

  const flatCardBase = computeFlatCardOffset(session, topicIdx, objIdx, taskIdx)
  return {
    start: flatCardBase + startInTask,
    end: flatCardBase + endInTask,
  }
}

export {
  BLOCK_GAP,
  CONTENT_BLOCK_FIXED,
  OBJ_CHROME,
  OBJ_LABEL,
  TOPIC_CHROME,
  TOPIC_LABEL,
  estimateDroppedCardHeight,
  isBootstrappedTopic,
}
