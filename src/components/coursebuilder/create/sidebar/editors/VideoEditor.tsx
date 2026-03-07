"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Film, Plus, Trash2 } from "lucide-react"
import {
  StudioSection,
  StudioUrlInput,
  StudioInput,
  StudioNumberInput,
} from "./studio-primitives"

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

function toSeconds(timecode: string): number {
  const parts = timecode.trim().split(":").map(Number)
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] ?? 0
}

function formatSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

// ─── Provider badge ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: "youtube" | "vimeo" | "direct" }) {
  const cfg = {
    youtube: { label: "YouTube", dot: "bg-red-500",     pill: "bg-red-100 text-red-700 border-red-200" },
    vimeo:   { label: "Vimeo",   dot: "bg-blue-500",    pill: "bg-blue-100 text-blue-700 border-blue-200" },
    direct:  { label: "Direct",  dot: "bg-neutral-400", pill: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  }[provider]
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Chapter timeline ─────────────────────────────────────────────────────────

function ChapterTimeline({
  chapters,
  duration,
  selectedIdx,
  onSelect,
}: {
  chapters: Chapter[]
  duration: number
  selectedIdx: number | null
  onSelect: (i: number | null) => void
}) {
  const totalSecs =
    duration > 0
      ? duration
      : chapters.length > 0
        ? Math.max(...chapters.map((c) => toSeconds(c.time))) + 60
        : 300

  return (
    <div className="space-y-1.5">
      <div className="relative rounded-lg bg-neutral-900" style={{ height: 54 }}>
        {/* baseline */}
        <div className="absolute inset-x-4 bg-neutral-700" style={{ height: 1, top: "50%" }} />

        {chapters.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-[10px] text-neutral-600">No chapters yet</p>
          </div>
        )}

        {chapters.map((ch, i) => {
          const secs = toSeconds(ch.time)
          const pct = Math.min(96, Math.max(4, (secs / totalSecs) * 100))
          const active = selectedIdx === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(active ? null : i)}
              style={{ left: `${pct}%` }}
              className="group absolute inset-y-0 -translate-x-1/2"
            >
              <div
                className={[
                  "absolute inset-y-0 w-px transition-colors",
                  active ? "bg-[#4a94ff]" : "bg-neutral-600 group-hover:bg-neutral-400",
                ].join(" ")}
              />
              <div
                className={[
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all",
                  active
                    ? "border-[#4a94ff] bg-[#4a94ff] text-white shadow-[0_0_8px_rgba(74,148,255,0.5)]"
                    : "border-neutral-600 bg-neutral-800 text-neutral-400 group-hover:border-neutral-400 group-hover:text-neutral-200",
                ].join(" ")}
              >
                {i + 1}
              </div>
              <div
                className={[
                  "absolute bottom-1.5 -translate-x-1/2 whitespace-nowrap text-[8px] font-mono transition-opacity",
                  active ? "text-[#4a94ff] opacity-100" : "text-neutral-500 opacity-0 group-hover:opacity-100",
                ].join(" ")}
              >
                {ch.time}
              </div>
            </button>
          )
        })}
      </div>
      <div className="flex justify-between px-1 text-[9px] font-mono text-neutral-500">
        <span>0:00</span>
        {duration > 0 && <span>{formatSeconds(duration)}</span>}
      </div>
    </div>
  )
}

// ─── Chapter edit row ─────────────────────────────────────────────────────────

function ChapterEditRow({
  chapter,
  idx,
  onUpdate,
  onDelete,
}: {
  chapter: Chapter
  idx: number
  onUpdate: (field: keyof Chapter, value: string) => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#4a94ff]/30 bg-[#4a94ff]/5 px-3 py-2">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4a94ff] text-[9px] font-bold text-white">
        {idx + 1}
      </div>
      <input
        type="text"
        value={chapter.time}
        onChange={(e) => onUpdate("time", e.target.value)}
        placeholder="0:00"
        className="w-16 shrink-0 rounded border border-[#4a94ff]/30 bg-white px-2 py-1 font-mono text-[11px] text-neutral-800 outline-none focus:border-[#4a94ff]/60"
      />
      <input
        type="text"
        value={chapter.title}
        onChange={(e) => onUpdate("title", e.target.value)}
        placeholder="Chapter title"
        className="min-w-0 flex-1 rounded border border-[#4a94ff]/30 bg-white px-2 py-1 text-[12px] text-neutral-800 outline-none focus:border-[#4a94ff]/60"
      />
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 text-neutral-400 transition-colors hover:text-red-500"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export function VideoEditor({ content, onChange }: VideoEditorProps) {
  const [streamStatus, setStreamStatus] = useState<"idle" | "native" | "hls" | "error">("idle")
  const [duration, setDuration] = useState(0)
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)

  const url = typeof content.url === "string" ? content.url : ""
  const poster = typeof content.poster === "string" ? content.poster : ""
  const captionsUrl = typeof content.captionsUrl === "string" ? content.captionsUrl : ""
  const startAtSeconds = typeof content.startAtSeconds === "number" ? content.startAtSeconds : 0
  const chapters = parseChapters(content.chapters)

  const provider = detectProvider(url)
  const ytId = provider === "youtube" ? extractYouTubeId(url) : null
  const vimeoId = provider === "vimeo" ? extractVimeoId(url) : null
  const isHlsStream = /\.m3u8(\?|$)/i.test(url)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url || provider !== "direct") return

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => setStreamStatus("hls"))
      hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) setStreamStatus("error") })
      hlsRef.current = hls
      return () => { hls.destroy(); hlsRef.current = null }
    }

    video.src = url
    setStreamStatus(isHlsStream ? "error" : "native")
  }, [url, provider, isHlsStream])

  const addChapter = () => {
    const next = [...chapters, { time: "0:00", title: `Chapter ${chapters.length + 1}` }]
    onChange("chapters", next)
    setSelectedChapterIdx(next.length - 1)
  }

  const removeChapter = (i: number) => {
    onChange("chapters", chapters.filter((_, idx) => idx !== i))
    setSelectedChapterIdx(null)
  }

  const updateChapter = (i: number, field: keyof Chapter, value: string) => {
    onChange("chapters", chapters.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)))
  }

  const selectedChapter = selectedChapterIdx !== null ? chapters[selectedChapterIdx] ?? null : null

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">

      {/* Source */}
      <StudioSection label="Source" className="pt-4">
        <StudioUrlInput
          value={url}
          placeholder="YouTube, Vimeo, or .mp4 / .m3u8 URL"
          onCommit={(u) => onChange("url", u)}
        />
        {url && <ProviderBadge provider={provider} />}
      </StudioSection>

      {/* Video preview */}
      {url ? (
        <div className="shrink-0 border-b border-neutral-100 bg-neutral-950">
          {ytId ? (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?start=${startAtSeconds}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
                title="YouTube preview"
              />
            </div>
          ) : vimeoId ? (
            <div className="aspect-video">
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
                title="Vimeo preview"
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                controls
                className="w-full aspect-video bg-neutral-950"
                poster={poster || undefined}
                onDurationChange={(e) => setDuration(e.currentTarget.duration)}
              />
              {isHlsStream && (
                <p className={`px-4 pb-2 text-[10px] ${streamStatus === "error" ? "text-red-400" : "text-neutral-500"}`}>
                  {streamStatus === "hls" && "Adaptive streaming via hls.js"}
                  {streamStatus === "native" && "Adaptive streaming — native"}
                  {streamStatus === "error" && "HLS stream failed to load"}
                  {streamStatus === "idle" && "Loading stream…"}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mx-4 my-3 flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 py-10">
          <Film size={28} className="text-neutral-300" />
          <div className="text-center">
            <p className="text-[12px] font-medium text-neutral-500">No video loaded</p>
            <p className="text-[10px] text-neutral-400">YouTube · Vimeo · MP4 · HLS</p>
          </div>
        </div>
      )}

      {/* Chapter timeline */}
      <StudioSection
        label="Chapters"
        action={
          <button
            type="button"
            onClick={addChapter}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
          >
            <Plus size={10} />
            Add chapter
          </button>
        }
      >
        <ChapterTimeline
          chapters={chapters}
          duration={duration}
          selectedIdx={selectedChapterIdx}
          onSelect={setSelectedChapterIdx}
        />

        {selectedChapter && selectedChapterIdx !== null && (
          <ChapterEditRow
            chapter={selectedChapter}
            idx={selectedChapterIdx}
            onUpdate={(field, value) => updateChapter(selectedChapterIdx, field, value)}
            onDelete={() => removeChapter(selectedChapterIdx)}
          />
        )}

        {chapters.length > 0 && selectedChapterIdx === null && (
          <div className="space-y-1">
            {chapters.map((ch, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedChapterIdx(i)}
                className="flex w-full items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-1.5 text-left transition-all hover:border-neutral-200 hover:bg-white"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[8px] font-bold text-neutral-600">
                  {i + 1}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-neutral-500">{ch.time}</span>
                <span className="truncate text-[11px] text-neutral-700">{ch.title || "Untitled"}</span>
              </button>
            ))}
          </div>
        )}
      </StudioSection>

      {/* Poster & Captions */}
      <StudioSection label="Poster & Captions">
        <StudioInput
          label="Poster / thumbnail URL"
          value={poster}
          placeholder="https://example.com/poster.jpg"
          onChange={(e) => onChange("poster", e.target.value)}
        />
        <StudioInput
          label="Captions URL"
          value={captionsUrl}
          placeholder="https://example.com/captions.vtt"
          hint="SRT or WebVTT file URL"
          onChange={(e) => onChange("captionsUrl", e.target.value)}
        />
      </StudioSection>

      <StudioSection label="Playback" noBorder>
        <StudioNumberInput
          label="Start at (seconds)"
          value={startAtSeconds}
          min={0}
          step={1}
          onChange={(v) => onChange("startAtSeconds", v)}
        />
      </StudioSection>
    </div>
  )
}
