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
import { GripVertical } from "lucide-react"
import type { CardType, CardId } from "../types"
import type { DragSourceData } from "../hooks/useCardDrop"
import { CardTypePreview } from "../cards/CardTypePreview"
import {
  CARD_SPECS,
  GROUPS,
  SAMPLE_CONTENT,
  type CardSpec,
} from "./make-panel-data"

// ─── Draggable ghost strip ────────────────────────────────────────────────────

function DraggableGhostStrip({ spec }: { spec: CardSpec }) {
  const dragData: DragSourceData = {
    type:     "card",
    cardId:   `new-${spec.cardType}` as CardId,
    cardType: spec.cardType,
    title:    spec.label,
    content:  { title: spec.label },
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `make-ghost-${spec.cardType}`,
    data: dragData,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        "flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-neutral-200",
        "cursor-grab select-none transition-colors",
        isDragging ? "opacity-40 border-neutral-400 bg-neutral-50" : "hover:border-neutral-400 hover:bg-neutral-50",
      ].join(" ")}
    >
      <GripVertical size={14} className="text-neutral-300 shrink-0" />
      <spec.Icon size={16} className="text-neutral-400 shrink-0" />
      <span className="text-[12px] font-medium text-neutral-600">Drag to canvas to place a {spec.label} card</span>
    </div>
  )
}

// ─── Make Panel ───────────────────────────────────────────────────────────────

export function MakePanel() {
  const [search, setSearch]         = useState("")
  const [selected, setSelected]     = useState<CardType>("text")
  const [activeGroup, setActiveGroup] = useState<"all" | "media" | "data">("all")

  const selectedSpec = CARD_SPECS.find((s) => s.cardType === selected)!

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
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 shrink-0">
              <selectedSpec.Icon size={20} className="text-neutral-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 leading-tight">{selectedSpec.label}</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5 capitalize">{selectedSpec.group === "data" ? "Data & Visuals" : selectedSpec.group}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-[12px] text-neutral-500 leading-relaxed mb-5">{selectedSpec.description}</p>

          {/* Card preview */}
          <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">Preview</p>
            <CardTypePreview
              cardType={selected}
              content={SAMPLE_CONTENT[selected] ?? {}}
            />
          </div>

          {/* Drag zone */}
          <DraggableGhostStrip spec={selectedSpec} />

          <p className="mt-3 text-[10px] text-neutral-400">
            Drag the card above onto the canvas, or switch to Curate to arrange your lesson.
          </p>
        </div>
      </div>
    </div>
  )
}
