"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, Check, Mic, RotateCcw, Send, Square } from "lucide-react"
import type { CardRenderProps } from "../CardRegistry"
import { ResourceCardFrame } from "./ResourceCardFrame"

type AssessmentOption = {
  text: string
  correct?: boolean
  feedback?: string
}

type FormField = {
  id: string
  label: string
  type: "text" | "textarea" | "number" | "select"
  required?: boolean
  options?: string[]
}

type Pair = {
  term: string
  match: string
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function parseOptions(raw: unknown): AssessmentOption[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry): AssessmentOption | null => {
      if (!entry || typeof entry !== "object") return null
      const data = entry as Record<string, unknown>
      const text = readString(data.text).trim()
      if (!text) return null
      return {
        text,
        correct: typeof data.correct === "boolean" ? data.correct : false,
        feedback: readString(data.feedback),
      }
    })
    .filter((entry): entry is AssessmentOption => entry !== null)
}

function parsePairs(raw: unknown): Pair[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry): Pair | null => {
      if (!entry || typeof entry !== "object") return null
      const data = entry as Record<string, unknown>
      const term = readString(data.term).trim()
      const match = readString(data.match).trim()
      if (!term && !match) return null
      return { term: term || "Term", match: match || "Match" }
    })
    .filter((entry): entry is Pair => entry !== null)
}

function parseItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map(String).map((item) => item.trim()).filter(Boolean)
}

function parseFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) {
    return [{ id: "response", label: "Response", type: "textarea", required: true }]
  }

  const fields = raw
    .map((entry, index): FormField | null => {
      if (!entry || typeof entry !== "object") return null
      const data = entry as Record<string, unknown>
      const label = readString(data.label).trim()
      if (!label) return null
      const rawType = readString(data.type, "text")
      const type = rawType === "textarea" || rawType === "number" || rawType === "select" ? rawType : "text"
      return {
        id: readString(data.id, `field-${index + 1}`),
        label,
        type,
        required: Boolean(data.required),
        options: parseItems(data.options),
      }
    })
    .filter((entry): entry is FormField => entry !== null)

  return fields.length > 0 ? fields : [{ id: "response", label: "Response", type: "textarea", required: true }]
}

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

function FieldHint({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "bad" }) {
  const className =
    tone === "good" ? "border-[#d6ede3] bg-[#d6ede3]/55 text-[#2e6b4a]" :
    tone === "bad" ? "border-[#f0d8d8] bg-[#f0d8d8]/55 text-[#8a3030]" :
    "border-neutral-200 bg-neutral-50 text-neutral-500"

  return (
    <div className={["rounded-md border px-3 py-2 text-[11px] leading-relaxed", className].join(" ")}>
      {children}
    </div>
  )
}

export function AssessmentCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const prompt = readString(card.content.prompt, "Answer the prompt.")
  const interactionType = readString(card.content.interactionType, "multiple-choice")
  const options = parseOptions(card.content.options)
  const tfCorrect = typeof card.content.tfCorrect === "boolean" ? card.content.tfCorrect : true
  const sampleAnswer = readString(card.content.sampleAnswer)
  const keywords = readString(card.content.keywords)
  const hint = readString(card.content.hint)

  const [selected, setSelected] = useState<number | null>(null)
  const [tfSelected, setTfSelected] = useState<boolean | null>(null)
  const [shortAnswer, setShortAnswer] = useState("")
  const [shortSubmitted, setShortSubmitted] = useState(false)
  const [ranked, setRanked] = useState(() => options.map((option) => option.text))

  const selectedOption = selected !== null ? options[selected] : null
  const selectedCorrect = Boolean(selectedOption?.correct)
  const isRanking = interactionType === "ranking"
  const isShort = interactionType === "short-answer"
  const isTrueFalse = interactionType === "true-false"

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} fillAvailable={fillAvailable}>
      <div className="space-y-3">
        <p className="text-[13px] font-semibold leading-snug text-neutral-900">{prompt}</p>

        {!isRanking && !isShort && !isTrueFalse && (
          <div className="space-y-2">
            {options.map((option, index) => {
              const isSelected = selected === index
              return (
                <button
                  key={`${option.text}-${index}`}
                  type="button"
                  onClick={() => setSelected(index)}
                  className={[
                    "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-[12px] transition-colors",
                    isSelected
                      ? option.correct
                        ? "border-[#5c9970] bg-[#d6ede3]/55 text-[#2e6b4a]"
                        : "border-[#b87070] bg-[#f0d8d8]/55 text-[#8a3030]"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-[#9eb9da] hover:bg-[#dbe8f6]/35",
                  ].join(" ")}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-semibold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option.text}</span>
                </button>
              )
            })}
            {selectedOption && (
              <FieldHint tone={selectedCorrect ? "good" : "bad"}>
                {selectedOption.feedback || (selectedCorrect ? "Correct." : "Not quite. Review the prompt and try another evidence path.")}
              </FieldHint>
            )}
          </div>
        )}

        {isTrueFalse && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {([true, false] as const).map((value) => {
                const chosen = tfSelected === value
                const correct = value === tfCorrect
                return (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setTfSelected(value)}
                    className={[
                      "rounded-md border px-3 py-2 text-[12px] font-semibold transition-colors",
                      chosen
                        ? correct
                          ? "border-[#5c9970] bg-[#d6ede3]/55 text-[#2e6b4a]"
                          : "border-[#b87070] bg-[#f0d8d8]/55 text-[#8a3030]"
                        : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    {value ? "True" : "False"}
                  </button>
                )
              })}
            </div>
            {tfSelected !== null && (
              <FieldHint tone={tfSelected === tfCorrect ? "good" : "bad"}>
                {tfSelected === tfCorrect ? "Correct." : "Not quite."}
              </FieldHint>
            )}
          </div>
        )}

        {isShort && (
          <div className="space-y-2">
            <textarea
              value={shortAnswer}
              onChange={(event) => setShortAnswer(event.target.value)}
              rows={4}
              placeholder="Type a short response..."
              className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] leading-relaxed outline-none focus:border-[#9eb9da] focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShortSubmitted(true)}
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <Check size={13} /> Save response
            </button>
            {shortSubmitted && (
              <FieldHint tone="good">
                Response saved locally for this session. {sampleAnswer && `Teacher sample: ${sampleAnswer}`} {keywords && `Keywords: ${keywords}`}
              </FieldHint>
            )}
          </div>
        )}

        {isRanking && (
          <div className="space-y-2">
            {ranked.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-[12px] text-neutral-700">{item}</span>
                <button type="button" onClick={() => setRanked((current) => move(current, index, -1))} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => setRanked((current) => move(current, index, 1))} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                  <ArrowDown size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {hint && <FieldHint>{hint}</FieldHint>}
      </div>
    </ResourceCardFrame>
  )
}

export function FormActivityCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const fields = useMemo(() => parseFields(card.content.fields), [card.content.fields])
  const prompt = readString(card.content.prompt)
  const submitLabel = readString(card.content.submitLabel, "Submit")
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const missingRequired = fields.some((field) => field.required && !values[field.id]?.trim())

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} fillAvailable={fillAvailable}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!missingRequired) setSubmitted(true)
        }}
      >
        {prompt && <p className="text-[12px] leading-relaxed text-neutral-600">{prompt}</p>}
        {fields.map((field) => (
          <label key={field.id} className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              {field.label}{field.required ? " *" : ""}
            </span>
            {field.type === "textarea" ? (
              <textarea
                value={values[field.id] ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                rows={3}
                className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-[#9eb9da] focus:bg-white"
              />
            ) : field.type === "select" ? (
              <select
                value={values[field.id] ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                className="min-h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-[#9eb9da] focus:bg-white"
              >
                <option value="">Choose...</option>
                {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                value={values[field.id] ?? ""}
                onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                className="min-h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-[#9eb9da] focus:bg-white"
              />
            )}
          </label>
        ))}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={missingRequired}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={13} /> {submitLabel}
          </button>
          {submitted && <span className="text-[11px] font-medium text-[#2e6b4a]">Submitted</span>}
        </div>
      </form>
    </ResourceCardFrame>
  )
}

export function VoiceRecorderActivityCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const prompt = readString(card.content.prompt, "Record a spoken response.")
  const maxDuration = readNumber(card.content.maxDurationSeconds, 60)
  const [status, setStatus] = useState<"idle" | "recording" | "done" | "error">("idle")
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState("")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (status !== "recording") return
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current + 1 >= maxDuration) {
          recorderRef.current?.stop()
          return maxDuration
        }
        return current + 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [maxDuration, status])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  async function startRecording() {
    setError("")
    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setStatus("error")
      setError("Recording is not available in this browser.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        setAudioUrl((current) => {
          if (current) URL.revokeObjectURL(current)
          return URL.createObjectURL(blob)
        })
        stream.getTracks().forEach((track) => track.stop())
        setStatus("done")
      }
      setSeconds(0)
      setStatus("recording")
      recorder.start()
    } catch {
      setStatus("error")
      setError("Microphone permission was denied or unavailable.")
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
  }

  function resetRecording() {
    setStatus("idle")
    setSeconds(0)
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} fillAvailable={fillAvailable}>
      <div className="space-y-3">
        <p className="text-[12px] leading-relaxed text-neutral-600">{prompt}</p>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[22px] font-semibold text-neutral-800">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-neutral-400">Limit {maxDuration}s</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full rounded-full bg-[#00ccb3]" style={{ width: `${Math.min(100, (seconds / maxDuration) * 100)}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status !== "recording" ? (
            <button type="button" onClick={startRecording} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">
              <Mic size={13} /> Record
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#b87070] bg-[#f0d8d8]/55 px-3 py-2 text-[12px] font-semibold text-[#8a3030]">
              <Square size={13} /> Stop
            </button>
          )}
          {status === "done" && (
            <button type="button" onClick={resetRecording} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">
              <RotateCcw size={13} /> Retry
            </button>
          )}
        </div>
        {audioUrl && <audio controls src={audioUrl} className="w-full" />}
        {error && <FieldHint tone="bad">{error}</FieldHint>}
      </div>
    </ResourceCardFrame>
  )
}

function MatchActivity({ pairs }: { pairs: Pair[] }) {
  const matches = pairs.map((pair) => pair.match)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)

  return (
    <div className="space-y-2">
      {pairs.map((pair) => {
        const value = answers[pair.term] ?? ""
        const correct = value === pair.match
        return (
          <label key={pair.term} className="grid gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 md:grid-cols-[1fr_1.2fr] md:items-center">
            <span className="text-[12px] font-semibold text-neutral-700">{pair.term}</span>
            <select
              value={value}
              onChange={(event) => setAnswers((current) => ({ ...current, [pair.term]: event.target.value }))}
              className={[
                "min-h-8 rounded-md border bg-neutral-50 px-2 py-1 text-[12px] outline-none focus:border-[#9eb9da]",
                checked ? correct ? "border-[#5c9970]" : "border-[#b87070]" : "border-neutral-200",
              ].join(" ")}
            >
              <option value="">Choose match...</option>
              {matches.map((match) => <option key={match} value={match}>{match}</option>)}
            </select>
          </label>
        )
      })}
      <button type="button" onClick={() => setChecked(true)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">
        <Check size={13} /> Check matches
      </button>
      {checked && <FieldHint tone={pairs.every((pair) => answers[pair.term] === pair.match) ? "good" : "bad"}>Match check complete.</FieldHint>}
    </div>
  )
}

function OrderActivity({ items }: { items: string[] }) {
  const [order, setOrder] = useState(items)
  const [checked, setChecked] = useState(false)
  const correct = order.every((item, index) => item === items[index])

  return (
    <div className="space-y-2">
      {order.map((item, index) => (
        <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500">{index + 1}</span>
          <span className="min-w-0 flex-1 text-[12px] text-neutral-700">{item}</span>
          <button type="button" onClick={() => setOrder((current) => move(current, index, -1))} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
            <ArrowUp size={13} />
          </button>
          <button type="button" onClick={() => setOrder((current) => move(current, index, 1))} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
            <ArrowDown size={13} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setChecked(true)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">
        <Check size={13} /> Check order
      </button>
      {checked && <FieldHint tone={correct ? "good" : "bad"}>{correct ? "Correct order." : "Not in the target order yet."}</FieldHint>}
    </div>
  )
}

function FillBlankActivity({ text }: { text: string }) {
  const blanks = [...text.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1] ?? "")
  const display = text.replace(/\[[^\]]+\]/g, "_____")
  const [answers, setAnswers] = useState<string[]>(() => blanks.map(() => ""))
  const [checked, setChecked] = useState(false)
  const correct = blanks.every((blank, index) => answers[index]?.trim().toLowerCase() === blank.trim().toLowerCase())

  return (
    <div className="space-y-2">
      <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] leading-relaxed text-neutral-700">{display}</p>
      {blanks.map((blank, index) => (
        <input
          key={`${blank}-${index}`}
          value={answers[index] ?? ""}
          onChange={(event) => setAnswers((current) => current.map((answer, answerIndex) => answerIndex === index ? event.target.value : answer))}
          placeholder={`Blank ${index + 1}`}
          className="min-h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-[#9eb9da]"
        />
      ))}
      <button type="button" onClick={() => setChecked(true)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">
        <Check size={13} /> Check answers
      </button>
      {checked && <FieldHint tone={correct ? "good" : "bad"}>{correct ? "All blanks are correct." : "One or more blanks need revision."}</FieldHint>}
    </div>
  )
}

export function SorterActivityCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const pairs = parsePairs(card.content.pairs)
  const items = parseItems(card.content.items)
  const mode = readString(card.content.mode, pairs.length > 0 ? "match" : "order")

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} fillAvailable={fillAvailable}>
      <div className="space-y-3">
        {readString(card.content.instructions) && <p className="text-[12px] leading-relaxed text-neutral-600">{readString(card.content.instructions)}</p>}
        {mode === "match" && pairs.length > 0 ? <MatchActivity pairs={pairs} /> : <OrderActivity items={items.length > 0 ? items : pairs.map((pair) => pair.term)} />}
      </div>
    </ResourceCardFrame>
  )
}

export function GamesActivityCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const gameType = readString(card.content.gameType, "word-match")
  const pairs = parsePairs(card.content.pairs)
  const items = parseItems(card.content.items)
  const fillText = readString(card.content.fillText)

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} fillAvailable={fillAvailable}>
      <div className="space-y-3">
        {readString(card.content.instructions) && <p className="text-[12px] leading-relaxed text-neutral-600">{readString(card.content.instructions)}</p>}
        {(gameType === "word-match" || gameType === "memory") && <MatchActivity pairs={pairs} />}
        {gameType === "fill-blank" && <FillBlankActivity text={fillText || "Add [answers] in the Make panel."} />}
        {gameType === "drag-order" && <OrderActivity items={items.length > 0 ? items : pairs.map((pair) => pair.term)} />}
      </div>
    </ResourceCardFrame>
  )
}

export function FlashcardActivityCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const pairs = parsePairs(card.content.pairs)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const current = pairs[index] ?? { term: "Prompt", match: "Answer" }

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} fillAvailable={fillAvailable}>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setFlipped((currentValue) => !currentValue)}
          className="flex min-h-32 w-full items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-6 text-center transition-colors hover:bg-white"
        >
          <span className="text-[14px] font-semibold text-neutral-800">{flipped ? current.match : current.term}</span>
        </button>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => { setIndex((currentIndex) => Math.max(0, currentIndex - 1)); setFlipped(false) }} className="min-h-9 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">
            Previous
          </button>
          <span className="text-[11px] text-neutral-400">{index + 1} / {Math.max(1, pairs.length)}</span>
          <button type="button" onClick={() => { setIndex((currentIndex) => Math.min(Math.max(0, pairs.length - 1), currentIndex + 1)); setFlipped(false) }} className="min-h-9 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">
            Next
          </button>
        </div>
      </div>
    </ResourceCardFrame>
  )
}
