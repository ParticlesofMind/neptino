"use client"

import type { ComponentType } from "react"
import { Plus, Trash2, Gamepad2, ArrowUpDown, BookOpen, MousePointer, PenLine } from "lucide-react"
import {
  StudioSection,
  StudioSegment,
  StudioInput,
  StudioTextarea,
  StudioNumberInput,
  StudioToggle,
} from "./studio-primitives"
import { EditorSplitLayout } from "./editor-split-layout"
import { GenericEditorPreview } from "./generic-editor-preview"
import { MAKE_BLUE_BADGE, MAKE_BLUE_INPUT_FOCUS, MAKE_BLUE_TEXT } from "../make-theme"

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
          className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-medium text-neutral-600 transition-colors hover:border-[#9eb9da] hover:bg-[#dbe8f6]/45 hover:text-[#233f5d] disabled:opacity-40"
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
              className={`min-h-10 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
            />
            <span className="text-neutral-300">↔</span>
            <input
              type="text"
              value={pair.match}
              onChange={(e) => updatePair(i, "match", e.target.value)}
              placeholder="Definition / match"
              className={`min-h-10 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
            />
            <button type="button" onClick={() => removePair(i)} disabled={pairs.length <= 1} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30">
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
        className={`w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13px] text-neutral-700 leading-relaxed outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
      />
      <p className={["rounded-lg border px-3 py-2 text-[11px]", MAKE_BLUE_BADGE].join(" ")}>
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
          className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-medium text-neutral-600 transition-colors hover:border-[#9eb9da] hover:bg-[#dbe8f6]/45 hover:text-[#233f5d] disabled:opacity-40"
        >
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500">{i + 1}</span>
            <MousePointer size={12} className="shrink-0 text-neutral-300" />
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={`Step ${i + 1}`}
              className={`min-h-10 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
            />
            <button type="button" onClick={() => removeItem(i)} disabled={items.length <= 2} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30">
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
    <EditorSplitLayout
      sidebar={(
        <div className="flex h-full flex-col overflow-auto bg-white">

          <StudioSection className="pt-4">
            <StudioSegment
              label="Game type"
              options={GAME_TYPES.map(({ id, label }) => ({ value: id, label }))}
              value={gameType}
              onChange={(t) => onChange("gameType", t)}
              size="xs"
            />
          </StudioSection>

          <StudioSection label="Setup">
        <StudioInput
          label="Title"
          value={title}
          placeholder="e.g. Cell biology vocabulary match"
          onChange={(e) => onChange("title", e.target.value)}
        />
        <StudioTextarea
          label="Instructions"
          badge="shown to students"
          value={instructions}
          rows={2}
          placeholder="Match each term on the left to its definition on the right."
          onChange={(e) => onChange("instructions", e.target.value)}
        />
          </StudioSection>

          <div className="flex-1 overflow-auto px-4 py-4">
            {(gameType === "word-match" || gameType === "memory") && (
              <WordMatchEditor pairs={pairs} onChange={(p) => onChange("pairs", p)} />
            )}
            {gameType === "fill-blank" && (
              <FillBlankEditor text={fillText} onChange={(t) => onChange("fillText", t)} />
            )}
            {gameType === "drag-order" && (
              <DragOrderEditor items={items} onChange={(i) => onChange("items", i)} />
            )}
          </div>

          <div className="shrink-0 border-t border-neutral-100 bg-neutral-50 px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StudioNumberInput
                label="Time limit (s)"
                value={timeLimit}
                min={0}
                max={600}
                step={15}
                unit="0 = unlimited"
                onChange={(v) => onChange("timeLimit", v)}
              />
              <StudioToggle
                label="Show hints"
                checked={showHints}
                onChange={(v) => onChange("showHints", v)}
              />
            </div>
          </div>
        </div>
      )}
      preview={<GenericEditorPreview cardType="games" content={content} onTitleChange={(next) => onChange("title", next)} maxWidthClassName="max-w-4xl" />}
    />
  )
}
