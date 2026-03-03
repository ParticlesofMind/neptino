"use client"

import { Play, Copy, Check } from "lucide-react"
import { useState } from "react"

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
    <div className="border-b border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-2 flex items-center justify-between gap-3">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400">Animation</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyCss}
            title="Copy as CSS animation property"
            className="flex items-center gap-1 border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            {copied ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
            {copied ? "Copied!" : "Copy CSS"}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange("animationScrubEnabled", false)
              onChange("animationNonce", Date.now())
            }}
            className="flex items-center gap-1 border border-neutral-900 bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white hover:opacity-90"
          >
            <Play size={9} />
            Play
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] items-end gap-2 px-4 py-2.5">
        {/* Preset */}
        <label className="space-y-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Preset</span>
          <select
            value={preset}
            onChange={(e) => onChange("animationPreset", e.target.value)}
            className="w-full border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
          >
            {["Fade", "Zoom", "Flip", "Emphasis"].map((group) => (
              <optgroup key={group} label={group}>
                {PRESET_OPTIONS.filter((p) => p.group === group).map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {/* Easing */}
        <label className="space-y-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Easing</span>
          <select
            value={easing}
            onChange={(e) => onChange("animationEasing", e.target.value)}
            className="w-full border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
          >
            {EASING_OPTIONS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>

        {/* Duration */}
        <label className="space-y-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Duration ms</span>
          <input
            type="number"
            min={100}
            max={12000}
            step={50}
            value={durationMs}
            onChange={(e) => onChange("animationDurationMs", Number(e.target.value))}
            className="w-24 border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>

        {/* Delay */}
        <label className="space-y-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Delay ms</span>
          <input
            type="number"
            min={0}
            max={5000}
            step={50}
            value={delayMs}
            onChange={(e) => onChange("animationDelayMs", Number(e.target.value))}
            className="w-24 border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700 outline-none focus:border-neutral-400"
          />
        </label>

        {/* Autoplay toggle */}
        <div className="space-y-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Autoplay</span>
          <button
            type="button"
            onClick={() => onChange("autoplay", !autoplay)}
            className={[
              "w-16 border py-1 text-[10px] font-medium transition-colors",
              autoplay ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600",
            ].join(" ")}
          >
            {autoplay ? "On" : "Off"}
          </button>
        </div>

        {/* Loop toggle */}
        <div className="space-y-1">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Loop</span>
          <button
            type="button"
            onClick={() => onChange("loop", !loop)}
            className={[
              "w-16 border py-1 text-[10px] font-medium transition-colors",
              loop ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-600",
            ].join(" ")}
          >
            {loop ? "On" : "Off"}
          </button>
        </div>
      </div>

      {/* Scrubber row */}
      <div className="grid grid-cols-[1fr_auto] gap-4 border-t border-neutral-100 bg-neutral-50 px-4 py-2.5">
        <div className="space-y-1.5">
          {/* Live / Scrub toggle */}
          <div className="flex items-center gap-1.5">
            {[false, true].map((isScrub) => (
              <button
                key={String(isScrub)}
                type="button"
                onClick={() => onChange("animationScrubEnabled", isScrub)}
                className={[
                  "border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                  scrubEnabled === isScrub
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400",
                ].join(" ")}
              >
                {isScrub ? "Scrub" : "Live"}
              </button>
            ))}
            <span className="ml-auto text-[10px] font-mono text-neutral-500">{scrubMs}ms</span>
          </div>

          {/* Range scrubber */}
          <input
            type="range"
            min={0}
            max={maxDuration}
            step={10}
            value={scrubMs}
            onChange={(e) => {
              onChange("animationScrubEnabled", true)
              onChange("animationScrubMs", Number(e.target.value))
            }}
            className="w-full accent-neutral-900"
          />

          {/* Keyframe stops */}
          <div className="flex items-center justify-between">
            {keyframeStops.map((stop) => (
              <button
                key={stop.label}
                type="button"
                onClick={() => {
                  onChange("animationScrubEnabled", true)
                  onChange("animationScrubMs", stop.ms)
                }}
                className={[
                  "border px-1.5 py-0.5 text-[9px] transition-colors",
                  scrubEnabled && scrubMs === stop.ms
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400",
                ].join(" ")}
              >
                {stop.label}
              </button>
            ))}
          </div>
        </div>

        {/* Easing curve preview */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Curve</span>
          <div className="border border-neutral-200 bg-white px-1 py-1" style={{ width: 64, height: 52 }}>
            <svg viewBox="0 0 32 24" width="100%" height="100%" className="overflow-visible">
              <line x1={4} y1={20} x2={28} y2={20} stroke="#e5e7eb" strokeWidth={0.8} />
              <line x1={4} y1={20} x2={4} y2={4} stroke="#e5e7eb" strokeWidth={0.8} />
              <path
                d={EASING_CURVES[easing]}
                fill="none"
                stroke="#171717"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
