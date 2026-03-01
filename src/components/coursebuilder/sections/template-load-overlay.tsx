"use client"

import { Trash2 } from "lucide-react"
import { OverlineLabel } from "@/components/ui/overline-label"
import {
  DANGER_ACTION_BUTTON_SM_CLASS,
  PRIMARY_ACTION_BUTTON_CLASS,
} from "@/components/coursebuilder/layout-primitives"
import { normalizeTemplate, type LocalTemplate } from "./template-section-data"
import { TEMPLATE_TYPE_META } from "./template-section-meta"

interface Props {
  templates: LocalTemplate[]
  pendingLoadId: string | null
  setPendingLoadId: (id: string | null) => void
  confirmDelete: boolean
  setConfirmDelete: (v: boolean) => void
  onDelete: () => void
  onCancel: () => void
  onLoad: () => void
  onEditTemplate: (tpl: LocalTemplate) => void
  formatTemplateDate: (ts?: string) => string
}

export function TemplateLoadOverlay({
  templates,
  pendingLoadId,
  setPendingLoadId,
  confirmDelete,
  setConfirmDelete,
  onDelete,
  onCancel,
  onLoad,
  onEditTemplate,
  formatTemplateDate,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] max-h-[860px] w-full max-w-xl flex-col rounded-xl border border-border bg-background p-5 shadow-lg">
        <OverlineLabel className="mb-3">Load Template</OverlineLabel>

        <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
          {templates.map(tplRaw => {
            const tpl = normalizeTemplate(tplRaw)
            const meta = TEMPLATE_TYPE_META[tpl.type]
            const selected = pendingLoadId === tpl.id
            return (
              <div
                key={tpl.id}
                onClick={() => { setPendingLoadId(tpl.id); setConfirmDelete(false) }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left text-sm transition ${
                  selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <div className="text-foreground">{meta.icon}</div>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.badge}`}>{meta.label}</span>
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{tpl.name}</span>
                  <span className="block text-[11px] text-muted-foreground">Created: {formatTemplateDate(tpl.createdAt)}</span>
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onEditTemplate(tpl) }}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-primary/30"
                >
                  Edit
                </button>
              </div>
            )
          })}
        </div>

        {confirmDelete && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            Are you sure you want to delete this template?
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (!pendingLoadId) return
              if (!confirmDelete) { setConfirmDelete(true); return }
              onDelete()
            }}
            disabled={!pendingLoadId}
            className={`${DANGER_ACTION_BUTTON_SM_CLASS} inline-flex h-9 w-9 items-center justify-center p-0`}
            aria-label="Delete selected template"
            title="Delete selected template"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onLoad}
              disabled={!pendingLoadId}
              className={PRIMARY_ACTION_BUTTON_CLASS}
            >
              Load Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
