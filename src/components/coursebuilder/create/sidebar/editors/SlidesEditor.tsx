"use client"

import { Plus, Trash2 } from "lucide-react"

import { CardTypePreview } from "../../cards/CardTypePreview"
import { EditorSplitLayout } from "./editor-split-layout"

interface SlideDraft {
  title: string
  body: string
  notes: string
}

interface SlidesEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function readSlides(raw: unknown): SlideDraft[] {
  if (!Array.isArray(raw)) {
    return [{ title: "Opening", body: "Introduce the topic and orient the audience.", notes: "" }]
  }

  return raw.map((slide) => {
    const entry = slide && typeof slide === "object" ? slide as Record<string, unknown> : {}
    return {
      title: typeof entry.title === "string" ? entry.title : "",
      body: typeof entry.body === "string" ? entry.body : "",
      notes: typeof entry.notes === "string" ? entry.notes : "",
    }
  })
}

export function SlidesEditor({ content, onChange }: SlidesEditorProps) {
  const title = typeof content.title === "string" ? content.title : ""
  const slides = readSlides(content.slides)

  const updateSlide = (index: number, key: keyof SlideDraft, value: string) => {
    onChange("slides", slides.map((slide, slideIndex) => (
      slideIndex === index ? { ...slide, [key]: value } : slide
    )))
  }

  const addSlide = () => {
    onChange("slides", [...slides, { title: "New slide", body: "", notes: "" }])
  }

  const removeSlide = (index: number) => {
    onChange("slides", slides.filter((_, slideIndex) => slideIndex !== index))
  }

  return (
    <EditorSplitLayout
      previewContentClassName="overflow-auto"
      sidebar={(
        <div className="space-y-4 px-4 py-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-neutral-600">Deck title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="Presentation title"
              className="min-h-10 w-full rounded-md border border-neutral-200 bg-white px-3 text-[12px] text-neutral-700 outline-none focus:border-[#9eb9da]"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Slides</p>
              <button
                type="button"
                onClick={addSlide}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                <Plus size={12} />
                Add
              </button>
            </div>

            {slides.map((slide, index) => (
              <div key={index} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Slide {index + 1}</p>
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlide(index)}
                      className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove slide"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={slide.title}
                  onChange={(event) => updateSlide(index, "title", event.target.value)}
                  placeholder="Slide title"
                  className="mb-2 min-h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 text-[12px] text-neutral-700 outline-none focus:border-[#9eb9da]"
                />
                <textarea
                  value={slide.body}
                  onChange={(event) => updateSlide(index, "body", event.target.value)}
                  placeholder="Slide body"
                  rows={3}
                  className="mb-2 w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 text-[12px] text-neutral-700 outline-none focus:border-[#9eb9da]"
                />
                <textarea
                  value={slide.notes}
                  onChange={(event) => updateSlide(index, "notes", event.target.value)}
                  placeholder="Speaker notes"
                  rows={2}
                  className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 text-[12px] text-neutral-700 outline-none focus:border-[#9eb9da]"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      preview={<CardTypePreview cardType="slides" content={{ ...content, slides }} />}
    />
  )
}
