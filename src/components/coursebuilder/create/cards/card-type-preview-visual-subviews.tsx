"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Pause, Play, RefreshCw, SkipBack, SkipForward, Sparkles } from "lucide-react"
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts"

// Lottie player — SSR-safe
const LottiePlayer = dynamic(() => import("lottie-react").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="flex h-28 items-center justify-center bg-neutral-50 text-[11px] text-neutral-400">Loading…</div>,
})

// ─── Animation Preview ─────────────────────────────────────────────────────────

interface AnimationPreviewProps {
  format: string
  duration: string
  fps: number
  url?: string
  lottieData?: object
  title?: string
}

const ANIM_SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const
type AnimPlaybackRate = typeof ANIM_SPEED_STEPS[number]
const SVG_LOOP_DURATION = 3.2 // seconds — matches longest blob animation

// ─── Shared animation transport bar ───────────────────────────────────────────

function AnimTransportBar({
  playing, progress, seekProg, currentTime, totalTime, speed, loop,
  onTogglePlay, onSkip, onSpeedChange, onLoopToggle,
  onScrubDown, onScrubMove, onScrubUp, scrubRef,
}: {
  playing: boolean
  progress: number
  seekProg: number | null
  currentTime: number
  totalTime: number
  speed: AnimPlaybackRate
  loop: boolean
  onTogglePlay: () => void
  onSkip: (delta: number) => void
  onSpeedChange: (s: AnimPlaybackRate) => void
  onLoopToggle: () => void
  onScrubDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onScrubMove: (e: React.PointerEvent<HTMLDivElement>) => void
  onScrubUp: (e: React.PointerEvent<HTMLDivElement>) => void
  scrubRef: React.RefObject<HTMLDivElement | null>
}) {
  const disp = seekProg ?? progress
  const dispCur = seekProg !== null && totalTime ? (seekProg / 100) * totalTime : currentTime
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }
  return (
    <div className="mt-2">
      {/* Scrubber */}
      <div
        ref={scrubRef}
        className="relative flex h-5 cursor-pointer items-center touch-none group"
        onPointerDown={onScrubDown}
        onPointerMove={onScrubMove}
        onPointerUp={onScrubUp}
      >
        <div className="h-1.5 w-full rounded-full bg-muted group-hover:h-2.5 transition-[height] duration-150">
          <div
            className="h-full rounded-full bg-foreground/70"
            style={{ width: `${disp}%`, transition: seekProg !== null ? "none" : "width 100ms" }}
          />
        </div>
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${disp}%` }}
        />
      </div>
      {/* Timestamps */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
        <span>{fmt(dispCur)}</span>
        <span>{totalTime > 0 ? fmt(totalTime) : "--:--"}</span>
      </div>
      {/* Transport row */}
      <div className="relative flex items-center justify-center mb-2">
        <div className="flex items-center gap-1 mr-6">
          <span className="shrink-0 w-6 text-[10px] text-muted-foreground tabular-nums">{speed}×</span>
          <input
            type="range" min={0.5} max={2} step={0.25} value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value) as AnimPlaybackRate)}
            className="w-24 cursor-pointer touch-none"
            style={{ accentColor: "var(--foreground)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onSkip(-10)} title="Skip back 10s"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground/15 bg-foreground shadow-sm hover:bg-foreground/85 transition-colors">
            <SkipBack className="h-4 w-4 fill-background stroke-none" />
          </button>
          <button type="button" onClick={onTogglePlay}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground/15 bg-foreground shadow-sm hover:bg-foreground/85 transition-colors">
            {playing
              ? <Pause className="h-4 w-4 fill-background stroke-none" />
              : <Play className="h-4 w-4 fill-background stroke-none ml-0.5" />}
          </button>
          <button type="button" onClick={() => onSkip(10)} title="Skip forward 10s"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground/15 bg-foreground shadow-sm hover:bg-foreground/85 transition-colors">
            <SkipForward className="h-4 w-4 fill-background stroke-none" />
          </button>
        </div>
        <div className="ml-6">
          <button type="button" onClick={onLoopToggle} title="Loop"
            className={["transition-colors", loop ? "text-foreground" : "text-muted-foreground hover:text-foreground"].join(" ")}>
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AnimationPreview({ format, fps: _fps, url, lottieData }: AnimationPreviewProps) {
  const [playing, setPlaying] = React.useState(true)
  const [progress, setProgress] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [totalTime, setTotalTime] = React.useState(0)
  const [speed, setSpeed] = React.useState<AnimPlaybackRate>(1)
  const [loop, setLoop] = React.useState(true)
  const [seekProg, setSeekProg] = React.useState<number | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lottieRef = React.useRef<any>(null)
  const scrubRef = React.useRef<HTMLDivElement | null>(null)
  const scrubbingRef = React.useRef(false)
  const rafRef = React.useRef<number | undefined>(undefined)

  // SVG fallback synthetic clock
  const svgElapsedRef = React.useRef(0)
  const svgLastTsRef = React.useRef<number | null>(null)
  const playingRef = React.useRef(true)
  const speedRef = React.useRef<number>(1)
  const loopRef = React.useRef(true)
  React.useEffect(() => { playingRef.current = playing }, [playing])
  React.useEffect(() => { speedRef.current = speed }, [speed])
  React.useEffect(() => { loopRef.current = loop }, [loop])

  // ── Lottie RAF tracking ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!lottieData) return
    const tick = () => {
      const anim = lottieRef.current?.animationItem
      if (anim && (anim.totalFrames as number) > 0) {
        const cf = anim.currentFrame as number
        const tf = anim.totalFrames as number
        const dur = (anim.getDuration?.() as number) ?? 0
        setCurrentTime((cf / tf) * dur)
        setTotalTime(dur)
        setProgress((cf / tf) * 100)
        if (!anim.isPaused && !playingRef.current) setPlaying(true)
        if (anim.isPaused && playingRef.current) {/* let lottie drive */}
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current) }
  }, [lottieData])

  // Keep Lottie loop property in sync without restarting the animation
  React.useEffect(() => {
    if (!lottieData || !lottieRef.current?.animationItem) return
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    lottieRef.current.animationItem.loop = loop
  }, [loop, lottieData])

  // ── SVG fallback RAF clock ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (lottieData || (url && (format === "gif" || url.endsWith(".gif")))) return
    setTotalTime(SVG_LOOP_DURATION)
    const tick = (ts: number) => {
      if (playingRef.current) {
        if (svgLastTsRef.current !== null) {
          const dt = ((ts - svgLastTsRef.current) / 1000) * speedRef.current
          const next = svgElapsedRef.current + dt
          if (!loopRef.current && next >= SVG_LOOP_DURATION) {
            svgElapsedRef.current = SVG_LOOP_DURATION
            setPlaying(false)
          } else {
            svgElapsedRef.current = loopRef.current
              ? next % SVG_LOOP_DURATION
              : Math.min(next, SVG_LOOP_DURATION)
          }
        }
        svgLastTsRef.current = ts
      } else {
        svgLastTsRef.current = null
      }
      setCurrentTime(svgElapsedRef.current)
      setProgress((svgElapsedRef.current / SVG_LOOP_DURATION) * 100)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current) }
  }, [lottieData, url, format])

  // ── Scrubber helpers ────────────────────────────────────────────────────────
  const getScrubRatio = (clientX: number) => {
    const el = scrubRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }

  const seekTo = (ratio: number) => {
    if (lottieData) {
      const anim = lottieRef.current?.animationItem
      if (!anim?.totalFrames) return
      const frame = ratio * (anim.totalFrames as number)
      if (playing) lottieRef.current.goToAndPlay(frame, true)
      else lottieRef.current.goToAndStop(frame, true)
    } else {
      svgElapsedRef.current = ratio * SVG_LOOP_DURATION
    }
  }

  const onScrubDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    scrubbingRef.current = true
    const r = getScrubRatio(e.clientX)
    setSeekProg(r * 100)
    seekTo(r)
  }

  const onScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    const r = getScrubRatio(e.clientX)
    setSeekProg(r * 100)
    seekTo(r)
  }

  const onScrubUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    scrubbingRef.current = false
    seekTo(getScrubRatio(e.clientX))
    setSeekProg(null)
  }

  const skip = (delta: number) => {
    if (lottieData) {
      const anim = lottieRef.current?.animationItem
      if (!anim?.totalFrames) return
      const dur = (anim.getDuration?.() as number) ?? 0
      if (!dur) return
      const newTime = Math.max(0, Math.min(dur, currentTime + delta))
      const newFrame = (newTime / dur) * (anim.totalFrames as number)
      if (playing) lottieRef.current.goToAndPlay(newFrame, true)
      else lottieRef.current.goToAndStop(newFrame, true)
    } else {
      svgElapsedRef.current = Math.max(
        0,
        loopRef.current
          ? (svgElapsedRef.current + delta + SVG_LOOP_DURATION) % SVG_LOOP_DURATION
          : Math.min(svgElapsedRef.current + delta, SVG_LOOP_DURATION),
      )
    }
  }

  const togglePlay = () => {
    const next = !playing
    if (lottieData) {
      if (next) lottieRef.current?.play()
      else lottieRef.current?.pause()
    }
    setPlaying(next)
  }

  const handleSpeedChange = (s: AnimPlaybackRate) => {
    setSpeed(s)
    if (lottieData) lottieRef.current?.setSpeed(s)
  }

  const handleLoopToggle = () => setLoop((l) => !l)

  const transportProps = {
    playing, progress, seekProg, currentTime, totalTime, speed, loop,
    onTogglePlay: togglePlay,
    onSkip: skip,
    onSpeedChange: handleSpeedChange,
    onLoopToggle: handleLoopToggle,
    onScrubDown,
    onScrubMove,
    onScrubUp,
    scrubRef,
  }

  // ── Lottie ──────────────────────────────────────────────────────────────────
  if (lottieData) {
    return (
      <div>
        <div className="relative flex items-center justify-center bg-white border border-border overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <LottiePlayer
            animationData={lottieData}
            loop={loop}
            autoplay
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            lottieRef={lottieRef}
            onComplete={() => { if (!loop) setPlaying(false) }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <AnimTransportBar {...transportProps} />
      </div>
    )
  }

  // ── GIF ─────────────────────────────────────────────────────────────────────
  if (url && (format === "gif" || url.endsWith(".gif"))) {
    return (
      <div>
        <div className="relative flex items-center justify-center border border-border overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Animation" className="max-h-full max-w-full object-contain" />
          <span className="absolute bottom-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">GIF</span>
        </div>
      </div>
    )
  }

  // ── SVG fallback blob visualization ─────────────────────────────────────────
  const blobs = [
    { cx: 80,  cy: 106, r: 50,  delay: "0s",   op: 0.22, dur: "2.8s" },
    { cx: 190, cy: 73,  r: 37,  delay: "0.4s",  op: 0.38, dur: "2.8s" },
    { cx: 300, cy: 133, r: 29,  delay: "0.8s",  op: 0.28, dur: "2.8s" },
    { cx: 175, cy: 193, r: 24,  delay: "1.2s",  op: 0.48, dur: "2.8s" },
    { cx: 55,  cy: 200, r: 18,  delay: "1.6s",  op: 0.32, dur: "2.8s" },
    { cx: 240, cy: 200, r: 42,  delay: "0.6s",  op: 0.14, dur: "3.4s" },
    { cx: 70,  cy: 58,  r: 28,  delay: "1.0s",  op: 0.18, dur: "3.4s" },
    { cx: 355, cy: 200, r: 20,  delay: "1.8s",  op: 0.28, dur: "3.4s" },
  ]

  return (
    <div>
      <div className="relative">
        <svg
          viewBox="0 0 400 225"
          width="100%"
          className="select-none"
          style={{ aspectRatio: "16/9", display: "block" }}
        >
          {blobs.map((b, i) => {
            const blobDur = parseFloat(b.dur)
            const blobDelay = parseFloat(b.delay)
            // When paused: freeze by computing where the blob should be at currentTime
            const frozenDelay = -((currentTime * speed + blobDelay) % blobDur + blobDur) % blobDur
            return (
              <circle
                key={i}
                cx={b.cx}
                cy={b.cy}
                r={b.r}
                fill="hsl(var(--primary))"
                fillOpacity={b.op}
                style={playing ? {
                  animationName: "animFloat",
                  animationDuration: `${blobDur / speed}s`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDirection: "alternate",
                  animationDelay: b.delay,
                  animationPlayState: "running",
                } : {
                  animationName: "animFloat",
                  animationDuration: `${blobDur / speed}s`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDirection: "alternate",
                  animationDelay: `${frozenDelay}s`,
                  animationPlayState: "paused",
                }}
              />
            )
          })}
        </svg>
      </div>
      <AnimTransportBar {...transportProps} />
    </div>
  )
}

// ─── Map Preview ───────────────────────────────────────────────────────────────

export function MapPreview({ lat, lng, zoom, layers }: { lat: number; lng: number; zoom: number; layers: string[] }) {
  const W = 380
  const H = 213  // 16:9 of 380

  const gH = [37, 75, 106, 142, 178]
  const gV = [48, 100, 152, 200, 248, 296, 340]

  return (
    <div>
      <div style={{ aspectRatio: "16/9", width: "100%", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "hsl(var(--muted)/0.3)", display: "block" }} className="select-none">
        {gH.map((y, i) => <line key={`h${i}`} x1={0} y1={y} x2={W} y2={y} stroke="hsl(var(--border))" strokeWidth={0.7} />)}
        {gV.map((x, i) => <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} stroke="hsl(var(--border))" strokeWidth={0.7} />)}
        <path d="M20,62 Q55,44 90,56 Q112,68 104,90 Q88,108 62,97 Q24,88 20,62Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <path d="M103,38 Q162,22 202,44 Q225,62 206,86 Q175,108 146,92 Q103,74 103,38Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <path d="M210,52 Q244,40 272,56 Q290,74 274,96 Q252,114 226,99 Q207,82 210,52Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <path d="M103,116 Q132,100 155,115 Q168,133 148,148 Q124,158 100,144 Q84,130 103,116Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <path d="M196,120 Q228,112 250,128 Q256,144 238,154 Q213,160 194,146 Q184,132 196,120Z" fill="hsl(var(--muted-foreground)/0.18)" />
        <circle cx={W / 2} cy={H / 2} r={14} fill="hsl(var(--primary)/0.15)" />
        <circle cx={W / 2} cy={H / 2} r={5} fill="hsl(var(--primary))" />
      </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground font-mono">{lat.toFixed(1)}°, {lng.toFixed(1)}°</span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Zoom {zoom}</span>
        {layers.map((l) => <span key={l} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{l}</span>)}
      </div>
    </div>
  )
}

// ─── Chart Preview ─────────────────────────────────────────────────────────────

type ChartData = Record<string, unknown>[]

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444"]

function parseChartData(content: { columns?: unknown; rows?: unknown; chartData?: unknown }): { data: ChartData; keys: string[]; labelKey: string } {
  // If recharts-format chartData is provided
  if (Array.isArray(content.chartData)) {
    const sample = content.chartData[0] ?? {}
    const keys = Object.keys(sample).filter((k) => typeof (sample as Record<string, unknown>)[k] === "number")
    const labelKey = Object.keys(sample).find((k) => typeof (sample as Record<string, unknown>)[k] === "string") ?? keys[0]
    return { data: content.chartData as ChartData, keys, labelKey }
  }

  // Convert columns + rows format
  if (Array.isArray(content.columns) && Array.isArray(content.rows)) {
    const columns = content.columns as string[]
    const rows = content.rows as string[][]
    const data: ChartData = rows.map((row) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => {
        const val = row[i] ?? ""
        obj[col] = i === 0 ? val : (isNaN(Number(val)) ? 0 : Number(val))
      })
      return obj
    })
    const keys = columns.slice(1)
    const labelKey = columns[0]
    return { data, keys, labelKey }
  }

  // Hardcoded fallback temperature data
  const fallback = [-0.16, -0.08, -0.11, -0.17, -0.28, -0.33, -0.14, 0.02, 0.19, 0.32, 0.54, 0.62, 0.98, 1.02]
  const data = fallback.map((v, i) => ({ Year: 1880 + i * 10, Value: v }))
  return { data, keys: ["Value"], labelKey: "Year" }
}

export function ChartPreview({
  chartType,
  xLabel,
  yLabel,
  source,
  columns,
  rows,
  chartData: rawChartData,
  colorScheme,
}: {
  chartType: string
  xLabel: string
  yLabel: string
  source: string
  columns?: unknown
  rows?: unknown
  chartData?: unknown
  colorScheme?: string
}) {
  const { data, keys, labelKey } = parseChartData({ columns, rows, chartData: rawChartData })

  const colors = colorScheme === "Purple" ? ["#8b5cf6", "#a78bfa", "#c4b5fd"] :
                 colorScheme === "Teal"   ? ["#14b8a6", "#2dd4bf", "#5eead4"] :
                 colorScheme === "Warm"   ? ["#f59e0b", "#fbbf24", "#fcd34d"] :
                 colorScheme === "Mono"   ? ["#1f2937", "#374151", "#4b5563"] :
                 CHART_COLORS

  const commonProps = {
    data,
    margin: { top: 4, right: 8, left: -16, bottom: 0 },
  }

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            {keys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i % colors.length]} />)}
          </BarChart>
        )
      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            {keys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} fill={colors[i % colors.length] + "22"} />
            ))}
          </AreaChart>
        )
      case "scatter":
        return (
          <ScatterChart margin={commonProps.margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 9 }} />
            <YAxis dataKey={keys[0]} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Scatter data={data} fill={colors[0]} />
          </ScatterChart>
        )
      case "pie":
        return (
          <PieChart>
            <Pie
              data={data.map((d) => ({ name: String(d[labelKey] ?? ""), value: Number(d[keys[0]] ?? 0) }))}
              cx="50%" cy="50%" outerRadius={60} dataKey="value"
              label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 10 }} />
          </PieChart>
        )
      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            {keys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} dot={false} strokeWidth={2} />
            ))}
          </LineChart>
        )
    }
  }

  return (
    <div>
      <div style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {renderChart() as any}
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground capitalize">{chartType}</span>
        {xLabel && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">x: {xLabel}</span>}
        {yLabel && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">y: {yLabel}</span>}
        {source && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Source: {source}</span>}
      </div>
    </div>
  )
}

// ─── Diagram Preview ───────────────────────────────────────────────────────────

interface DiagramNode {
  id: string
  label: string
  x: number
  y: number
  shape?: string
}

interface DiagramEdge {
  from: string
  to: string
}

export function DiagramPreview({
  diagramType,
  nodes: nodesRaw,
  edges: edgesRaw,
}: {
  diagramType: string
  nodes?: unknown
  edges?: unknown
}) {
  const W = 380
  const H = 228

  // Try to use live node/edge data
  const livNodes = Array.isArray(nodesRaw) ? nodesRaw as DiagramNode[] : null
  const livEdges = Array.isArray(edgesRaw) ? edgesRaw as DiagramEdge[] : null

  if (livNodes && livNodes.length > 0) {
    const byId = (id: string) => livNodes.find((n) => n.id === id)
    const NODE_W = 90
    const NODE_H = 32

    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 180 }} className="select-none">
          <defs>
            <marker id="dg-arrow-prev" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3 Z" fill="hsl(var(--muted-foreground)/0.45)" />
            </marker>
          </defs>
          {(livEdges ?? []).map((edge, i) => {
            const a = byId(edge.from)
            const b = byId(edge.to)
            if (!a || !b) return null
            return (
              <line
                key={i}
                x1={a.x + NODE_W / 2} y1={a.y + NODE_H / 2}
                x2={b.x + NODE_W / 2} y2={b.y + NODE_H / 2}
                stroke="hsl(var(--muted-foreground)/0.35)"
                strokeWidth={1.4}
                markerEnd="url(#dg-arrow-prev)"
              />
            )
          })}
          {livNodes.map((n) => (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={6} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1.2} />
              <text x={n.x + NODE_W / 2} y={n.y + NODE_H / 2 + 4} textAnchor="middle" fontSize={9.5} fill="hsl(var(--foreground)/0.85)">
                {n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground capitalize">{diagramType}</span>
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{livNodes.length} nodes</span>
          {livEdges && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{livEdges.length} edges</span>}
        </div>
      </div>
    )
  }

  // Fallback: hardcoded Krebs cycle
  const nodeData = [
    { id: "a", label: "Acetyl CoA", x: 190, y: 28, w: 94, h: 26 },
    { id: "b", label: "Citrate", x: 320, y: 80, w: 72, h: 26 },
    { id: "c", label: "Isocitrate", x: 332, y: 150, w: 82, h: 26 },
    { id: "d", label: "α-Ketoglutarate", x: 230, y: 198, w: 114, h: 26 },
    { id: "e", label: "Malate", x: 148, y: 198, w: 64, h: 26 },
    { id: "f", label: "Fumarate", x: 46, y: 150, w: 76, h: 26 },
    { id: "g", label: "Oxaloacetate", x: 56, y: 80, w: 96, h: 26 },
  ]
  const edgePairs: [string, string][] = [["g", "a"], ["a", "b"], ["b", "c"], ["c", "d"], ["d", "e"], ["e", "f"], ["f", "g"]]
  const byId2 = (id: string) => nodeData.find((n) => n.id === id)!

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height: 180 }} className="select-none">
        <defs>
          <marker id="dg-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 Z" fill="hsl(var(--muted-foreground)/0.45)" />
          </marker>
        </defs>
        {edgePairs.map(([from, to], i) => {
          const a = byId2(from)
          const b = byId2(to)
          return <line key={i} x1={a.x} y1={a.y + a.h / 2} x2={b.x} y2={b.y + b.h / 2} stroke="hsl(var(--muted-foreground)/0.35)" strokeWidth={1.4} markerEnd="url(#dg-arrow)" />
        })}
        {nodeData.map((n) => (
          <g key={n.id}>
            <rect x={n.x - n.w / 2} y={n.y} width={n.w} height={n.h} rx={7} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1.2} />
            <text x={n.x} y={n.y + n.h / 2 + 4.5} textAnchor="middle" fontSize={9.5} fill="hsl(var(--foreground)/0.85)">{n.label}</text>
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground capitalize">{diagramType}</span>
      </div>
    </div>
  )
}

// ─── Rich Sim Placeholder ──────────────────────────────────────────────────────

export function RichSimPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border h-40 gap-2">
      <Sparkles className="h-7 w-7 text-muted-foreground/40" />
      <span className="text-[12px] text-muted-foreground">Paste a simulation URL to preview</span>
    </div>
  )
}

// ─── Timeline Preview ──────────────────────────────────────────────────────────

interface TimelineEvent {
  date: string
  label: string
  description?: string
  color?: string
}

export function TimelinePreview({ events, orientation = "vertical" }: { events: TimelineEvent[]; orientation?: "horizontal" | "vertical" }) {
  const accentColors = [
    "#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444",
    "#10b981", "#f97316", "#6366f1", "#ec4899", "#06b6d4",
  ]

  if (orientation === "horizontal") {
    return (
      <div className="w-full overflow-x-auto py-6 px-2">
        <div className="relative flex items-start" style={{ minWidth: events.length * 140 }}>
          {/* Connecting line */}
          <div className="absolute top-[18px] left-6 right-6 h-[2px] bg-border" />
          {events.map((ev, i) => {
            const color = ev.color ?? accentColors[i % accentColors.length]
            return (
              <div key={i} className="relative flex flex-col items-center flex-1 px-2">
                {/* Node */}
                <div
                  className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-background text-[10px] font-bold text-white shadow-sm"
                  style={{ borderColor: color, background: color }}
                >
                  {i + 1}
                </div>
                {/* Date */}
                <span className="mt-2 text-[10px] font-semibold text-muted-foreground whitespace-nowrap">{ev.date}</span>
                {/* Label */}
                <span className="mt-0.5 text-[11px] font-medium text-foreground text-center leading-tight">{ev.label}</span>
                {/* Description */}
                {ev.description && (
                  <p className="mt-1 text-[10px] text-muted-foreground text-center leading-relaxed line-clamp-2">{ev.description}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Vertical (default)
  return (
    <div className="relative space-y-0 pl-8">
      {/* Vertical stem */}
      <div className="absolute left-3 top-2 bottom-2 w-[2px] bg-border" />

      {events.map((ev, i) => {
        const color = ev.color ?? accentColors[i % accentColors.length]
        const isLast = i === events.length - 1
        return (
          <div key={i} className={`relative flex items-start gap-4 ${isLast ? "pb-0" : "pb-5"}`}>
            {/* Node */}
            <div
              className="absolute left-[-21px] top-0 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-background text-[9px] font-bold shadow-sm"
              style={{ borderColor: color, color }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className="text-[10px] font-semibold rounded-sm px-1.5 py-0.5"
                  style={{ background: color + "18", color }}
                >
                  {ev.date}
                </span>
                <span className="text-[12px] font-semibold text-foreground leading-snug">{ev.label}</span>
              </div>
              {ev.description && (
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{ev.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Legend Preview ────────────────────────────────────────────────────────────

interface LegendItem {
  color: string
  label: string
  description?: string
  value?: string | number
}

export function LegendPreview({
  items,
  title,
  layout = "list",
}: {
  items: LegendItem[]
  title?: string
  layout?: "list" | "chips" | "grid"
}) {
  if (layout === "chips") {
    return (
      <div className="space-y-3">
        {title && <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>}
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
              <span className="text-[11px] font-medium text-foreground">{item.label}</span>
              {item.value !== undefined && (
                <span className="text-[10px] text-muted-foreground">{item.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (layout === "grid") {
    return (
      <div className="space-y-3">
        {title && <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>}
        <div className="grid grid-cols-2 gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/10 p-2">
              <span className="mt-0.5 h-3 w-3 shrink-0 rounded-sm" style={{ background: item.color }} />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-foreground leading-tight">{item.label}</p>
                {item.description && (
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // List (default) — works great in narrow sidebar slots
  return (
    <div className="space-y-2">
      {title && <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-sm"
            style={{ background: item.color }}
          />
          <div className="flex flex-1 min-w-0 items-baseline gap-2">
            <span className="text-[12px] font-medium text-foreground whitespace-nowrap">{item.label}</span>
            {item.description && (
              <span className="text-[11px] text-muted-foreground truncate">{item.description}</span>
            )}
          </div>
          {item.value !== undefined && (
            <span className="text-[11px] font-mono text-muted-foreground shrink-0">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  )
}
