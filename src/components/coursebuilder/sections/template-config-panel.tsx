"use client"

import { Plus, X } from "lucide-react"

import {
  CUSTOM_PARTITION_PRESET_ID,
  TEMPLATE_PARTITION_PRESETS,
  getPartitionPresetId,
  resolveTemplatePartitions,
} from "@/lib/curriculum/template-partitions"
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
const TEMPLATE_BLUE_ACTIVE = "border-[#9eb9da] bg-[#dbe8f6] text-[#3a6ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
const BLOCK_DIVISION_COPY: Partial<Record<BlockId, string>> = {
  content: "These divisions become the content work areas for each task on the canvas.",
  assignment: "These divisions become the assignment work areas for each task on the canvas.",
}

export function TemplateConfigPanel({
  blocks,
  fieldDefs,
  fieldState,
  onToggleOptional,
  onApplyPartitionPreset,
  onRenamePartition,
  onAddPartition,
  onRemovePartition,
}: {
  blocks: BlockId[]
  fieldDefs: Record<BlockId, TemplateFieldDef[]>
  fieldState: TemplateFieldState
  onToggleOptional: (block: BlockId, key: string, checked: boolean) => void
  onApplyPartitionPreset: (block: BlockId, presetId: string) => void
  onRenamePartition: (block: BlockId, partitionId: string, label: string) => void
  onAddPartition: (block: BlockId) => void
  onRemovePartition: (block: BlockId, partitionId: string) => void
}) {
  return (
    <div className="space-y-2">
      {blocks.map((block) => {
        const hasSplitMode = SPLIT_MODE_BLOCKS.includes(block)
        const blockFieldState = fieldState[block] as Record<string, unknown> | undefined
        const presetId = hasSplitMode ? getPartitionPresetId(blockFieldState) : "single"
        const partitions = hasSplitMode ? resolveTemplatePartitions(blockFieldState, block) : []
        const isCustom = presetId === CUSTOM_PARTITION_PRESET_ID

        return (
          <div key={block} className="py-2 border-b border-border last:border-b-0">
            <p className="text-[11px] font-semibold text-foreground">{BLOCK_LABELS[block] ?? block}</p>

            {hasSplitMode && (
              <div className="mt-2 space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Content divisions
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {BLOCK_DIVISION_COPY[block]}
                  </p>
                </div>

                <div className="grid gap-1.5">
                  {TEMPLATE_PARTITION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyPartitionPreset(block, preset.id)}
                      aria-pressed={presetId === preset.id}
                      className={[
                        "rounded-md border px-2.5 py-2 text-left transition-colors",
                        presetId === preset.id
                          ? TEMPLATE_BLUE_ACTIVE
                          : "bg-background text-muted-foreground border-border hover:border-[#9eb9da] hover:bg-[#dbe8f6]/45 hover:text-[#3a6ea0]",
                      ].join(" ")}
                    >
                      <span className="block text-[11px] font-semibold text-foreground">
                        {preset.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                        {preset.tradition}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onApplyPartitionPreset(block, CUSTOM_PARTITION_PRESET_ID)}
                    aria-pressed={isCustom}
                    className={[
                      "rounded-md border px-2.5 py-2 text-left transition-colors",
                      isCustom
                        ? TEMPLATE_BLUE_ACTIVE
                        : "bg-background text-muted-foreground border-border hover:border-[#9eb9da] hover:bg-[#dbe8f6]/45 hover:text-[#3a6ea0]",
                    ].join(" ")}
                  >
                    <span className="block text-[11px] font-semibold text-foreground">
                      Custom
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                      Teacher-defined sequence
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                      Name your own task areas when a course uses a local teaching routine or a discipline-specific studio workflow.
                    </span>
                  </button>
                </div>

                {isCustom && (
                  <div className="space-y-1.5">
                    {partitions.map((partition, index) => (
                      <div key={partition.id} className="flex items-center gap-1.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/30 text-[10px] text-muted-foreground">
                          {index + 1}
                        </span>
                        <input
                          aria-label={`${BLOCK_LABELS[block] ?? block} partition ${index + 1}`}
                          value={partition.label}
                          onChange={(event) => onRenamePartition(block, partition.id, event.target.value)}
                          className="h-7 min-w-0 flex-1 rounded border border-border bg-background px-2 text-[11px] text-foreground outline-none focus:border-[#9eb9da] focus:ring-2 focus:ring-[#dbe8f6]"
                        />
                        {partitions.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove ${partition.label}`}
                            onClick={() => onRemovePartition(block, partition.id)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => onAddPartition(block)}
                      className="inline-flex h-7 items-center gap-1.5 rounded border border-border bg-background px-2 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                    >
                      <Plus size={12} />
                      Add partition
                    </button>
                  </div>
                )}
              </div>
            )}

            {!hasSplitMode && (
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
                        className="h-3.5 w-3.5 rounded border-border accent-[#3a6ea0] disabled:opacity-100"
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
