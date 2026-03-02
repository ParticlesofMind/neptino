import type { TemplateDefinition } from "../../types"

export const LESSON_TEMPLATE: TemplateDefinition = {
  type: "lesson",
  label: "Lesson",
  blocks: [
    { key: "header",     required: true,  defaultVisible: true,  accepts: [],                        grows: false },
    { key: "program",    required: true,  defaultVisible: true,  accepts: [],                        grows: false },
    { key: "resources",  required: true,  defaultVisible: true,  accepts: [],                        grows: false },
    { key: "content",    required: true,  defaultVisible: true,                                      grows: true  },
    { key: "assignment", required: true,  defaultVisible: true,                                      grows: true  },
    { key: "scoring",    required: false, defaultVisible: false, accepts: ["text", "table"],         grows: false },
    { key: "footer",     required: true,  defaultVisible: true,  accepts: [],                        grows: false },
  ],
}
