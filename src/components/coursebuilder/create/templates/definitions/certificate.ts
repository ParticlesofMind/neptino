import type { TemplateDefinition } from "../../types"

export const CERTIFICATE_TEMPLATE: TemplateDefinition = {
  type: "certificate",
  label: "Certificate",
  blocks: [
    { key: "header",  required: true,  defaultVisible: true  },
    { key: "content", required: true,  defaultVisible: true  },
    { key: "footer",  required: true,  defaultVisible: true  },
  ],
}
