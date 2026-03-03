"use client"

import { useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Play, Pause, RotateCcw, Upload, Link as LinkIcon, Film } from "lucide-react"

// Dynamically import lottie-react to avoid SSR issues
const LottiePlayer = dynamic(() => import("lottie-react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-40 bg-neutral-50">
      <span className="text-[11px] text-neutral-400">Loading player…</span>
    </div>
  ),
})

interface AnimationEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function AnimationEditor({ content, onChange }: AnimationEditorProps) {
  const [urlDraft, setUrlDraft] = useState(typeof content.url === "string" ? content.url : "")
  const [lottieData, setLottieData] = useState<object | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(true)
  const lottieRef = useRef<{ play: () => void; pause: () => void; stop: () => void; goToAndStop: (frame: number, isFrame: boolean) => void; animationItem?: { totalFrames: number } } | null>(null)

  const url = typeof content.url === "string" ? content.url : ""
  const format = typeof content.format === "string" ? content.format : "lottie"
  const loop = typeof content.loop === "boolean" ? content.loop : true
  const speed = typeof content.speed === "number" ? content.speed : 1

  const loadLottie = async (src: string) => {
    if (!src) return
    setLoading(true)
    setLoadError(false)
    try {
      const resp = await fetch(src)
      if (!resp.ok) throw new Error("Failed to fetch")
      const data = await resp.json()
      setLottieData(data)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const commitUrl = () => {
    onChange("url", urlDraft)
    if (urlDraft) void loadLottie(urlDraft)
  }

  const togglePlay = () => {
    if (!lottieRef.current) return
    if (playing) {
      lottieRef.current.pause()
    } else {
      lottieRef.current.play()
    }
    setPlaying(!playing)
  }

  const replay = () => {
    if (!lottieRef.current) return
    lottieRef.current.stop()
    lottieRef.current.play()
    setPlaying(true)
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-white">
      {/* Source */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3">
        <div className="flex gap-0 border border-neutral-200 divide-x divide-neutral-200 w-fit">
          {(["lottie", "gif", "svg"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange("format", f)}
              className={[
                "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                format === f ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-50",
              ].join(" ")}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={urlDraft}
            placeholder={format === "lottie" ? "https://…/animation.json" : "https://…/animation.gif"}
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
      </div>

      {/* Player area */}
      <div className="px-4 py-4 border-b border-neutral-100 bg-neutral-50">
        {!url && (
          <div className="flex flex-col items-center gap-3 border-2 border-dashed border-neutral-300 py-12">
            <Film size={28} className="text-neutral-300" />
            <p className="text-[12px] text-neutral-400">Paste a Lottie JSON URL above to preview</p>
          </div>
        )}

        {url && format === "lottie" && (
          <>
            {loading && (
              <div className="flex items-center justify-center h-40 bg-neutral-100">
                <span className="text-[11px] text-neutral-400">Loading animation…</span>
              </div>
            )}
            {loadError && (
              <div className="flex items-center justify-center h-40 border border-red-200 bg-red-50">
                <span className="text-[11px] text-red-500">Failed to load animation. Check URL.</span>
              </div>
            )}
            {lottieData && !loading && !loadError && (
              <div className="flex items-center justify-center bg-white border border-neutral-200" style={{ height: 200 }}>
                <LottiePlayer
                  lottieRef={lottieRef as React.RefObject<never>}
                  animationData={lottieData}
                  loop={loop}
                  autoplay={true}
                  style={{ height: 180, width: "100%" }}
                />
              </div>
            )}
            {!lottieData && !loading && !loadError && url && (
              <div className="flex items-center justify-center h-40 bg-neutral-100">
                <span className="text-[11px] text-neutral-400">Click Load to fetch animation</span>
              </div>
            )}
          </>
        )}

        {url && format === "gif" && (
          <div className="flex items-center justify-center bg-white border border-neutral-200" style={{ height: 200 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Animation preview" className="max-h-full max-w-full object-contain" />
          </div>
        )}

        {url && format === "svg" && (
          <div className="flex items-center justify-center bg-white border border-neutral-200" style={{ height: 200 }}>
            <object data={url} type="image/svg+xml" className="max-h-full max-w-full" />
          </div>
        )}
      </div>

      {/* Player controls */}
      {lottieData && format === "lottie" && (
        <div className="px-4 py-3 border-b border-neutral-100 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Controls</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center gap-1.5 border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white hover:opacity-90"
            >
              {playing ? <Pause size={11} /> : <Play size={11} />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={replay}
              className="flex items-center gap-1.5 border border-neutral-200 px-3 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
            >
              <RotateCcw size={11} />
              Replay
            </button>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="px-4 py-3 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Settings</p>

        <label className="block space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-600">Speed</span>
            <span className="text-[11px] text-neutral-400">{speed}x</span>
          </div>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.25}
            value={speed}
            onChange={(e) => {
              const s = Number(e.target.value)
              onChange("speed", s)
            }}
            className="w-full accent-neutral-900"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>0.25x</span>
            <span>1x</span>
            <span>3x</span>
          </div>
        </label>

        <label className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-neutral-600">Loop</span>
          <button
            type="button"
            onClick={() => onChange("loop", !loop)}
            className={[
              "h-6 w-11 border transition-colors relative",
              loop ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 bg-neutral-100",
            ].join(" ")}
            aria-pressed={loop}
          >
            <span className={[
              "absolute top-0.5 h-5 w-5 bg-white transition-transform",
              loop ? "translate-x-5" : "translate-x-0.5",
            ].join(" ")} />
          </button>
        </label>
      </div>
    </div>
  )
}
