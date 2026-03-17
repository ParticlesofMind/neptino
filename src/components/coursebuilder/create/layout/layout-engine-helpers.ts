import type { BlockKey, CourseSession, PageDimensions, TaskAreaKind, Topic } from "../types"
import { bodyHeightPx } from "../types"
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
  estimateProgramHeight,
  estimateResourcesHeight,
  estimateTableBlockBaseHeight,
  estimateTaskTableRowCount,
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
  fieldEnabled?: Partial<Record<string, Record<string, boolean>>>,
): TaskAreaKind[] {
  const fe = fieldEnabled?.[blockKey]
  const instruction = fe ? (fe.instruction ?? true) : true
  const practice = fe ? (fe.practice ?? true) : true
  const feedback = fe ? (fe.feedback ?? true) : true

  return [
    ...(instruction ? (["instruction"] as TaskAreaKind[]) : []),
    ...(practice ? (["practice"] as TaskAreaKind[]) : []),
    ...(feedback ? (["feedback"] as TaskAreaKind[]) : []),
  ]
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
  const taskRowCount = estimateTaskTableRowCount(session.topics)
  const rowBlocksPerPage = rowSplitFixedKeys.length
  const rowHeightPerPage = rowBlocksPerPage * TABLE_ROW_HEIGHT

  const pageCostForRows = (rows: number, includeNonRowFixed: boolean): number => {
    const keysOnPage = fixedKeys.filter((key) => includeNonRowFixed || rowSplitKeySet.has(key))
    let cost = 0

    for (let index = 0; index < keysOnPage.length; index++) {
      const key = keysOnPage[index]!
      cost += rowSplitKeySet.has(key)
        ? estimateTableBlockBaseHeight() + rows * TABLE_ROW_HEIGHT
        : estimateFixedBlockHeight(key, session)
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
    const overhead = pageCostForRows(0, includeNonRowFixed)
    const maxRowsBySpace = rowHeightPerPage > 0 ? Math.floor((available - overhead) / rowHeightPerPage) : 0
    const rowsOnPage = Math.max(1, Math.min(taskRowCount - taskStart, maxRowsBySpace))
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
  fieldEnabled: Partial<Record<string, Record<string, boolean>>> | undefined,
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
  fieldEnabled: Partial<Record<string, Record<string, boolean>>> | undefined,
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
  fieldEnabled: Partial<Record<string, Record<string, boolean>>> | undefined,
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
      const cardsPerArea: Partial<Record<TaskAreaKind, typeof cardsForBlock>> = {
        instruction: cardsForBlock.filter((card) => card.areaKind === "instruction"),
        practice: cardsForBlock.filter((card) => card.areaKind === "practice"),
        feedback: cardsForBlock.filter((card) => card.areaKind === "feedback"),
      }
      return sum + singleTaskHeight(hasLabel, blockAreas.length, cardsPerArea, blockAreas) + (count > 0 ? SPACE_Y_1_5 : 0)
    }, 0)

    if (remaining < taskCost) break

    remaining -= taskCost
    count++
  }

  return count
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

export {
  BLOCK_GAP,
  CONTENT_BLOCK_FIXED,
  OBJ_CHROME,
  OBJ_LABEL,
  TOPIC_CHROME,
  TOPIC_LABEL,
  isBootstrappedTopic,
}