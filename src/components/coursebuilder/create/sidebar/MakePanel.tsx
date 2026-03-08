"use client"

/**
 * Make Panel — redesigned
 *
 * Three-column layout:
 *   Left nav  (w-60) — grouped card type list with search + filters
 *   Editor    (flex-1) — per-type rich editor (EditorShell)
 *   Preview   (w-80, collapsible) — live CardTypePreview
 *
 * Motion toolbar strip rendered at bottom for animation-capable types.
 */

import { useEffect, useState } from "react"
import { PanelRightClose, PanelRight, Plus, Check } from "lucide-react"
import type { CardType } from "../types"
import { CardTypePreview, CARD_TYPE_META } from "../cards/CardTypePreview"
import { MakeMotionToolbar } from "./make-motion-toolbar"
import { buildStudioCardContent, getStudioDefaults } from "./make-studio-tools"
import { EditorShell } from "./editors/EditorShell"
import { CARD_SPECS, GROUPS, SAMPLE_CONTENT, type CardGroup } from "./make-panel-data"
import { useMakeLibraryStore } from "../store/makeLibraryStore"
import { useCreateModeStore } from "../store/createModeStore"

// ─── Constants ────────────────────────────────────────────────────────────────

function isMotionCard(cardType: CardType): boolean {
  return cardType === "animation" || cardType === "video" || cardType === "rich-sim"
}

function easingToCss(easing: string): string {
  if (easing === "spring") return "cubic-bezier(.2,1.4,.4,1)"
  return easing
}

function presetToKeyframes(preset: string): string {
  const map: Record<string, string> = {
    "fade-up": "makeFadeUp", "fade-down": "makeFadeDown",
    "fade-left": "makeFadeLeft", "fade-right": "makeFadeRight",
    "zoom-in": "makeZoomIn", "zoom-out": "makeZoomOut",
    "flip-x": "makeFlipX", "flip-y": "makeFlipY",
    bounce: "makeBounce", pulse: "makePulse", shake: "makeShake", rotate: "makeRotate",
  }
  return map[preset] ?? "makeFadeUp"
}

// ─── Group accent colours ─────────────────────────────────────────────────────

const GROUP_ACCENT: Record<string, { icon: string; pill: string; pillActive: string; border: string; dot: string }> = {
  media:      { icon: "text-[#4a94ff]",  pill: "text-[#4a94ff]",  pillActive: "bg-[#4a94ff] text-white",  border: "border-[#4a94ff]/20 bg-[#4a94ff]/5",  dot: "bg-[#4a94ff]"  },
  data:       { icon: "text-[#00ccb3]",  pill: "text-[#00ccb3]",  pillActive: "bg-[#00ccb3] text-white",  border: "border-[#00ccb3]/20 bg-[#00ccb3]/5",  dot: "bg-[#00ccb3]"  },
  products:   { icon: "text-amber-500",  pill: "text-amber-600",  pillActive: "bg-amber-500 text-white",  border: "border-amber-200 bg-amber-50",         dot: "bg-amber-400"  },
  activities: { icon: "text-violet-500", pill: "text-violet-600", pillActive: "bg-violet-500 text-white", border: "border-violet-200 bg-violet-50",        dot: "bg-violet-400" },
  layout:     { icon: "text-neutral-600", pill: "text-neutral-600", pillActive: "bg-neutral-600 text-white", border: "border-neutral-200 bg-neutral-50",     dot: "bg-neutral-400" },
}

// ─── Preview Panel ─────────────────────────────────────────────────────────────

function PreviewPanel({
  cardType,
  content,
  onClose,
}: {
  cardType: CardType
  content: Record<string, unknown>
  onClose: () => void
}) {
  const meta = CARD_TYPE_META[cardType]
  const spec = CARD_SPECS.find((s) => s.cardType === cardType)
  const cardContent = buildStudioCardContent(cardType, content)
  const [playbackToken, setPlaybackToken] = useState(0)

  const autoplay  = typeof cardContent.autoplay  === "boolean" ? cardContent.autoplay  : true
  const loop      = typeof cardContent.loop       === "boolean" ? cardContent.loop      : true
  const preset    = typeof cardContent.animationPreset    === "string" ? cardContent.animationPreset    : "fade-up"
  const easing    = typeof cardContent.animationEasing    === "string" ? cardContent.animationEasing    : "ease-in-out"
  const durationMs = typeof cardContent.animationDurationMs === "number" ? cardContent.animationDurationMs : 1200
  const delayMs   = typeof cardContent.animationDelayMs   === "number" ? cardContent.animationDelayMs   : 0
  const animationNonce    = typeof cardContent.animationNonce    === "number" ? cardContent.animationNonce    : 0
  const scrubEnabled = typeof cardContent.animationScrubEnabled === "boolean" ? cardContent.animationScrubEnabled : false
  const scrubMs   = typeof cardContent.animationScrubMs   === "number" ? cardContent.animationScrubMs   : 0

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

  const accent = GROUP_ACCENT[spec?.group ?? "media"]

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-neutral-200 bg-white">
      {/* Preview header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={["flex h-6 w-6 shrink-0 items-center justify-center rounded-md", accent.border].join(" ")}>
            <meta.icon size={12} className={accent.icon} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400">Live preview</p>
            <p className="text-[12px] font-semibold text-neutral-800 truncate">{meta.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Hide preview"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
        >
          <PanelRightClose size={15} />
        </button>
      </div>

      {/* Preview body */}
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        <div key={playbackToken} style={animationStyle}>
          <CardTypePreview cardType={cardType} content={cardContent} />
        </div>
      </div>

      {/* Card info footer */}
      <div className="shrink-0 border-t border-neutral-100 bg-neutral-50/80 px-4 py-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-neutral-400">Card info</p>
        <div className="space-y-1">
          {Boolean(content.title) && (
            <div className="flex gap-2 text-[11px]">
              <span className="shrink-0 w-16 text-neutral-400">Title</span>
              <span className="text-neutral-700 truncate">{String(content.title)}</span>
            </div>
          )}
          {Boolean(content.readingLevel) && (
            <div className="flex gap-2 text-[11px]">
              <span className="shrink-0 w-16 text-neutral-400">Level</span>
              <span className="text-neutral-700">{String(content.readingLevel)}</span>
            </div>
          )}
          {Number(content.durationMinutes) > 0 && (
            <div className="flex gap-2 text-[11px]">
              <span className="shrink-0 w-16 text-neutral-400">Duration</span>
              <span className="text-neutral-700">{Number(content.durationMinutes)} min</span>
            </div>
          )}
          {Boolean(content.attribution) && (
            <div className="flex gap-2 text-[11px]">
              <span className="shrink-0 w-16 text-neutral-400">Source</span>
              <span className="text-neutral-700 truncate">{String(content.attribution)}</span>
            </div>
          )}
          {!content.title && !content.readingLevel && !content.durationMinutes && !content.attribution && (
            <p className="text-[11px] italic text-neutral-400">Fill in the editor to populate card info.</p>
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
  const [activeGroup, setActiveGroup] = useState<"all" | CardGroup>("all")
  const [contentByType, setContentByType] = useState<Partial<Record<CardType, Record<string, unknown>>>>({})
  const [showPreview, setShowPreview] = useState(true)
  const [addedFeedback, setAddedFeedback] = useState(false)

  const addCard = useMakeLibraryStore((s) => s.addCard)
  const setMode = useCreateModeStore((s) => s.setMode)

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
  const totalCards = CARD_SPECS.length
  const visibleCards = filtered.length

  const handleAddToCanvas = () => {
    addCard(selected, buildStudioCardContent(selected, selectedContent))
    setAddedFeedback(true)
    setTimeout(() => {
      setAddedFeedback(false)
      setMode("curate")
    }, 800)
  }

  const meta = CARD_TYPE_META[selected]
  const selectedSpec = CARD_SPECS.find((s) => s.cardType === selected)
  const accent = GROUP_ACCENT[selectedSpec?.group ?? "media"]

  return (
    <div className="flex h-full w-full overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f5f7fb_100%)]">

      {/* ── Left nav ─────────────────────────────────────────────────────────── */}
      <div className="flex w-60 shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white">

        {/* Nav header */}
        <div className="shrink-0 border-b border-neutral-100 px-4 pb-3 pt-4">
          <p className="text-[11px] font-bold tracking-tight text-neutral-900">Card library</p>
          <p className="mt-0.5 text-[10px] text-neutral-400">Choose a type to configure</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="rounded bg-[#4a94ff]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#2b6cd2]">{visibleCards} visible</span>
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-500">{totalCards} total</span>
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 px-3 pt-2.5 pb-2">
          <input
            type="search"
            placeholder="Search card types…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[12px] text-neutral-700 outline-none transition-colors focus:border-[#4a94ff]/50 focus:bg-white focus:ring-1 focus:ring-[#4a94ff]/10 placeholder:text-neutral-400"
          />
        </div>

        {/* Group filter pills */}
        <div className="shrink-0 flex gap-1 px-3 pb-2.5">
          {(["all", "media", "data", "products", "activities"] as const).map((g) => {
            const isActive = activeGroup === g
            const groupAccent = g !== "all" ? GROUP_ACCENT[g] : null
            const LABELS: Record<string, string> = { all: "All", media: "Media", data: "Data", products: "Prod", activities: "Act" }
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={[
                  "flex-1 rounded-md py-1 text-[9px] font-bold uppercase tracking-wider transition-all",
                  isActive
                    ? groupAccent ? groupAccent.pillActive : "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                    : groupAccent ? `bg-neutral-100 ${groupAccent.pill} hover:opacity-80` : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
                ].join(" ")}
              >
                {LABELS[g]}
              </button>
            )
          })}
        </div>

        {/* Card type list */}
        <div className="flex-1 overflow-y-auto">
          {grouped.map((group) => {
            const ga = GROUP_ACCENT[group.id]
            return (
              <div key={group.id}>
                {/* Group header */}
                <div className="flex items-center gap-1.5 px-4 pb-1 pt-3">
                  <div className={["h-1.5 w-1.5 rounded-full", GROUP_ACCENT[group.id]?.dot ?? "bg-neutral-400"].join(" ")} />
                  <p className={["text-[9px] font-bold uppercase tracking-widest", ga.pill].join(" ")}>
                    {group.label}
                  </p>
                </div>

                {/* Items */}
                {group.items.map((spec) => {
                  const isActive = spec.cardType === selected
                  return (
                    <button
                      key={spec.cardType}
                      onClick={() => setSelected(spec.cardType)}
                      className={[
                        "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-all mx-auto",
                        isActive
                          ? ""
                          : "hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      {/* Active indicator */}
                      <div className={[
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all",
                        isActive ? [ga.border, "shadow-sm"].join(" ") : "bg-neutral-100",
                      ].join(" ")}>
                        <spec.Icon
                          size={12}
                          className={isActive ? ga.icon : "text-neutral-400"}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={[
                          "text-[12px] font-semibold leading-tight",
                          isActive ? "text-neutral-900" : "text-neutral-600",
                        ].join(" ")}>
                          {spec.label}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-neutral-400">
                          {spec.description}
                        </p>
                      </div>
                      {isActive && (
                        <div className={["mt-1 h-1.5 w-1.5 shrink-0 rounded-full", GROUP_ACCENT[group.id]?.dot ?? "bg-neutral-400"].join(" ")} />
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}

          {grouped.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[12px] text-neutral-400">No card types match your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Editor header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Icon badge */}
            <div className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", accent.border].join(" ")}>
              <meta.icon size={16} className={accent.icon} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-neutral-900 truncate">{meta.label}</p>
              <p className="text-[10px] text-neutral-400 capitalize">{selectedSpec?.group ?? "media"} card</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded border border-[#00ccb3]/20 bg-[#00ccb3]/10 px-2 py-1 text-[10px] font-semibold text-[#008f7e] md:inline">
              Open-source ready
            </span>
            {/* Preview toggle */}
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              title={showPreview ? "Hide preview" : "Show preview"}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                showPreview
                  ? "border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  : "border-[#4a94ff]/30 bg-[#4a94ff]/5 text-[#4a94ff] hover:bg-[#4a94ff]/10",
              ].join(" ")}
            >
              {showPreview ? <PanelRightClose size={15} /> : <PanelRight size={15} />}
            </button>

            {/* Add to canvas */}
            <button
              type="button"
              onClick={handleAddToCanvas}
              title="Add to canvas"
              className={[
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-all active:scale-[0.98]",
                addedFeedback
                  ? "bg-green-500 hover:bg-green-500"
                  : "bg-[#4a94ff] hover:bg-[#3d7de0]",
              ].join(" ")}
            >
              {addedFeedback ? <Check size={13} /> : <Plus size={13} />}
              {addedFeedback ? "Added!" : "Add to canvas"}
            </button>
          </div>
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

          {/* Live preview — collapsible */}
          {showPreview && (
            <PreviewPanel
              cardType={selected}
              content={selectedContent}
              onClose={() => setShowPreview(false)}
            />
          )}
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
