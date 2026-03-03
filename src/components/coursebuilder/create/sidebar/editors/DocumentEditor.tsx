"use client"

import { useState } from "react"
import { FileText, Plus, Trash2, Link as LinkIcon } from "lucide-react"

interface DocumentSection {
  heading: string
  body: string
}

interface DocumentEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function parseSections(raw: unknown): DocumentSection[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((s): s is DocumentSection =>
    typeof s === "object" && s !== null && "heading" in s && "body" in s,
  )
}

export function DocumentEditor({ content, onChange }: DocumentEditorProps) {
  const [urlDraft, setUrlDraft] = useState(typeof content.url === "string" ? content.url : "")

  const url = typeof content.url === "string" ? content.url : ""
  const documentType = typeof content.documentType === "string" ? content.documentType : "pdf"
  const pages = typeof content.pages === "number" ? content.pages : 0
  const excerpt = typeof content.excerpt === "string" ? content.excerpt : ""
  const sections = parseSections(content.sections)

  const commitUrl = () => onChange("url", urlDraft)

  const addSection = () => {
    onChange("sections", [...sections, { heading: "", body: "" }])
  }

  const removeSection = (i: number) => {
    onChange("sections", sections.filter((_, idx) => idx !== i))
  }

  const updateSection = (i: number, field: keyof DocumentSection, value: string) => {
    onChange("sections", sections.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  const isPdf = documentType === "pdf" && url

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Source */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
        <div className="flex gap-0 border border-neutral-200 divide-x divide-neutral-200 w-fit">
          {(["pdf", "slides", "web"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange("documentType", t)}
              className={[
                "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                documentType === t ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50",
              ].join(" ")}
            >
              {t === "pdf" ? "PDF" : t === "slides" ? "Slides" : "Web"}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={urlDraft}
            placeholder={
              documentType === "pdf" ? "https://example.com/document.pdf" :
              documentType === "slides" ? "https://docs.google.com/presentation/…" :
              "https://example.com/article"
            }
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={commitUrl}
            onKeyDown={(e) => e.key === "Enter" && commitUrl()}
            className="flex-1 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
          <button
            type="button"
            onClick={commitUrl}
            className="border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white hover:opacity-90"
          >
            Load
          </button>
        </div>
      </div>

      {/* Preview */}
      {url ? (
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
          {isPdf ? (
            <div className="overflow-hidden border border-neutral-200 bg-white" style={{ height: 200 }}>
              <object
                data={`${url}#view=FitH`}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <FileText size={28} className="text-neutral-300" />
                  <p className="text-[11px] text-neutral-400">PDF preview unavailable</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 border border-neutral-200 px-3 py-1.5 text-[11px] text-neutral-600 hover:bg-neutral-50"
                  >
                    <LinkIcon size={11} /> Open PDF
                  </a>
                </div>
              </object>
            </div>
          ) : documentType === "web" ? (
            <div className="overflow-hidden border border-neutral-200 bg-white" style={{ height: 180 }}>
              <iframe
                src={url}
                className="w-full h-full border-0"
                title="Document preview"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          ) : (
            <div className="overflow-hidden border border-neutral-200 bg-white" style={{ height: 180 }}>
              <iframe
                src={url}
                className="w-full h-full border-0"
                title="Slides preview"
                allow="autoplay"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="mx-4 my-4 flex flex-col items-center gap-3 border-2 border-dashed border-neutral-200 bg-neutral-50 py-10">
          <FileText size={28} className="text-neutral-300" />
          <p className="text-[12px] text-neutral-400">Enter a URL above to preview</p>
        </div>
      )}

      {/* Metadata */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-3">
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Pages</span>
          <input
            type="number"
            value={pages}
            min={0}
            max={5000}
            onChange={(e) => onChange("pages", Number(e.target.value))}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Excerpt</span>
          <textarea
            value={excerpt}
            rows={3}
            placeholder="Key excerpt or abstract…"
            onChange={(e) => onChange("excerpt", e.target.value)}
            className="w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>
      </div>

      {/* Sections */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Sections</p>
          <button
            type="button"
            onClick={addSection}
            disabled={sections.length >= 10}
            className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
          >
            <Plus size={10} /> Add
          </button>
        </div>

        {sections.length === 0 && (
          <p className="text-[11px] text-neutral-400 italic">Add sections to structure the document card.</p>
        )}

        <div className="space-y-3">
          {sections.map((s, i) => (
            <div key={i} className="border border-neutral-200 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={s.heading}
                  onChange={(e) => updateSection(i, "heading", e.target.value)}
                  placeholder="Section heading"
                  className="flex-1 border border-neutral-200 bg-neutral-50 px-2 py-1 text-[12px] font-semibold text-neutral-700 outline-none focus:border-neutral-400"
                />
                <button type="button" onClick={() => removeSection(i)} className="text-neutral-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
              <textarea
                value={s.body}
                rows={3}
                onChange={(e) => updateSection(i, "body", e.target.value)}
                placeholder="Section body…"
                className="w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
