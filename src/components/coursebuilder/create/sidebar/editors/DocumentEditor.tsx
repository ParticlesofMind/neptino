"use client"

import { useEffect, useState } from "react"
import { FileText, Plus, Trash2, Link as LinkIcon } from "lucide-react"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"

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
  const title = typeof content.title === "string" ? content.title : ""
  const documentType = typeof content.documentType === "string" ? content.documentType : "pdf"
  const pages = typeof content.pages === "number" ? content.pages : 0
  const excerpt = typeof content.excerpt === "string" ? content.excerpt : ""
  const sections = parseSections(content.sections)

  useEffect(() => {
    setUrlDraft(url)
  }, [url])

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
    <EditorSplitLayout
      previewContentClassName="overflow-auto"
      sidebar={(
        <>
          <div className="space-y-3 border-b border-neutral-100 px-4 pt-4 pb-3">
            <div className="flex w-fit gap-0 divide-x divide-neutral-200 border border-neutral-200">
              {(["pdf", "slides", "web"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange("documentType", t)}
                  className={[
                    "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    documentType === t ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" : "bg-white text-neutral-500 hover:bg-neutral-50",
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
                  documentType === "pdf"
                    ? "https://example.com/document.pdf"
                    : documentType === "slides"
                      ? "https://docs.google.com/presentation/…"
                      : "https://example.com/article"
                }
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={commitUrl}
                onKeyDown={(e) => e.key === "Enter" && commitUrl()}
                className="min-h-10 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
              />
              <button
                type="button"
                onClick={commitUrl}
                className="min-h-10 rounded-md border border-neutral-200 bg-white px-3.5 py-2.5 text-[11px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Load
              </button>
            </div>
          </div>

          <div className="space-y-3 border-b border-neutral-100 px-4 py-3">
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-neutral-600">Pages</span>
              <input
                type="number"
                value={pages}
                min={0}
                max={5000}
                onChange={(e) => onChange("pages", Number(e.target.value))}
                className="min-h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium text-neutral-600">Excerpt</span>
              <textarea
                value={excerpt}
                rows={3}
                placeholder="Key excerpt or abstract…"
                onChange={(e) => onChange("excerpt", e.target.value)}
                className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
              />
            </label>
          </div>

          <div className="space-y-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Sections</p>
              <button
                type="button"
                onClick={addSection}
                disabled={sections.length >= 10}
                className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              >
                <Plus size={10} /> Add
              </button>
            </div>

            {sections.length === 0 && (
              <p className="text-[11px] italic text-neutral-400">Add sections to structure the document block.</p>
            )}

            <div className="space-y-3">
              {sections.map((s, i) => (
                <div key={i} className="space-y-2 border border-neutral-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={s.heading}
                      onChange={(e) => updateSection(i, "heading", e.target.value)}
                      placeholder="Section heading"
                      className="min-h-10 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] font-semibold text-neutral-700 outline-none focus:border-neutral-400"
                    />
                    <button type="button" onClick={() => removeSection(i)} className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <textarea
                    value={s.body}
                    rows={3}
                    onChange={(e) => updateSection(i, "body", e.target.value)}
                    placeholder="Section body…"
                    className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      preview={(
        <div className="flex min-h-full items-center justify-center px-6 py-6 md:px-8">
          {!url ? (
            <EditorPreviewFrame
              cardType={documentType === "web" ? "media" : "document"}
              title={title}
              onTitleChange={(next) => onChange("title", next)}
              className="w-full max-w-4xl"
              bodyClassName="flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-white/75 px-8 text-center"
            >
              <FileText size={28} className="text-neutral-300" />
              <p className="text-[13px] font-medium text-neutral-700">No document loaded</p>
              <p className="text-[11px] text-neutral-400">Paste a document URL in the settings panel to preview it here.</p>
            </EditorPreviewFrame>
          ) : isPdf ? (
            <EditorPreviewFrame
              cardType={documentType === "web" ? "media" : "document"}
              title={title}
              onTitleChange={(next) => onChange("title", next)}
              className="h-[70vh] w-full max-w-5xl"
              bodyClassName="h-full"
            >
              <object data={`${url}#view=FitH`} type="application/pdf" className="h-full w-full">
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <FileText size={28} className="text-neutral-300" />
                  <p className="text-[11px] text-neutral-400">PDF preview unavailable</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-9 items-center gap-1 rounded-md border border-neutral-200 px-3 py-2 text-[11px] text-neutral-600 hover:bg-neutral-50"
                  >
                    <LinkIcon size={11} /> Open PDF
                  </a>
                </div>
              </object>
            </EditorPreviewFrame>
          ) : (
            <EditorPreviewFrame
              cardType={documentType === "web" ? "media" : "document"}
              title={title}
              onTitleChange={(next) => onChange("title", next)}
              className="h-[70vh] w-full max-w-5xl"
              bodyClassName="h-full"
            >
              {documentType === "web" ? (
                <iframe
                  src={url}
                  className="h-full w-full border-0"
                  title="Document preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              ) : (
                <iframe
                  src={url}
                  className="h-full w-full border-0"
                  title="Slides preview"
                  allow="autoplay"
                />
              )}
            </EditorPreviewFrame>
          )}
        </div>
      )}
    />
  )
}
