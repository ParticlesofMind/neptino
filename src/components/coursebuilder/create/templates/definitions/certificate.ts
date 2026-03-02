import type { TemplateDefinition } from "../../types"

export const CERTIFICATE_TEMPLATE: TemplateDefinition = {
  type: "certificate",
  label: "Certificate",
  blocks: [
    { key: "header",  required: true, defaultVisible: true, accepts: [], grows: false },
    { key: "content", required: true, defaultVisible: true,              grows: true  },
    { key: "footer",  required: true, defaultVisible: true, accepts: [], grows: false },
  ],
}
