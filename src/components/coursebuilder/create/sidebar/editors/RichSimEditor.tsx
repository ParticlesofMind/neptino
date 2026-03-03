"use client"

import { Sparkles } from "lucide-react"

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
      {/* Preview area */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
        {url ? (
          <div className="overflow-hidden border border-neutral-200 bg-black" style={{ height: 200 }}>
            <iframe
              src={url}
              className="w-full h-full border-0"
              title={`${meta.name} preview`}
              sandbox="allow-scripts allow-same-origin allow-forms"
              allow="accelerometer; camera; fullscreen; gyroscope; microphone"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 border-2 border-dashed border-neutral-200 bg-neutral-50 py-12">
            <Sparkles size={28} className="text-neutral-300" />
            <div className="text-center">
              <p className="text-[12px] font-medium text-neutral-600">{meta.name}</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">{meta.desc}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            placeholder="https://embed.example.com/simulation"
            onChange={(e) => onChange("url", e.target.value)}
            className="flex-1 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </div>
        <p className="text-[10px] text-neutral-400">Paste an embeddable URL — the experience will render above.</p>
      </div>

      {/* Content fields */}
      <div className="px-4 py-4 space-y-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Title</span>
          <input type="text" value={title} onChange={(e) => onChange("title", e.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Description</span>
          <textarea value={description} rows={2} onChange={(e) => onChange("description", e.target.value)}
            className="w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Starter instruction / prompt</span>
          <textarea value={prompt} rows={3} onChange={(e) => onChange("prompt", e.target.value)}
            placeholder="What should students do or explore?"
            className="w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
        </label>

        {variant !== "village-3d" && (
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Interaction type</span>
            <select value={interactionType} onChange={(e) => onChange("interactionType", e.target.value)}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none">
              <option value="sandbox">Sandbox</option>
              <option value="scenario">Scenario</option>
              <option value="guided">Guided</option>
              <option value="challenge">Challenge</option>
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Checkpoints</span>
            <input type="number" value={checkpoints} min={0} max={20}
              onChange={(e) => onChange("checkpoints", Number(e.target.value))}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400" />
          </label>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Hints</span>
            <div className="pt-0.5">
              <button type="button" onClick={() => onChange("hintsEnabled", !hintsEnabled)}
                className={["h-7 w-12 border relative transition-colors", hintsEnabled ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 bg-neutral-100"].join(" ")}>
                <span className={["absolute top-0.5 h-6 w-6 bg-white transition-transform", hintsEnabled ? "translate-x-5" : "translate-x-0.5"].join(" ")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
