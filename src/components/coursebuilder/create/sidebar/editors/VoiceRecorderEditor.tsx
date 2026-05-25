"use client"

import { Mic } from "lucide-react"
import { EditorSplitLayout } from "./editor-split-layout"
import { GenericEditorPreview } from "./generic-editor-preview"
import { StudioInput, StudioNumberInput, StudioSection, StudioSelect, StudioTextarea } from "./studio-primitives"

interface VoiceRecorderEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function VoiceRecorderEditor({ content, onChange }: VoiceRecorderEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const prompt = typeof content.prompt === "string" ? content.prompt : ""
  const transcript = typeof content.transcript === "string" ? content.transcript : ""
  const retryPolicy = typeof content.retryPolicy === "string" ? content.retryPolicy : "allow"
  const maxDurationSeconds = typeof content.maxDurationSeconds === "number" ? content.maxDurationSeconds : 60

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[33rem] md:flex-none xl:w-[35rem]"
      sidebar={(
        <div className="flex h-full flex-col overflow-auto bg-white">
          <StudioSection label="Voice task" className="pt-4">
            <StudioInput
              label="Title"
              icon={<Mic size={11} />}
              value={title}
              placeholder="Oral reflection"
              onChange={(event) => onChange("title", event.target.value)}
            />
            <StudioTextarea
              label="Prompt"
              rows={4}
              value={prompt}
              placeholder="What should the learner say?"
              onChange={(event) => onChange("prompt", event.target.value)}
            />
          </StudioSection>

          <StudioSection label="Recording rules">
            <StudioNumberInput
              label="Max duration"
              value={maxDurationSeconds}
              min={10}
              max={600}
              step={10}
              unit="seconds"
              onChange={(value) => onChange("maxDurationSeconds", value)}
            />
            <StudioSelect
              label="Retry policy"
              value={retryPolicy}
              onChange={(event) => onChange("retryPolicy", event.target.value)}
            >
              <option value="allow">Allow retries</option>
              <option value="single">One take only</option>
            </StudioSelect>
          </StudioSection>

          <StudioSection label="Teacher transcript" noBorder>
            <StudioTextarea
              rows={4}
              value={transcript}
              placeholder="Optional model transcript or speaking guide"
              onChange={(event) => onChange("transcript", event.target.value)}
            />
          </StudioSection>
        </div>
      )}
      preview={<GenericEditorPreview cardType="voice-recorder" content={content} onTitleChange={(next) => onChange("title", next)} />}
    />
  )
}
