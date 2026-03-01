"use client"

import { OverlineLabel } from "@/components/ui/overline-label"
import { PRIMARY_ACTION_BUTTON_CLASS } from "@/components/coursebuilder/layout-primitives"
import { TEMPLATE_TYPES } from "./template-section-data"
import { TEMPLATE_TYPE_META } from "./template-section-meta"
import type { TemplateType } from "@/lib/curriculum/template-blocks"

interface Props {
  isCreating: boolean
  pendingTypeSelection: TemplateType | null
  setPendingTypeSelection: (t: TemplateType | null) => void
  configName: string
  setConfigName: (v: string) => void
  configDesc: string
  setConfigDesc: (v: string) => void
  onCancel: () => void
  onConfirm: () => void
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
    />
  )
}

export function TemplateTypeOverlay({
  isCreating,
  pendingTypeSelection,
  setPendingTypeSelection,
  configName,
  setConfigName,
  configDesc,
  setConfigDesc,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] max-h-[860px] w-full max-w-xl flex-col rounded-xl border border-border bg-background p-5 shadow-lg">
        <OverlineLabel className="mb-3">Pick Template Type</OverlineLabel>

        <div className="no-scrollbar mb-4 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATE_TYPES.map(t => {
              const meta = TEMPLATE_TYPE_META[t]
              const selected = pendingTypeSelection === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPendingTypeSelection(t)}
                  className={`rounded-lg border bg-background px-3 py-3 text-left transition ${
                    selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0 text-foreground">{meta.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className={!pendingTypeSelection ? "opacity-60" : ""}>
            <FieldLabel>Template Name</FieldLabel>
            <TextInput
              value={configName}
              onChange={e => setConfigName(e.target.value.slice(0, 60))}
              placeholder="e.g., Standard Lesson"
              disabled={!pendingTypeSelection}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{configName.length} / 60</p>
          </div>

          <div className={!pendingTypeSelection ? "opacity-60" : ""}>
            <FieldLabel hint="optional">Description</FieldLabel>
            <TextInput
              value={configDesc}
              onChange={e => setConfigDesc(e.target.value.slice(0, 120))}
              placeholder="Brief description of this template"
              disabled={!pendingTypeSelection}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!pendingTypeSelection || !configName.trim()}
            className={PRIMARY_ACTION_BUTTON_CLASS}
          >
            {isCreating ? "Create Template" : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  )
}
