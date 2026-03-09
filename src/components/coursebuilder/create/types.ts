/**
 * Coursebuilder Create — Normalized Data Model
 *
 * Separation of concerns:
 *   types.ts → data shape (this file)
 *   store/   → runtime state
 */

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
export type CardType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "animation"
  | "dataset"
  | "model-3d"
  | "map"
  | "chart"
  | "diagram"
  | "media"
  | "document"
  | "table"
  | "rich-sim"    // interactive simulation — canvas-backed
  | "village-3d"  // 3D exploration card — canvas-backed
  | "interactive" // quiz / interactive — canvas-backed
  | "games"       // game-based learning card
  | "chat"        // AI-powered student chat card
  | "text-editor" // embedded writing workspace product
  | "code-editor" // embedded code workspace product
  | "whiteboard"  // embedded whiteboard product
  | "timeline"    // chronological event timeline
  | "legend"      // color-coded map/chart legend
  | "layout-split"      // two equal columns
  | "layout-stack"      // two rows (60% top / 40% bottom)
  | "layout-feature"    // narrow-left anchor + large-right upper + thin-right lower
  | "layout-sidebar"    // asymmetric 30/70 columns
  | "layout-quad"       // 2×2 equal grid
  | "layout-mosaic"     // 3×3 equal grid
  | "layout-triptych"   // 3 equal columns
  | "layout-trirow"     // 3 full-width horizontal bands (header / body / footer)
  | "layout-banner"     // spanning header strip + 2 equal columns below
  | "layout-broadside"  // spanning header strip + 3 equal columns below
  | "layout-tower"      // wide-left spanning column + 3 stacked right cells
  | "layout-pinboard"   // spanning header strip + 2×2 grid below
  | "layout-annotated"  // narrow-left annotation column + 2×2 content grid
  | "layout-sixgrid"    // 3 columns × 2 rows (storyboard / six-panel)

// ─── Task area kinds ─────────────────────────────────────────────────────────
export type TaskAreaKind = "instruction" | "practice" | "feedback"

// ─── Dropped card ────────────────────────────────────────────────────────────
export interface DroppedCard {
  id: DroppedCardId
  /** Reference to the source card in the media library / file browser */
  cardId: CardId
  cardType: CardType
  taskId: TaskId
  areaKind: TaskAreaKind
  /** Which block this card was dropped into — scopes rendering to the originating block */
  blockKey?: BlockKey
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
   * When set, the BlockRenderer only mounts these blocks.
   * undefined = render all blocks.
   */
  blockKeys?: BlockKey[]
  /**
   * Slice of the session's flat topic list to render inside the ContentBlock
   * on this page.  Both bounds are absolute topic indices (0-based, inclusive
   * start, exclusive end).
   * undefined → render all topics (page not yet split).
   */
  contentTopicRange?: { start: number; end?: number }
  /**
   * Objective-level split within the topics shown on this page.
   * Both bounds are session-global flat objective indices (0-based, inclusive
   * start, exclusive end) spanning all objectives across all topics in order.
   * undefined → render all objectives for the visible topic slice.
   * Used as a fallback when a single large topic cannot be split at topic boundaries.
   */
  contentObjectiveRange?: { start: number; end?: number }
  /**
   * Task-level split within the objective shown on this page.
   * Both bounds are session-global flat task indices (0-based, inclusive
   * start, exclusive end) spanning all tasks across all objectives in order.
   * undefined → render all tasks for the visible objective slice.
   * Used as a fallback when a single large objective cannot be split at
   * objective boundaries.
   */
  contentTaskRange?: { start: number; end?: number }
  /**
   * Card-level split for template-free canvases.
   * Bounds are absolute card indices (0-based, inclusive start, exclusive end)
   * across the session's flattened dropped-card list sorted by `order`.
   */
  contentCardRange?: { start: number; end?: number }
  /** Ephemeral — set by useCanvasOverflow, not persisted */
  measuredContentHeightPx?: number
}

// ─── Session ─────────────────────────────────────────────────────────────────
export interface CourseSession {
  id: SessionId
  courseId: CourseId
  order: number
  title: string
  canvases: CanvasPage[]
  topics: Topic[]
  durationMinutes?: number
  /**
   * The template type selected for this session (e.g. "lesson", "quiz", "exam").
   * Drives which blocks the canvas renders via `blockKeys` on each CanvasPage.
   */
  templateType?: string
  /**
   * Per-block field visibility flags sourced from the active template's fieldState.
   * Shape: { [blockKey]: { [fieldKey]: boolean } }
   * Forwarded to BlockRenderer and individual block components to
   * show/hide optional columns and task-area zones.
   */
  fieldEnabled?: Partial<Record<string, Record<string, boolean>>>
  // ── Course-level metadata — sourced at load time, used by Header/Footer ──
  courseTitle?: string
  institution?: string
  moduleName?: string
  pedagogy?: string
  scheduleDate?: string
  teacherName?: string
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

// ─── Block render props ───────────────────────────────────────────────────────
export interface BlockRenderProps {
  sessionId: SessionId
  /** The canvas page this block is being rendered on — used by ContentBlock for topic-range slicing */
  canvasId?: CanvasId
  /** The block key for this rendered block — forwarded to drop zones so useCardDrop can validate accepts */
  blockKey?: BlockKey
  /** Field values sourced from the course/session metadata */
  fieldValues: Record<string, string>
  /** Body data for complex blocks (program table rows, resource rows, topic tree) */
  data?: Record<string, unknown>
  /**
   * Per-block field visibility flags sourced from the active template's fieldState.
   * Shape: { [blockKey]: { [fieldKey]: boolean } }
   * Blocks use this to show/hide optional columns or task-area zones.
   * When absent, blocks default all fields to visible.
   */
  fieldEnabled?: Partial<Record<string, Record<string, boolean>>>
}

// ─── Draft persistence ────────────────────────────────────────────────────────
/**
 * During editing, the full session state is written as a JSON blob (one row per
 * session in the `lessons` table via `useCanvasPersistence`). On publish the
 * normalized tables are populated.
 */
export interface CourseSessionDraft {
  sessionId: SessionId
  snapshot: CourseSession
  lastSavedAt: string
}
