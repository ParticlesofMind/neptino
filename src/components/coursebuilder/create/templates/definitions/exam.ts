import type { TemplateDefinition } from "../../types"

export const EXAM_TEMPLATE: TemplateDefinition = {
  type: "exam",
  label: "Exam",
  blocks: [
    { key: "header",    required: true,  defaultVisible: true  },
    { key: "program",   required: false, defaultVisible: true  },
    { key: "content",   required: true,  defaultVisible: true  },
    { key: "scoring",   required: true,  defaultVisible: true  },
    { key: "footer",    required: true,  defaultVisible: true  },
  ],
}
