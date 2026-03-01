import type { TemplateDefinition, TemplateType } from "../../types"
import { LESSON_TEMPLATE } from "./lesson"
import { EXAM_TEMPLATE } from "./exam"
import { CERTIFICATE_TEMPLATE } from "./certificate"

// ─── Additional built-in definitions ─────────────────────────────────────────

const QUIZ_TEMPLATE: TemplateDefinition = {
  type: "quiz",
  label: "Quiz",
  blocks: [
    { key: "header",  required: true,  defaultVisible: true  },
    { key: "content", required: true,  defaultVisible: true  },
    { key: "scoring", required: false, defaultVisible: true  },
    { key: "footer",  required: true,  defaultVisible: true  },
  ],
}

const ASSESSMENT_TEMPLATE: TemplateDefinition = {
  type: "assessment",
  label: "Assessment",
  blocks: [
    { key: "header",     required: true,  defaultVisible: true  },
    { key: "program",    required: false, defaultVisible: false },
    { key: "content",    required: true,  defaultVisible: true  },
    { key: "assignment", required: false, defaultVisible: true  },
    { key: "scoring",    required: true,  defaultVisible: true  },
    { key: "footer",     required: true,  defaultVisible: true  },
  ],
}

const PROJECT_TEMPLATE: TemplateDefinition = {
  type: "project",
  label: "Project",
  blocks: [
    { key: "header",   required: true,  defaultVisible: true  },
    { key: "program",  required: false, defaultVisible: true  },
    { key: "content",  required: true,  defaultVisible: true  },
    { key: "project",  required: false, defaultVisible: true  },
    { key: "scoring",  required: false, defaultVisible: true  },
    { key: "footer",   required: true,  defaultVisible: true  },
  ],
}

const LAB_TEMPLATE: TemplateDefinition = {
  type: "lab",
  label: "Lab",
  blocks: [
    { key: "header",     required: true,  defaultVisible: true  },
    { key: "resources",  required: false, defaultVisible: true  },
    { key: "content",    required: true,  defaultVisible: true  },
    { key: "assignment", required: false, defaultVisible: true  },
    { key: "footer",     required: true,  defaultVisible: true  },
  ],
}

const WORKSHOP_TEMPLATE: TemplateDefinition = {
  type: "workshop",
  label: "Workshop",
  blocks: [
    { key: "header",     required: true,  defaultVisible: true  },
    { key: "program",    required: false, defaultVisible: true  },
    { key: "resources",  required: false, defaultVisible: false },
    { key: "content",    required: true,  defaultVisible: true  },
    { key: "assignment", required: false, defaultVisible: true  },
    { key: "footer",     required: true,  defaultVisible: true  },
  ],
}

const DISCUSSION_TEMPLATE: TemplateDefinition = {
  type: "discussion",
  label: "Discussion",
  blocks: [
    { key: "header",  required: true,  defaultVisible: true },
    { key: "content", required: true,  defaultVisible: true },
    { key: "footer",  required: true,  defaultVisible: true },
  ],
}

const REFLECTION_TEMPLATE: TemplateDefinition = {
  type: "reflection",
  label: "Reflection",
  blocks: [
    { key: "header",  required: true,  defaultVisible: true },
    { key: "content", required: true,  defaultVisible: true },
    { key: "footer",  required: true,  defaultVisible: true },
  ],
}

const SURVEY_TEMPLATE: TemplateDefinition = {
  type: "survey",
  label: "Survey",
  blocks: [
    { key: "header",  required: true,  defaultVisible: true },
    { key: "content", required: true,  defaultVisible: true },
    { key: "footer",  required: true,  defaultVisible: true },
  ],
}

const TABLE_OF_CONTENTS_TEMPLATE: TemplateDefinition = {
  type: "table_of_contents",
  label: "Table of Contents",
  blocks: [
    { key: "header",  required: true,  defaultVisible: true },
    { key: "content", required: true,  defaultVisible: true },
    { key: "footer",  required: true,  defaultVisible: true },
  ],
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TEMPLATE_DEFINITIONS: Record<TemplateType, TemplateDefinition> = {
  lesson:            LESSON_TEMPLATE,
  exam:              EXAM_TEMPLATE,
  certificate:       CERTIFICATE_TEMPLATE,
  quiz:              QUIZ_TEMPLATE,
  assessment:        ASSESSMENT_TEMPLATE,
  project:           PROJECT_TEMPLATE,
  lab:               LAB_TEMPLATE,
  workshop:          WORKSHOP_TEMPLATE,
  discussion:        DISCUSSION_TEMPLATE,
  reflection:        REFLECTION_TEMPLATE,
  survey:            SURVEY_TEMPLATE,
  table_of_contents: TABLE_OF_CONTENTS_TEMPLATE,
}

export function getTemplateDefinition(type: TemplateType): TemplateDefinition {
  return TEMPLATE_DEFINITIONS[type] ?? LESSON_TEMPLATE
}
