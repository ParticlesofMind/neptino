"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Plus } from "lucide-react"
import { MakeMotionToolbar } from "../make-motion-toolbar"
import {
  StudioSection,
  StudioUrlInput,
  StudioInput,
  StudioNumberInput,
  StudioSelect,
  StudioToggle,
} from "./studio-primitives"
import { ChapterEditRow, ChapterTimeline, ProviderBadge } from "./video-editor-primitives"
import { VideoEditorPreview } from "./video-editor-preview"
import {
  detectVideoProvider,
  extractVimeoId,
  extractYouTubeId,
  getAspectRatioClass,
  type VideoAspectRatio,
  type VideoFitMode,
} from "./video-utils"

interface VideoEditorProps {
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

export function VideoEditor({ content, onChange }: VideoEditorProps) {
  const [streamStatus, setStreamStatus] = useState<"idle" | "native" | "hls" | "error">("idle")
  const [duration, setDuration] = useState(0)
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)

  const url = typeof content.url === "string" ? content.url : ""
  const title = typeof content.title === "string" ? content.title : ""
  const poster = typeof content.poster === "string" ? content.poster : ""
  const captionsUrl = typeof content.captionsUrl === "string" ? content.captionsUrl : ""
  const startAtSeconds = typeof content.startAtSeconds === "number" ? content.startAtSeconds : 0
  const aspectRatio = (typeof content.aspectRatio === "string" ? content.aspectRatio : "16:9") as VideoAspectRatio
  const fitMode = (typeof content.fitMode === "string" ? content.fitMode : "contain") as VideoFitMode
  const showControls = typeof content.showControls === "boolean" ? content.showControls : true
  const autoplay = typeof content.autoplay === "boolean" ? content.autoplay : false
  const muted = typeof content.muted === "boolean" ? content.muted : false
  const loop = typeof content.loop === "boolean" ? content.loop : false
  const chapters = parseChapters(content.chapters)

  const provider = detectVideoProvider(url)
  const ytId = provider === "youtube" ? extractYouTubeId(url) : null
  const vimeoId = provider === "vimeo" ? extractVimeoId(url) : null
  const isHlsStream = /\.m3u8(\?|$)/i.test(url)
  const previewAspectRatioClass = getAspectRatioClass(aspectRatio)

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

  useEffect(() => {
    const video = videoRef.current
    if (!video || provider !== "direct") return
    video.currentTime = startAtSeconds
  }, [provider, startAtSeconds, url])

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:flex-row">
      <div className="w-full shrink-0 border-b border-neutral-100 md:min-h-0 md:w-[32rem] md:border-b-0 md:border-r md:border-neutral-200 xl:w-[35rem]">
        <div className="min-h-0 h-full overflow-y-auto">
          <StudioSection label="Source" className="pt-4">
            <StudioUrlInput
              value={url}
              placeholder="YouTube, Vimeo, or .mp4 / .m3u8 URL"
              onCommit={(u) => onChange("url", u)}
            />
            {url && <ProviderBadge provider={provider} />}
            <StudioInput
              label="Title"
              value={title}
              placeholder="Optional video title"
              onChange={(e) => onChange("title", e.target.value)}
            />
          </StudioSection>

          <StudioSection label="Display">
            <div className="grid grid-cols-2 gap-3">
              <StudioSelect label="Aspect ratio" value={aspectRatio} onChange={(e) => onChange("aspectRatio", e.target.value)}>
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
                <option value="9:16">9:16</option>
              </StudioSelect>
              <StudioSelect label="Fit" value={fitMode} onChange={(e) => onChange("fitMode", e.target.value)}>
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </StudioSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StudioToggle label="Show controls" checked={showControls} onChange={(v) => onChange("showControls", v)} />
              <StudioToggle label="Muted by default" checked={muted} onChange={(v) => onChange("muted", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StudioToggle label="Autoplay" checked={autoplay} onChange={(v) => onChange("autoplay", v)} />
              <StudioToggle label="Loop playback" checked={loop} onChange={(v) => onChange("loop", v)} />
            </div>
          </StudioSection>

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
              toSeconds={toSeconds}
              formatSeconds={formatSeconds}
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

          <StudioSection>
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

          <StudioSection noBorder>
            <StudioNumberInput
              label="Start at (seconds)"
              value={startAtSeconds}
              min={0}
              step={1}
              onChange={(v) => onChange("startAtSeconds", v)}
            />
          </StudioSection>

          <div className="border-t border-neutral-200">
            <MakeMotionToolbar content={content} onChange={onChange} compact />
          </div>
        </div>
      </div>

      <VideoEditorPreview
        url={url}
        title={title}
        ytId={ytId}
        vimeoId={vimeoId}
        provider={provider}
        startAtSeconds={startAtSeconds}
        autoplay={autoplay}
        muted={muted}
        loop={loop}
        showControls={showControls}
        poster={poster}
        captionsUrl={captionsUrl}
        isHlsStream={isHlsStream}
        streamStatus={streamStatus}
        fitMode={fitMode}
        previewAspectRatioClass={previewAspectRatioClass}
        videoRef={videoRef}
        onTitleChange={(next) => onChange("title", next)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
      />
    </div>
  )
}
