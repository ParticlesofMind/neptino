"use client"

import { Plus, Trash2 } from "lucide-react"
import { EditorSplitLayout } from "./editor-split-layout"
import { GenericEditorPreview } from "./generic-editor-preview"
import { StudioInput, StudioSection, StudioSelect, StudioTextarea, StudioToggle } from "./studio-primitives"

interface FormEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
}

function parseFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return [{ id: "response", label: "Response", type: "textarea", required: true }]
  const fields = raw
    .map((entry, index): FormField | null => {
      if (!entry || typeof entry !== "object") return null
      const data = entry as Record<string, unknown>
      return {
        id: typeof data.id === "string" ? data.id : `field-${index + 1}`,
        label: typeof data.label === "string" ? data.label : "",
        type: typeof data.type === "string" ? data.type : "text",
        required: Boolean(data.required),
      }
    })
    .filter((field): field is FormField => field !== null)
  return fields.length > 0 ? fields : [{ id: "response", label: "Response", type: "textarea", required: true }]
}

export function FormEditor({ content, onChange }: FormEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const prompt = typeof content.prompt === "string" ? content.prompt : ""
  const submitLabel = typeof content.submitLabel === "string" ? content.submitLabel : "Submit"
  const fields = parseFields(content.fields)

  const setFields = (next: FormField[]) => onChange("fields", next)
  const updateField = (index: number, patch: Partial<FormField>) => {
    setFields(fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field))
  }

  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[34rem] md:flex-none xl:w-[36rem]"
      sidebar={(
        <div className="flex h-full flex-col overflow-auto bg-white">
          <StudioSection label="Form setup" className="pt-4">
            <StudioInput
              label="Title"
              value={title}
              placeholder="Exit ticket"
              onChange={(event) => onChange("title", event.target.value)}
            />
            <StudioTextarea
              label="Prompt"
              rows={3}
              value={prompt}
              placeholder="What should learners submit?"
              onChange={(event) => onChange("prompt", event.target.value)}
            />
            <StudioInput
              label="Submit label"
              value={submitLabel}
              onChange={(event) => onChange("submitLabel", event.target.value)}
            />
          </StudioSection>

          <StudioSection
            label="Fields"
            action={(
              <button
                type="button"
                onClick={() => setFields([...fields, { id: `field-${fields.length + 1}`, label: "", type: "text", required: false }])}
                className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                <Plus size={10} /> Add
              </button>
            )}
            noBorder
          >
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={`${field.id}-${index}`} className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_8rem_auto_auto] md:items-end">
                    <StudioInput
                      label="Label"
                      value={field.label}
                      placeholder={`Field ${index + 1}`}
                      onChange={(event) => updateField(index, { label: event.target.value })}
                    />
                    <StudioSelect
                      label="Type"
                      value={field.type}
                      onChange={(event) => updateField(index, { type: event.target.value })}
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Long text</option>
                      <option value="number">Number</option>
                    </StudioSelect>
                    <StudioToggle
                      label="Required"
                      checked={field.required}
                      onChange={(required) => updateField(index, { required })}
                    />
                    <button
                      type="button"
                      onClick={() => setFields(fields.filter((_, fieldIndex) => fieldIndex !== index))}
                      disabled={fields.length <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </StudioSection>
        </div>
      )}
      preview={<GenericEditorPreview cardType="form" content={content} onTitleChange={(next) => onChange("title", next)} />}
    />
  )
}
