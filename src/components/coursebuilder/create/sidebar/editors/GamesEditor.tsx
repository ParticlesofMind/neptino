"use client"

import type { ComponentType } from "react"
import { Plus, Trash2, Gamepad2, ArrowUpDown, BookOpen, MousePointer, PenLine } from "lucide-react"

interface GamesEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type GameType = "word-match" | "memory" | "fill-blank" | "drag-order"

interface Pair {
  term: string
  match: string
}

function parsePairs(raw: unknown): Pair[] {
  if (!Array.isArray(raw)) return [{ term: "", match: "" }]
  return raw.map((p): Pair => ({
    term: typeof p === "object" && p !== null && "term" in p ? String((p as { term: unknown }).term) : "",
    match: typeof p === "object" && p !== null && "match" in p ? String((p as { match: unknown }).match) : "",
  }))
}

const GAME_TYPES: { id: GameType; label: string; description: string; Icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "word-match", label: "Word Match", description: "Match terms to definitions", Icon: BookOpen },
  { id: "memory", label: "Memory", description: "Flip & match card pairs", Icon: Gamepad2 },
  { id: "fill-blank", label: "Fill in the Blank", description: "Complete sentences with missing words", Icon: PenLine },
  { id: "drag-order", label: "Drag & Order", description: "Arrange items in correct sequence", Icon: ArrowUpDown },
]

function WordMatchEditor({ pairs, onChange }: { pairs: Pair[]; onChange: (p: Pair[]) => void }) {
  const addPair = () => {
    if (pairs.length >= 16) return
    onChange([...pairs, { term: "", match: "" }])
  }

  const removePair = (i: number) => {
    if (pairs.length <= 1) return
    onChange(pairs.filter((_, idx) => idx !== i))
  }

  const updatePair = (i: number, field: keyof Pair, value: string) => {
    onChange(pairs.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Term — Definition pairs</p>
        <button
          type="button"
          onClick={addPair}
          disabled={pairs.length >= 16}
          className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:border-[#4a94ff]/40 hover:text-[#4a94ff] disabled:opacity-40 transition-colors"
        >
          <Plus size={10} /> Add pair
        </button>
      </div>

      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="shrink-0 w-5 text-center text-[10px] font-mono text-neutral-400">{i + 1}</span>
            <input
              type="text"
              value={pair.term}
              onChange={(e) => updatePair(i, "term", e.target.value)}
              placeholder="Term"
              className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#4a94ff]/60 focus:ring-1 focus:ring-[#4a94ff]/10"
            />
            <span className="text-neutral-300">↔</span>
            <input
              type="text"
              value={pair.match}
              onChange={(e) => updatePair(i, "match", e.target.value)}
              placeholder="Definition / match"
              className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#4a94ff]/60 focus:ring-1 focus:ring-[#4a94ff]/10"
            />
            <button type="button" onClick={() => removePair(i)} disabled={pairs.length <= 1} className="shrink-0 text-neutral-400 hover:text-red-500 disabled:opacity-30 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function FillBlankEditor({ text, onChange }: { text: string; onChange: (t: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Text with blanks</p>
      <textarea
        value={text}
        rows={6}
        placeholder="The mitochondria is the [powerhouse] of the cell. It produces [ATP] through [cellular respiration]."
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13px] text-neutral-700 leading-relaxed outline-none focus:border-[#4a94ff]/60 focus:ring-1 focus:ring-[#4a94ff]/10"
      />
      <p className="rounded-lg bg-[#4a94ff]/5 border border-[#4a94ff]/10 px-3 py-2 text-[11px] text-[#4a94ff]">
        Wrap blank words in <span className="font-mono font-bold">[square brackets]</span> — students will fill them in.
      </p>
    </div>
  )
}

function DragOrderEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const addItem = () => {
    if (items.length >= 12) return
    onChange([...items, ""])
  }

  const removeItem = (i: number) => {
    if (items.length <= 2) return
    onChange(items.filter((_, idx) => idx !== i))
  }

  const updateItem = (i: number, value: string) => {
    onChange(items.map((item, idx) => idx === i ? value : item))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Items in correct order</p>
        <button
          type="button"
          onClick={addItem}
          disabled={items.length >= 12}
          className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:border-[#4a94ff]/40 hover:text-[#4a94ff] disabled:opacity-40 transition-colors"
        >
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500">{i + 1}</span>
            <MousePointer size={12} className="shrink-0 text-neutral-300" />
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={`Step ${i + 1}`}
              className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#4a94ff]/60 focus:ring-1 focus:ring-[#4a94ff]/10"
            />
            <button type="button" onClick={() => removeItem(i)} disabled={items.length <= 2} className="shrink-0 text-neutral-400 hover:text-red-500 disabled:opacity-30 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-neutral-400">Students drag items into the correct sequence. The order you define here is the correct answer.</p>
    </div>
  )
}

function parseItems(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  return ["", ""]
}

export function GamesEditor({ content, onChange }: GamesEditorProps) {
  const gameType = (typeof content.gameType === "string" ? content.gameType : "word-match") as GameType
  const title = typeof content.title === "string" ? content.title : ""
  const instructions = typeof content.instructions === "string" ? content.instructions : ""
  const timeLimit = typeof content.timeLimit === "number" ? content.timeLimit : 120
  const showHints = typeof content.showHints === "boolean" ? content.showHints : true
  const pairs = parsePairs(content.pairs)
  const fillText = typeof content.fillText === "string" ? content.fillText : ""
  const items = parseItems(content.items)

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Game type selector */}
      <div className="shrink-0 border-b border-neutral-100 px-4 pt-4 pb-3">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Game type</p>
        <div className="grid grid-cols-2 gap-2">
          {GAME_TYPES.map(({ id, label, description, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange("gameType", id)}
              className={[
                "flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all",
                gameType === id
                  ? "border-[#4a94ff]/30 bg-[#4a94ff]/5 shadow-sm"
                  : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
              ].join(" ")}
            >
              <Icon
                size={14}
                className={["mt-0.5 shrink-0", gameType === id ? "text-[#4a94ff]" : "text-neutral-400"].join(" ")}
              />
              <div>
                <p className={["text-[11px] font-semibold leading-tight", gameType === id ? "text-[#4a94ff]" : "text-neutral-700"].join(" ")}>
                  {label}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-neutral-400">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Title & instructions */}
      <div className="shrink-0 border-b border-neutral-100 px-4 py-3 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-neutral-600">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. Cell biology vocabulary match"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#4a94ff]/60 focus:ring-1 focus:ring-[#4a94ff]/10"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-neutral-600">Instructions <span className="text-neutral-400 font-normal">(shown to students)</span></span>
          <textarea
            value={instructions}
            rows={2}
            onChange={(e) => onChange("instructions", e.target.value)}
            placeholder="Match each term on the left to its definition on the right."
            className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#4a94ff]/60 focus:ring-1 focus:ring-[#4a94ff]/10"
          />
        </label>
      </div>

      {/* Game-specific content */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {(gameType === "word-match" || gameType === "memory") && (
          <WordMatchEditor
            pairs={pairs}
            onChange={(p) => onChange("pairs", p)}
          />
        )}
        {gameType === "fill-blank" && (
          <FillBlankEditor
            text={fillText}
            onChange={(t) => onChange("fillText", t)}
          />
        )}
        {gameType === "drag-order" && (
          <DragOrderEditor
            items={items}
            onChange={(i) => onChange("items", i)}
          />
        )}
      </div>

      {/* Settings */}
      <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-4 py-3 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Game settings</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-[11px] font-medium text-neutral-600">Time limit (s) <span className="text-neutral-400 font-normal">0 = unlimited</span></span>
            <input
              type="number"
              value={timeLimit}
              min={0}
              max={600}
              step={15}
              onChange={(e) => onChange("timeLimit", Number(e.target.value))}
              className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-[#4a94ff]/60"
            />
          </label>
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-neutral-600">Show hints</span>
            <button
              type="button"
              onClick={() => onChange("showHints", !showHints)}
              role="switch"
              aria-checked={showHints}
              className={[
                "relative h-7 w-12 rounded-full border transition-colors",
                showHints ? "border-[#4a94ff]/40 bg-[#4a94ff]" : "border-neutral-300 bg-neutral-200",
              ].join(" ")}
            >
              <span className={["absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", showHints ? "translate-x-6" : "translate-x-0.5"].join(" ")} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
