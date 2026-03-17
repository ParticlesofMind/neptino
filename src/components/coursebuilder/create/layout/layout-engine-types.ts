import type { BlockKey } from "../types"

export interface PageAssignment {
  blockKeys: BlockKey[]
  topicRange?: { start: number; end?: number }
  objectiveRange?: { start: number; end?: number }
  taskRange?: { start: number; end?: number }
  cardRange?: { start: number; end?: number }
}