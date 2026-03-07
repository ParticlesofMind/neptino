"use client"

import { Play, Copy, Check } from "lucide-react"
import { useState } from "react"
import { SectionLabel } from "./editors/studio-primitives"

type MotionPreset =
  | "fade-up" | "fade-down" | "fade-left" | "fade-right"
  | "zoom-in" | "zoom-out" | "flip-x" | "flip-y"
  | "bounce" | "pulse" | "shake" | "rotate"

const PRESET_OPTIONS: Array<{ label: string; value: MotionPreset; group: string }> = [
  { label: "Fade Up",    value: "fade-up",    group: "Fade" },
  { label: "Fade Down",  value: "fade-down",  group: "Fade" },
  { label: "Fade Left",  value: "fade-left",  group: "Fade" },
  { label: "Fade Right", value: "fade-right", group: "Fade" },
  { label: "Zoom In",    value: "zoom-in",    group: "Zoom" },
  { label: "Zoom Out",   value: "zoom-out",   group: "Zoom" },
  { label: "Flip X",     value: "flip-x",     group: "Flip" },
  { label: "Flip Y",     value: "flip-y",     group: "Flip" },
  { label: "Bounce",     value: "bounce",     group: "Emphasis" },
  { label: "Pulse",      value: "pulse",      group: "Emphasis" },
  { label: "Shake",      value: "shake",      group: "Emphasis" },
  { label: "Rotate",     value: "rotate",     group: "Emphasis" },
]

const EASING_OPTIONS = ["linear", "ease-in", "ease-out", "ease-in-out", "spring"] as const
type EasingOption = (typeof EASING_OPTIONS)[number]

const EASING_CURVES: Record<EasingOption, string> = {
  "linear":      "M4 20 L28 4",
  "ease-in":     "M4 20 C8 20, 18 10, 28 4",
  "ease-out":    "M4 20 C10 14, 20 4, 28 4",
  "ease-in-out": "M4 20 C10 20, 16 4, 28 4",
  "spring":      "M4 20 C8 26, 14 -4, 20 8 C23 14, 25 3, 28 4",
}

function easingToCssValue(easing: EasingOption): string {
  if (easing === "spring") return "cubic-bezier(.2,1.4,.4,1)"
  return easing
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

interface MakeMotionToolbarProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function MakeMotionToolbar({ content, onChange }: MakeMotionToolbarProps) {
  const [copied, setCopied] = useState(false)

  const durationMs = asNumber(content.animationDurationMs, 1200)
  const delayMs = asNumber(content.animationDelayMs, 0)
  const easing = (typeof content.animationEasing === "string" ? content.animationEasing : "ease-in-out") as EasingOption
  const preset = (typeof content.animationPreset === "string" ? content.animationPreset : "fade-up") as MotionPreset
  const autoplay = typeof content.autoplay === "boolean" ? content.autoplay : true
  const loop = typeof content.loop === "boolean" ? content.loop : true
  const scrubEnabled = typeof content.animationScrubEnabled === "boolean" ? content.animationScrubEnabled : false
  const maxDuration = Math.max(100, durationMs)
  const scrubMsRaw = asNumber(content.animationScrubMs, 0)
  const scrubMs = Math.max(0, Math.min(maxDuration, scrubMsRaw))

  const keyframeStops = [
    { label: "Start", ms: 0 },
    { label: "In",    ms: Math.round(maxDuration * 0.25) },
    { label: "Peak",  ms: Math.round(maxDuration * 0.5) },
    { label: "Out",   ms: Math.round(maxDuration * 0.75) },
    { label: "End",   ms: maxDuration },
  ]

  const copyCss = () => {
    const easingVal = easingToCssValue(easing)
    const css = `animation: ${preset.replace("-", "")} ${durationMs}ms ${easingVal} ${delayMs}ms ${loop ? "infinite" : "1"} both;`
    void navigator.clipboard.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-2">
        <SectionLabel>Motion</SectionLabel>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyCss}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[9px] font-semibold text-neutral-500 transition-colors hover:bg-neutral-50"
          >
            {copied ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
            {copied ? "Copied!" : "Copy CSS"}
          </button>
          <button
            type="button"
            onClick={() => { onChange("animationScrubEnabled", false); onChange("animationNonce", Date.now()) }}
            className="flex items-center gap-1 rounded-md border border-neutral-900 bg-neutral-900 px-2 py-1 text-[9px] font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            <Play size={9} /> Play
          </button>
        </div>
      </div>

      {/* Preset grid */}
      <div className="border-b border-neutral-100 px-4 py-2.5 space-y-1.5">
        <SectionLabel>Preset</SectionLabel>
        <div className="grid grid-cols-4 gap-1">
          {PRESET_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange("animationPreset", p.value)}
              className={[
                "rounded-md px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider transition-all",
                preset === p.value
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "border border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-300 hover:bg-white hover:text-neutral-700",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Easing curve picker */}
      <div className="border-b border-neutral-100 px-4 py-2.5 space-y-1.5">
        <SectionLabel>Easing</SectionLabel>
        <div className="flex gap-1.5">
          {EASING_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange("animationEasing", e)}
              title={e}
              className={[
                "flex flex-1 flex-col items-center gap-1 rounded-md border p-1.5 transition-all",
                easing === e
                  ? "border-neutral-900 bg-neutral-900"
                  : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white",
              ].join(" ")}
            >
              <svg viewBox="0 0 32 24" width="32" height="20" className="overflow-visible">
                <line x1={4} y1={20} x2={28} y2={20} stroke={easing === e ? "#ffffff33" : "#e5e7eb"} strokeWidth={0.8} />
                <line x1={4} y1={20} x2={4} y2={4} stroke={easing === e ? "#ffffff33" : "#e5e7eb"} strokeWidth={0.8} />
                <path
                  d={EASING_CURVES[e]}
                  fill="none"
                  stroke={easing === e ? "#ffffff" : "#374151"}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`text-[8px] font-semibold uppercase tracking-wider ${easing === e ? "text-white" : "text-neutral-500"}`}>
                {e === "ease-in-out" ? "ease" : e === "spring" ? "spring" : e.replace("ease-", "")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Timing + toggles */}
      <div className="flex items-end gap-3 border-b border-neutral-100 px-4 py-2.5">
        <div className="space-y-1 flex-1">
          <SectionLabel>Duration</SectionLabel>
          <div className="flex items-stretch overflow-hidden rounded-md border border-neutral-200 bg-white">
            <input
              type="number" min={100} max={12000} step={50} value={durationMs}
              onChange={(e) => onChange("animationDurationMs", Number(e.target.value))}
              className="min-w-0 flex-1 px-2 py-1.5 text-[11px] font-mono text-neutral-800 outline-none"
            />
            <span className="shrink-0 border-l border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[9px] font-semibold text-neutral-400">ms</span>
          </div>
        </div>
        <div className="space-y-1 flex-1">
          <SectionLabel>Delay</SectionLabel>
          <div className="flex items-stretch overflow-hidden rounded-md border border-neutral-200 bg-white">
            <input
              type="number" min={0} max={5000} step={50} value={delayMs}
              onChange={(e) => onChange("animationDelayMs", Number(e.target.value))}
              className="min-w-0 flex-1 px-2 py-1.5 text-[11px] font-mono text-neutral-800 outline-none"
            />
            <span className="shrink-0 border-l border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[9px] font-semibold text-neutral-400">ms</span>
          </div>
        </div>
        <div className="space-y-1">
          <SectionLabel>Auto</SectionLabel>
          <button
            type="button"
            onClick={() => onChange("autoplay", !autoplay)}
            className={["rounded-md border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all", autoplay ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-500"].join(" ")}
          >
            {autoplay ? "On" : "Off"}
          </button>
        </div>
        <div className="space-y-1">
          <SectionLabel>Loop</SectionLabel>
          <button
            type="button"
            onClick={() => onChange("loop", !loop)}
            className={["rounded-md border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all", loop ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-500"].join(" ")}
          >
            {loop ? "On" : "Off"}
          </button>
        </div>
      </div>

      {/* Scrubber */}
      <div className="bg-neutral-50 px-4 py-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {[false, true].map((isScrub) => (
            <button
              key={String(isScrub)}
              type="button"
              onClick={() => onChange("animationScrubEnabled", isScrub)}
              className={[
                "rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                scrubEnabled === isScrub
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400",
              ].join(" ")}
            >
              {isScrub ? "Scrub" : "Live"}
            </button>
          ))}
          <span className="ml-auto font-mono text-[10px] text-neutral-500">{scrubMs}ms</span>
        </div>

        {/* Track */}
        <div className="relative flex h-4 items-center">
          <div className="absolute inset-x-0 h-1 rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-neutral-700 transition-all"
              style={{ width: `${Math.min(100, (scrubMs / Math.max(1, maxDuration)) * 100)}%` }}
            />
          </div>
          <input
            type="range" min={0} max={maxDuration} step={10} value={scrubMs}
            onChange={(e) => { onChange("animationScrubEnabled", true); onChange("animationScrubMs", Number(e.target.value)) }}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          />
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-neutral-700 bg-white shadow-sm transition-all"
            style={{ left: `${Math.min(100, (scrubMs / Math.max(1, maxDuration)) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {keyframeStops.map((stop) => (
            <button
              key={stop.label}
              type="button"
              onClick={() => { onChange("animationScrubEnabled", true); onChange("animationScrubMs", stop.ms) }}
              className={[
                "rounded px-1.5 py-0.5 text-[9px] font-semibold transition-all",
                scrubEnabled && scrubMs === stop.ms
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-700",
              ].join(" ")}
            >
              {stop.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
