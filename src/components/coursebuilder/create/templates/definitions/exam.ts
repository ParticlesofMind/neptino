import type { TemplateDefinition } from "../../types"

export const EXAM_TEMPLATE: TemplateDefinition = {
  type: "exam",
  label: "Exam",
  blocks: [
    { key: "header",   required: true,  defaultVisible: true,  accepts: [],                  grows: false },
    { key: "program",  required: false, defaultVisible: true,  accepts: [],                  grows: false },
    { key: "content",  required: true,  defaultVisible: true,                                grows: true  },
    { key: "scoring",  required: true,  defaultVisible: true,  accepts: ["text", "table"],   grows: false },
    { key: "footer",   required: true,  defaultVisible: true,  accepts: [],                  grows: false },
  ],
}
