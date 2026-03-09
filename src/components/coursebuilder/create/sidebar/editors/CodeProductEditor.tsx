"use client"

import {
  StudioInput,
  StudioSection,
  StudioSelect,
  StudioTextarea,
} from "./studio-primitives"
import type { EditorProps } from "./types"

export function CodeProductEditor({ content, onChange }: EditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const language = typeof content.language === "string" ? content.language : "javascript"
  const code = typeof content.code === "string" ? content.code : ""
  const prompt = typeof content.prompt === "string" ? content.prompt : ""

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      <StudioSection label="Identity" className="pt-4">
        <StudioInput
          label="Title"
          value={title}
          placeholder="Code lab"
          onChange={(event) => onChange("title", event.target.value)}
        />
        <StudioSelect
          label="Language"
          value={language}
          onChange={(event) => onChange("language", event.target.value)}
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
        </StudioSelect>
      </StudioSection>

      <StudioSection label="Prompt">
        <StudioTextarea
          rows={3}
          value={prompt}
          placeholder="Explain what students should do with this code workspace."
          onChange={(event) => onChange("prompt", event.target.value)}
        />
      </StudioSection>

      <StudioSection label="Starter code">
        <StudioTextarea
          rows={14}
          value={code}
          placeholder="const answer = 42"
          onChange={(event) => onChange("code", event.target.value)}
        />
      </StudioSection>
    </div>
  )
}