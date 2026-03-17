"use client"

import { Plus, Trash2 } from "lucide-react"
import { EditorSplitLayout } from "./editor-split-layout"
import { GenericEditorPreview } from "./generic-editor-preview"
import type { TimelineEditorProps } from "./types"

interface TimelineEvent {
  date: string
  label: string
  description?: string
}

function isEvent(v: unknown): v is TimelineEvent {
  return typeof v === "object" && v !== null && "label" in v
}

export function TimelineEditor({ content, onChange }: TimelineEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const rawEvents = Array.isArray(content.events) ? content.events : []
  const events: TimelineEvent[] = rawEvents.filter(isEvent)

  const updateEvent = (index: number, field: keyof TimelineEvent, value: string) => {
    const next = events.map((ev, i) =>
      i === index ? { ...ev, [field]: value } : ev,
    )
    onChange("events", next)
  }

  const addEvent = () => {
    onChange("events", [...events, { date: "", label: "New event", description: "" }])
  }

  const removeEvent = (index: number) => {
    onChange("events", events.filter((_, i) => i !== index))
  }

  return (
    <EditorSplitLayout
      sidebar={(
        <div className="flex h-full flex-col overflow-auto bg-white">
          <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Timeline title
            </p>
            <input
              type="text"
              value={title}
              placeholder="e.g. History of the Internet"
              onChange={(e) => onChange("title", e.target.value)}
              className="min-h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                Events ({events.length})
              </p>
              <button
                type="button"
                onClick={addEvent}
                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[11px] text-neutral-600 hover:bg-neutral-50"
              >
                <Plus size={11} /> Add event
              </button>
            </div>

            {events.length === 0 && (
              <p className="text-[11px] text-neutral-400">
                No events yet. Click &ldquo;Add event&rdquo; to start.
              </p>
            )}

            {events.map((ev, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-neutral-400">Event {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeEvent(i)}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Remove event"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-medium text-neutral-500">Date / year</span>
                    <input
                      type="text"
                      value={ev.date}
                      placeholder="e.g. 1969"
                      onChange={(e) => updateEvent(i, "date", e.target.value)}
                      className="min-h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-[12px] font-mono text-neutral-700 outline-none focus:border-neutral-400"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-medium text-neutral-500">Label</span>
                    <input
                      type="text"
                      value={ev.label}
                      placeholder="Event name"
                      onChange={(e) => updateEvent(i, "label", e.target.value)}
                      className="min-h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] font-medium text-neutral-500">Description</span>
                  <textarea
                    value={ev.description ?? ""}
                    rows={2}
                    placeholder="Optional details…"
                    onChange={(e) => updateEvent(i, "description", e.target.value)}
                    className="w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      preview={<GenericEditorPreview cardType="timeline" content={content} onTitleChange={(next) => onChange("title", next)} maxWidthClassName="max-w-4xl" />}
    />
  )
}
