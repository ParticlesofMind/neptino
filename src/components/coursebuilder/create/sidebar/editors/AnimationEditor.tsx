"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Play, Pause, RotateCcw, Film } from "lucide-react"
import { MakeMotionToolbar } from "../make-motion-toolbar"
import {
  StudioSection,
  StudioSegment,
  StudioUrlInput,
  StudioSlider,
  StudioToggle,
} from "./studio-primitives"
import { EditorSplitLayout } from "./editor-split-layout"
import { EditorPreviewFrame } from "./editor-preview-frame"

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
  const lottieRef = useRef<{
    play: () => void
    pause: () => void
    stop: () => void
    setSpeed?: (value: number) => void
  } | null>(null)

  const url = typeof content.url === "string" ? content.url : ""
  const title = typeof content.title === "string" ? content.title : ""
  const format = typeof content.format === "string" ? content.format : "lottie"
  const loop = typeof content.loop === "boolean" ? content.loop : true
  const speed = typeof content.speed === "number" ? content.speed : 1

  useEffect(() => {
    let isCurrent = true

    if (format !== "lottie" || !url) {
      setLottieData(null)
      setLoadError(false)
      setLoading(false)
      setPlaying(true)
      return () => {
        isCurrent = false
      }
    }

    async function loadLottie(src: string) {
      setLoading(true)
      setLoadError(false)
      try {
        const resp = await fetch(src)
        if (!resp.ok) throw new Error("Failed to fetch")
        const nextData = await resp.json()
        if (!isCurrent) return
        setLottieData(nextData)
        setPlaying(true)
      } catch {
        if (!isCurrent) return
        setLottieData(null)
        setLoadError(true)
      } finally {
        if (isCurrent) setLoading(false)
      }
    }

    void loadLottie(url)

    return () => {
      isCurrent = false
    }
  }, [format, url])

  useEffect(() => {
    lottieRef.current?.setSpeed?.(speed)
  }, [speed])

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
    <EditorSplitLayout
      sidebar={(
        <>
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
              onCommit={(u) => {
                onChange("url", u)
              }}
            />
          </StudioSection>

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

          <div className="border-t border-neutral-200">
            <MakeMotionToolbar content={content} onChange={onChange} compact />
          </div>
        </>
      )}
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          {!url ? (
            <EditorPreviewFrame
              cardType="animation"
              title={title}
              onTitleChange={(next) => onChange("title", next)}
              className="w-full max-w-3xl"
              bodyClassName="flex aspect-[4/3] flex-col items-center justify-center gap-3 bg-white/75 px-8 text-center"
            >
              <Film size={28} className="text-neutral-300" />
              <p className="text-[13px] font-medium text-neutral-700">No animation loaded</p>
              <p className="text-[11px] text-neutral-400">Add an asset URL from the settings panel to preview it here.</p>
            </EditorPreviewFrame>
          ) : (
            <EditorPreviewFrame
              cardType="animation"
              title={title}
              onTitleChange={(next) => onChange("title", next)}
              className="w-full max-w-4xl"
              bodyClassName="space-y-4 p-5"
            >
              {format === "lottie" && (
                <>
                  {loading && (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-[28px] border border-neutral-200 bg-white">
                      <span className="text-[11px] text-neutral-400">Loading animation…</span>
                    </div>
                  )}
                  {loadError && (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-[28px] border border-destructive/20 bg-destructive/5">
                      <span className="text-[11px] text-destructive">Failed to load — check the URL</span>
                    </div>
                  )}
                  {lottieData && !loading && !loadError && (
                    <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]" style={{ aspectRatio: "4/3" }}>
                      <LottiePlayer
                        lottieRef={lottieRef as React.RefObject<never>}
                        animationData={lottieData}
                        loop={loop}
                        autoplay
                        speed={speed}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                  )}
                  {!lottieData && !loading && !loadError && (
                    <div className="flex aspect-[4/3] items-center justify-center rounded-[28px] border border-neutral-200 bg-white">
                      <span className="text-[11px] text-neutral-400">Load a Lottie JSON file to preview the animation.</span>
                    </div>
                  )}

                  {lottieData && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-colors hover:bg-[#cedef0]"
                      >
                        {playing ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={replay}
                        className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                      >
                        <RotateCcw size={11} />
                        Replay
                      </button>
                    </div>
                  )}
                </>
              )}

              {url && format === "gif" && (
                <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]" style={{ aspectRatio: "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Animation preview" className="h-full w-full object-contain" />
                </div>
              )}

              {url && format === "svg" && (
                <div className="flex items-center justify-center overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]" style={{ aspectRatio: "4/3" }}>
                  <object data={url} type="image/svg+xml" className="max-h-full max-w-full" />
                </div>
              )}
            </EditorPreviewFrame>
          )}
        </div>
      )}
    />
  )
}
