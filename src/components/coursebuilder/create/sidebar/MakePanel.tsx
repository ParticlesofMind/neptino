"use client"

/**
 * Make Panel
 *
 * Full-width card-creation workspace rendered when the editor is in Make mode.
 *
 * Layout:
 *   Left nav  (w-56) — grouped card type list with search
 *   Main area (flex-1) — selected card type details + draggable ghost
 */

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import type { CardType, CardId } from "../types"
import type { DragSourceData } from "../hooks/useCardDrop"
import { CardTypePreview } from "../cards/CardTypePreview"
import { CARD_TYPE_META } from "../cards/CardTypePreview"
import {
  CARD_SPECS,
  GROUPS,
} from "./make-panel-data"

function DraggablePreviewCard({ cardType }: { cardType: CardType }) {
  const meta = CARD_TYPE_META[cardType]

  const dragData: DragSourceData = {
    type:     "card",
    cardId:   `new-${cardType}` as CardId,
    cardType,
    title:    "",
    content:  {},
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `make-preview-${cardType}`,
    data: dragData,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        "mb-5 flex min-h-0 flex-col rounded-2xl border border-border bg-background p-5 overflow-hidden",
        "cursor-grab select-none transition-opacity",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      <div className="mb-5 shrink-0 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-foreground">{meta.label}</h3>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <CardTypePreview cardType={cardType} content={{}} />
      </div>
    </div>
  )
}

// ─── Make Panel ───────────────────────────────────────────────────────────────

export function MakePanel() {
  const [search, setSearch]         = useState("")
  const [selected, setSelected]     = useState<CardType>("text")
  const [activeGroup, setActiveGroup] = useState<"all" | "media" | "data">("all")

  const filtered = CARD_SPECS.filter((spec) => {
    const matchesGroup  = activeGroup === "all" || spec.group === activeGroup
    const q             = search.toLowerCase()
    const matchesSearch = spec.label.toLowerCase().includes(q) || spec.description.toLowerCase().includes(q)
    return matchesGroup && matchesSearch
  })

  // Group filtered specs
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: filtered.filter((s) => s.group === g.id),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full w-full overflow-hidden bg-neutral-50">
      {/* Left nav */}
      <div className="flex flex-col w-72 shrink-0 border-r border-neutral-200 bg-white overflow-hidden">
        {/* Header + search */}
        <div className="px-3 pt-3 pb-2 border-b border-neutral-100 space-y-2 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Card types
          </p>
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] outline-none focus:border-neutral-400 placeholder:text-neutral-400"
          />
        </div>

        {/* Group filter pills */}
        <div className="flex gap-1 px-3 py-2 shrink-0 border-b border-neutral-100 flex-wrap">
          {(["all", ...GROUPS.map((g) => g.id)] as const).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={[
                "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                activeGroup === g
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
              ].join(" ")}
            >
              {g === "all" ? "All" : GROUPS.find((gr) => gr.id === g)?.label}
            </button>
          ))}
        </div>

        {/* Card type list */}
        <div className="flex-1 overflow-y-auto">
          {grouped.map((group) => (
            <div key={group.id}>
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                {group.label}
              </p>
              {group.items.map((spec) => {
                const isActive = spec.cardType === selected
                return (
                  <button
                    key={spec.cardType}
                    onClick={() => setSelected(spec.cardType)}
                    className={[
                      "w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors",
                      isActive
                        ? "bg-neutral-100 border-l-2 border-neutral-900"
                        : "border-l-2 border-transparent hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <spec.Icon
                      size={14}
                      className={isActive ? "text-neutral-900 mt-0.5 shrink-0" : "text-neutral-400 mt-0.5 shrink-0"}
                    />
                    <div className="min-w-0">
                      <p className={[
                        "text-[12px] font-medium leading-tight",
                        isActive ? "text-neutral-900" : "text-neutral-700",
                      ].join(" ")}>
                        {spec.label}
                      </p>
                      <p className="text-[10px] text-neutral-400 leading-snug mt-0.5 line-clamp-2">
                        {spec.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
          {grouped.length === 0 && (
            <p className="px-3 py-4 text-[11px] text-neutral-400 italic">No results.</p>
          )}
        </div>
      </div>

      {/* Main detail area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-8 max-w-2xl">
          <DraggablePreviewCard cardType={selected} />
        </div>
      </div>
    </div>
  )
}
