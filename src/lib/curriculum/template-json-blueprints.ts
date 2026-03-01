/**
 * Template JSON Blueprints
 *
 * Each template type is described by a canonical JSON blueprint that defines
 * its exact visual structure: a Header region (top margin), one or more Body
 * slots (content area), and a Footer region (bottom margin).
 *
 * This is the single source of truth for both the configurator preview and
 * the actual canvas rendering. Every type follows the same tri-region layout:
 *
 *   ┌──────────────────────────────────────────┐
 *   │  HEADER  — lives in the top page margin  │
 *   ├──────────────────────────────────────────┤
 *   │                                          │
 *   │  BODY  — one or more content blocks      │
 *   │                                          │
 *   ├──────────────────────────────────────────┤
 *   │  FOOTER  — lives in the bottom margin    │
 *   └──────────────────────────────────────────┘
 *
 * The height of the header/footer bands is determined by the page-margin
 * settings configured in Page Setup. The body fills the remaining space.
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

// ─── Shared constants ─────────────────────────────────────────────────────────

const COMMON_HEADER_RIGHT: FieldRef[] = [
  { key: "date",         label: "Date" },
  { key: "teacher_name", label: "Teacher" },
]

const COMMON_FOOTER_LEFT: FieldRef[] = [
  { key: "copyright",        label: "Copyright" },
  { key: "institution_name", label: "Institution" },
  { key: "teacher_name",     label: "Teacher" },
]

const COMMON_FOOTER_RIGHT: FieldRef[] = [
  { key: "page_number", label: "Page" },
]

const PROGRAM_COLUMNS: FieldRef[] = [
  { key: "topic",               label: "Topic" },
  { key: "objective",           label: "Objective" },
  { key: "task",                label: "Task" },
  { key: "program_method",      label: "Method" },
  { key: "program_social_form", label: "Social Form" },
  { key: "program_time",        label: "Time" },
]

const RESOURCES_COLUMNS: FieldRef[] = [
  { key: "task",    label: "Task" },
  { key: "type",    label: "Type" },
  { key: "origin",  label: "Origin" },
  { key: "state",   label: "State" },
  { key: "quality", label: "Quality" },
]

const SCORING_COLUMNS: FieldRef[] = [
  { key: "criterion",  label: "Criterion" },
  { key: "weight",     label: "Weight" },
  { key: "max_points", label: "Points" },
  { key: "feedback",   label: "Feedback" },
]

const ALL_AREAS: ("instruction" | "practice" | "feedback")[] = [
  "instruction",
  "practice",
  "feedback",
]

const TWO_AREAS: ("instruction" | "practice" | "feedback")[] = [
  "instruction",
  "practice",
]

// ─── Blueprint Definitions ────────────────────────────────────────────────────

export const TEMPLATE_BLUEPRINTS: Record<string, TemplateBlueprintJson> = {

  lesson: {
    type: "lesson",
    header: {
      left: [
        { key: "lesson_number",   label: "Lesson No." },
        { key: "lesson_title",    label: "Lesson Title" },
        { key: "module_title",    label: "Module" },
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: COMMON_HEADER_RIGHT,
    },
    body: [
      { kind: "program_table",    columns: PROGRAM_COLUMNS },
      { kind: "resources_table",  columns: RESOURCES_COLUMNS },
      { kind: "content_nested",   areas: ALL_AREAS },
      { kind: "assignment_nested", areas: ALL_AREAS },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  quiz: {
    type: "quiz",
    header: {
      left: [
        { key: "lesson_number",   label: "Quiz No." },
        { key: "lesson_title",    label: "Quiz Title" },
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: COMMON_HEADER_RIGHT,
    },
    body: [
      { kind: "program_table",   columns: PROGRAM_COLUMNS },
      { kind: "content_nested",  areas: ALL_AREAS },
      { kind: "scoring_rubric",  columns: SCORING_COLUMNS },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  exam: {
    type: "exam",
    header: {
      left: [
        { key: "lesson_title",    label: "Exam Title" },
        { key: "module_title",    label: "Module" },
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: COMMON_HEADER_RIGHT,
    },
    body: [
      { kind: "program_table",   columns: PROGRAM_COLUMNS },
      { kind: "resources_table", columns: RESOURCES_COLUMNS },
      { kind: "content_nested",  areas: TWO_AREAS },
      { kind: "scoring_rubric",  columns: SCORING_COLUMNS },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  assessment: {
    type: "assessment",
    header: {
      left: [
        { key: "lesson_title",    label: "Assessment Title" },
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: COMMON_HEADER_RIGHT,
    },
    body: [
      { kind: "program_table",   columns: PROGRAM_COLUMNS },
      { kind: "resources_table", columns: RESOURCES_COLUMNS },
      { kind: "content_nested",  areas: TWO_AREAS },
      { kind: "scoring_rubric",  columns: SCORING_COLUMNS },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  certificate: {
    type: "certificate",
    header: {
      left: [
        { key: "institution_name", label: "Institution" },
        { key: "course_title",     label: "Course" },
      ],
      right: [
        { key: "date", label: "Date" },
      ],
    },
    body: [
      { kind: "certificate_body" },
    ],
    footer: {
      left: [{ key: "copyright", label: "Copyright" }],
      right: COMMON_FOOTER_RIGHT,
    },
  },

  project: {
    type: "project",
    header: {
      left: [
        { key: "lesson_number",   label: "Project No." },
        { key: "lesson_title",    label: "Project Title" },
        { key: "module_title",    label: "Module" },
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: COMMON_HEADER_RIGHT,
    },
    body: [
      { kind: "program_table",   columns: PROGRAM_COLUMNS },
      { kind: "resources_table", columns: RESOURCES_COLUMNS },
      { kind: "content_nested",  areas: ALL_AREAS },
      { kind: "scoring_rubric",  columns: SCORING_COLUMNS },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  lab: {
    type: "lab",
    header: {
      left: [
        { key: "lesson_number",   label: "Lab No." },
        { key: "lesson_title",    label: "Lab Title" },
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: COMMON_HEADER_RIGHT,
    },
    body: [
      { kind: "program_table",   columns: PROGRAM_COLUMNS },
      { kind: "resources_table", columns: RESOURCES_COLUMNS },
      { kind: "content_nested",  areas: ALL_AREAS },
      { kind: "scoring_rubric",  columns: SCORING_COLUMNS },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  workshop: {
    type: "workshop",
    header: {
      left: [
        { key: "lesson_number",   label: "Session No." },
        { key: "lesson_title",    label: "Workshop Title" },
        { key: "module_title",    label: "Module" },
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: COMMON_HEADER_RIGHT,
    },
    body: [
      { kind: "program_table",   columns: PROGRAM_COLUMNS },
      { kind: "resources_table", columns: RESOURCES_COLUMNS },
      { kind: "content_nested",  areas: TWO_AREAS },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  discussion: {
    type: "discussion",
    header: {
      left: [
        { key: "lesson_title",    label: "Topic" },
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: COMMON_HEADER_RIGHT,
    },
    body: [
      { kind: "discussion_prompt" },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  reflection: {
    type: "reflection",
    header: {
      left: [
        { key: "lesson_title", label: "Reflection Title" },
        { key: "course_title", label: "Course" },
      ],
      right: [
        { key: "date", label: "Date" },
      ],
    },
    body: [
      { kind: "reflection_journal" },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  survey: {
    type: "survey",
    header: {
      left: [
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
      ],
      right: [
        { key: "date", label: "Date" },
      ],
    },
    body: [
      { kind: "survey_form" },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

  table_of_contents: {
    type: "table_of_contents",
    header: {
      left: [
        { key: "course_title",    label: "Course" },
        { key: "institution_name", label: "Institution" },
        { key: "teacher_name",    label: "Teacher" },
      ],
      right: [
        { key: "date", label: "Date" },
      ],
    },
    body: [
      {
        kind: "toc_list",
        levels: ["module", "lesson", "page"],
      },
    ],
    footer: { left: COMMON_FOOTER_LEFT, right: COMMON_FOOTER_RIGHT },
  },

}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Maps a body-slot kind to the BlockId it corresponds to.
 * Used by the renderer to check whether a block is enabled before drawing.
 */
export function slotToBlockId(kind: BodySlot["kind"]): string | null {
  switch (kind) {
    case "program_table":    return "program"
    case "resources_table":  return "resources"
    case "content_nested":
    case "toc_list":
    case "certificate_body":
    case "discussion_prompt":
    case "reflection_journal":
    case "survey_form":      return "content"
    case "assignment_nested": return "assignment"
    case "scoring_rubric":   return "scoring"
    default:                 return null
  }
}
