/**
 * Coursebuilder Create — Normalized Data Model
 *
 * Separation of concerns:
 *   types.ts → data shape (this file)
 *   store/   → runtime state
 *   templates/ → rendering rules
 */

import type { TemplateType } from "@/lib/curriculum/template-blocks"
import type { TemplateFieldState } from "@/components/coursebuilder/sections/template-section-data"

// ─── Re-exports for convenience ──────────────────────────────────────────────
export type { TemplateType, TemplateFieldState }

// ─── Branded ID types ────────────────────────────────────────────────────────
export type CourseId      = string & { readonly __brand: "CourseId" }
export type SessionId     = string & { readonly __brand: "SessionId" }
export type CanvasId      = string & { readonly __brand: "CanvasId" }
export type TopicId       = string & { readonly __brand: "TopicId" }
export type ObjectiveId   = string & { readonly __brand: "ObjectiveId" }
export type TaskId        = string & { readonly __brand: "TaskId" }
export type CardId        = string & { readonly __brand: "CardId" }
export type DroppedCardId = string & { readonly __brand: "DroppedCardId" }

// ─── Card types ───────────────────────────────────────────────────────────────
/**
 * DOM-rendered card types use standard React components.
 * Canvas-backed types (village-3d, rich-sim) get a PixiJS/Three.js renderer.
 */
export type CardRenderMode = "dom" | "canvas"

export type CardType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "table"
  | "rich-sim"    // interactive simulation — canvas-backed
  | "village-3d"  // 3D exploration card — canvas-backed
  | "interactive" // generic interactive — canvas-backed

export const CANVAS_BACKED_CARD_TYPES: ReadonlySet<CardType> = new Set<CardType>([
  "rich-sim",
  "village-3d",
  "interactive",
])

export function cardRenderMode(type: CardType): CardRenderMode {
  return CANVAS_BACKED_CARD_TYPES.has(type) ? "canvas" : "dom"
}

// ─── Task area kinds ─────────────────────────────────────────────────────────
export type TaskAreaKind = "instruction" | "student" | "teacher"

// ─── Dropped card ────────────────────────────────────────────────────────────
export interface DroppedCard {
  id: DroppedCardId
  /** Reference to the source card in the media library / file browser */
  cardId: CardId
  cardType: CardType
  taskId: TaskId
  areaKind: TaskAreaKind
  position: { x: number; y: number }
  dimensions: { width: number; height: number }
  /** Card-type-specific payload */
  content: Record<string, unknown>
  order: number
}

// ─── Task ─────────────────────────────────────────────────────────────────────
export interface Task {
  id: TaskId
  objectiveId: ObjectiveId
  label: string
  order: number
  droppedCards: DroppedCard[]
}

// ─── Objective ────────────────────────────────────────────────────────────────
export interface Objective {
  id: ObjectiveId
  topicId: TopicId
  label: string
  order: number
  tasks: Task[]
}

// ─── Topic ────────────────────────────────────────────────────────────────────
export interface Topic {
  id: TopicId
  /** Topics are owned by a session; the canvas page they appear on is derived */
  sessionId: SessionId
  label: string
  order: number
  objectives: Objective[]
}

// ─── Canvas page ─────────────────────────────────────────────────────────────
/**
 * A canvas page is a fixed-height A4 (or custom) rectangle.
 * `measuredContentHeightPx` is populated by `useTaskHeight` after mount —
 * it drives the overflow/pagination logic, never stored to the DB.
 */
export interface CanvasPage {
  id: CanvasId
  sessionId: SessionId
  pageNumber: number
  /**
   * Which body block keys to render on this canvas page.
   * When set, the TemplateRenderer only mounts these blocks.
   * undefined = render all blocks in template order (non-lesson fallback).
   */
  blockKeys?: BlockKey[]
  /** Ephemeral — set by useTaskHeight, not persisted */
  measuredContentHeightPx?: number
}

// ─── Session ─────────────────────────────────────────────────────────────────
export interface CourseSession {
  id: SessionId
  courseId: CourseId
  order: number
  title: string
  templateType: TemplateType
  canvases: CanvasPage[]
  topics: Topic[]
  durationMinutes?: number
  // ── Course-level metadata — sourced at load time, used by Header/Footer ──
  courseTitle?: string
  institution?: string
  moduleName?: string
  pedagogy?: string
  scheduleDate?: string
  teacherName?: string
  /**
   * Per-field visibility from the applied template (from template setup's fieldEnabled).
   * When present, Header/Footer blocks filter their fields accordingly.
   */
  fieldEnabled?: TemplateFieldState
}

// ─── Page config ─────────────────────────────────────────────────────────────
export interface PageDimensions {
  widthPx: number
  heightPx: number
  margins: { top: number; right: number; bottom: number; left: number }
}

export const DEFAULT_PAGE_DIMENSIONS: PageDimensions = {
  widthPx:  794,
  heightPx: 1123,
  margins:  { top: 96, right: 76, bottom: 96, left: 76 },
}

/** Derived: usable body height after margins are subtracted */
export function bodyHeightPx(dims: PageDimensions): number {
  return dims.heightPx - dims.margins.top - dims.margins.bottom
}

// ─── Block key ───────────────────────────────────────────────────────────────
export type BlockKey =
  | "header"
  | "footer"
  | "program"
  | "resources"
  | "content"
  | "assignment"
  | "scoring"
  | "project"

// ─── Template definition ──────────────────────────────────────────────────────
export interface BlockDefinition {
  key: BlockKey
  required: boolean
  defaultVisible: boolean
  config?: Record<string, unknown>
}

export interface TemplateDefinition {
  type: TemplateType
  label: string
  blocks: BlockDefinition[]
}

// ─── Block render props ───────────────────────────────────────────────────────
export interface BlockRenderProps {
  sessionId: SessionId
  /** Field values sourced from the course/session metadata */
  fieldValues: Record<string, string>
  /** Body data for complex blocks (program table rows, resource rows, topic tree) */
  data?: Record<string, unknown>
  /** Template type — used by Header/Footer to look up the blueprint field list */
  templateType?: TemplateType
  /** Per-field visibility from the applied template — used to filter header/footer fields */
  fieldEnabled?: TemplateFieldState
}

// ─── Draft persistence ────────────────────────────────────────────────────────
/**
 * During editing, the full session state is written as a JSON blob (one row per
 * session in the `course_drafts` table) for speed. On publish the normalized
 * tables are populated.
 */
export interface CourseSessionDraft {
  sessionId: SessionId
  snapshot: CourseSession
  lastSavedAt: string
}
