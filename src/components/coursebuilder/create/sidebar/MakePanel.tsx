"use client"

/**
 * Make Panel — redesigned
 *
 * Three-column layout:
 *   Left nav  (w-56) — grouped card type list with search
 *   Editor    (flex-1) — per-type rich editor (EditorShell)
 *   Preview   (w-80) — live CardTypePreview + quick metadata
 *
 * Motion toolbar strip rendered at bottom for animation-capable types.
 */

import { useEffect, useState } from "react"
import type { CardType } from "../types"
import { CardTypePreview } from "../cards/CardTypePreview"
import { CARD_TYPE_META } from "../cards/CardTypePreview"
import { MakeMotionToolbar } from "./make-motion-toolbar"
import { buildStudioCardContent, getStudioDefaults } from "./make-studio-tools"
import { EditorShell } from "./editors/EditorShell"
import { CARD_SPECS, GROUPS, SAMPLE_CONTENT } from "./make-panel-data"

function isMotionCard(cardType: CardType): boolean {
  return cardType === "animation" || cardType === "video" || cardType === "rich-sim"
}

function easingToCss(easing: string): string {
  if (easing === "spring") return "cubic-bezier(.2,1.4,.4,1)"
  return easing
}

function presetToKeyframes(preset: string): string {
  const map: Record<string, string> = {
    "fade-up": "makeFadeUp",
    "fade-down": "makeFadeDown",
    "fade-left": "makeFadeLeft",
    "fade-right": "makeFadeRight",
    "zoom-in": "makeZoomIn",
    "zoom-out": "makeZoomOut",
    "flip-x": "makeFlipX",
    "flip-y": "makeFlipY",
    bounce: "makeBounce",
    pulse: "makePulse",
    shake: "makeShake",
    rotate: "makeRotate",
  }
  return map[preset] ?? "makeFadeUp"
}

// ─── Preview Panel ─────────────────────────────────────────────────────────────

function PreviewPanel({
  cardType,
  content,
}: {
  cardType: CardType
  content: Record<string, unknown>
}) {
  const meta = CARD_TYPE_META[cardType]
  const cardContent = buildStudioCardContent(cardType, content)
  const [playbackToken, setPlaybackToken] = useState(0)

  const autoplay = typeof cardContent.autoplay === "boolean" ? cardContent.autoplay : true
  const loop = typeof cardContent.loop === "boolean" ? cardContent.loop : true
  const preset = typeof cardContent.animationPreset === "string" ? cardContent.animationPreset : "fade-up"
  const easing = typeof cardContent.animationEasing === "string" ? cardContent.animationEasing : "ease-in-out"
  const durationMs = typeof cardContent.animationDurationMs === "number" ? cardContent.animationDurationMs : 1200
  const delayMs = typeof cardContent.animationDelayMs === "number" ? cardContent.animationDelayMs : 0
  const animationNonce = typeof cardContent.animationNonce === "number" ? cardContent.animationNonce : 0
  const scrubEnabled = typeof cardContent.animationScrubEnabled === "boolean" ? cardContent.animationScrubEnabled : false
  const scrubMs = typeof cardContent.animationScrubMs === "number" ? cardContent.animationScrubMs : 0

  useEffect(() => {
    if (!isMotionCard(cardType)) return
    if (!autoplay || scrubEnabled) return
    setPlaybackToken((t) => t + 1)
  }, [cardType, autoplay, scrubEnabled, preset, easing, durationMs, delayMs, animationNonce, loop])

  useEffect(() => {
    if (!isMotionCard(cardType) || animationNonce <= 0) return
    setPlaybackToken((t) => t + 1)
  }, [cardType, animationNonce])

  const shouldAnimate = isMotionCard(cardType)
  const resolvedDuration = Math.max(100, durationMs)
  const resolvedDelay = Math.max(0, delayMs)
  const scrubbedMs = Math.max(0, Math.min(resolvedDuration, scrubMs))

  const animationStyle = shouldAnimate
    ? {
        animationName: presetToKeyframes(preset),
        animationDuration: `${resolvedDuration}ms`,
        animationDelay: scrubEnabled ? `${-scrubbedMs}ms` : `${resolvedDelay}ms`,
        animationTimingFunction: easingToCss(easing),
        animationFillMode: "both" as const,
        animationIterationCount: scrubEnabled ? "1" : loop ? "infinite" : "1",
        animationPlayState: scrubEnabled ? "paused" as const : "running" as const,
      }
    : undefined

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-neutral-200 bg-white">
      {/* Preview header */}
      <div className="shrink-0 border-b border-neutral-100 px-4 py-2.5">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400">Live preview</p>
        <p className="mt-0.5 text-[12px] font-semibold text-neutral-800">{meta.label}</p>
      </div>

      {/* Preview body */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <div key={playbackToken} style={animationStyle}>
          <CardTypePreview cardType={cardType} content={cardContent} />
        </div>
      </div>

      {/* Quick info */}
      <div className="shrink-0 border-t border-neutral-100 bg-neutral-50 px-4 py-3 space-y-2">
        <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400">Card info</p>
        <div className="space-y-1">
          {Boolean(content.title) && (
            <div className="flex gap-2 text-[11px]">
              <span className="shrink-0 text-neutral-400 w-16">Title</span>
              <span className="text-neutral-700 truncate">{String(content.title)}</span>
            </div>
          )}
          {Boolean(content.readingLevel) && (
            <div className="flex gap-2 text-[11px]">
              <span className="shrink-0 text-neutral-400 w-16">Level</span>
              <span className="text-neutral-700">{String(content.readingLevel)}</span>
            </div>
          )}
          {Number(content.durationMinutes) > 0 && (
            <div className="flex gap-2 text-[11px]">
              <span className="shrink-0 text-neutral-400 w-16">Duration</span>
              <span className="text-neutral-700">{Number(content.durationMinutes)} min</span>
            </div>
          )}
          {Boolean(content.attribution) && (
            <div className="flex gap-2 text-[11px]">
              <span className="shrink-0 text-neutral-400 w-16">Source</span>
              <span className="text-neutral-700 truncate">{String(content.attribution)}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes makeFadeUp    { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes makeFadeDown  { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes makeFadeLeft  { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes makeFadeRight { from { opacity:0; transform:translateX(-16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes makeZoomIn    { from { opacity:0; transform:scale(0.9) } to { opacity:1; transform:scale(1) } }
        @keyframes makeZoomOut   { from { opacity:0; transform:scale(1.1) } to { opacity:1; transform:scale(1) } }
        @keyframes makeFlipX     { from { opacity:0; transform:perspective(400px) rotateX(90deg) } to { opacity:1; transform:perspective(400px) rotateX(0) } }
        @keyframes makeFlipY     { from { opacity:0; transform:perspective(400px) rotateY(90deg) } to { opacity:1; transform:perspective(400px) rotateY(0) } }
        @keyframes makeBounce    { 0%,100%{ transform:translateY(0) } 30%{ transform:translateY(-18px) } 60%{ transform:translateY(-8px) } }
        @keyframes makePulse     { 0%,100%{ transform:scale(1); opacity:1 } 50%{ transform:scale(1.04); opacity:.88 } }
        @keyframes makeShake     { 0%,100%{ transform:translateX(0) } 25%{ transform:translateX(-8px) } 75%{ transform:translateX(8px) } }
        @keyframes makeRotate    { from{ transform:rotate(-180deg); opacity:0 } to{ transform:rotate(0); opacity:1 } }
      `}</style>
    </aside>
  )
}

// ─── Make Panel ────────────────────────────────────────────────────────────────

export function MakePanel() {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<CardType>("text")
  const [activeGroup, setActiveGroup] = useState<"all" | "media" | "data" | "interactive">("all")
  const [contentByType, setContentByType] = useState<Partial<Record<CardType, Record<string, unknown>>>>({})

  // Seed defaults + sample content on first select
  useEffect(() => {
    setContentByType((prev) => {
      if (prev[selected]) return prev
      const sample = SAMPLE_CONTENT[selected] ?? {}
      return { ...prev, [selected]: { ...getStudioDefaults(selected), ...sample } }
    })
  }, [selected])

  const selectedContent = contentByType[selected] ?? getStudioDefaults(selected)

  const handleChange = (key: string, value: unknown) => {
    setContentByType((prev) => ({
      ...prev,
      [selected]: {
        ...(prev[selected] ?? getStudioDefaults(selected)),
        [key]: value,
      },
    }))
  }

  // Filtered card specs
  const filtered = CARD_SPECS.filter((spec) => {
    const matchesGroup = activeGroup === "all" || spec.group === activeGroup
    const q = search.toLowerCase()
    const matchesSearch = spec.label.toLowerCase().includes(q) || spec.description.toLowerCase().includes(q)
    return matchesGroup && matchesSearch
  })

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: filtered.filter((s) => s.group === g.id),
  })).filter((g) => g.items.length > 0)

  const meta = CARD_TYPE_META[selected]

  return (
    <div className="flex h-full w-full overflow-hidden bg-neutral-50">
      {/* ── Left nav ─────────────────────────────────────────────────────────── */}
      <div className="flex w-56 shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white">
        {/* Search + filters */}
        <div className="shrink-0 space-y-2 border-b border-neutral-100 px-3 pt-3 pb-2">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400">Card types</p>
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] outline-none focus:border-neutral-400 placeholder:text-neutral-400"
          />
        </div>

        {/* Group pills */}
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-neutral-100 px-3 py-2">
          {(["all", "media", "data", "interactive"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={[
                "px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                activeGroup === g
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
              ].join(" ")}
            >
              {g === "all" ? "All" : g === "data" ? "Data" : g === "interactive" ? "Interactive" : "Media"}
            </button>
          ))}
        </div>

        {/* Card type list */}
        <div className="flex-1 overflow-y-auto">
          {grouped.map((group) => (
            <div key={group.id}>
              <p className="px-3 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-widest text-neutral-400">
                {group.label}
              </p>
              {group.items.map((spec) => {
                const isActive = spec.cardType === selected
                return (
                  <button
                    key={spec.cardType}
                    onClick={() => setSelected(spec.cardType)}
                    className={[
                      "flex w-full items-start gap-2 border-l-2 px-3 py-2 text-left transition-colors",
                      isActive
                        ? "border-neutral-900 bg-neutral-100"
                        : "border-transparent hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <spec.Icon
                      size={13}
                      className={isActive ? "mt-0.5 shrink-0 text-neutral-900" : "mt-0.5 shrink-0 text-neutral-400"}
                    />
                    <div className="min-w-0">
                      <p className={[
                        "text-[12px] font-medium leading-tight",
                        isActive ? "text-neutral-900" : "text-neutral-700",
                      ].join(" ")}>
                        {spec.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-neutral-400">
                        {spec.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
          {grouped.length === 0 && (
            <p className="px-3 py-4 text-[11px] italic text-neutral-400">No results.</p>
          )}
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Editor header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <meta.icon size={15} className="shrink-0 text-neutral-500" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-neutral-900 truncate">{meta.label} editor</p>
            </div>
          </div>
          <button
            type="button"
            title="Add to canvas — drag from the Curate panel, or wire up drop action here"
            className="shrink-0 border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:opacity-90"
          >
            Add to canvas
          </button>
        </div>

        {/* Editor body + preview */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Rich editor */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <EditorShell
              cardType={selected}
              content={selectedContent}
              onChange={handleChange}
            />
          </div>

          {/* Live preview */}
          <PreviewPanel cardType={selected} content={selectedContent} />
        </div>

        {/* Motion toolbar */}
        {isMotionCard(selected) && (
          <div className="shrink-0 border-t border-neutral-200">
            <MakeMotionToolbar
              content={selectedContent}
              onChange={handleChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
