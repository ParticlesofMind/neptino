"use client"

import { Plus, Trash2, Bot, MessageSquare, Target } from "lucide-react"
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ollama/models"
import {
  StudioSection,
  StudioSegment,
  StudioInput,
  StudioTextarea,
  StudioSelect,
  StudioNumberInput,
} from "./studio-primitives"

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
  const model = typeof content.model === "string" ? content.model : DEFAULT_MODEL
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
      <StudioSection className="pt-4">
        <StudioSegment
          label="Chat mode"
          options={CHAT_MODES.map(({ id, label }) => ({ value: id, label }))}
          value={chatMode}
          onChange={(m) => onChange("chatMode", m)}
          variant="teal"
          size="xs"
        />
      </StudioSection>

      {/* Identity */}
      <StudioSection label="Identity">
        <StudioInput
          label="Card title"
          value={title}
          placeholder="e.g. Chat with Darwin"
          onChange={(e) => onChange("title", e.target.value)}
        />
        <StudioInput
          label="AI persona name"
          icon={<Bot size={11} />}
          value={aiPersona}
          placeholder="Charles Darwin, Amelia Earhart, Science Tutor…"
          onChange={(e) => onChange("aiPersona", e.target.value)}
        />
        <StudioSelect label="Ollama model" value={model} onChange={(e) => onChange("model", e.target.value)}>
          {AVAILABLE_MODELS.map((entry) => (
            <option key={entry.name} value={entry.name}>{entry.displayName}</option>
          ))}
        </StudioSelect>
      </StudioSection>

      {/* Topic */}
      <StudioSection label="Topic context">
        <StudioTextarea
          value={topic}
          rows={4}
          placeholder="Describe the knowledge domain the AI should draw from. Be specific — e.g. 'Charles Darwin's theory of natural selection, including the voyage of the Beagle, Galapagos finches, variation, inheritance, and adaptation.'"
          onChange={(e) => onChange("topic", e.target.value)}
          hint="This becomes the AI's knowledge scope — be precise."
        />
      </StudioSection>

      {/* Opening message */}
      <StudioSection label="Opening message">
        <StudioTextarea
          icon={<MessageSquare size={11} />}
          value={openingMessage}
          rows={3}
          placeholder="The first message students see when the chat opens…"
          onChange={(e) => onChange("openingMessage", e.target.value)}
        />
      </StudioSection>

      {/* Learning objectives */}
      <StudioSection label="Learning objectives">
        <StudioTextarea
          icon={<Target size={11} />}
          value={learningObjectives}
          rows={3}
          placeholder="What should students be able to explain or demonstrate by the end of the conversation?"
          onChange={(e) => onChange("learningObjectives", e.target.value)}
          hint="The AI uses these to guide and assess the conversation."
        />
      </StudioSection>

      {/* Conversation starters */}
      <StudioSection
        label="Conversation starters"
        action={
          <button
            type="button"
            onClick={addStarter}
            disabled={starters.length >= 8}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-40"
          >
            <Plus size={10} /> Add
          </button>
        }
      >
        {starters.length === 0 && (
          <p className="text-[11px] italic text-neutral-400">No starters — students will open with a free message.</p>
        )}
        <div className="space-y-1.5">
          {starters.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={s}
                onChange={(e) => updateStarter(i, e.target.value)}
                placeholder={`Starter ${i + 1}`}
                className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50/80 px-2.5 py-1.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:border-[#00ccb3]/60 focus:bg-white"
              />
              <button type="button" onClick={() => removeStarter(i)} className="shrink-0 text-neutral-400 transition-colors hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </StudioSection>

      {/* Settings */}
      <div className="shrink-0 border-t border-neutral-100 bg-neutral-50 px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <StudioNumberInput
            label="Max turns"
            value={maxTurns}
            min={0}
            max={100}
            step={5}
            unit="0 = unlimited"
            onChange={(v) => onChange("maxTurns", v)}
          />
          <StudioSelect
            label="Difficulty"
            value={difficulty}
            onChange={(e) => onChange("difficulty", e.target.value)}
          >
            {DIFFICULTY_LEVELS.map((d) => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </StudioSelect>
        </div>
      </div>
    </div>
  )
}
