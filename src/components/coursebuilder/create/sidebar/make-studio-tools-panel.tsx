"use client"

import type { CardType } from "../types"
import { getStudioProfile, type StudioField } from "./make-studio-tools"

interface MakeStudioToolsPanelProps {
  cardType: CardType
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  layout?: "summary" | "options"
}

const UPLOAD_ENABLED_TYPES = new Set<CardType>([
  "image",
  "audio",
  "video",
  "animation",
  "model-3d",
  "document",
  "media",
])

function uploadLabelFor(cardType: CardType): string {
  if (cardType === "image") return "Upload image"
  if (cardType === "audio") return "Upload audio"
  if (cardType === "video") return "Upload video"
  if (cardType === "animation") return "Upload animation"
  if (cardType === "model-3d") return "Upload 3D model"
  if (cardType === "document" || cardType === "media") return "Upload file"
  return "Upload"
}

function TextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder?: string
  onChange: (next: string) => void
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border border-neutral-200 bg-white px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
    />
  )
}

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (next: number) => void
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full border border-neutral-200 bg-white px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
    />
  )
}

function OptionField({
  field,
  value,
  onChange,
}: {
  field: StudioField
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <label key={field.key} className="block space-y-1">
      <span className="text-[11px] font-medium text-neutral-600">{field.label}</span>

      {field.kind === "text" && (
        <TextInput
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(next) => onChange(field.key, next)}
        />
      )}

      {field.kind === "textarea" && (
        <textarea
          value={typeof value === "string" ? value : ""}
          rows={field.rows ?? 4}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.key, event.target.value)}
          className="w-full border border-neutral-200 bg-white px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
        />
      )}

      {field.kind === "number" && (
        <NumberInput
          value={typeof value === "number" ? value : 0}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(next) => onChange(field.key, Number.isFinite(next) ? next : 0)}
        />
      )}

      {field.kind === "select" && (
        <select
          value={typeof value === "string" ? value : (field.options?.[0]?.value ?? "")}
          onChange={(event) => onChange(field.key, event.target.value)}
          className="w-full border border-neutral-200 bg-white px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.kind === "toggle" && (
        <button
          type="button"
          onClick={() => onChange(field.key, !(typeof value === "boolean" ? value : false))}
          className={[
            "h-7 w-12 border transition-colors",
            value ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 bg-neutral-100",
          ].join(" ")}
          aria-pressed={Boolean(value)}
        >
          <span
            className={[
              "block h-5 w-5 bg-white transition-transform",
              value ? "translate-x-6" : "translate-x-1",
            ].join(" ")}
          />
        </button>
      )}

      {field.kind === "action" && (
        <div className="space-y-1">
          <button
            type="button"
            disabled={field.disabled}
            className={[
              "border px-2 py-1.5 text-[11px] font-medium transition-colors",
              field.disabled
                ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400"
                : "border-neutral-900 bg-neutral-900 text-white hover:opacity-90",
            ].join(" ")}
          >
            {field.actionLabel ?? field.label}
          </button>
          {field.description && <p className="text-[10px] text-neutral-500">{field.description}</p>}
        </div>
      )}
    </label>
  )
}

export function MakeStudioToolsPanel({ cardType, content, onChange, layout = "summary" }: MakeStudioToolsPanelProps) {
  const profile = getStudioProfile(cardType)
  const inlineFieldKeys = new Set(["title", "subtitle", "bodyText", "text", "transcript"])
  const supportsUpload = UPLOAD_ENABLED_TYPES.has(cardType)

  if (layout === "summary") {
    return (
      <aside className="h-full min-h-0 overflow-auto border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Creator studio</p>
        </div>

        <div className="space-y-2 px-3 py-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Media name</span>
            <TextInput
              value={typeof content.title === "string" ? content.title : ""}
              placeholder="Name"
              onChange={(next) => onChange("title", next)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Subtitle</span>
            <TextInput
              value={typeof content.subtitle === "string" ? content.subtitle : ""}
              placeholder="Subtitle"
              onChange={(next) => onChange("subtitle", next)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-neutral-600">Description</span>
            <textarea
              value={typeof content.description === "string" ? content.description : ""}
              rows={3}
              placeholder="Description"
              onChange={(event) => onChange("description", event.target.value)}
              className="w-full border border-neutral-200 bg-white px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
            />
          </label>
          {supportsUpload && (
            <button
              type="button"
              className="border border-neutral-900 bg-neutral-900 px-2 py-1.5 text-[11px] font-medium text-white transition-colors hover:opacity-90"
            >
              {uploadLabelFor(cardType)}
            </button>
          )}
        </div>
      </aside>
    )
  }

  return (
    <section className="h-full min-h-0 overflow-auto border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Options</p>
        <p className="mt-1 text-[12px] text-neutral-600">Configure {profile.mediaType.toLowerCase()} settings and workflow.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
        {profile.sections.map((section) => (
          <section key={section.title} className="space-y-2 min-w-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{section.title}</h3>
            <div className="space-y-2">
              {section.fields
                .filter((field) => !inlineFieldKeys.has(field.key))
                .map((field) => (
                  <OptionField
                    key={field.key}
                    field={field}
                    value={content[field.key]}
                    onChange={onChange}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
