"use client"

import { Sparkles } from "lucide-react"
import {
  StudioSection,
  StudioUrlInput,
  StudioInput,
  StudioTextarea,
  StudioSelect,
  StudioNumberInput,
  StudioToggle,
} from "./studio-primitives"

interface RichSimEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  variant?: "rich-sim" | "village-3d" | "interactive"
}

export function RichSimEditor({ content, onChange, variant = "rich-sim" }: RichSimEditorProps) {
  const url = typeof content.url === "string" ? content.url : ""
  const title = typeof content.title === "string" ? content.title : ""
  const description = typeof content.description === "string" ? content.description : ""
  const prompt = typeof content.prompt === "string" ? content.prompt : ""
  const interactionType = typeof content.interactionType === "string" ? content.interactionType : "sandbox"
  const checkpoints = typeof content.checkpoints === "number" ? content.checkpoints : 0
  const hintsEnabled = typeof content.hintsEnabled === "boolean" ? content.hintsEnabled : true

  const labels = {
    "rich-sim": { name: "Simulation", desc: "Interactive simulation or widget" },
    "village-3d": { name: "3D Scene", desc: "Immersive 3D exploration experience" },
    "interactive": { name: "Interactive", desc: "Custom interactive experience" },
  }

  const meta = labels[variant]

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">

      {/* Embed URL */}
      <StudioSection label="Embed source" className="pt-4">
        <StudioUrlInput
          value={url}
          placeholder="https://embed.example.com/simulation"
          onCommit={(u) => onChange("url", u)}
          hint="Paste an embeddable URL — the experience renders in a sandboxed frame."
        />
      </StudioSection>

      {/* Preview */}
      {url ? (
        <div className="shrink-0 border-b border-neutral-100 bg-neutral-950 px-4 py-3">
          <div className="relative w-full overflow-hidden rounded-lg border border-neutral-800 bg-black" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={url}
              className="absolute inset-0 h-full w-full border-0"
              title={`${meta.name} preview`}
              sandbox="allow-scripts allow-same-origin allow-forms"
              allow="accelerometer; camera; fullscreen; gyroscope; microphone"
            />
          </div>
        </div>
      ) : (
        <div className="mx-4 my-3 flex flex-col items-center gap-2.5 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 py-10">
          <Sparkles size={26} className="text-neutral-300" />
          <div className="text-center">
            <p className="text-[12px] font-medium text-neutral-500">{meta.name}</p>
            <p className="text-[10px] text-neutral-400">Paste an embed URL above to preview</p>
          </div>
        </div>
      )}

      {/* Content */}
      <StudioSection label="Content">
        <StudioInput
          label="Title"
          value={title}
          onChange={(e) => onChange("title", e.target.value)}
        />
        <StudioTextarea
          label="Description"
          value={description}
          rows={2}
          onChange={(e) => onChange("description", e.target.value)}
        />
        <StudioTextarea
          label="Starter instruction / prompt"
          value={prompt}
          rows={3}
          placeholder="What should students do or explore?"
          onChange={(e) => onChange("prompt", e.target.value)}
        />
        {variant !== "village-3d" && (
          <StudioSelect
            label="Interaction type"
            value={interactionType}
            onChange={(e) => onChange("interactionType", e.target.value)}
          >
            <option value="sandbox">Sandbox</option>
            <option value="scenario">Scenario</option>
            <option value="guided">Guided</option>
            <option value="challenge">Challenge</option>
          </StudioSelect>
        )}
      </StudioSection>

      {/* Scaffolding */}
      <StudioSection label="Scaffolding" noBorder>
        <div className="grid grid-cols-2 gap-3">
          <StudioNumberInput
            label="Checkpoints"
            value={checkpoints}
            min={0}
            max={20}
            onChange={(v) => onChange("checkpoints", v)}
          />
          <StudioToggle
            label="Hint scaffolding"
            checked={hintsEnabled}
            onChange={(v) => onChange("hintsEnabled", v)}
          />
        </div>
      </StudioSection>
    </div>
  )
}
