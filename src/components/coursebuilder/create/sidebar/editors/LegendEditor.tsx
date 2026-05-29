"use client"

import { Plus, Trash2 } from "lucide-react"
import { CardTypePreview } from "../../cards/CardTypePreview"
import { EditorPreviewFrame } from "./editor-preview-frame"
import { EditorSplitLayout } from "./editor-split-layout"
import {
  StudioFieldGrid,
  StudioInput,
  StudioSection,
  StudioSelect,
} from "./studio-primitives"

interface LegendEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

interface LegendItem {
  color: string
  label: string
  description: string
  value?: string | number
}

function parseItems(value: unknown): LegendItem[] {
  if (!Array.isArray(value)) {
    return [
      { color: "#2563eb", label: "Layer", description: "Layer description" },
    ]
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((item) => ({
      color: typeof item.color === "string" ? item.color : "#94a3b8",
      label: typeof item.label === "string" ? item.label : "",
      description: typeof item.description === "string" ? item.description : "",
      value: typeof item.value === "string" || typeof item.value === "number" ? item.value : undefined,
    }))
}

export function LegendEditor({ content, onChange }: LegendEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const layout = typeof content.layout === "string" ? content.layout : "list"
  const items = parseItems(content.items)

  const updateItem = (index: number, patch: Partial<LegendItem>) => {
    onChange("items", items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const addItem = () => {
    onChange("items", [...items, { color: "#94a3b8", label: `Item ${items.length + 1}`, description: "" }])
  }

  const removeItem = (index: number) => {
    onChange("items", items.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[30rem] md:flex-none xl:w-[34rem]"
      sidebar={(
        <div className="h-full min-h-0 overflow-y-auto bg-white">
          <StudioSection label="Legend" priority="primary">
            <StudioInput label="Title" value={title} onChange={(event) => onChange("title", event.target.value)} />
            <StudioSelect label="Layout" value={layout} onChange={(event) => onChange("layout", event.target.value)}>
              <option value="list">List</option>
              <option value="chips">Chips</option>
              <option value="grid">Grid</option>
            </StudioSelect>
          </StudioSection>

          <StudioSection
            label="Items"
            action={(
              <button
                type="button"
                onClick={addItem}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                <Plus size={11} />
                Item
              </button>
            )}
          >
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.label}-${index}`} className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Item {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded p-1 text-neutral-400 hover:bg-white hover:text-destructive"
                        aria-label="Remove legend item"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <StudioFieldGrid>
                    <StudioInput
                      label="Colour"
                      type="color"
                      value={item.color}
                      onChange={(event) => updateItem(index, { color: event.target.value })}
                      className="h-10 px-1 py-1"
                    />
                    <StudioInput
                      label="Label"
                      value={item.label}
                      onChange={(event) => updateItem(index, { label: event.target.value })}
                    />
                  </StudioFieldGrid>
                  <div className="mt-2">
                    <StudioInput
                      label="Description"
                      value={item.description}
                      onChange={(event) => updateItem(index, { description: event.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </StudioSection>
        </div>
      )}
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType="legend"
            title={title}
            onTitleChange={(next) => onChange("title", next)}
            className="w-full max-w-2xl"
            bodyClassName="p-5"
          >
            <CardTypePreview cardType="legend" content={content} hideTitle />
          </EditorPreviewFrame>
        </div>
      )}
    />
  )
}
