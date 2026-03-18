"use client"

import { CARD_TYPE_META } from "@/components/coursebuilder/create/cards/CardTypePreview"
import type { DragSourceData } from "@/components/coursebuilder/create/hooks/useCardDrop"

// Schematic grid configs for each layout kind.
const LAYOUT_SCHEMATICS = {
  "layout-split":     { cols: 2, rows: 1 },
  "layout-stack":     { cols: 1, rows: 2 },
  "layout-feature":   { cols: 2, rows: 2, custom: "feature" },
  "layout-sidebar":   { cols: 2, rows: 1, asymmetric: true },
  "layout-quad":      { cols: 2, rows: 2 },
  "layout-mosaic":    { cols: 3, rows: 3 },
  "layout-triptych":  { cols: 3, rows: 1 },
  "layout-trirow":    { cols: 1, rows: 3 },
  "layout-banner":    { cols: 2, rows: 2, custom: "banner" },
  "layout-broadside": { cols: 3, rows: 2, custom: "broadside" },
  "layout-tower":     { cols: 2, rows: 3, custom: "tower" },
  "layout-pinboard":  { cols: 2, rows: 3, custom: "pinboard" },
  "layout-annotated": { cols: 3, rows: 2, custom: "annotated" },
  "layout-sixgrid":   { cols: 3, rows: 2 },
} as const

type LayoutKindKey = keyof typeof LAYOUT_SCHEMATICS

const CARD_TYPE_COLORS: Partial<Record<string, { bg: string; text: string }>> = {
  text:          { bg: "bg-[#dbe8f6]", text: "text-[#3a6ea0]" },
  image:         { bg: "bg-[#f0e6cc]", text: "text-[#7a5010]" },
  video:         { bg: "bg-[#f0d8d8]", text: "text-[#8a3030]" },
  audio:         { bg: "bg-[#d6ede3]", text: "text-[#2e6b4a]" },
  document:      { bg: "bg-[#dbe8f6]", text: "text-[#3a6ea0]" },
  chart:         { bg: "bg-[#f0e8cc]", text: "text-[#7a6010]" },
  diagram:       { bg: "bg-[#f0e8cc]", text: "text-[#7a6010]" },
  table:         { bg: "bg-[#f0e8cc]", text: "text-[#7a6010]" },
  map:           { bg: "bg-[#f0e8cc]", text: "text-[#7a6010]" },
  animation:     { bg: "bg-[#f0e6cc]", text: "text-[#7a5010]" },
  dataset:       { bg: "bg-[#f0e8cc]", text: "text-[#7a6010]" },
  timeline:      { bg: "bg-[#dbe8f6]", text: "text-[#3a6ea0]" },
  legend:        { bg: "bg-[#d6ede3]", text: "text-[#2e6b4a]" },
  interactive:   { bg: "bg-[#f0d8d8]", text: "text-[#8a3030]" },
  games:         { bg: "bg-[#f0d8d8]", text: "text-[#8a3030]" },
  "rich-sim":    { bg: "bg-[#f0e6cc]", text: "text-[#7a5010]" },
  "village-3d":  { bg: "bg-[#f0e6cc]", text: "text-[#7a5010]" },
  chat:          { bg: "bg-[#f0d8d8]", text: "text-[#8a3030]" },
  "text-editor": { bg: "bg-[#dbe8f6]", text: "text-[#3a6ea0]" },
  "code-editor": { bg: "bg-muted",     text: "text-muted-foreground" },
  whiteboard:    { bg: "bg-[#d6ede3]", text: "text-[#2e6b4a]" },
}

function LayoutSchematicOverlay({ cardType }: { cardType: LayoutKindKey }) {
  const spec = LAYOUT_SCHEMATICS[cardType]
  const label = cardType.replace("layout-", "").charAt(0).toUpperCase() +
                cardType.replace("layout-", "").slice(1)

  if (cardType === "layout-feature") {
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px] rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg cursor-grabbing">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          {label} layout block
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gridTemplateRows: "2fr 1fr", gap: 2, height: 52 }}>
          <div style={{ gridArea: "1 / 1 / 3 / 2" }} className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-100" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-sidebar") {
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px] rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg cursor-grabbing">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          {label} layout block
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "3fr 7fr", gap: 2, height: 36 }}>
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-banner") {
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px] rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg cursor-grabbing">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          {label} layout block
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto 1fr", gap: 2, height: 52 }}>
          <div style={{ gridArea: "1 / 1 / 2 / 3" }} className="rounded-sm border border-neutral-400 bg-neutral-300" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-broadside") {
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px] rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg cursor-grabbing">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          {label} layout block
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto 1fr", gap: 2, height: 52 }}>
          <div style={{ gridArea: "1 / 1 / 2 / 4" }} className="rounded-sm border border-neutral-400 bg-neutral-300" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-tower") {
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px] rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg cursor-grabbing">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          {label} layout block
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 2, height: 56 }}>
          <div style={{ gridArea: "1 / 1 / 4 / 2" }} className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-100" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-100" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-100" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-pinboard") {
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px] rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg cursor-grabbing">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          {label} layout block
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto 1fr 1fr", gap: 2, height: 60 }}>
          <div style={{ gridArea: "1 / 1 / 2 / 3" }} className="rounded-sm border border-neutral-400 bg-neutral-300" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-200" />
        </div>
      </div>
    )
  }

  if (cardType === "layout-annotated") {
    return (
      <div className="flex flex-col gap-1.5 min-w-[160px] rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg cursor-grabbing">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          {label} layout block
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr", gridTemplateRows: "1fr 1fr", gap: 2, height: 52 }}>
          <div style={{ gridArea: "1 / 1 / 3 / 2" }} className="rounded-sm border border-neutral-300 bg-neutral-200" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-100" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-100" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-100" />
          <div className="rounded-sm border border-neutral-300 bg-neutral-100" />
        </div>
      </div>
    )
  }

  const cells = spec.cols * spec.rows
  return (
    <div className="flex flex-col gap-1.5 min-w-[160px] rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg cursor-grabbing">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
        {label} layout block
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${spec.cols}, 1fr)`,
          gridTemplateRows: `repeat(${spec.rows}, 1fr)`,
          gap: 2,
          height: spec.rows === 1 ? 36 : spec.rows === 3 ? 52 : 44,
        }}
      >
        {Array.from({ length: cells }).map((_, i) => (
          <div key={i} className="rounded-sm border border-neutral-300 bg-neutral-200" />
        ))}
      </div>
    </div>
  )
}

export function DragOverlayCard({ data }: { data: DragSourceData }) {
  if (data.cardType in LAYOUT_SCHEMATICS) {
    return <LayoutSchematicOverlay cardType={data.cardType as LayoutKindKey} />
  }

  const meta = CARD_TYPE_META[data.cardType]
  const Icon = meta.icon
  const typeLabel = meta.label
  const title = data.title ?? meta.label
  const colors = CARD_TYPE_COLORS[data.cardType] ?? { bg: "bg-neutral-100", text: "text-neutral-600" }

  return (
    <div className="w-[260px] rounded-lg border border-neutral-200 bg-white p-2.5 shadow-xl cursor-grabbing">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
          <Icon size={18} className={colors.text} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] font-medium leading-tight text-neutral-800">{title}</p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400">{typeLabel}</p>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 w-2/3 rounded bg-neutral-100" />
      <div className="mt-1.5 h-1.5 w-full rounded bg-neutral-100" />
    </div>
  )
}
