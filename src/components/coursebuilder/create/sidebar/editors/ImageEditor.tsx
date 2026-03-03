"use client"

import { useState, useRef } from "react"
import { Upload, Link as LinkIcon, Sparkles, ImageIcon, Info } from "lucide-react"

interface ImageEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type Tab = "url" | "upload"

export function ImageEditor({ content, onChange }: ImageEditorProps) {
  const [tab, setTab] = useState<Tab>("url")
  const [dragging, setDragging] = useState(false)
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null)
  const [urlDraft, setUrlDraft] = useState(typeof content.url === "string" ? content.url : "")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const url = typeof content.url === "string" ? content.url : ""
  const alt = typeof content.alt === "string" ? content.alt : ""
  const caption = typeof content.caption === "string" ? content.caption : ""
  const attribution = typeof content.attribution === "string" ? content.attribution : ""

  const commitUrl = () => {
    onChange("url", urlDraft)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        onChange("url", dataUrl)
        setUrlDraft(dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Tabs */}
      <div className="flex shrink-0 border-b border-neutral-200 bg-white">
        {(["url", "upload"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
              tab === t
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-400 hover:text-neutral-700",
            ].join(" ")}
          >
            {t === "url" ? <LinkIcon size={11} /> : <Upload size={11} />}
            {t === "url" ? "URL" : "Upload"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-4 bg-white">
        {tab === "url" ? (
          <div className="space-y-2">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium text-neutral-600">Image URL</span>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={urlDraft}
                  placeholder="https://example.com/image.jpg"
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
            </label>

            {/* Live image preview */}
            {url ? (
              <div className="relative overflow-hidden border border-neutral-200 bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={alt || "Preview"}
                  className="w-full object-contain"
                  style={{ maxHeight: 220 }}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setImgDims({ w: img.naturalWidth, h: img.naturalHeight })
                  }}
                  onError={() => setImgDims(null)}
                />
                {imgDims && (
                  <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                    {imgDims.w} × {imgDims.h}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border border-dashed border-neutral-300 bg-neutral-50 py-10">
                <ImageIcon size={28} className="mb-2 text-neutral-300" />
                <p className="text-[11px] text-neutral-400">Paste a URL above to preview</p>
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed py-14 transition-colors",
              dragging ? "border-neutral-900 bg-neutral-100" : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100",
            ].join(" ")}
          >
            <Upload size={24} className={dragging ? "text-neutral-700" : "text-neutral-400"} />
            <div className="text-center">
              <p className="text-[12px] font-medium text-neutral-700">Drop an image or click to browse</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">PNG, JPG, WebP, GIF, SVG</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string
                  onChange("url", dataUrl)
                  setUrlDraft(dataUrl)
                }
                reader.readAsDataURL(file)
              }}
            />
          </div>
        )}

        {/* Alt text */}
        <label className="block space-y-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-600">
            Alt text
            <span className="rounded bg-red-100 px-1 text-[9px] font-semibold text-red-600">required</span>
          </span>
          <input
            type="text"
            value={alt}
            placeholder="Describe the image for screen readers"
            onChange={(e) => onChange("alt", e.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>

        {/* Caption */}
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Caption</span>
          <textarea
            value={caption}
            rows={2}
            placeholder="Optional caption shown below the image"
            onChange={(e) => onChange("caption", e.target.value)}
            className="w-full resize-none border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>

        {/* Attribution */}
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Attribution / source</span>
          <input
            type="text"
            value={attribution}
            placeholder="Photo by … / CC BY 2.0"
            onChange={(e) => onChange("attribution", e.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>

        {/* AI generation stub */}
        <div className="border border-neutral-200 bg-neutral-50 px-3 py-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-neutral-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">AI Image Generation</span>
          </div>
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 border border-neutral-300 bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-400 cursor-not-allowed"
          >
            <Sparkles size={11} />
            Generate imagery
          </button>
          <p className="flex items-start gap-1 text-[10px] text-neutral-400">
            <Info size={10} className="mt-0.5 shrink-0" />
            AI image generation will be available in a future release.
          </p>
        </div>
      </div>
    </div>
  )
}
