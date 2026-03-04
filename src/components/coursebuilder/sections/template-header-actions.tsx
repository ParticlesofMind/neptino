"use client"

import {
  PRIMARY_ACTION_BUTTON_CLASS,
  SECONDARY_ACTION_BUTTON_CLASS,
} from "@/components/coursebuilder"
import type { SetupTemplateType } from "./templates-section"

interface SavedTemplate {
  id: string
  type: SetupTemplateType
  label: string
  description?: string
}

export function TemplateHeaderActions({
  canCreate,
  canLoad,
  showCreatePopup,
  showLoadPopup,
  templateTypes,
  createType,
  createName,
  createDescription,
  selectedLoadTemplateId,
  savedTemplates,
  onOpenCreate,
  onOpenLoad,
  onCloseCreate,
  onCloseLoad,
  onChangeCreateType,
  onChangeCreateName,
  onChangeCreateDescription,
  onChangeSelectedLoadTemplate,
  onCreate,
  onLoad,
}: {
  canCreate: boolean
  canLoad: boolean
  showCreatePopup: boolean
  showLoadPopup: boolean
  templateTypes: SetupTemplateType[]
  createType: SetupTemplateType
  createName: string
  createDescription: string
  selectedLoadTemplateId: string
  savedTemplates: SavedTemplate[]
  onOpenCreate: () => void
  onOpenLoad: () => void
  onCloseCreate: () => void
  onCloseLoad: () => void
  onChangeCreateType: (value: SetupTemplateType) => void
  onChangeCreateName: (value: string) => void
  onChangeCreateDescription: (value: string) => void
  onChangeSelectedLoadTemplate: (id: string) => void
  onCreate: () => void
  onLoad: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={onOpenCreate}
          disabled={!canCreate}
          className={PRIMARY_ACTION_BUTTON_CLASS}
        >
          Create Template
        </button>
        {showCreatePopup && (
          <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-border bg-background p-3 shadow-lg">
            <p className="text-xs font-semibold text-foreground">Create template</p>
            <div className="mt-2 space-y-2.5">
              <label className="block text-xs text-muted-foreground">
                Template type
                <select
                  value={createType}
                  onChange={(e) => onChangeCreateType(e.target.value as SetupTemplateType)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  {templateTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-muted-foreground">
                Template name
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => onChangeCreateName(e.target.value)}
                  placeholder="Lesson"
                  className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Description (optional)
                <textarea
                  rows={3}
                  value={createDescription}
                  onChange={(e) => onChangeCreateDescription(e.target.value)}
                  placeholder="Short description"
                  className="mt-1 w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground" onClick={onCloseCreate}>Cancel</button>
                <button type="button" className="rounded-md border border-[#93C5FD]/70 bg-[#BFDBFE]/70 px-2.5 py-1.5 text-xs font-medium text-[#1E3A8A]" onClick={onCreate}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={onOpenLoad}
          disabled={!canLoad}
          className={SECONDARY_ACTION_BUTTON_CLASS}
        >
          Load Template
        </button>
        {showLoadPopup && (
          <div className="absolute right-0 z-30 mt-2 w-80 rounded-lg border border-border bg-background p-3 shadow-lg">
            <p className="text-xs font-semibold text-foreground">Load template</p>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {savedTemplates.map((template) => (
                <label key={template.id} className="flex cursor-pointer items-start gap-2 rounded border border-border p-2 text-xs">
                  <input
                    type="radio"
                    name="load-template"
                    checked={selectedLoadTemplateId === template.id}
                    onChange={() => onChangeSelectedLoadTemplate(template.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium text-foreground">{template.label}</span>
                    <span className="block text-muted-foreground capitalize">{template.type}</span>
                    {template.description && <span className="block text-muted-foreground">{template.description}</span>}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground" onClick={onCloseLoad}>Cancel</button>
              <button type="button" className="rounded-md border border-[#86EFAC]/70 bg-[#BBF7D0]/70 px-2.5 py-1.5 text-xs font-medium text-[#166534]" onClick={onLoad}>Load</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
