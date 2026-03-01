"use client"
// Types, context, and utility functions shared across template-blueprint modules.

import React from "react"
import type { BlockId } from "@/components/coursebuilder/sections/templates-section"

export interface TemplateAreaMediaItem {
  id: string
  title: string
  description: string
  mediaType: string
  category: string
  url: string
}

export type TaskAreaKind = "instruction" | "student" | "teacher"

function toAreaKeyToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function hashAreaIdentity(value: string): string {
  let hash = 2166136261
  for (let idx = 0; idx < value.length; idx += 1) {
    hash ^= value.charCodeAt(idx)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function buildStableTaskKey(args: {
  block: "content" | "assignment"
  topic: string
  objective: string
  task: string
}): string {
  const topicToken = toAreaKeyToken(args.topic) || "topic"
  const objectiveToken = toAreaKeyToken(args.objective) || "objective"
  const taskToken = toAreaKeyToken(args.task) || "task"
  const identity = `${args.block}|${topicToken}|${objectiveToken}|${taskToken}`
  return `${topicToken}~${objectiveToken}~${taskToken}~${hashAreaIdentity(identity)}`
}

export function buildTaskAreaKey(
  block: "content" | "assignment",
  stableTaskKey: string,
  area: TaskAreaKind,
): string {
  return `${block}:key:${stableTaskKey}:${area}`
}

export interface TemplateBlueprintData {
  fieldValues?: Partial<Record<BlockId, Record<string, string>>>
  programRows?: Array<Record<string, string>>
  resourceRows?: Array<Record<string, string>>
  contentItems?: {
    topics?: string[]
    objectives?: string[]
    tasks?: string[]
    topicGroups?: Array<{
      topic: string
      objectives: Array<{
        objective: string
        tasks: Array<{
          task: string
          stableTaskKey?: string
          instructionArea: string
          studentArea: string
          teacherArea: string
        }>
      }>
    }>
  }
  assignmentItems?: {
    tasks?: string[]
    topicGroups?: Array<{
      topic: string
      objectives: Array<{
        objective: string
        tasks: Array<{
          task: string
          stableTaskKey?: string
          instructionArea: string
          studentArea: string
          teacherArea: string
        }>
      }>
    }>
  }
  resourceItems?: string[]
  scoringItems?: string[]
  continuation?: Partial<Record<BlockId, boolean>>
}

export const SCALE_CONFIG = {
  sm: {
    containerPadding: "p-2",
    headerPadding: "px-3 py-2",
    headerFontSize: "text-xs",
    blockPadding: "p-2",
    blockTitleSize: "text-[9px]",
    fieldSize: "text-[8px]",
    blockGap: "gap-1",
    headerFieldGap: "gap-1",
    headerFieldPadding: "px-1 py-0.5",
  },
  md: {
    containerPadding: "p-3",
    headerPadding: "px-4 py-3",
    headerFontSize: "text-sm",
    blockPadding: "p-3",
    blockTitleSize: "text-[10px]",
    fieldSize: "text-xs",
    blockGap: "gap-2",
    headerFieldGap: "gap-1.5",
    headerFieldPadding: "px-1.5 py-0.5",
  },
  lg: {
    containerPadding: "p-4",
    headerPadding: "px-5 py-4",
    headerFontSize: "text-base",
    blockPadding: "p-4",
    blockTitleSize: "text-[11px]",
    fieldSize: "text-sm",
    blockGap: "gap-3",
    headerFieldGap: "gap-2",
    headerFieldPadding: "px-2 py-1",
  },
}

// ─── Template render context ──────────────────────────────────────────────
// Shared payload created by TemplateBlueprint and consumed by JsonTemplatePreview and
// BlueprintBodySlot without threading props through every intermediate layer.

export interface TemplateBlueprintContextValue {
  enabled: Record<BlockId, boolean>
  data?: TemplateBlueprintData
  droppedMediaByArea?: Record<string, TemplateAreaMediaItem[]>
  mediaDragActive: boolean
  onRemoveAreaMedia?: (areaKey: string, mediaId: string) => void
  orderedTaskAreas: TaskAreaKind[]
  densityAreaHeightClass: string
}

export const TemplateBlueprintContext = React.createContext<TemplateBlueprintContextValue | null>(null)

export function useTemplateBlueprintContext(): TemplateBlueprintContextValue {
  const ctx = React.useContext(TemplateBlueprintContext)
  if (!ctx) throw new Error("useTemplateBlueprintContext must be used inside TemplateBlueprint")
  return ctx
}

