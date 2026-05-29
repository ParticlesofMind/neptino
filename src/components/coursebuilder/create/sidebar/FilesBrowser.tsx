"use client"

/**
 * Files Browser (sidebar — Curate mode)
 *
 * Single-column layout:
 *   - Search and category filters at the top
 *   - Draggable card list below
 *
 * Categories follow the reductive taxonomy:
 *   Materials    — atomic media, references, data, and representations
 *   Compositions — assembled cards, learner surfaces, simulations, games, and layouts
 *
 * Layout cards are authored in Add Card. Canvas places authored cards.
 */

import { Search, SlidersHorizontal } from "lucide-react"
import { useState } from "react"
import { MAKE_BLUE_TEXT } from "./make-theme"

import { useMakeLibraryStore } from "../store/makeLibraryStore"
import { DraggableItem, DraggableUserCard } from "./files-browser-draggables"
import { LIBRARY_ITEMS, PURPOSE_FILTERS } from "./files-browser-data"
import { CARD_SPECS, SUBGROUPS, type CardSubgroup } from "./make-panel-data"

// ─── Files Browser ────────────────────────────────────────────────────────────

export function FilesBrowser() {
  const [activePurpose, setActivePurpose] = useState<"all" | CardSubgroup>("all")
  const [search, setSearch] = useState("")

  const studioCards  = useMakeLibraryStore((s) => s.cards)
  const removeCard   = useMakeLibraryStore((s) => s.removeCard)

  const purposeOptions = PURPOSE_FILTERS.compositions
  const cardSpecByType = new Map(CARD_SPECS.map((spec) => [spec.cardType, spec]))
  const query = search.trim().toLowerCase()

  const matchesSearch = (values: Array<string | undefined>) => {
    if (!query) return true
    return values.some((value) => value?.toLowerCase().includes(query))
  }

  const visibleStudio = studioCards.filter((card) => {
    const spec = cardSpecByType.get(card.cardType)
    const matchesText = matchesSearch([card.title, spec?.label, spec?.description])
    return matchesText
  })

  const visible = LIBRARY_ITEMS.filter((item) => {
    const matchesText = matchesSearch([item.title, item.description])
    return (activePurpose === "all" || item.subgroup === activePurpose) && matchesText
  })

  const visibleBySubgroup = SUBGROUPS.compositions
    .map((subgroup) => ({
      ...subgroup,
      items: visible.filter((item) => item.subgroup === subgroup.id),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="flex h-full w-full overflow-hidden border-r border-neutral-200 bg-white">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-neutral-100 bg-gradient-to-b from-neutral-50 to-white px-3 pt-3 pb-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <Search size={14} className="shrink-0 text-neutral-400" />
            <input
              type="search"
              placeholder="Search ready compositions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-w-0 bg-transparent text-[12px] text-neutral-700 outline-none placeholder:text-neutral-400"
            />
            <div className="flex max-w-[12rem] shrink-0 items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-neutral-600 transition-colors focus-within:border-[#9eb9da] focus-within:bg-white">
              <SlidersHorizontal size={12} className="shrink-0 text-neutral-400" />
              <select
                aria-label="Filter card purpose"
                value={activePurpose}
                onChange={(event) => setActivePurpose(event.target.value as "all" | CardSubgroup)}
                className="min-w-0 max-w-[9rem] appearance-none bg-transparent pr-1 text-[10px] font-semibold text-neutral-600 outline-none"
              >
                {purposeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div
          className="flex-1 overflow-y-auto p-2.5"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex flex-col gap-1.5">
            {/* Studio cards (user-created) */}
            {visibleStudio.length > 0 && (
              <>
                <p className={["px-0.5 pb-0.5 pt-1 text-[11px] font-bold uppercase tracking-[0.14em]", MAKE_BLUE_TEXT].join(" ")}>
                  My cards
                </p>
                {visibleStudio.map((card) => (
                  <DraggableUserCard
                    key={card.id}
                    card={card}
                    onRemove={() => removeCard(card.id)}
                  />
                ))}
                <div className="my-1 border-t border-neutral-100" />
              </>
            )}

            {/* Ready-to-go composition presets */}
            {visibleBySubgroup.length > 0 && (
              <p className="px-0.5 pb-0.5 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                Ready compositions
              </p>
            )}
            {visibleBySubgroup.map((subgroup) => (
              <section key={subgroup.id} className="pb-1">
                <div className="px-0.5 pb-1 pt-1.5">
                  <p className="text-[13px] font-bold leading-tight text-foreground/85">{subgroup.label}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-muted-foreground/70">{subgroup.description}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {subgroup.items.map((item) => (
                    <DraggableItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
          {visibleStudio.length === 0 && visibleBySubgroup.length === 0 && (
            <p className="px-3 py-4 text-xs text-neutral-400 italic">
              {search ? "No results." : "Nothing in this category yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
