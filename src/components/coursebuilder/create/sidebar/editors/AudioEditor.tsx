"use client"

import { useState } from "react"
import { Plus, Trash2, Upload, Link as LinkIcon, ChevronUp, ChevronDown } from "lucide-react"
import { AudioPreview } from "../../cards/card-type-preview-subviews"

interface AudioEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

interface Chapter {
  time: string
  title: string
}

function parseChapters(raw: unknown): Chapter[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (c): c is Chapter => typeof c === "object" && c !== null && "time" in c && "title" in c,
  )
}

export function AudioEditor({ content, onChange }: AudioEditorProps) {
  const [urlDraft, setUrlDraft] = useState(typeof content.url === "string" ? content.url : "")
  const [urlTab, setUrlTab] = useState<"url" | "upload">("url")

  const url = typeof content.url === "string" ? content.url : ""
  const transcript = typeof content.transcript === "string" ? content.transcript : ""
  const playback = typeof content.playback === "string" ? content.playback : "1x"
  const chapters = parseChapters(content.chapters)

  const commitUrl = () => onChange("url", urlDraft)

  const addChapter = () => {
    onChange("chapters", [...chapters, { time: "0:00", title: "Chapter" }])
  }

  const removeChapter = (i: number) => {
    onChange("chapters", chapters.filter((_, idx) => idx !== i))
  }

  const updateChapter = (i: number, field: keyof Chapter, value: string) => {
    const next = chapters.map((c, idx) => idx === i ? { ...c, [field]: value } : c)
    onChange("chapters", next)
  }

  const moveChapter = (i: number, dir: -1 | 1) => {
    const next = [...chapters]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange("chapters", next)
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Source section */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
        <div className="flex items-center gap-0 border border-neutral-200 divide-x divide-neutral-200 w-fit">
          {(["url", "upload"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setUrlTab(t)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                urlTab === t ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50",
              ].join(" ")}
            >
              {t === "url" ? <LinkIcon size={10} /> : <Upload size={10} />}
              {t === "url" ? "URL" : "Upload"}
            </button>
          ))}
        </div>

        {urlTab === "url" ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={urlDraft}
              placeholder="https://example.com/audio.mp3"
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
        ) : (
          <div className="flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-neutral-300 bg-neutral-50 py-6 hover:border-neutral-400 hover:bg-neutral-100">
            <Upload size={20} className="text-neutral-400" />
            <p className="text-[11px] text-neutral-500">Drop an MP3, WAV, or OGG file</p>
            <p className="text-[10px] text-neutral-400">Upload to Supabase storage — coming soon</p>
          </div>
        )}
      </div>

      {/* Waveform player */}
      {url && (
        <div className="px-4 py-4 border-b border-neutral-100 bg-neutral-50">
          <AudioPreview url={url} />
        </div>
      )}

      {/* Playback settings */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Playback</p>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-neutral-600">Default speed</span>
          <select
            value={playback}
            onChange={(e) => onChange("playback", e.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[12px] text-neutral-700 outline-none focus:border-neutral-400"
          >
            {["0.5x", "0.75x", "1x", "1.25x", "1.5x", "2x"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Chapter markers */}
      <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
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
          <p className="text-[11px] text-neutral-400 italic">No chapters. Add one to mark key moments.</p>
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
              <button type="button" onClick={() => moveChapter(i, -1)} className="text-neutral-400 hover:text-neutral-700">
                <ChevronUp size={13} />
              </button>
              <button type="button" onClick={() => moveChapter(i, 1)} className="text-neutral-400 hover:text-neutral-700">
                <ChevronDown size={13} />
              </button>
              <button type="button" onClick={() => removeChapter(i)} className="text-neutral-400 hover:text-red-500">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript */}
      <div className="px-4 py-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Transcript</p>
        <p className="text-[10px] text-neutral-400">Use timecodes like <code className="bg-neutral-100 px-1">[0:30]</code> to mark sections.</p>
        <textarea
          value={transcript}
          rows={8}
          placeholder={"[0:00] Welcome to today's lecture.\n[0:30] We'll start with…"}
          onChange={(e) => onChange("transcript", e.target.value)}
          className="w-full resize-none border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] font-mono text-neutral-700 leading-relaxed outline-none focus:border-neutral-400"
        />
      </div>
    </div>
  )
}
