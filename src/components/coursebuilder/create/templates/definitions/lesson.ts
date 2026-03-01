import type { TemplateDefinition } from "../../types"

export const LESSON_TEMPLATE: TemplateDefinition = {
  type: "lesson",
  label: "Lesson",
  blocks: [
    { key: "header",     required: true,  defaultVisible: true  },
    { key: "program",    required: true,  defaultVisible: true  },
    { key: "resources",  required: true,  defaultVisible: true  },
    { key: "content",    required: true,  defaultVisible: true  },
    { key: "assignment", required: true,  defaultVisible: true  },
    { key: "scoring",    required: false, defaultVisible: false },
    { key: "footer",     required: true,  defaultVisible: true  },
  ],
}
