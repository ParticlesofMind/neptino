"use client"

import { Plus, Trash2, Bot, MessageSquare, Target, Sliders } from "lucide-react"

interface ChatEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type ChatMode = "socratic" | "roleplay" | "qa" | "tutor"

const CHAT_MODES: { id: ChatMode; label: string; description: string }[] = [
  { id: "socratic", label: "Socratic", description: "AI asks guiding questions to lead discovery" },
  { id: "roleplay", label: "Role-play", description: "AI plays a historical or fictional character" },
  { id: "qa", label: "Q&A", description: "Free-form question & answer on the topic" },
  { id: "tutor", label: "Tutor", description: "AI explains, checks understanding, gives feedback" },
]

const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"] as const

function parseStarters(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  return []
}

export function ChatEditor({ content, onChange }: ChatEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const topic = typeof content.topic === "string" ? content.topic : ""
  const aiPersona = typeof content.aiPersona === "string" ? content.aiPersona : ""
  const openingMessage = typeof content.openingMessage === "string" ? content.openingMessage : ""
  const learningObjectives = typeof content.learningObjectives === "string" ? content.learningObjectives : ""
  const chatMode = (typeof content.chatMode === "string" ? content.chatMode : "qa") as ChatMode
  const difficulty = (typeof content.difficulty === "string" ? content.difficulty : "intermediate") as typeof DIFFICULTY_LEVELS[number]
  const maxTurns = typeof content.maxTurns === "number" ? content.maxTurns : 20
  const starters = parseStarters(content.conversationStarters)

  const addStarter = () => {
    if (starters.length >= 8) return
    onChange("conversationStarters", [...starters, ""])
  }

  const removeStarter = (i: number) => {
    onChange("conversationStarters", starters.filter((_, idx) => idx !== i))
  }

  const updateStarter = (i: number, value: string) => {
    onChange("conversationStarters", starters.map((s, idx) => idx === i ? value : s))
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Chat mode */}
      <div className="shrink-0 border-b border-neutral-100 px-4 pt-4 pb-3">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Chat mode</p>
        <div className="grid grid-cols-2 gap-2">
          {CHAT_MODES.map(({ id, label, description }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange("chatMode", id)}
              className={[
                "flex flex-col gap-0.5 rounded-lg border p-2.5 text-left transition-all",
                chatMode === id
                  ? "border-[#00ccb3]/40 bg-[#00ccb3]/5 shadow-sm"
                  : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
              ].join(" ")}
            >
              <span className={["text-[11px] font-semibold", chatMode === id ? "text-[#00876b]" : "text-neutral-700"].join(" ")}>{label}</span>
              <span className="text-[10px] leading-snug text-neutral-400">{description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title + persona */}
      <div className="shrink-0 border-b border-neutral-100 px-4 py-3 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-neutral-600">Card title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. Chat with Darwin"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#00ccb3]/60 focus:ring-1 focus:ring-[#00ccb3]/10"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
            <Bot size={11} className="text-neutral-400" />
            AI persona name
          </span>
          <input
            type="text"
            value={aiPersona}
            onChange={(e) => onChange("aiPersona", e.target.value)}
            placeholder="e.g. Charles Darwin, Amelia Earhart, Science Tutor"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#00ccb3]/60 focus:ring-1 focus:ring-[#00ccb3]/10"
          />
        </label>
      </div>

      {/* Topic context */}
      <div className="shrink-0 border-b border-neutral-100 px-4 py-3 space-y-1.5">
        <span className="block text-[11px] font-medium text-neutral-600">
          Topic context <span className="text-neutral-400 font-normal">(AI knowledge scope)</span>
        </span>
        <textarea
          value={topic}
          rows={4}
          onChange={(e) => onChange("topic", e.target.value)}
          placeholder="Describe the knowledge domain the AI should draw from. Be specific — e.g. 'Charles Darwin's theory of natural selection, including the voyage of the Beagle, Galapagos finches, variation, inheritance, and adaptation.'"
          className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2.5 text-[12px] text-neutral-700 leading-relaxed outline-none focus:border-[#00ccb3]/60 focus:ring-1 focus:ring-[#00ccb3]/10"
        />
      </div>

      {/* Opening message */}
      <div className="shrink-0 border-b border-neutral-100 px-4 py-3 space-y-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
          <MessageSquare size={11} className="text-neutral-400" />
          Opening message from AI
        </span>
        <textarea
          value={openingMessage}
          rows={3}
          onChange={(e) => onChange("openingMessage", e.target.value)}
          placeholder="The first message students see when the chat opens…"
          className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[12px] text-neutral-700 leading-relaxed outline-none focus:border-[#00ccb3]/60 focus:ring-1 focus:ring-[#00ccb3]/10"
        />
      </div>

      {/* Learning objectives */}
      <div className="shrink-0 border-b border-neutral-100 px-4 py-3 space-y-1.5">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600">
          <Target size={11} className="text-neutral-400" />
          Learning objectives <span className="text-neutral-400 font-normal">(for the AI to assess against)</span>
        </span>
        <textarea
          value={learningObjectives}
          rows={3}
          onChange={(e) => onChange("learningObjectives", e.target.value)}
          placeholder="What should students be able to explain or demonstrate by the end of the conversation?"
          className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[12px] text-neutral-700 leading-relaxed outline-none focus:border-[#00ccb3]/60 focus:ring-1 focus:ring-[#00ccb3]/10"
        />
      </div>

      {/* Conversation starters */}
      <div className="shrink-0 border-b border-neutral-100 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-600">Conversation starters <span className="text-neutral-400 font-normal">(optional prompts shown to students)</span></span>
          <button
            type="button"
            onClick={addStarter}
            disabled={starters.length >= 8}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:border-[#00ccb3]/40 hover:text-[#00876b] disabled:opacity-40 transition-colors"
          >
            <Plus size={10} /> Add
          </button>
        </div>
        {starters.length === 0 && (
          <p className="text-[11px] italic text-neutral-400">No starters yet — students will open with a free message.</p>
        )}
        <div className="space-y-2">
          {starters.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={s}
                onChange={(e) => updateStarter(i, e.target.value)}
                placeholder={`Starter ${i + 1}`}
                className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#00ccb3]/60"
              />
              <button type="button" onClick={() => removeStarter(i)} className="text-neutral-400 hover:text-red-500 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="shrink-0 bg-neutral-50 px-4 py-3 space-y-3">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          <Sliders size={10} />
          Chat settings
        </span>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-[11px] font-medium text-neutral-600">Max turns <span className="text-neutral-400 font-normal">(0 = unlimited)</span></span>
            <input
              type="number"
              value={maxTurns}
              min={0}
              max={100}
              step={5}
              onChange={(e) => onChange("maxTurns", Number(e.target.value))}
              className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#00ccb3]/60"
            />
          </label>
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-neutral-600">Difficulty</span>
            <select
              value={difficulty}
              onChange={(e) => onChange("difficulty", e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#00ccb3]/60"
            >
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
