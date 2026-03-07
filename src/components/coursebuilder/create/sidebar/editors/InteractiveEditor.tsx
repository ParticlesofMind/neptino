"use client"

import { ChevronUp, ChevronDown, Plus, Trash2, Check } from "lucide-react"
import {
  StudioSection,
  StudioSegment,
  StudioTextarea,
  StudioInput,
  StudioNumberInput,
} from "./studio-primitives"

interface Option {
  text: string
  correct: boolean
  feedback: string
}

interface InteractiveEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type InteractionType = "multiple-choice" | "true-false" | "short-answer" | "ranking"

function parseOptions(raw: unknown): Option[] {
  if (!Array.isArray(raw)) return [{ text: "", correct: false, feedback: "" }]
  return raw.map((o): Option => ({
    text: typeof o === "object" && o !== null && "text" in o ? String((o as { text: unknown }).text) : "",
    correct: typeof o === "object" && o !== null && "correct" in o ? Boolean((o as { correct: unknown }).correct) : false,
    feedback: typeof o === "object" && o !== null && "feedback" in o ? String((o as { feedback: unknown }).feedback) : "",
  }))
}

const INTERACTION_TYPES: { id: InteractionType; label: string }[] = [
  { id: "multiple-choice", label: "Multiple choice" },
  { id: "true-false", label: "True / False" },
  { id: "short-answer", label: "Short answer" },
  { id: "ranking", label: "Ranking" },
]

export function InteractiveEditor({ content, onChange }: InteractiveEditorProps) {
  const interactionType = (typeof content.interactionType === "string" ? content.interactionType : "multiple-choice") as InteractionType
  const prompt = typeof content.prompt === "string" ? content.prompt : ""
  const hint = typeof content.hint === "string" ? content.hint : ""
  const points = typeof content.points === "number" ? content.points : 1
  const sampleAnswer = typeof content.sampleAnswer === "string" ? content.sampleAnswer : ""
  const keywords = typeof content.keywords === "string" ? content.keywords : ""
  const options = parseOptions(content.options)
  const tfCorrect = typeof content.tfCorrect === "boolean" ? content.tfCorrect : true

  const setOptions = (next: Option[]) => onChange("options", next)

  const addOption = () => {
    if (options.length >= 8) return
    setOptions([...options, { text: "", correct: false, feedback: "" }])
  }

  const removeOption = (i: number) => {
    if (options.length <= 1) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, field: keyof Option, value: unknown) => {
    setOptions(options.map((o, idx) => idx === i ? { ...o, [field]: value } : o))
  }

  const moveOption = (i: number, dir: -1 | 1) => {
    const next = [...options]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setOptions(next)
  }

  const toggleCorrect = (i: number) => {
    if (interactionType === "multiple-choice") {
      // Radio: only one correct
      setOptions(options.map((o, idx) => ({ ...o, correct: idx === i })))
    } else {
      // Ranking/multi: toggle
      updateOption(i, "correct", !options[i].correct)
    }
  }

  const promptCharCount = prompt.length
  const promptMax = 500

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">

      {/* Interaction type */}
      <StudioSection className="pt-4">
        <StudioSegment
          label="Interaction type"
          options={INTERACTION_TYPES.map(({ id, label }) => ({ value: id, label }))}
          value={interactionType}
          onChange={(t) => onChange("interactionType", t)}
          size="xs"
        />
      </StudioSection>

      {/* Question prompt */}
      <StudioSection label="Question">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Prompt</span>
            <span className={`text-[10px] font-mono ${promptCharCount > promptMax * 0.9 ? "text-amber-500" : "text-neutral-400"}`}>
              {promptCharCount}/{promptMax}
            </span>
          </div>
          <textarea
            value={prompt}
            rows={4}
            maxLength={promptMax}
            placeholder="Enter your question here…"
            onChange={(e) => onChange("prompt", e.target.value)}
            className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50/80 px-2.5 py-2 text-[13px] leading-relaxed text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:border-[#4a94ff]/60 focus:bg-white focus:shadow-[0_0_0_3px_rgba(74,148,255,0.06)]"
          />
        </div>
      </StudioSection>

      {/* Options (MC / Ranking) */}
      {(interactionType === "multiple-choice" || interactionType === "ranking") && (
        <StudioSection
          label={interactionType === "ranking" ? "Items to rank" : "Answer choices"}
          action={
            <button
              type="button"
              onClick={addOption}
              disabled={options.length >= 8}
              className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-all hover:bg-neutral-50 disabled:opacity-40"
            >
              <Plus size={10} /> Add
            </button>
          }
        >
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  {interactionType === "multiple-choice" && (
                    <button
                      type="button"
                      title={opt.correct ? "Correct answer" : "Mark as correct"}
                      onClick={() => toggleCorrect(i)}
                      className={[
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                        opt.correct
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-neutral-300 text-transparent hover:border-green-400 hover:text-green-400",
                      ].join(" ")}
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOption(i, "text", e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50/80 px-2.5 py-1.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none focus:border-[#4a94ff]/60 focus:bg-white"
                  />
                  <button type="button" onClick={() => moveOption(i, -1)} className="text-neutral-400 hover:text-neutral-700 transition-colors">
                    <ChevronUp size={13} />
                  </button>
                  <button type="button" onClick={() => moveOption(i, 1)} className="text-neutral-400 hover:text-neutral-700 transition-colors">
                    <ChevronDown size={13} />
                  </button>
                  <button type="button" onClick={() => removeOption(i)} disabled={options.length <= 1} className="text-neutral-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
                {opt.text && (
                  <input
                    type="text"
                    value={opt.feedback}
                    onChange={(e) => updateOption(i, "feedback", e.target.value)}
                    placeholder={`Feedback when student picks ${String.fromCharCode(65 + i)}…`}
                    className="ml-8 w-[calc(100%-2rem)] rounded border border-dashed border-neutral-200 bg-white px-2 py-1 text-[11px] italic text-neutral-500 outline-none focus:border-neutral-400"
                  />
                )}
              </div>
            ))}
          </div>
        </StudioSection>
      )}

      {/* True / False */}
      {interactionType === "true-false" && (
        <StudioSection label="Correct answer">
          <div className="flex gap-2">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onChange("tfCorrect", val)}
                className={[
                  "flex-1 rounded-md border py-2.5 text-[12px] font-bold transition-all",
                  tfCorrect === val
                    ? val
                      ? "border-green-500 bg-green-500 text-white shadow-sm"
                      : "border-red-500 bg-red-500 text-white shadow-sm"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                ].join(" ")}
              >
                {val ? "True" : "False"}
              </button>
            ))}
          </div>
        </StudioSection>
      )}

      {/* Short answer */}
      {interactionType === "short-answer" && (
        <StudioSection label="Sample answer & keywords">
          <StudioTextarea
            label="Sample answer"
            value={sampleAnswer}
            rows={3}
            placeholder="Expected answer for teacher reference…"
            onChange={(e) => onChange("sampleAnswer", e.target.value)}
          />
          <StudioInput
            label="Keywords"
            value={keywords}
            placeholder="photosynthesis, chlorophyll, light…"
            hint="Comma-separated — used for auto-grading hints"
            onChange={(e) => onChange("keywords", e.target.value)}
          />
        </StudioSection>
      )}

      {/* Hint & scoring */}
      <StudioSection label="Hint & scoring" noBorder>
        <StudioInput
          label="Hint"
          badge="optional"
          badgeVariant="optional"
          value={hint}
          placeholder="Shown when student requests help"
          onChange={(e) => onChange("hint", e.target.value)}
        />
        <StudioNumberInput
          label="Points"
          value={points}
          min={0}
          max={100}
          step={0.5}
          onChange={(v) => onChange("points", v)}
        />
      </StudioSection>
    </div>
  )
}
