import { useEffect, useRef, useState } from "react"
import {
  AudioLines,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react"
import {
  AnimationPreview as AnimationPreviewBase,
  ChartPreview,
  DiagramPreview,
  LegendPreview,
  MapPreview,
  RichSimPlaceholder,
  TimelinePreview,
} from "./card-type-preview-visual-subviews"

const BAR_COUNT = 36
const BAR_SPEEDS = Array.from({ length: BAR_COUNT }, (_, i) => 280 + Math.abs(Math.sin(i * 1.4)) * 220 + (i % 7) * 55)
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => 12 + Math.abs(Math.sin(i * 0.85 + 0.6)) * 78)

const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const
type PlaybackRate = typeof SPEED_STEPS[number]

// ─── Audio waveform visualization ─────────────────────────────────────────────

function AudioWaveform({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-px h-16 mb-4">
      {BAR_SPEEDS.map((barSpeed, i) => (
        <div
          key={i}
          className="flex-1 rounded-[2px]"
          style={{
            height: playing ? `${BAR_HEIGHTS[i]}%` : "10%",
            background: playing
              ? `hsl(${200 + (i / BAR_COUNT) * 60}, 70%, 55%)`
              : "hsl(var(--muted-foreground) / 0.25)",
            transition: playing ? "none" : "height 500ms ease, background 500ms ease",
            ...(playing
              ? {
                  animationName: "audioBar",
                  animationDuration: `${barSpeed}ms`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                  animationDirection: "alternate",
                  animationDelay: `${(i * 41) % 380}ms`,
                }
              : {}),
          }}
        />
      ))}
    </div>
  )
}

// ─── Shared media player ──────────────────────────────────────────────────────

function MediaPlayer({ kind, url, title }: { kind: "audio" | "video"; url: string; title?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const scrubRef = useRef<HTMLDivElement>(null)
  const scrubbingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [loop, setLoop] = useState(false)
  const [seekProg, setSeekProg] = useState<number | null>(null)
  const [speed, setSpeed] = useState<PlaybackRate>(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const getMedia = (): HTMLMediaElement | null =>
    kind === "video" ? videoRef.current : audioRef.current

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const toggle = () => {
    const el = getMedia()
    if (!el) return
    if (el.paused) { el.playbackRate = speed; void el.play(); setPlaying(true) }
    else { el.pause(); setPlaying(false) }
  }

  const skip = (delta: number) => {
    const el = getMedia()
    if (!el) return
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta))
  }

  const setVolumeLevel = (v: number) => {
    setVolume(v)
    const el = getMedia()
    if (el) { el.volume = v; el.muted = v === 0; setMuted(v === 0) }
  }

  const toggleMute = () => {
    const el = getMedia()
    if (!el) return
    const next = !el.muted
    el.muted = next
    setMuted(next)
    if (!next && volume === 0) setVolumeLevel(0.7)
  }

  const toggleLoop = () => {
    const next = !loop
    setLoop(next)
    const el = getMedia()
    if (el) el.loop = next
  }

  const setPlaybackSpeed = (s: PlaybackRate) => {
    setSpeed(s)
    const el = getMedia()
    if (el) el.playbackRate = s
  }

  const toggleFullscreen = () => {
    if (isFullscreen) void document.exitFullscreen()
    else void containerRef.current?.requestFullscreen()
  }

  const getScrubRatio = (clientX: number): number => {
    const el = scrubRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }

  const onScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    scrubbingRef.current = true
    const r = getScrubRatio(e.clientX)
    setSeekProg(r * 100)
    const el = getMedia()
    if (el?.duration) el.currentTime = r * el.duration
  }

  const onScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    const r = getScrubRatio(e.clientX)
    setSeekProg(r * 100)
    const el = getMedia()
    if (el?.duration) el.currentTime = r * el.duration
  }

  const onScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    scrubbingRef.current = false
    const r = getScrubRatio(e.clientX)
    const el = getMedia()
    if (el?.duration) { el.currentTime = r * el.duration; setCurrent(r * el.duration) }
    setProgress(r * 100)
    setSeekProg(null)
  }

  const onTimeUpdate = () => {
    const el = getMedia()
    if (!el) return
    setCurrent(el.currentTime)
    setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0)
  }

  const onLoadedMetadata = () => {
    const el = getMedia()
    if (el) setDuration(el.duration)
  }

  const onEnded = () => setPlaying(false)

  const disp = seekProg ?? progress
  const dispCur = seekProg !== null && duration ? (seekProg / 100) * duration : current

  return (
    <div
      ref={kind === "video" ? containerRef : undefined}
      className={isFullscreen ? "flex flex-col bg-black" : "select-none"}
    >
      {/* Title bar */}
      {title && !isFullscreen && (
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border/50">
          {kind === "audio"
            ? <AudioLines className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            : <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
          <span className="text-[12px] font-semibold text-foreground truncate">{title}</span>
        </div>
      )}

      {/* Media + visual area */}
      {kind === "video" ? (
        <div className={isFullscreen ? "relative flex-1 overflow-hidden" : "relative overflow-hidden rounded-lg bg-black aspect-video"}>
          <video
            ref={videoRef}
            src={url}
            className="w-full h-full cursor-pointer object-cover"
            onClick={toggle}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onEnded}
          />
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 cursor-pointer" onClick={toggle}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-sm">
                <Play className="h-4 w-4 fill-white stroke-none ml-0.5" />
              </div>
            </div>
          )}
          {isFullscreen && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 pb-5 pt-16">
              {/* Scrubber — fullscreen */}
              <div ref={scrubRef} className="relative flex h-6 cursor-pointer items-center touch-none group" onPointerDown={onScrubPointerDown} onPointerMove={onScrubPointerMove} onPointerUp={onScrubPointerUp}>
                <div className="h-1.5 w-full rounded-full bg-white/25 group-hover:h-2.5 transition-[height] duration-150">
                  <div className="h-full rounded-full bg-white/80" style={{ width: `${disp}%`, transition: seekProg !== null ? "none" : "width 100ms" }} />
                </div>
                <div className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${disp}%` }} />
              </div>
              {/* Timestamps — fullscreen */}
              <div className="flex items-center justify-between text-[11px] text-white/60 mb-3">
                <span>{fmt(dispCur)}</span>
                <span>{duration ? fmt(duration) : "--:--"}</span>
              </div>
              {/* Transport — fullscreen */}
              <div className="relative flex items-center justify-center">
                <div className="flex items-center gap-1 mr-6">
                  <span className="shrink-0 w-6 text-[10px] text-white/60 tabular-nums">{speed}×</span>
                  <input type="range" min={0.5} max={2} step={0.25} value={speed} list="media-speed-ticks"
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value) as PlaybackRate)}
                    className="w-24 cursor-pointer touch-none" style={{ accentColor: "white" }} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => skip(-10)} title="Skip back 10s"
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-white shadow-sm hover:bg-white/90 transition-colors">
                    <SkipBack className="h-4 w-4 fill-black stroke-none" />
                  </button>
                  <button type="button" onClick={toggle}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 bg-white shadow-sm hover:bg-white/90 transition-colors">
                    {playing ? <Pause className="h-4 w-4 fill-black stroke-none" /> : <Play className="h-4 w-4 fill-black stroke-none ml-0.5" />}
                  </button>
                  <button type="button" onClick={() => skip(10)} title="Skip forward 10s"
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/20 bg-white shadow-sm hover:bg-white/90 transition-colors">
                    <SkipForward className="h-4 w-4 fill-black stroke-none" />
                  </button>
                </div>
                <div className="flex items-center gap-3 ml-6">
                  <button type="button" onClick={toggleLoop} title="Loop"
                    className={["transition-colors", loop ? "text-white" : "text-white/50 hover:text-white"].join(" ")}>
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={toggleMute} className="shrink-0 text-white/60 hover:text-white transition-colors">
                      {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <input type="range" min={0} max={1} step={0.1} value={muted ? 0 : volume} list="media-vol-ticks"
                      onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                      className="w-24 cursor-pointer touch-none" style={{ accentColor: "white" }} />
                  </div>
                </div>
                <button type="button" onClick={toggleFullscreen} title="Exit full screen"
                  className="absolute right-0 text-white/60 hover:text-white transition-colors">
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <audio
            ref={audioRef}
            src={url}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onEnded}
          />
          <AudioWaveform playing={playing} />
        </>
      )}

      {/* Datalists — shared by both sliders */}
      <datalist id="media-speed-ticks">
        {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((v) => <option key={v} value={v} />)}
      </datalist>
      <datalist id="media-vol-ticks">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => <option key={v} value={v} />)}
      </datalist>

      {/* Normal-mode controls — always for audio; video only when not fullscreen */}
      {(kind === "audio" || !isFullscreen) && (
        <>
          {/* Scrubber */}
          <div
            ref={scrubRef}
            className="relative flex h-5 cursor-pointer items-center touch-none group mt-2"
            onPointerDown={onScrubPointerDown}
            onPointerMove={onScrubPointerMove}
            onPointerUp={onScrubPointerUp}
          >
            <div className="h-1.5 w-full rounded-full bg-muted group-hover:h-2.5 transition-[height] duration-150">
              <div className="h-full rounded-full bg-foreground/70" style={{ width: `${disp}%`, transition: seekProg !== null ? "none" : "width 100ms" }} />
            </div>
            <div className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${disp}%` }} />
          </div>

          {/* Timestamps */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
            <span>{fmt(dispCur)}</span>
            <span>{duration ? fmt(duration) : "--:--"}</span>
          </div>

          {/* Transport row */}
          <div className="relative flex items-center justify-center mb-2">
            <div className="flex items-center gap-1 mr-6">
              <span className="shrink-0 w-6 text-[10px] text-muted-foreground tabular-nums">{speed}×</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.25}
                value={speed}
                list="media-speed-ticks"
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value) as PlaybackRate)}
                className="w-24 cursor-pointer touch-none"
                style={{ accentColor: "var(--foreground)" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => skip(-10)} title="Skip back 10s"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground/15 bg-foreground shadow-sm hover:bg-foreground/85 transition-colors">
                <SkipBack className="h-4 w-4 fill-background stroke-none" />
              </button>
              <button type="button" onClick={toggle}
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground/15 bg-foreground shadow-sm hover:bg-foreground/85 transition-colors">
                {playing ? <Pause className="h-4 w-4 fill-background stroke-none" /> : <Play className="h-4 w-4 fill-background stroke-none ml-0.5" />}
              </button>
              <button type="button" onClick={() => skip(10)} title="Skip forward 10s"
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground/15 bg-foreground shadow-sm hover:bg-foreground/85 transition-colors">
                <SkipForward className="h-4 w-4 fill-background stroke-none" />
              </button>
            </div>
            <div className="flex items-center gap-3 ml-6">
              <button type="button" onClick={toggleLoop} title="Loop"
                className={["transition-colors", loop ? "text-foreground" : "text-muted-foreground hover:text-foreground"].join(" ")}>
                <RefreshCw className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                <button type="button" onClick={toggleMute} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={muted ? 0 : volume}
                  list="media-vol-ticks"
                  onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                  className="w-24 cursor-pointer touch-none"
                  style={{ accentColor: "var(--foreground)" }}
                />
              </div>
            </div>
            {kind === "video" && (
              <button type="button" onClick={toggleFullscreen} title="Full screen"
                className="absolute right-0 text-muted-foreground hover:text-foreground transition-colors">
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Public exports ───────────────────────────────────────────────────────────

export function AudioPreview({ url, title }: { url: string; title?: string }) {
  return <MediaPlayer kind="audio" url={url} title={title} />
}

export function VideoPreview({ url, title }: { url: string; title?: string }) {
  return <MediaPlayer kind="video" url={url} title={title} />
}

// AnimationPreview: use full media player for video-format URLs; fall through otherwise
interface AnimationPreviewProps {
  format: string
  duration: string
  fps: number
  url?: string
  lottieData?: object
  title?: string
}

function AnimationPreviewWrapper(props: AnimationPreviewProps) {
  const { url, title } = props
  if (url && /\.(mp4|webm|mov|avi|mkv)$/i.test(url)) {
    return <MediaPlayer kind="video" url={url} title={title} />
  }
  return <AnimationPreviewBase {...props} />
}

export { AnimationPreviewWrapper as AnimationPreview, ChartPreview, DiagramPreview, LegendPreview, MapPreview, RichSimPlaceholder, TimelinePreview }

