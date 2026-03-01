"use client"

import { GripVertical } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import { BLOCK_FIELDS, type BlockId, type TemplateBlockConfig, type TemplateFieldState } from "./template-section-data"
import { BLOCK_META } from "./template-section-meta"

interface Props {
  block: TemplateBlockConfig
  configType: TemplateType
  configEnabled: Record<BlockId, boolean>
  configFieldEnabled: TemplateFieldState
  onToggleBlock: (id: BlockId) => void
  onToggleField: (blockId: BlockId, fieldKey: string) => void
}

export function SortableBlockCard({
  block,
  configType,
  configEnabled,
  configFieldEnabled,
  onToggleBlock,
  onToggleField,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })

  const style = { transform: CSS.Transform.toString(transform), transition }
  const requiredFields = BLOCK_FIELDS[block.id].filter(f => f.forTypes.includes(configType) && f.required)
  const optionalFields = BLOCK_FIELDS[block.id].filter(f => f.forTypes.includes(configType) && !f.required)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-border bg-background p-4 shadow-sm ${isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={`Reorder ${block.label}`}
          className="mt-0.5 flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="mt-0.5 flex-shrink-0 text-muted-foreground">{BLOCK_META[block.id].icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{block.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">{block.description}</p>
        </div>
      </div>

      {!block.mandatory && (
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="checkbox"
            checked={configEnabled[block.id]}
            onChange={() => onToggleBlock(block.id)}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-xs font-medium text-muted-foreground">Include in template</span>
        </div>
      )}

      {(configEnabled[block.id] || block.mandatory) && (
        <div className="mt-3 rounded-lg border border-border/70 bg-muted/5 p-3">
          <div className="space-y-3">
            {requiredFields.length > 0 && (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {requiredFields.map(field => (
                  <label key={field.key} className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-xs text-foreground/80 cursor-not-allowed">
                    <input type="checkbox" checked disabled className="h-3 w-3 accent-primary" />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            )}
            {optionalFields.length > 0 && (
              <div>
                {requiredFields.length > 0 && <div className="border-t border-border/40 pt-2.5" />}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  {optionalFields.map(field => (
                    <label key={field.key} className="flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-xs text-foreground/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(configFieldEnabled[block.id]?.[field.key])}
                        onChange={() => onToggleField(block.id, field.key)}
                        className="h-3 w-3 accent-primary"
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
