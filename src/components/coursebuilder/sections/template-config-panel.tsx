"use client"

import type { BlockId, TemplateFieldDef, TemplateFieldState } from "./template-fields"

const BLOCK_LABELS: Partial<Record<BlockId, string>> = {
  header: "Header",
  program: "Program",
  resources: "Resources",
  content: "Content",
  assignment: "Assignment",
  footer: "Footer",
}

const SPLIT_MODE_BLOCKS: BlockId[] = ["content", "assignment"]

export function TemplateConfigPanel({
  blocks,
  fieldDefs,
  fieldState,
  onToggleOptional,
}: {
  blocks: BlockId[]
  fieldDefs: Record<BlockId, TemplateFieldDef[]>
  fieldState: TemplateFieldState
  onToggleOptional: (block: BlockId, key: string, checked: boolean) => void
}) {
  return (
    <div className="space-y-2">
      {blocks.map((block) => {
        const hasSplitMode = SPLIT_MODE_BLOCKS.includes(block)
        const isSplit = hasSplitMode ? Boolean(fieldState[block]?.["_split"]) : false

        return (
          <div key={block} className="py-2 border-b border-border last:border-b-0">
            <p className="text-[11px] font-semibold text-foreground">{BLOCK_LABELS[block] ?? block}</p>

            {hasSplitMode && (
              <div className="mt-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleOptional(block, "_split", false)}
                  className={[
                    "rounded px-2 py-0.5 text-[11px] border transition-colors",
                    !isSplit
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30",
                  ].join(" ")}
                >
                  Single field
                </button>
                <button
                  type="button"
                  onClick={() => onToggleOptional(block, "_split", true)}
                  className={[
                    "rounded px-2 py-0.5 text-[11px] border transition-colors",
                    isSplit
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30",
                  ].join(" ")}
                >
                  Three phases
                </button>
              </div>
            )}

            {(!hasSplitMode || isSplit) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {(fieldDefs[block] ?? []).map((field) => {
                  const checked = field.required ? true : Boolean(fieldState[block]?.[field.key])
                  return (
                    <label key={field.key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={field.required}
                        onChange={(e) => onToggleOptional(block, field.key, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary disabled:opacity-100"
                      />
                      <span>
                        {field.label}
                        <span className="ml-1 text-[10px] text-muted-foreground/70">
                          {field.required ? "(mandatory)" : "(optional)"}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
