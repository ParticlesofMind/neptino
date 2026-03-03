"use client"

import { useState } from "react"
import { Link as LinkIcon, Play, Plus, Trash2 } from "lucide-react"

interface VideoEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

interface Chapter {
  time: string
  title: string
}

function detectProvider(url: string): "youtube" | "vimeo" | "direct" {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube"
  if (/vimeo\.com/.test(url)) return "vimeo"
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return "direct"
  if (url.length > 8) return "direct"
  return "direct"
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

function parseChapters(raw: unknown): Chapter[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (c): c is Chapter => typeof c === "object" && c !== null && "time" in c && "title" in c,
  )
}

export function VideoEditor({ content, onChange }: VideoEditorProps) {
  const [urlDraft, setUrlDraft] = useState(typeof content.url === "string" ? content.url : "")

  const url = typeof content.url === "string" ? content.url : ""
  const poster = typeof content.poster === "string" ? content.poster : ""
  const captionsUrl = typeof content.captionsUrl === "string" ? content.captionsUrl : ""
  const startAtSeconds = typeof content.startAtSeconds === "number" ? content.startAtSeconds : 0
  const chapters = parseChapters(content.chapters)

  const provider = detectProvider(url)
  const ytId = provider === "youtube" ? extractYouTubeId(url) : null
  const vimeoId = provider === "vimeo" ? extractVimeoId(url) : null

  const commitUrl = () => onChange("url", urlDraft)

  const addChapter = () => {
    onChange("chapters", [...chapters, { time: "0:00", title: "Chapter" }])
  }

  const removeChapter = (i: number) => {
    onChange("chapters", chapters.filter((_, idx) => idx !== i))
  }

  const updateChapter = (i: number, field: keyof Chapter, value: string) => {
    onChange("chapters", chapters.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* URL input */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-neutral-600 flex items-center gap-1">
            <LinkIcon size={11} />
            Video URL
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlDraft}
              placeholder="YouTube, Vimeo, or direct .mp4 URL"
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

        {/* Provider badge */}
        {url && (
          <div className="flex items-center gap-1.5">
            <span className={[
              "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              provider === "youtube" ? "bg-red-100 text-red-700" :
              provider === "vimeo" ? "bg-blue-100 text-blue-700" :
              "bg-neutral-100 text-neutral-600",
            ].join(" ")}>
              {provider === "youtube" ? "YouTube" : provider === "vimeo" ? "Vimeo" : "Direct"}
            </span>
          </div>
        )}
      </div>

      {/* Video preview */}
      {url && (
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
          {ytId ? (
            <div className="relative">
              <div className="aspect-video overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?start=${startAtSeconds}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                  title="YouTube preview"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                  alt="YouTube thumbnail"
                  className="h-12 w-20 object-cover border border-neutral-200"
                />
                <span className="text-[10px] text-neutral-500">Thumbnail preview</span>
              </div>
            </div>
          ) : vimeoId ? (
            <div className="aspect-video overflow-hidden bg-black">
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
                title="Vimeo preview"
              />
            </div>
          ) : (
            <video
              src={url}
              controls
              className="w-full max-h-52 bg-black"
              poster={poster || undefined}
            />
          )}
        </div>
      )}

      {!url && (
        <div className="mx-4 my-4 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-neutral-200 bg-neutral-50 py-12">
          <Play size={28} className="text-neutral-300" />
          <p className="text-[12px] text-neutral-400">Enter a URL above to load video</p>
          <p className="text-[10px] text-neutral-400">YouTube, Vimeo, or direct .mp4/.webm</p>
        </div>
      )}

      {/* Poster image */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Poster / Thumbnail</p>
        <input
          type="text"
          value={poster}
          placeholder="https://example.com/poster.jpg"
          onChange={(e) => onChange("poster", e.target.value)}
          className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
        />
      </div>

      {/* Captions */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Captions</p>
        <input
          type="text"
          value={captionsUrl}
          placeholder="https://example.com/captions.vtt"
          onChange={(e) => onChange("captionsUrl", e.target.value)}
          className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
        />
        <p className="text-[10px] text-neutral-400">SRT or WebVTT file URL</p>
      </div>

      {/* Playback settings */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Playback</p>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Start at (seconds)</span>
          <input
            type="number"
            value={startAtSeconds}
            min={0}
            step={1}
            onChange={(e) => onChange("startAtSeconds", Number(e.target.value))}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>
      </div>

      {/* Chapter markers */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Chapters</p>
          <button
            type="button"
            onClick={addChapter}
            className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50"
          >
            <Plus size={10} /> Add
          </button>
        </div>
        {chapters.length === 0 && (
          <p className="text-[11px] text-neutral-400 italic">No chapters defined.</p>
        )}
        <div className="space-y-1.5">
          {chapters.map((ch, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                value={ch.time}
                onChange={(e) => updateChapter(i, "time", e.target.value)}
                className="w-16 shrink-0 border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-mono text-neutral-700 outline-none focus:border-neutral-400"
                placeholder="0:00"
              />
              <input
                type="text"
                value={ch.title}
                onChange={(e) => updateChapter(i, "title", e.target.value)}
                className="flex-1 border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
                placeholder="Chapter title"
              />
              <button type="button" onClick={() => removeChapter(i)} className="text-neutral-400 hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
