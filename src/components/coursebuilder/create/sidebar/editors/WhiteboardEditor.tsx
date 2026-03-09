"use client"

import {
  StudioInput,
  StudioSection,
  StudioTextarea,
} from "./studio-primitives"
import type { EditorProps } from "./types"

export function WhiteboardEditor({ content, onChange }: EditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const prompt = typeof content.prompt === "string" ? content.prompt : ""
  const boardKey = typeof content.boardKey === "string" ? content.boardKey : ""

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      <StudioSection label="Identity" className="pt-4">
        <StudioInput
          label="Title"
          value={title}
          placeholder="Whiteboard"
          onChange={(event) => onChange("title", event.target.value)}
        />
        <StudioInput
          label="Board key"
          value={boardKey}
          placeholder="internet-history-board"
          onChange={(event) => onChange("boardKey", event.target.value)}
          hint="Controls the tldraw persistence key so a board can be revisited."
        />
      </StudioSection>

      <StudioSection label="Teacher prompt">
        <StudioTextarea
          rows={6}
          value={prompt}
          placeholder="Describe how learners should use the board."
          onChange={(event) => onChange("prompt", event.target.value)}
        />
      </StudioSection>
    </div>
  )
}