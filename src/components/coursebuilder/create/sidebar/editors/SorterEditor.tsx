"use client"

import { Plus, Trash2 } from "lucide-react"
import { EditorSplitLayout } from "./editor-split-layout"
import { GenericEditorPreview } from "./generic-editor-preview"
import { StudioInput, StudioSection, StudioSegment, StudioTextarea, StudioToggle } from "./studio-primitives"
import { MAKE_BLUE_INPUT_FOCUS } from "../make-theme"

interface SorterEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

interface Pair {
  term: string
  match: string
}

function parsePairs(raw: unknown): Pair[] {
  if (!Array.isArray(raw)) return [{ term: "", match: "" }]
  const pairs = raw
    .map((entry): Pair | null => {
      if (!entry || typeof entry !== "object") return null
      const data = entry as Record<string, unknown>
      return {
        term: typeof data.term === "string" ? data.term : "",
        match: typeof data.match === "string" ? data.match : "",
      }
    })
    .filter((pair): pair is Pair => pair !== null)
  return pairs.length > 0 ? pairs : [{ term: "", match: "" }]
}

function parseItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ["", ""]
  const items = raw.map(String)
  return items.length > 0 ? items : ["", ""]
}

export function SorterEditor({ content, onChange }: SorterEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const instructions = typeof content.instructions === "string" ? content.instructions : ""
  const mode = typeof content.mode === "string" ? content.mode : "match"
  const showHints = typeof content.showHints === "boolean" ? content.showHints : true
  const pairs = parsePairs(content.pairs)
  const items = parseItems(content.items)

  const setPairs = (next: Pair[]) => onChange("pairs", next)
  const setItems = (next: string[]) => onChange("items", next)

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[34rem] md:flex-none xl:w-[36rem]"
      sidebar={(
        <div className="flex h-full flex-col overflow-auto bg-white">
          <StudioSection className="pt-4">
            <StudioSegment
              label="Activity mode"
              options={[
                { value: "match", label: "Match" },
                { value: "order", label: "Order" },
              ]}
              value={mode}
              onChange={(next) => onChange("mode", next)}
              size="xs"
            />
          </StudioSection>

          <StudioSection label="Setup">
            <StudioInput
              label="Title"
              value={title}
              placeholder="Sort the evidence"
              onChange={(event) => onChange("title", event.target.value)}
            />
            <StudioTextarea
              label="Instructions"
              rows={2}
              value={instructions}
              placeholder="Tell students what to match or order."
              onChange={(event) => onChange("instructions", event.target.value)}
            />
          </StudioSection>

          {mode === "match" ? (
            <StudioSection
              label="Pairs"
              action={(
                <button
                  type="button"
                  onClick={() => setPairs([...pairs, { term: "", match: "" }])}
                  className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  <Plus size={10} /> Add
                </button>
              )}
            >
              <div className="space-y-2">
                {pairs.map((pair, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={pair.term}
                      onChange={(event) => setPairs(pairs.map((entry, pairIndex) => pairIndex === index ? { ...entry, term: event.target.value } : entry))}
                      placeholder="Term"
                      className={`min-h-10 min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
                    />
                    <input
                      value={pair.match}
                      onChange={(event) => setPairs(pairs.map((entry, pairIndex) => pairIndex === index ? { ...entry, match: event.target.value } : entry))}
                      placeholder="Match"
                      className={`min-h-10 min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
                    />
                    <button
                      type="button"
                      onClick={() => setPairs(pairs.filter((_, pairIndex) => pairIndex !== index))}
                      disabled={pairs.length <= 1}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </StudioSection>
          ) : (
            <StudioSection
              label="Correct order"
              action={(
                <button
                  type="button"
                  onClick={() => setItems([...items, ""])}
                  className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  <Plus size={10} /> Add
                </button>
              )}
            >
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-500">{index + 1}</span>
                    <input
                      value={item}
                      onChange={(event) => setItems(items.map((entry, itemIndex) => itemIndex === index ? event.target.value : entry))}
                      placeholder={`Item ${index + 1}`}
                      className={`min-h-10 min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
                    />
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}
                      disabled={items.length <= 2}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </StudioSection>
          )}

          <StudioSection label="Assistance" noBorder>
            <StudioToggle label="Show hints" checked={showHints} onChange={(value) => onChange("showHints", value)} />
          </StudioSection>
        </div>
      )}
      preview={<GenericEditorPreview cardType="sorter" content={content} onTitleChange={(next) => onChange("title", next)} />}
    />
  )
}
