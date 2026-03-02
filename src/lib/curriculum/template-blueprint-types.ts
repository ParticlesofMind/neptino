/**
 * Template Blueprint Types
 *
 * All interfaces and union types that describe the JSON blueprint format for
 * course templates. Shared between template-json-blueprints.ts and consumers.
 */

// ─── Primitives ──────────────────────────────────────────────────────────────

/** A reference to a document field (its storage key and its display label). */
export interface FieldRef {
  key: string
  label: string
}

/**
 * Header region — rendered inside the top page margin.
 * A single horizontal row split into a left group and a right group.
 */
export interface HeaderRegion {
  left: FieldRef[]
  right: FieldRef[]
}

/**
 * Footer region — rendered inside the bottom page margin.
 * A single horizontal row split into a left group and a right group.
 */
export interface FooterRegion {
  left: FieldRef[]
  right: FieldRef[]
}

// ─── Body Slot Kinds ─────────────────────────────────────────────────────────

/** Structured lesson-planning table (Program block). */
export interface ProgramTableSlot {
  kind: "program_table"
  /** Ordered list of columns shown in the table. */
  columns: FieldRef[]
}

/** Reference-material table (Resources block). */
export interface ResourcesTableSlot {
  kind: "resources_table"
  columns: FieldRef[]
}

/** Nested instructional hierarchy: Topic → Objective → Task → task areas. */
export interface ContentNestedSlot {
  kind: "content_nested"
  /** Which task-area sub-zones to include. */
  areas: ("instruction" | "practice" | "feedback")[]
}

/** Same nested hierarchy framed as an exercise/homework assignment. */
export interface AssignmentNestedSlot {
  kind: "assignment_nested"
  areas: ("instruction" | "practice" | "feedback")[]
}

/** Scoring rubric table: criterion / weight / max points / feedback. */
export interface ScoringRubricSlot {
  kind: "scoring_rubric"
  columns: FieldRef[]
}

/**
 * Table of contents: hierarchical list of modules → lessons → page numbers.
 * Used exclusively by the `table_of_contents` template type.
 */
export interface TocListSlot {
  kind: "toc_list"
  levels: ("module" | "lesson" | "page")[]
}

/** Certificate completion statement, decorative rule, and signature lines. */
export interface CertificateBodySlot {
  kind: "certificate_body"
}

/** Discussion prompt area and structured response zone. */
export interface DiscussionPromptSlot {
  kind: "discussion_prompt"
}

/** Reflection journal: guided prompts with ruled response lines. */
export interface ReflectionJournalSlot {
  kind: "reflection_journal"
}

/** Survey form: question rows with answer/response fields. */
export interface SurveyFormSlot {
  kind: "survey_form"
}

export type BodySlot =
  | ProgramTableSlot
  | ResourcesTableSlot
  | ContentNestedSlot
  | AssignmentNestedSlot
  | ScoringRubricSlot
  | TocListSlot
  | CertificateBodySlot
  | DiscussionPromptSlot
  | ReflectionJournalSlot
  | SurveyFormSlot

// ─── Full Blueprint ───────────────────────────────────────────────────────────

export interface TemplateBlueprintJson {
  /** Must match one of the TemplateType values. */
  type: string
  /** Header region — rendered in the top margin band. */
  header: HeaderRegion
  /** Ordered list of body slots rendered in the content area. */
  body: BodySlot[]
  /** Footer region — rendered in the bottom margin band. */
  footer: FooterRegion
}
