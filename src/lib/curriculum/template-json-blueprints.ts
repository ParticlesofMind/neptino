/**
 * Template JSON Blueprints
 *
 * Canonical JSON blueprints that define the visual structure of each template
 * type: Header (top margin), Body slots (content area), Footer (bottom margin).
 *
 * Types are defined in template-blueprint-types.ts and re-exported here for
 * backward compat.
 */

export type {
  FieldRef,
  HeaderRegion,
  FooterRegion,
  ProgramTableSlot,
  ResourcesTableSlot,
  ContentNestedSlot,
  AssignmentNestedSlot,
  ScoringRubricSlot,
  TocListSlot,
  CertificateBodySlot,
  DiscussionPromptSlot,
  ReflectionJournalSlot,
  SurveyFormSlot,
  BodySlot,
  TemplateBlueprintJson,
} from "./template-blueprint-types"
import type {
  FieldRef,
  HeaderRegion,
  FooterRegion,
  BodySlot,
  TemplateBlueprintJson,
} from "./template-blueprint-types"

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
