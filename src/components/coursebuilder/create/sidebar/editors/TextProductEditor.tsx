"use client"

import { FileText } from "lucide-react"
import {
  StudioInput,
  StudioSection,
  StudioSelect,
  StudioTextarea,
} from "./studio-primitives"
import type { EditorProps } from "./types"

export function TextProductEditor({ content, onChange }: EditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const document = typeof content.document === "string" ? content.document : ""
  const placeholder = typeof content.placeholder === "string" ? content.placeholder : ""
  const mode = typeof content.mode === "string" ? content.mode : "document"

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      <StudioSection label="Identity" className="pt-4">
        <StudioInput
          label="Title"
          value={title}
          placeholder="Writing studio"
          onChange={(event) => onChange("title", event.target.value)}
        />
        <StudioSelect label="Mode" value={mode} onChange={(event) => onChange("mode", event.target.value)}>
          <option value="document">Document</option>
          <option value="notes">Notes</option>
          <option value="journal">Journal</option>
        </StudioSelect>
      </StudioSection>

      <StudioSection label="Editor copy">
        <StudioInput
          label="Placeholder"
          icon={<FileText size={11} />}
          value={placeholder}
          placeholder="Start writing..."
          onChange={(event) => onChange("placeholder", event.target.value)}
        />
        <StudioTextarea
          label="Starter HTML"
          rows={12}
          value={document}
          placeholder="<h2>Draft workspace</h2><p>Students can start here...</p>"
          onChange={(event) => onChange("document", event.target.value)}
          hint="This is the initial TipTap document content shown inside the product."
        />
      </StudioSection>
    </div>
  )
}