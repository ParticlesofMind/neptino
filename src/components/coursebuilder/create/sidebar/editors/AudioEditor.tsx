"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"
import { ChevronDown, ChevronUp, Pause, Play, Plus, Trash2, Upload, AudioLines } from "lucide-react"
import {
  StudioSection,
  StudioUrlInput,
  StudioDropZone,
  StudioTextarea,
  StudioPillGroup,
  StudioSegment,
} from "./studio-primitives"

interface AudioEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

interface Chapter {
  time: string
  title: string
}

function toSeconds(timecode: string): number {
  const parts = timecode.trim().split(":").map((p) => Number(p))
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return 0
}

function formatSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function parseChapters(raw: unknown): Chapter[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (c): c is Chapter => typeof c === "object" && c !== null && "time" in c && "title" in c,
  )
}

const SPEED_OPTIONS = [
  { value: "0.5x", label: "0.5×" },
  { value: "0.75x", label: "0.75×" },
  { value: "1x", label: "1×" },
  { value: "1.25x", label: "1.25×" },
  { value: "1.5x", label: "1.5×" },
  { value: "2x", label: "2×" },
] as const

export function AudioEditor({ content, onChange }: AudioEditorProps) {
  const [sourceTab, setSourceTab] = useState<"url" | "upload">("url")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const waveContainerRef = useRef<HTMLDivElement | null>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)

  const url = typeof content.url === "string" ? content.url : ""
  const transcript = typeof content.transcript === "string" ? content.transcript : ""
  const playback = typeof content.playback === "string" ? content.playback : "1x"
  const chapters = parseChapters(content.chapters)
  const playbackRate = useMemo(() => Number(playback.replace("x", "")) || 1, [playback])

  useEffect(() => {
    if (!waveformRef.current) return
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#334155",
      progressColor: "#4a94ff",
      cursorColor: "#60a5fa",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 96,
      normalize: true,
      autoScroll: true,
    })
    ws.on("ready", () => { setDuration(ws.getDuration()); ws.setPlaybackRate(playbackRate) })
    ws.on("timeupdate", (t) => setCurrentTime(t))
    ws.on("play", () => setIsPlaying(true))
    ws.on("pause", () => setIsPlaying(false))
    ws.on("finish", () => setIsPlaying(false))
    waveSurferRef.current = ws
    return () => { ws.destroy(); waveSurferRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const ws = waveSurferRef.current
    if (!ws || !url) return
    ws.load(url)
  }, [url])

  useEffect(() => {
    waveSurferRef.current?.setPlaybackRate(playbackRate)
  }, [playbackRate])

  const togglePlay = () => { void waveSurferRef.current?.playPause() }

  const seekToChapter = (timecode: string) => {
    const ws = waveSurferRef.current
    if (!ws || duration <= 0) return
    const target = Math.min(toSeconds(timecode), duration)
    ws.seekTo(target / duration)
    setCurrentTime(target)
  }

  const addChapter = () => {
    const t = duration > 0 ? formatSeconds(currentTime) : "0:00"
    onChange("chapters", [...chapters, { time: t, title: `Chapter ${chapters.length + 1}` }])
  }

  const removeChapter = (i: number) => {
    onChange("chapters", chapters.filter((_, idx) => idx !== i))
  }

  const updateChapter = (i: number, field: keyof Chapter, value: string) => {
    onChange("chapters", chapters.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)))
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

      {/* Source */}
      <StudioSection className="pt-4">
        <StudioSegment
          options={[
            { value: "url", label: "URL" },
            { value: "upload", label: "Upload" },
          ]}
          value={sourceTab}
          onChange={setSourceTab}
        />
        {sourceTab === "url" ? (
          <StudioUrlInput
            value={url}
            placeholder="https://example.com/audio.mp3"
            onCommit={(u) => onChange("url", u)}
          />
        ) : (
          <StudioDropZone
            icon={<Upload size={22} />}
            label="Drop an MP3, WAV, or OGG file"
            hint="Upload to Supabase storage — coming soon"
            onDrop={() => {}}
            accept="audio/*"
          />
        )}
      </StudioSection>

      {/* Waveform player — hero */}
      <div className="shrink-0 border-b border-neutral-100 bg-neutral-950">
        {!url && (
          <div className="flex flex-col items-center justify-center gap-2.5 py-10">
            <AudioLines size={28} className="text-neutral-700" />
            <p className="text-[11px] text-neutral-500">Load an audio file above</p>
          </div>
        )}

        {url && (
          <div className="px-4 pt-4 pb-3 space-y-2">
            {/* Waveform + chapter pin overlay */}
            <div ref={waveContainerRef} className="relative">
              <div ref={waveformRef} className="rounded-md overflow-hidden" />
              {/* Chapter pins overlaid on waveform */}
              {duration > 0 && chapters.map((ch, i) => {
                const secs = toSeconds(ch.time)
                const pct = Math.min(100, Math.max(0, (secs / duration) * 100))
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => seekToChapter(ch.time)}
                    style={{ left: `${pct}%` }}
                    className="group absolute inset-y-0 -translate-x-1/2 pointer-events-auto"
                    title={ch.title || `Chapter ${i + 1}`}
                  >
                    <div className="absolute inset-y-0 w-px bg-[#4a94ff]/70 group-hover:bg-[#4a94ff]" />
                    <div className="absolute top-0 -translate-x-1/2 flex h-4 w-4 items-center justify-center rounded-b bg-[#4a94ff] text-[8px] font-bold text-white shadow-sm">
                      {i + 1}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Transport controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4a94ff] text-white shadow-sm hover:bg-[#3a84ef] transition-colors"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <div className="flex-1 text-[10px] font-mono text-neutral-400">
                {formatSeconds(currentTime)}
                <span className="mx-1 text-neutral-600">/</span>
                {formatSeconds(duration)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Speed */}
      <StudioSection label="Playback speed">
        <StudioPillGroup
          options={SPEED_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={playback}
          onChange={(v) => onChange("playback", v)}
          accentColor="#4a94ff"
        />
      </StudioSection>

      {/* Chapter markers */}
      <StudioSection
        label="Chapter markers"
        action={
          <button
            type="button"
            onClick={addChapter}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
          >
            <Plus size={10} />
            {duration > 0 ? "Add at playhead" : "Add"}
          </button>
        }
      >
        {chapters.length === 0 && (
          <p className="text-[11px] italic text-neutral-400">No chapters. Add one to mark key moments.</p>
        )}
        <div className="space-y-1.5">
          {chapters.map((ch, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-md border border-neutral-100 bg-neutral-50 px-2.5 py-1.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4a94ff] text-[8px] font-bold text-white">
                {i + 1}
              </span>
              <input
                type="text"
                value={ch.time}
                onChange={(e) => updateChapter(i, "time", e.target.value)}
                onBlur={() => seekToChapter(ch.time)}
                placeholder="0:00"
                className="w-14 shrink-0 bg-transparent font-mono text-[10px] text-neutral-500 outline-none focus:text-neutral-800"
              />
              <input
                type="text"
                value={ch.title}
                onChange={(e) => updateChapter(i, "title", e.target.value)}
                placeholder="Chapter title"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-neutral-700 outline-none focus:text-neutral-900"
              />
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => moveChapter(i, -1)} className="p-0.5 text-neutral-400 hover:text-neutral-700">
                  <ChevronUp size={12} />
                </button>
                <button type="button" onClick={() => moveChapter(i, 1)} className="p-0.5 text-neutral-400 hover:text-neutral-700">
                  <ChevronDown size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => seekToChapter(ch.time)}
                  className="ml-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-[#4a94ff] hover:bg-[#4a94ff]/10 transition-colors"
                >
                  Seek
                </button>
                <button type="button" onClick={() => removeChapter(i)} className="ml-0.5 p-0.5 text-neutral-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </StudioSection>

      {/* Transcript */}
      <StudioSection label="Transcript" noBorder>
        <StudioTextarea
          value={transcript}
          rows={8}
          placeholder={"[0:00] Welcome to today's lecture.\n[0:30] We'll start with…"}
          onChange={(e) => onChange("transcript", e.target.value)}
          hint="Use [0:30] timecodes to mark sections."
          className="font-mono"
        />
      </StudioSection>
    </div>
  )
}
