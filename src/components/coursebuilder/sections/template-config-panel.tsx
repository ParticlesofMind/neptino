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
      {blocks.map((block) => (
        <div key={block} className="py-2 border-b border-border last:border-b-0">
          <p className="text-[11px] font-semibold text-foreground">{BLOCK_LABELS[block] ?? block}</p>
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
        </div>
      ))}
    </div>
  )
}
