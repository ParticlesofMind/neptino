"use client"

import { useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Play, Pause, RotateCcw, Film } from "lucide-react"
import {
  StudioSection,
  StudioSegment,
  StudioUrlInput,
  StudioSlider,
  StudioToggle,
} from "./studio-primitives"

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
  const [lottieData, setLottieData] = useState<object | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(true)
  const lottieRef = useRef<{ play: () => void; pause: () => void; stop: () => void } | null>(null)

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
      setLottieData(await resp.json())
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const togglePlay = () => {
    if (!lottieRef.current) return
    playing ? lottieRef.current.pause() : lottieRef.current.play()
    setPlaying((p) => !p)
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
      <StudioSection label="Source" className="pt-4">
        <StudioSegment
          options={[
            { value: "lottie", label: "Lottie" },
            { value: "gif", label: "GIF" },
            { value: "svg", label: "SVG" },
          ]}
          value={format}
          onChange={(f) => onChange("format", f)}
          size="xs"
        />
        <StudioUrlInput
          value={url}
          placeholder={format === "lottie" ? "https://…/animation.json" : `https://…/animation.${format}`}
          onCommit={(u) => { onChange("url", u); if (u && format === "lottie") void loadLottie(u) }}
        />
      </StudioSection>

      {/* Player */}
      <div className="shrink-0 border-b border-neutral-100 bg-neutral-50 px-4 py-4">
        {!url && (
          <div className="flex flex-col items-center gap-2.5 rounded-xl border-2 border-dashed border-neutral-200 py-10">
            <Film size={26} className="text-neutral-300" />
            <p className="text-[11px] text-neutral-400">Load an animation above to preview</p>
          </div>
        )}

        {url && format === "lottie" && (
          <>
            {loading && (
              <div className="flex h-40 items-center justify-center rounded-lg bg-neutral-100">
                <span className="text-[11px] text-neutral-400">Loading animation…</span>
              </div>
            )}
            {loadError && (
              <div className="flex h-40 items-center justify-center rounded-lg border border-red-200 bg-red-50">
                <span className="text-[11px] text-red-500">Failed to load — check the URL</span>
              </div>
            )}
            {lottieData && !loading && !loadError && (
              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white" style={{ aspectRatio: "4/3" }}>
                <LottiePlayer
                  lottieRef={lottieRef as React.RefObject<never>}
                  animationData={lottieData}
                  loop={loop}
                  autoplay
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            )}
            {!lottieData && !loading && !loadError && url && (
              <div className="flex h-40 items-center justify-center rounded-lg bg-neutral-100">
                <span className="text-[11px] text-neutral-400">Click Load to fetch the animation</span>
              </div>
            )}

            {/* Playback controls */}
            {lottieData && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 transition-colors"
                >
                  {playing ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  type="button"
                  onClick={replay}
                  className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  <RotateCcw size={11} />
                  Replay
                </button>
              </div>
            )}
          </>
        )}

        {url && format === "gif" && (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white" style={{ aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Animation preview" className="h-full w-full object-contain" />
          </div>
        )}

        {url && format === "svg" && (
          <div className="flex items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white" style={{ aspectRatio: "4/3" }}>
            <object data={url} type="image/svg+xml" className="max-h-full max-w-full" />
          </div>
        )}
      </div>

      {/* Settings */}
      <StudioSection label="Playback settings" noBorder>
        <StudioSlider
          label="Speed"
          value={speed}
          min={0.25}
          max={3}
          step={0.25}
          format={(v) => `${v}×`}
          onChange={(s) => onChange("speed", s)}
        />
        <StudioToggle
          label="Loop"
          description="Restart playback when finished"
          checked={loop}
          onChange={(v) => onChange("loop", v)}
        />
      </StudioSection>
    </div>
  )
}
