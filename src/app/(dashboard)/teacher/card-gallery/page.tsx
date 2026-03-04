"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { LucideIcon } from "lucide-react"
import { AudioLines, Bot, Box, Database, FileText, Film, Gamepad2, Image as ImageIcon, Layers, LineChart, Map as MapIcon, Maximize2, Network, Pause, Play, PlayCircle, Sparkles, Table2, Volume2, VolumeX } from "lucide-react"

const Model3DViewer = dynamic(
  () => import("@/components/coursebuilder/model-3d-viewer").then((m) => m.Model3DViewer),
  { ssr: false },
)

import type { CardId, CardType, DroppedCard, DroppedCardId, TaskId } from "@/components/coursebuilder/create/types"

interface CardNavItem {
  id: string
  label: string
  summary: string
  cardType: CardType
  card: DroppedCard
}

interface CardSection {
  title: string
  description: string
  items: CardNavItem[]
}

interface CardTypeMeta {
  label: string
  icon: LucideIcon
}

const CARD_TYPE_META: Record<CardType, CardTypeMeta> = {
  text:         { label: "Text",        icon: FileText   },
  image:        { label: "Image",       icon: ImageIcon  },
  audio:        { label: "Audio",       icon: AudioLines },
  video:        { label: "Video",       icon: PlayCircle },
  animation:    { label: "Animation",   icon: Film       },
  dataset:      { label: "Dataset",     icon: Database   },
  "model-3d":   { label: "3D Model",    icon: Box        },
  map:          { label: "Map",         icon: MapIcon    },
  chart:        { label: "Chart",       icon: LineChart  },
  diagram:      { label: "Diagram",     icon: Network    },
  media:        { label: "Media",       icon: Layers     },
  document:     { label: "Document",    icon: FileText   },
  table:        { label: "Table",       icon: Table2     },
  "rich-sim":   { label: "Simulation",  icon: Sparkles   },
  "village-3d": { label: "3D Scene",   icon: Box        },
  interactive:  { label: "Interactive", icon: Sparkles   },
  games:        { label: "Game",        icon: Gamepad2   },
  chat:         { label: "AI Chat",     icon: Bot        },
}

const BAR_COUNT = 36
const BAR_SPEEDS = Array.from({ length: BAR_COUNT }, (_, i) => 280 + Math.abs(Math.sin(i * 1.4)) * 220 + (i % 7) * 55)
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => 12 + Math.abs(Math.sin(i * 0.85 + 0.6)) * 78)

function AudioPreview({ url }: { url: string }) {
  const mediaRef = useRef<HTMLAudioElement>(null)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(1)
  const [seekProgress, setSeekProgress] = useState<number | null>(null)

  const displayProgress = seekProgress ?? progress
  const displayCurrent = seekProgress !== null && duration ? (seekProgress / 100) * duration : current

  const SPEEDS = [0.5, 1, 1.25, 1.5, 2]

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const toggle = () => {
    const a = mediaRef.current
    if (!a) return
    if (a.paused) { void a.play(); setPlaying(true) } else { a.pause(); setPlaying(false) }
  }

  const skip = (delta: number) => {
    const a = mediaRef.current
    if (!a) return
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta))
  }

  const toggleMute = () => {
    const a = mediaRef.current
    if (!a) return
    a.muted = !a.muted
    setMuted(a.muted)
  }

  const cycleSpeed = () => {
    const a = mediaRef.current
    const next = (speedIdx + 1) % SPEEDS.length
    if (a) a.playbackRate = SPEEDS[next]!
    setSpeedIdx(next)
  }

  const calcRatioA = (clientX: number) => {
    const el = scrubberRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  const onScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const a = mediaRef.current
    const ratio = calcRatioA(e.clientX)
    if (ratio === null) return
    let lastRatio = ratio
    setSeekProgress(ratio * 100)
    if (a && a.duration) a.currentTime = ratio * a.duration
    const onMove = (me: MouseEvent) => {
      const r = calcRatioA(me.clientX)
      if (r === null) return
      lastRatio = r
      setSeekProgress(r * 100)
    }
    const onUp = () => {
      if (a && a.duration) {
        a.currentTime = lastRatio * a.duration
        setCurrent(lastRatio * a.duration)
      }
      setProgress(lastRatio * 100)
      setSeekProgress(null)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const speedLabel = SPEEDS[speedIdx] === 1 ? "1×" : `${SPEEDS[speedIdx]}×`

  return (
    <div className="select-none">
      <audio
        ref={mediaRef}
        src={url}
        onTimeUpdate={() => {
          const a = mediaRef.current
          if (!a) return
          setCurrent(a.currentTime)
          setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0)
        }}
        onLoadedMetadata={() => { if (mediaRef.current) setDuration(mediaRef.current.duration) }}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex items-end gap-px h-20 mb-5">
        {BAR_SPEEDS.map((speed, i) => (
          <div
            key={i}
            className="flex-1 rounded-[2px]"
            style={{
              height: playing ? `${BAR_HEIGHTS[i]}%` : "10%",
              background: playing
                ? `hsl(${200 + (i / BAR_COUNT) * 60}, 70%, 55%)`
                : "hsl(var(--muted-foreground) / 0.25)",
              transition: playing ? "none" : "height 500ms ease, background 500ms ease",
              ...(playing ? {
                animationName: "audioBar",
                animationDuration: `${speed}ms`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationDirection: "alternate",
                animationDelay: `${(i * 41) % 380}ms`,
              } : {}),
            }}
          />
        ))}
      </div>

      {/* Scrubber */}
      <div
        ref={scrubberRef}
        className="relative flex h-5 cursor-pointer items-center group mb-1"
        onMouseDown={onScrubberMouseDown}
      >
        <div className="h-1.5 w-full rounded-full bg-muted group-hover:h-2.5 transition-[height] duration-150">
          <div
            className="h-full rounded-full bg-foreground/70"
            style={{ width: `${displayProgress}%`, transition: seekProgress !== null ? "none" : "width 100ms" }}
          />
        </div>
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ left: `${displayProgress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-6">
        <span>{fmt(displayCurrent)}</span>
        <span>{duration ? fmt(duration) : "--:--"}</span>
      </div>

      {/* Transport */}
      <div className="flex items-center">
        <div className="flex-1" />
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Skip back 10 seconds"
            onClick={() => skip(-10)}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <text x="8.5" y="14.5" fontSize="6" fill="currentColor" stroke="none" fontWeight="600">10</text>
            </svg>
            <span className="text-[10px] tabular-nums text-muted-foreground">−10s</span>
          </button>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground/15 bg-foreground text-background shadow-sm hover:bg-foreground/85 transition-colors"
          >
            {playing
              ? <Pause className="h-5 w-5 fill-background stroke-none" />
              : <Play  className="h-5 w-5 fill-background stroke-none ml-0.5" />}
          </button>
          <button
            type="button"
            aria-label="Skip forward 10 seconds"
            onClick={() => skip(10)}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <text x="8.5" y="14.5" fontSize="6" fill="currentColor" stroke="none" fontWeight="600">10</text>
            </svg>
            <span className="text-[10px] tabular-nums text-muted-foreground">+10s</span>
          </button>
        </div>
        <div className="flex flex-1 justify-end items-center gap-3">
          <button
            type="button"
            aria-label={`Playback speed ${speedLabel}. Click to change.`}
            onClick={cycleSpeed}
            className="min-w-[36px] rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
          >
            {speedLabel}
          </button>
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function VideoPreview({ url }: { url: string }) {
  const mediaRef   = useRef<HTMLVideoElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [seekProgress, setSeekProgress] = useState<number | null>(null)

  const displayProgress = seekProgress ?? progress
  const displayCurrent = seekProgress !== null && duration ? (seekProgress / 100) * duration : current

  const SPEEDS = [0.5, 1, 1.25, 1.5, 2]

  // Track fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // Auto-hide controls when fullscreen + idle
  useEffect(() => {
    if (!isFullscreen) { setControlsVisible(true); return }
    const reset = () => {
      setControlsVisible(true)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 2500)
    }
    reset()
    const el = wrapperRef.current
    el?.addEventListener("mousemove", reset)
    el?.addEventListener("click", reset)
    return () => {
      el?.removeEventListener("mousemove", reset)
      el?.removeEventListener("click", reset)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isFullscreen])

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const toggle = () => {
    const v = mediaRef.current
    if (!v) return
    if (v.paused) { void v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  const skip = (delta: number) => {
    const v = mediaRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta))
  }

  const toggleMute = () => {
    const v = mediaRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const cycleSpeed = () => {
    const v = mediaRef.current
    const next = (speedIdx + 1) % SPEEDS.length
    if (v) v.playbackRate = SPEEDS[next]!
    setSpeedIdx(next)
  }

  const calcRatioV = (clientX: number) => {
    const el = scrubberRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  const onScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const v = mediaRef.current
    const ratio = calcRatioV(e.clientX)
    if (ratio === null) return
    let lastRatio = ratio
    setSeekProgress(ratio * 100)
    if (v && v.duration) v.currentTime = ratio * v.duration
    const onMove = (me: MouseEvent) => {
      const r = calcRatioV(me.clientX)
      if (r === null) return
      lastRatio = r
      setSeekProgress(r * 100)
    }
    const onUp = () => {
      if (v && v.duration) {
        v.currentTime = lastRatio * v.duration
        setCurrent(lastRatio * v.duration)
      }
      setProgress(lastRatio * 100)
      setSeekProgress(null)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const toggleFullscreen = () => {
    const el = wrapperRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen()
  }

  const speedLabel = SPEEDS[speedIdx] === 1 ? "1×" : `${SPEEDS[speedIdx]}×`

  // Controls panel — shared between normal and fullscreen layouts
  const controls = (
    <div
      className={
        isFullscreen
          ? `absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pt-12 pb-5 transition-opacity duration-300 ${
              controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`
          : "mt-4 px-1"
      }
    >
      {/* Scrubber */}
      <div
        ref={scrubberRef}
        className="relative flex h-5 cursor-pointer items-center group mb-1"
        onMouseDown={onScrubberMouseDown}
      >
        <div className={`h-1.5 w-full rounded-full group-hover:h-2.5 transition-[height] duration-150 ${isFullscreen ? "bg-white/25" : "bg-muted"}`}>
          <div
            className={`h-full rounded-full ${isFullscreen ? "bg-white" : "bg-foreground/70"}`}
            style={{ width: `${displayProgress}%`, transition: seekProgress !== null ? "none" : "width 100ms" }}
          />
        </div>
        <div
          className={`pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${isFullscreen ? "bg-white" : "bg-foreground"}`}
          style={{ left: `${displayProgress}%` }}
        />
      </div>
      <div className={`flex items-center justify-between text-[11px] mb-4 ${isFullscreen ? "text-white/60" : "text-muted-foreground"}`}>
        <span>{fmt(displayCurrent)}</span>
        <span>{duration ? fmt(duration) : "--:--"}</span>
      </div>

      {/* Transport */}
      <div className="flex items-center">
        <div className="flex-1" />
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Skip back 10 seconds"
            onClick={() => skip(-10)}
            className={`flex flex-col items-center gap-1 transition-colors ${isFullscreen ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <text x="8.5" y="14.5" fontSize="6" fill="currentColor" stroke="none" fontWeight="600">10</text>
            </svg>
            <span className="text-[10px] tabular-nums">−10s</span>
          </button>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-sm transition-colors ${
              isFullscreen
                ? "border-white/20 bg-white text-black hover:bg-white/85"
                : "border-foreground/15 bg-foreground text-background hover:bg-foreground/85"
            }`}
          >
            {playing
              ? <Pause className={`h-5 w-5 stroke-none ${isFullscreen ? "fill-black" : "fill-background"}`} />
              : <Play  className={`h-5 w-5 stroke-none ml-0.5 ${isFullscreen ? "fill-black" : "fill-background"}`} />}
          </button>
          <button
            type="button"
            aria-label="Skip forward 10 seconds"
            onClick={() => skip(10)}
            className={`flex flex-col items-center gap-1 transition-colors ${isFullscreen ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <text x="8.5" y="14.5" fontSize="6" fill="currentColor" stroke="none" fontWeight="600">10</text>
            </svg>
            <span className="text-[10px] tabular-nums">+10s</span>
          </button>
        </div>
        <div className="flex flex-1 justify-end items-center gap-3">
          <button
            type="button"
            aria-label={`Playback speed ${speedLabel}. Click to change.`}
            onClick={cycleSpeed}
            className={`min-w-[36px] rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
              isFullscreen
                ? "border-white/30 text-white/70 hover:border-white/60 hover:text-white"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {speedLabel}
          </button>
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
            className={`transition-colors ${isFullscreen ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button
            type="button"
            aria-label="Toggle fullscreen"
            onClick={toggleFullscreen}
            className={`transition-colors ${isFullscreen ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Maximize2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div
      ref={wrapperRef}
      className={isFullscreen ? "relative flex flex-col w-full h-full bg-black select-none" : "select-none"}
    >
      {/* Video with click-to-play and pause overlay */}
      <div className={isFullscreen ? "relative flex-1 overflow-hidden" : "relative rounded-xl overflow-hidden bg-black aspect-video"}>
        <video
          ref={mediaRef}
          src={url}
          className={`w-full h-full cursor-pointer ${isFullscreen ? "object-contain" : "object-cover"}`}
          onClick={toggle}
          onTimeUpdate={() => {
            const v = mediaRef.current
            if (!v) return
            setCurrent(v.currentTime)
            setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)
          }}
          onLoadedMetadata={() => { if (mediaRef.current) setDuration(mediaRef.current.duration) }}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            onClick={toggle}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-lg backdrop-blur-sm transition-transform hover:scale-105">
              <Play className="h-6 w-6 fill-white stroke-none ml-1" />
            </div>
          </div>
        )}
      </div>

      {controls}
    </div>
  )
}

function AnimationPreview({ format, duration, fps }: { format: string; duration: string; fps: number }) {
  const blobs = [
    { cx: 80,  cy: 80,  r: 38, delay: "0s",   op: 0.22, dur: "2.8s" },
    { cx: 170, cy: 55,  r: 28, delay: "0.4s", op: 0.38, dur: "2.8s" },
    { cx: 245, cy: 100, r: 22, delay: "0.8s", op: 0.28, dur: "2.8s" },
    { cx: 140, cy: 145, r: 18, delay: "1.2s", op: 0.48, dur: "2.8s" },
    { cx: 55,  cy: 150, r: 14, delay: "1.6s", op: 0.32, dur: "2.8s" },
    { cx: 180, cy: 150, r: 32, delay: "0.6s", op: 0.14, dur: "3.4s" },
    { cx: 65,  cy: 44,  r: 22, delay: "1.0s", op: 0.18, dur: "3.4s" },
    { cx: 272, cy: 155, r: 16, delay: "1.8s", op: 0.28, dur: "3.4s" },
  ]
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 300 200" width="100%" height="100%" className="select-none">
          {blobs.map((b, i) => (
            <circle
              key={i}
              cx={b.cx}
              cy={b.cy}
              r={b.r}
              fill="hsl(var(--primary))"
              fillOpacity={b.op}
              style={{
                animationName: "animFloat",
                animationDuration: b.dur,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationDirection: "alternate",
                animationDelay: b.delay,
              }}
            />
          ))}
        </svg>
      </div>
      <div className="shrink-0 mt-3 flex flex-wrap gap-2">
        {format   && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{format}</span>}
        {duration && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{duration}</span>}
        {fps > 0  && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{fps} fps</span>}
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Loop</span>
      </div>
    </div>
  )
}

function MapPreview({ lat, lng, zoom, layers }: { lat: number; lng: number; zoom: number; layers: string[] }) {
  const W = 380, H = 200
  const gH = [35, 75, 105, 135, 168]
  const gV = [48, 100, 152, 200, 248, 296, 340]
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="select-none" style={{ background: "hsl(var(--muted)/0.3)" }}>
          {gH.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="hsl(var(--border))" strokeWidth={0.7} />)}
          {gV.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="hsl(var(--border))" strokeWidth={0.7} />)}
          <path d="M20,62 Q55,44 90,56 Q112,68 104,90 Q88,108 62,97 Q24,88 20,62Z"           fill="hsl(var(--muted-foreground)/0.18)" />
          <path d="M103,38 Q162,22 202,44 Q225,62 206,86 Q175,108 146,92 Q103,74 103,38Z"   fill="hsl(var(--muted-foreground)/0.18)" />
          <path d="M210,52 Q244,40 272,56 Q290,74 274,96 Q252,114 226,99 Q207,82 210,52Z"   fill="hsl(var(--muted-foreground)/0.18)" />
          <path d="M103,116 Q132,100 155,115 Q168,133 148,148 Q124,158 100,144 Q84,130 103,116Z" fill="hsl(var(--muted-foreground)/0.18)" />
          <path d="M196,120 Q228,112 250,128 Q256,144 238,154 Q213,160 194,146 Q184,132 196,120Z" fill="hsl(var(--muted-foreground)/0.18)" />
          <path d="M296,76 Q318,66 340,78 Q348,92 335,102 Q316,108 298,98 Q288,86 296,76Z"   fill="hsl(var(--muted-foreground)/0.18)" />
          <circle cx={W / 2} cy={H / 2} r={14} fill="hsl(var(--primary)/0.15)" />
          <circle cx={W / 2} cy={H / 2} r={5}  fill="hsl(var(--primary))" />
        </svg>
      </div>
      <div className="shrink-0 mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground font-mono">{lat.toFixed(1)}°, {lng.toFixed(1)}°</span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Zoom {zoom}</span>
        {layers.map((l) => <span key={l} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{l}</span>)}
      </div>
    </div>
  )
}

function ChartPreview({ chartType, xLabel, yLabel, source }: { chartType: string; xLabel: string; yLabel: string; source: string }) {
  const vals = [-0.16, -0.08, -0.11, -0.17, -0.28, -0.33, -0.14, 0.02, 0.19, 0.32, 0.54, 0.62, 0.98, 1.02]
  const W = 380, H = 168, pX = 36, pY = 16
  const iW = W - pX * 2, iH = H - pY * 2 - 14
  const minV = -0.5, maxV = 1.25
  const px = (i: number) => pX + (i / (vals.length - 1)) * iW
  const py = (v: number) => pY + iH - ((v - minV) / (maxV - minV)) * iH
  const linePath = vals.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L${px(vals.length - 1).toFixed(1)},${(pY + iH).toFixed(1)} L${px(0).toFixed(1)},${(pY + iH).toFixed(1)}Z`
  const zeroY = py(0)
  const decades = ["1880", "1900", "1920", "1940", "1960", "1980", "2000", "2020"]
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="select-none">
          <line x1={pX} y1={zeroY} x2={W - pX} y2={zeroY} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 3" />
          {[-0.4, 0, 0.4, 0.8, 1.2].map((v) => (
            <g key={v}>
              <line x1={pX - 4} y1={py(v)} x2={pX} y2={py(v)} stroke="hsl(var(--border))" strokeWidth={0.8} />
              <text x={pX - 6} y={py(v) + 4} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground)/0.7)">{v > 0 ? `+${v}` : v}</text>
            </g>
          ))}
          {decades.map((yr, i) => {
            const xi = (i / (decades.length - 1)) * (vals.length - 1)
            return <text key={yr} x={px(xi)} y={H - 3} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground)/0.7)">{yr}</text>
          })}
          <path d={areaPath} fill="hsl(var(--primary)/0.08)" />
          <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {vals.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r={2.5} fill="hsl(var(--primary))" />)}
        </svg>
      </div>
      <div className="shrink-0 mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground capitalize">{chartType}</span>
        {xLabel && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">x: {xLabel}</span>}
        {yLabel && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">y: {yLabel}</span>}
        {source && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Source: {source}</span>}
      </div>
    </div>
  )
}

function DiagramPreview({ diagramType, nodes, edges }: { diagramType: string; nodes: number; edges: number }) {
  const W = 380, H = 228
  const nodeData = [
    { id: "a", label: "Acetyl CoA",       x: 190, y: 28,  w: 94,  h: 26 },
    { id: "b", label: "Citrate",          x: 320, y: 80,  w: 72,  h: 26 },
    { id: "c", label: "Isocitrate",       x: 332, y: 150, w: 82,  h: 26 },
    { id: "d", label: "α-Ketoglutarate", x: 230, y: 198, w: 114, h: 26 },
    { id: "e", label: "Malate",           x: 148, y: 198, w: 64,  h: 26 },
    { id: "f", label: "Fumarate",         x: 46,  y: 150, w: 76,  h: 26 },
    { id: "g", label: "Oxaloacetate",    x: 56,  y: 80,  w: 96,  h: 26 },
  ]
  const edgePairs: [string, string][] = [["g","a"],["a","b"],["b","c"],["c","d"],["d","e"],["e","f"],["f","g"]]
  const byId = (id: string) => nodeData.find((n) => n.id === id)!
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" className="select-none">
          <defs>
            <marker id="dg-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 Z" fill="hsl(var(--muted-foreground)/0.45)" />
            </marker>
          </defs>
          {edgePairs.map(([from, to], i) => {
            const a = byId(from), b = byId(to)
            return <line key={i} x1={a.x} y1={a.y + a.h / 2} x2={b.x} y2={b.y + b.h / 2} stroke="hsl(var(--muted-foreground)/0.35)" strokeWidth={1.4} markerEnd="url(#dg-arrow)" />
          })}
          {nodeData.map((n) => (
            <g key={n.id}>
              <rect x={n.x - n.w / 2} y={n.y} width={n.w} height={n.h} rx={7} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1.2} />
              <text x={n.x} y={n.y + n.h / 2 + 4.5} textAnchor="middle" fontSize={9.5} fill="hsl(var(--foreground)/0.85)">{n.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="shrink-0 mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground capitalize">{diagramType}</span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{nodes} nodes</span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{edges} edges</span>
      </div>
    </div>
  )
}

function CardPreview({ cardType, content }: { cardType: CardType; content: Record<string, unknown> }) {
  const meta = CARD_TYPE_META[cardType]
  const title = typeof content["title"] === "string" ? content["title"] : meta.label
  switch (cardType) {
    case "text": {
      const text = typeof content["text"] === "string" ? content["text"] : ""
      return (
        <div className="h-full overflow-auto">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{text || "Add your copy here."}</p>
        </div>
      )
    }
    case "image": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      const alt = typeof content["alt"] === "string" ? content["alt"] : title
      return (
        <div className="h-full rounded-xl overflow-hidden">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={alt || "Image"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-sm">No image provided.</span>
          )}
        </div>
      )
    }
    case "video": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      if (!url) return <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">No video provided.</div>
      return (
        <div className="h-full flex flex-col gap-4">
          <VideoPreview url={url} />
        </div>
      )
    }
    case "audio": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      return (
        <div className="h-full flex flex-col justify-center">
          <AudioPreview url={url} />
        </div>
      )
    }
    case "animation": {
      const format   = typeof content["format"]   === "string" ? content["format"]   : ""
      const duration = typeof content["duration"] === "string" ? content["duration"] : ""
      const fps      = typeof content["fps"]      === "number" ? content["fps"]      : 0
      return <AnimationPreview format={format} duration={duration} fps={fps} />
    }
    case "map": {
      const lat    = typeof content["lat"]    === "number" ? content["lat"]    : 0
      const lng    = typeof content["lng"]    === "number" ? content["lng"]    : 0
      const zoom   = typeof content["zoom"]   === "number" ? content["zoom"]   : 2
      const layers = Array.isArray(content["layers"]) ? content["layers"] as string[] : []
      return <MapPreview lat={lat} lng={lng} zoom={zoom} layers={layers} />
    }
    case "chart": {
      const chartType = typeof content["chartType"] === "string" ? content["chartType"] : "line"
      const xLabel    = typeof content["xLabel"]    === "string" ? content["xLabel"]    : ""
      const yLabel    = typeof content["yLabel"]    === "string" ? content["yLabel"]    : ""
      const source    = typeof content["source"]    === "string" ? content["source"]    : ""
      return <ChartPreview chartType={chartType} xLabel={xLabel} yLabel={yLabel} source={source} />
    }
    case "diagram": {
      const diagramType = typeof content["diagramType"] === "string" ? content["diagramType"] : "flowchart"
      const nodes       = typeof content["nodes"]       === "number" ? content["nodes"]       : 0
      const edges       = typeof content["edges"]       === "number" ? content["edges"]       : 0
      return <DiagramPreview diagramType={diagramType} nodes={nodes} edges={edges} />
    }
    case "dataset": {
      const source = typeof content["source"] === "string" ? content["source"] : ""
      const rows = typeof content["rows"] === "number" ? content["rows"] : 0
      const cols = typeof content["columns"] === "number" ? content["columns"] : 0
      const fmt = typeof content["format"] === "string" ? content["format"] : ""
      const sampleHeaders = ["sepal_length", "sepal_width", "petal_length", "petal_width", "species"]
      const sampleRows = [
        ["5.1", "3.5", "1.4", "0.2", "setosa"],
        ["4.9", "3.0", "1.4", "0.2", "setosa"],
        ["4.7", "3.2", "1.3", "0.2", "setosa"],
        ["6.4", "3.2", "4.5", "1.5", "versicolor"],
        ["6.9", "3.1", "4.9", "1.5", "versicolor"],
        ["5.5", "2.3", "4.0", "1.3", "versicolor"],
        ["6.3", "3.3", "6.0", "2.5", "virginica"],
        ["5.8", "2.7", "5.1", "1.9", "virginica"],
        ["7.1", "3.0", "5.9", "2.1", "virginica"],
      ]
      return (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {rows > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{rows} rows</span>}
            {cols > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{cols} columns</span>}
            {fmt && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{fmt}</span>}
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {sampleHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-foreground/80 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className={`px-3 py-2 whitespace-nowrap ${j === sampleHeaders.length - 1 ? "text-muted-foreground italic" : "text-foreground font-mono"}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Showing {sampleRows.length} of {rows} rows · {source && <a href={source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">View source</a>}</p>
        </div>
      )
    }
    case "model-3d": {
      return <Model3DViewer />
    }
    case "media": {
      const primary = typeof content["primary"] === "string" ? content["primary"] : "video/mp4"
      const files = typeof content["files"] === "number" ? content["files"] : 3
      const sources = Array.isArray(content["sources"]) ? content["sources"] : ["video", "audio", "transcript"]
      return (
        <>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-[12px] text-muted-foreground">Primary: {primary} • {files} files</p>
            </div>
            <Layers className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap gap-2 text-[12px] text-muted-foreground">
            {sources.map((s) => (
              <span key={s as string} className="rounded-full border border-border px-3 py-1">{s as string}</span>
            ))}
          </div>
        </>
      )
    }
    default:
      return (
        <p className="text-sm text-muted-foreground">Preview not available for this type yet.</p>
      )
  }
}

function CardTypeBadge({ cardType, className = "" }: { cardType: CardType; className?: string }) {
  const meta = CARD_TYPE_META[cardType]
  const Icon = meta.icon

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-[4px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${className}`}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{meta.label}</span>
    </span>
  )
}

function getCardHeader(cardType: CardType, content: Record<string, unknown>): { title: string; subtitle: string } {
  const title = (typeof content["title"] === "string" && content["title"]) || CARD_TYPE_META[cardType].label
  switch (cardType) {
    case "audio": {
      const dur = typeof content["duration"] === "string" ? content["duration"] : ""
      return { title, subtitle: dur }
    }
    case "dataset": {
      const rows = typeof content["rows"] === "number" ? `${content["rows"]} rows` : ""
      const cols = typeof content["columns"] === "number" ? `${content["columns"]} columns` : ""
      const fmt = typeof content["format"] === "string" ? content["format"] : ""
      return { title, subtitle: [rows, cols, fmt].filter(Boolean).join(" · ") }
    }
    case "model-3d": {
      const fmt = typeof content["format"] === "string" ? content["format"] : ""
      return { title, subtitle: fmt }
    }
    case "animation": {
      const fmt = typeof content["format"]   === "string" ? content["format"]   : ""
      const dur = typeof content["duration"] === "string" ? content["duration"] : ""
      return { title, subtitle: [fmt, dur].filter(Boolean).join(" · ") }
    }
    case "map": {
      const layerCount = Array.isArray(content["layers"]) ? `${(content["layers"] as unknown[]).length} layers` : ""
      return { title, subtitle: layerCount }
    }
    case "chart": {
      const ct  = typeof content["chartType"] === "string" ? content["chartType"] : ""
      const src = typeof content["source"]    === "string" ? content["source"]    : ""
      return { title, subtitle: [ct, src].filter(Boolean).join(" · ") }
    }
    case "diagram": {
      const dt = typeof content["diagramType"] === "string" ? content["diagramType"] : ""
      const n  = typeof content["nodes"]       === "number" ? `${content["nodes"]} nodes` : ""
      return { title, subtitle: [dt, n].filter(Boolean).join(" · ") }
    }
    default:
      return { title, subtitle: "" }
  }
}

function makeCard(
  id: string,
  cardType: CardType,
  content: Record<string, unknown>,
  overrides?: Partial<DroppedCard>,
): DroppedCard {
  return {
    id:         `${id}-preview` as DroppedCardId,
    cardId:     `${id}-source`  as CardId,
    cardType,
    taskId:     "task-preview"  as TaskId,
    areaKind:   "instruction",
    position:   { x: 0, y: 0 },
    dimensions: { width: 420, height: 220 },
    content,
    order: 0,
    ...overrides,
  }
}

const CARD_SECTIONS: CardSection[] = [
  {
    title:       "Media Cards",
    description: "Nine core Atlas media types available as droppable cards.",
    items: [
      {
        id:       "text",
        label:    "Text",
        summary:  "Structured copy with optional title; best for instructions and prompts.",
        cardType: "text",
        card:     makeCard("text", "text", {
          title: "The Water Cycle",
          text:  "The water cycle, also known as the hydrological cycle, describes the continuous movement of water through Earth's systems — from surface bodies to the atmosphere and back again. It is driven primarily by solar energy and the force of gravity, and it plays a fundamental role in distributing heat and freshwater across the planet.\n\nEvaporation is the process by which liquid water at the surface of oceans, lakes, rivers, and soil is converted into water vapour and enters the atmosphere. The sun's radiant energy provides the heat needed to break the molecular bonds holding liquid water together. Warm temperatures accelerate this process, which is why equatorial regions contribute disproportionately to global atmospheric moisture.\n\nTranspiration accounts for a significant additional share of atmospheric water vapour. Plants draw water up through their roots, transport it through vascular tissue, and release it as vapour through tiny pores called stomata on the underside of leaves. In densely forested areas such as the Amazon basin, transpiration rivals evaporation from open water bodies and profoundly influences regional climate patterns.\n\nCondensation occurs when water vapour cools and transforms back into liquid droplets or ice crystals, forming clouds and fog. For condensation to begin, the air must reach its dew point — the temperature at which it can no longer hold its current concentration of water vapour. Tiny aerosol particles, including dust, sea salt, and pollen, serve as condensation nuclei around which droplets form.\n\nPrecipitation is the mechanism by which condensed water falls back to Earth's surface in the form of rain, drizzle, snow, sleet, or hail, depending on temperature and atmospheric conditions. The global average annual precipitation is approximately 990 mm, though distribution varies dramatically: tropical rainforests may receive over 3000 mm per year, while hyperarid deserts receive fewer than 25 mm.\n\nInfiltration and surface runoff determine what happens to precipitation once it reaches the ground. Permeable soils and vegetation allow water to infiltrate and recharge groundwater aquifers, while impermeable surfaces — whether bedrock, frozen ground, or urban pavement — cause water to flow overland into streams and rivers. Land-use change and urbanisation have significantly altered infiltration rates in many regions, increasing flood risk and reducing aquifer recharge.\n\nGroundwater represents the largest reservoir of unfrozen freshwater on Earth. Water percolates downward through layers of soil and porous rock until it reaches a saturated zone called an aquifer. Aquifers can store water for decades, centuries, or even millennia. Many of the world's major agricultural regions depend on aquifer systems that are being drawn down faster than natural recharge can replace them.\n\nThe water cycle is intimately coupled to the global climate system. As warming increases sea surface temperatures, evaporation rates rise, intensifying the cycle: wet regions tend to receive more precipitation, while already-dry regions experience more prolonged droughts. Understanding these feedbacks is central to projecting future water availability and managing freshwater resources sustainably.",
        }),
      },
      {
        id:       "image",
        label:    "Image",
        summary:  "Inline media with caption; respects sizing while maintaining aspect ratio.",
        cardType: "image",
        card:     makeCard("image", "image", {
          title: "Diagram: Circulatory system",
          url:   "https://picsum.photos/seed/anatomy/800/600",
          alt:   "Medical illustration",
        }, { dimensions: { width: 460, height: 240 } }),
      },
      {
        id:       "audio",
        label:    "Audio",
        summary:  "Clips or narration snippets; waveform and transcripts coming soon.",
        cardType: "audio",
        card:     makeCard("audio", "audio", {
          title:    "Lecture excerpt — Cell division",
          duration: "04:12",
          url:      "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3",
        }),
      },
      {
        id:       "video",
        label:    "Video",
        summary:  "Embeds hosted video when possible; falls back to native playback controls.",
        cardType: "video",
        card:     makeCard("video", "video", {
          title: "Introduction to photosynthesis",
          url:   "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        }, { dimensions: { width: 460, height: 240 } }),
      },
      {
        id:       "animation",
        label:    "Animation",
        summary:  "Looping or time-based visual animations; Lottie JSON or animated SVG.",
        cardType: "animation",
        card:     makeCard("animation", "animation", {
          title:    "Mitosis — cell division",
          format:   "Lottie / JSON",
          duration: "8s",
          fps:      30,
          loop:     true,
        }),
      },
      {
        id:       "model-3d",
        label:    "3D Model",
        summary:  "Static 3D assets or scenes rendered in-place; GLB/GLTF format.",
        cardType: "model-3d",
        card:     makeCard("model-3d", "model-3d", {
          title:  "Astronaut model",
          format: "GLB",
          url:    "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
        }, { dimensions: { width: 520, height: 240 } }),
      },
      {
        id:       "map",
        label:    "Map",
        summary:  "Geographic or schematic maps with optional overlays and markers.",
        cardType: "map",
        card:     makeCard("map", "map", {
          title:       "World population density",
          lat:         20.0,
          lng:         10.0,
          zoom:        2,
          layers:      ["choropleth", "city labels"],
          attribution: "Natural Earth",
        }, { dimensions: { width: 480, height: 220 } }),
      },
      {
        id:       "chart",
        label:    "Chart",
        summary:  "Data visualizations: line, bar, scatter, and more.",
        cardType: "chart",
        card:     makeCard("chart", "chart", {
          title:     "Global temperature anomaly 1880–2020",
          chartType: "line",
          xLabel:    "Year",
          yLabel:    "°C anomaly",
          source:    "NASA GISS",
        }, { dimensions: { width: 480, height: 200 } }),
      },
      {
        id:       "diagram",
        label:    "Diagram",
        summary:  "Flowcharts, concept maps, and process diagrams.",
        cardType: "diagram",
        card:     makeCard("diagram", "diagram", {
          title:       "Krebs cycle overview",
          diagramType: "flowchart",
          nodes:       7,
          edges:       7,
          layout:      "circular",
        }, { dimensions: { width: 480, height: 240 } }),
      },
    ],
  },
]

export default function CardGalleryPage() {
  const initialId = CARD_SECTIONS[0]?.items[0]?.id
  const [activeId, setActiveId] = useState<string | undefined>(initialId)

  const activeItem = useMemo(() => {
    for (const section of CARD_SECTIONS) {
      const found = section.items.find((item) => item.id === activeId)
      if (found) return found
    }
    return undefined
  }, [activeId])

  return (
    <div className="min-h-[520px] h-[calc(100dvh-96px)] overflow-hidden">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-background p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cards</p>
            <span className="text-[11px] text-muted-foreground">{CARD_SECTIONS.reduce((t, s) => t + s.items.length, 0)} total</span>
          </div>
          <div className="nav-scroll space-y-4">
            {CARD_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="text-xs font-semibold text-foreground">{section.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{section.description}</p>
                <div className="space-y-1.5">
                  {section.items.map((item) => {
                    const isActive = item.id === activeId
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveId(item.id)}
                        className={
                          isActive
                            ? "group flex w-full items-start gap-3 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 px-3 py-2 text-left shadow-sm transition"
                            : "group flex w-full items-start gap-3 rounded-xl border border-border/80 bg-background px-3 py-2 text-left transition hover:border-primary/30 hover:bg-primary/5"
                        }
                      >
                        <span className={
                          isActive
                            ? "mt-[6px] h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
                            : "mt-[6px] h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40"
                        } />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{item.label}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground group-hover:text-foreground/80">
                            {item.summary}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 min-h-0 h-full overflow-hidden">
          {activeItem ? (
            <div
              className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-background p-5 overflow-hidden"
            >
              {(() => {
                const header  = getCardHeader(activeItem.cardType, activeItem.card.content)
                const meta    = CARD_TYPE_META[activeItem.cardType]
                const TypeIcon = meta?.icon
                return (
                  <div key={activeId} className="card-detail mb-5 shrink-0 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-foreground">{header.title}</h2>
                      {header.subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{header.subtitle}</p>}
                    </div>
                    {meta && TypeIcon && (
                      <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5">
                        <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[11px] font-medium text-muted-foreground">{meta.label}</span>
                      </div>
                    )}
                  </div>
                )
              })()}
              <div className="flex-1 min-h-0 overflow-hidden">
                <CardPreview cardType={activeItem.cardType} content={activeItem.card.content} />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-3xl border border-border bg-background p-6 text-sm text-muted-foreground">
              Select a card from the left to preview it.
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .card-detail { animation: fadeSlide 180ms ease-out; min-height: 0; }
        .nav-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
          scrollbar-width: none;
        }
        .nav-scroll::-webkit-scrollbar { display: none; }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes audioBar {
          from { height: 8%;  }
          to   { height: 90%; }
        }
        @keyframes animFloat {
          from { transform: translateY(0px);   opacity: 0.55; }
          to   { transform: translateY(-16px); opacity: 1;    }
        }
      `}</style>
    </div>
  )
}
