"use client"

import { ChevronUp, ChevronDown, Plus, Trash2, Check } from "lucide-react"

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
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Interaction type</p>
        <div className="flex gap-0 border border-neutral-200 divide-x divide-neutral-200 flex-wrap">
          {INTERACTION_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange("interactionType", id)}
              className={[
                "flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                interactionType === id ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Question prompt */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Question</p>
          <span className={`text-[10px] ${promptCharCount > promptMax * 0.9 ? "text-amber-500" : "text-neutral-400"}`}>
            {promptCharCount} / {promptMax}
          </span>
        </div>
        <textarea
          value={prompt}
          rows={4}
          maxLength={promptMax}
          placeholder="Enter your question here…"
          onChange={(e) => onChange("prompt", e.target.value)}
          className="w-full resize-none border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800 leading-relaxed outline-none focus:border-neutral-400"
        />
      </div>

      {/* Options (for MC / Ranking) */}
      {(interactionType === "multiple-choice" || interactionType === "ranking") && (
        <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              {interactionType === "ranking" ? "Items to rank" : "Answer choices"}
            </p>
            <button
              type="button"
              onClick={addOption}
              disabled={options.length >= 8}
              className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
            >
              <Plus size={10} /> Add
            </button>
          </div>

          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  {/* Correct toggle */}
                  {interactionType === "multiple-choice" && (
                    <button
                      type="button"
                      title={opt.correct ? "Correct answer" : "Mark as correct"}
                      onClick={() => toggleCorrect(i)}
                      className={[
                        "h-6 w-6 shrink-0 border flex items-center justify-center transition-colors",
                        opt.correct ? "border-green-600 bg-green-600 text-white" : "border-neutral-300 text-transparent hover:border-green-400",
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
                    className="flex-1 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
                  />

                  <button type="button" onClick={() => moveOption(i, -1)} className="text-neutral-400 hover:text-neutral-700">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveOption(i, 1)} className="text-neutral-400 hover:text-neutral-700">
                    <ChevronDown size={14} />
                  </button>
                  <button type="button" onClick={() => removeOption(i)} disabled={options.length <= 1} className="text-neutral-400 hover:text-red-500 disabled:opacity-30">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Feedback per option */}
                {opt.text && (
                  <input
                    type="text"
                    value={opt.feedback}
                    onChange={(e) => updateOption(i, "feedback", e.target.value)}
                    placeholder={`Feedback for option ${String.fromCharCode(65 + i)}…`}
                    className="ml-8 w-[calc(100%-2rem)] border border-dashed border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-500 italic outline-none focus:border-neutral-400"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* True / False */}
      {interactionType === "true-false" && (
        <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Correct answer</p>
          <div className="flex gap-2">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onChange("tfCorrect", val)}
                className={[
                  "flex-1 border py-2 text-[12px] font-semibold transition-colors",
                  tfCorrect === val
                    ? val ? "border-green-600 bg-green-600 text-white" : "border-red-500 bg-red-500 text-white"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                ].join(" ")}
              >
                {val ? "True" : "False"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Short answer */}
      {interactionType === "short-answer" && (
        <div className="px-4 py-3 border-b border-neutral-100 space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Sample answer</p>
            <textarea
              value={sampleAnswer}
              rows={3}
              onChange={(e) => onChange("sampleAnswer", e.target.value)}
              placeholder="Expected answer for teacher reference…"
              className="w-full resize-none border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Keywords</p>
            <input
              type="text"
              value={keywords}
              placeholder="photosynthesis, chlorophyll, light…"
              onChange={(e) => onChange("keywords", e.target.value)}
              className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
            />
            <p className="mt-1 text-[10px] text-neutral-400">Comma-separated keywords for auto-grading hints</p>
          </div>
        </div>
      )}

      {/* Hint & scoring */}
      <div className="px-4 py-3 space-y-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Hint (optional)</span>
          <input
            type="text"
            value={hint}
            placeholder="Hint shown when student requests help"
            onChange={(e) => onChange("hint", e.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Points</span>
          <input
            type="number"
            value={points}
            min={0}
            max={100}
            step={0.5}
            onChange={(e) => onChange("points", Number(e.target.value))}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>
      </div>
    </div>
  )
}
