import { useRef, useState } from "react"
import {
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react"
import {
  AnimationPreview,
  ChartPreview,
  DiagramPreview,
  MapPreview,
  RichSimPlaceholder,
} from "./card-type-preview-visual-subviews"

const BAR_COUNT = 36
const BAR_SPEEDS = Array.from({ length: BAR_COUNT }, (_, i) => 280 + Math.abs(Math.sin(i * 1.4)) * 220 + (i % 7) * 55)
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => 12 + Math.abs(Math.sin(i * 0.85 + 0.6)) * 78)

export function AudioPreview({ url }: { url: string }) {
  const mediaRef = useRef<HTMLAudioElement>(null)
  const scrubRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [seekProg, setSeekProg] = useState<number | null>(null)

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const toggle = () => {
    const audio = mediaRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      setPlaying(true)
    } else {
      audio.pause()
      setPlaying(false)
    }
  }

  const skip = (delta: number) => {
    const audio = mediaRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta))
  }

  const toggleMute = () => {
    const audio = mediaRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  const calcRatio = (clientX: number) => {
    const el = scrubRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width))
  }

  const onScrubDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const audio = mediaRef.current
    const ratio = calcRatio(e.clientX)
    if (ratio === null) return

    let last = ratio
    setSeekProg(ratio * 100)
    if (audio && audio.duration) audio.currentTime = ratio * audio.duration

    const onMove = (me: MouseEvent) => {
      const r = calcRatio(me.clientX)
      if (r === null) return
      last = r
      setSeekProg(r * 100)
    }

    const onUp = () => {
      if (audio && audio.duration) {
        audio.currentTime = last * audio.duration
        setCurrent(last * audio.duration)
      }
      setProgress(last * 100)
      setSeekProg(null)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const disp = seekProg ?? progress
  const dispCur = seekProg !== null && duration ? (seekProg / 100) * duration : current

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
        onLoadedMetadata={() => {
          if (mediaRef.current) setDuration(mediaRef.current.duration)
        }}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-end gap-px h-16 mb-4">
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
              ...(playing
                ? {
                    animationName: "audioBar",
                    animationDuration: `${speed}ms`,
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
      <div ref={scrubRef} className="relative flex h-5 cursor-pointer items-center group mb-1" onMouseDown={onScrubDown}>
        <div className="h-1.5 w-full rounded-full bg-muted group-hover:h-2.5 transition-[height] duration-150">
          <div className="h-full rounded-full bg-foreground/70" style={{ width: `${disp}%`, transition: seekProg !== null ? "none" : "width 100ms" }} />
        </div>
        <div className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-foreground shadow opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `${disp}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-4">
        <span>{fmt(dispCur)}</span>
        <span>{duration ? fmt(duration) : "--:--"}</span>
      </div>
      <div className="flex items-center justify-center gap-6">
        <button type="button" onClick={() => skip(-10)} className="text-muted-foreground hover:text-foreground transition-colors text-[11px]">−10s</button>
        <button type="button" onClick={toggle} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground/15 bg-foreground text-background shadow-sm hover:bg-foreground/85 transition-colors">
          {playing ? <Pause className="h-4 w-4 fill-background stroke-none" /> : <Play className="h-4 w-4 fill-background stroke-none ml-0.5" />}
        </button>
        <button type="button" onClick={() => skip(10)} className="text-muted-foreground hover:text-foreground transition-colors text-[11px]">+10s</button>
        <button type="button" onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export function VideoPreview({ url }: { url: string }) {
  const mediaRef = useRef<HTMLVideoElement>(null)
  const scrubRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [seekProg, setSeekProg] = useState<number | null>(null)

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const toggle = () => {
    const video = mediaRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = mediaRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  const calcRatio = (x: number) => {
    const el = scrubRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (x - r.left) / r.width))
  }

  const onScrubDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const video = mediaRef.current
    const ratio = calcRatio(e.clientX)
    if (ratio === null) return

    let last = ratio
    setSeekProg(ratio * 100)
    if (video && video.duration) video.currentTime = ratio * video.duration

    const onMove = (me: MouseEvent) => {
      const r = calcRatio(me.clientX)
      if (r === null) return
      last = r
      setSeekProg(r * 100)
    }

    const onUp = () => {
      if (video && video.duration) {
        video.currentTime = last * video.duration
        setCurrent(last * video.duration)
      }
      setProgress(last * 100)
      setSeekProg(null)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const disp = seekProg ?? progress
  const dispCur = seekProg !== null && duration ? (seekProg / 100) * duration : current

  return (
    <div className="select-none">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-3">
        <video
          ref={mediaRef}
          src={url}
          className="w-full h-full cursor-pointer object-cover"
          onClick={toggle}
          onTimeUpdate={() => {
            const v = mediaRef.current
            if (!v) return
            setCurrent(v.currentTime)
            setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)
          }}
          onLoadedMetadata={() => {
            if (mediaRef.current) setDuration(mediaRef.current.duration)
          }}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={toggle}>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Play className="h-5 w-5 fill-white stroke-none ml-0.5" />
            </div>
          </div>
        )}
      </div>
      <div ref={scrubRef} className="relative flex h-5 cursor-pointer items-center group mb-1" onMouseDown={onScrubDown}>
        <div className="h-1.5 w-full rounded-full bg-muted group-hover:h-2.5 transition-[height] duration-150">
          <div className="h-full rounded-full bg-foreground/70" style={{ width: `${disp}%`, transition: seekProg !== null ? "none" : "width 100ms" }} />
        </div>
        <div className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-foreground shadow opacity-0 group-hover:opacity-100" style={{ left: `${disp}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fmt(dispCur)}</span>
        <button type="button" onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <span>{duration ? fmt(duration) : "--:--"}</span>
      </div>
    </div>
  )
}

export { AnimationPreview, ChartPreview, DiagramPreview, MapPreview, RichSimPlaceholder }
