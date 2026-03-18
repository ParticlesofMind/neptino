"use client"

/**
 * Files Browser (sidebar — Curate mode)
 *
 * Single-column layout:
 *   - Search and category filters at the top
 *   - Draggable block list below
 *
 * Categories follow the 3+1 taxonomy:
 *   All         — every block
 *   Resources   — passive reference and display blocks
 *   Tools       — interactive instruments learners use
 *   Experiences — composed learning units
 *   Layout      — structural arrangements
 */

import { Search } from "lucide-react"
import { useState } from "react"
import { MAKE_BLUE_TEXT } from "./make-theme"

import { useMakeLibraryStore } from "../store/makeLibraryStore"
import { useCourseStore } from "../store/courseStore"
import type { CardType } from "../types"
import { CategoryButton } from "./files-browser-filters"
import { DraggableItem, DraggableUserCard } from "./files-browser-draggables"
import { CATEGORIES, LIBRARY_ITEMS } from "./files-browser-data"

// ─── Files Browser ────────────────────────────────────────────────────────────

export function FilesBrowser() {
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [search, setSearch] = useState("")

  const studioCards  = useMakeLibraryStore((s) => s.cards)
  const removeCard   = useMakeLibraryStore((s) => s.removeCard)

  const sessions = useCourseStore((s) => s.sessions)
  const needsLayoutHint = !sessions.some((session) =>
    session.topics.some((topic) =>
      topic.objectives.some((obj) =>
        obj.tasks.some((task) =>
          task.droppedCards.some((c) => c.cardType.startsWith("layout-"))
        )
      )
    )
  )

  const cat = CATEGORIES.find((c) => c.id === activeCategory)!

  const visibleStudio = studioCards.filter((card) => {
    const matchesType   = cat.types === "all" || (cat.types as CardType[]).includes(card.cardType)
    const matchesSearch = card.title.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  const visible = LIBRARY_ITEMS.filter((item) => {
    const matchesType   = cat.types === "all" || (cat.types as CardType[]).includes(item.cardType)
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  const totalVisible = visibleStudio.length + visible.length

  return (
    <div className="flex h-full w-full overflow-hidden border-r border-neutral-200 bg-white">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-neutral-100 bg-gradient-to-b from-neutral-50 to-white px-3 pt-3 pb-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <Search size={14} className="shrink-0 text-neutral-400" />
            <input
              type="search"
              placeholder="Search blocks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[11px] text-neutral-700 outline-none placeholder:text-neutral-400"
            />
            <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500">
              {totalVisible}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <CategoryButton
                key={c.id}
                cat={c}
                isActive={activeCategory === c.id}
                needsLayout={needsLayoutHint}
                onClick={() => setActiveCategory(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Items list */}
        <div
          className="flex-1 overflow-y-auto p-2.5"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Layout guidance banner ──────────────────────────────── */}
          {needsLayoutHint && activeCategory !== "layout" && (
            <button
              type="button"
              onClick={() => setActiveCategory("layout")}
              className="mb-2 w-full rounded border border-[#a89450]/30 bg-[#a89450]/5 px-2 py-1.5 text-left text-[9px] text-[#7a6010] transition-colors hover:bg-[#a89450]/10"
            >
              Start by placing a layout block. <span className="underline">Go to Layout</span>
            </button>
          )}
          <div className="flex flex-col gap-1.5">
            {/* Studio cards (user-created) */}
            {visibleStudio.length > 0 && (
              <>
                <p className={["px-0.5 pt-1 pb-0.5 text-[8px] font-bold uppercase tracking-widest", MAKE_BLUE_TEXT].join(" ")}>
                  My blocks
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

            {/* Library items */}
            {visible.map((item) => (
              <DraggableItem key={item.id} item={item} />
            ))}
          </div>
          {visibleStudio.length === 0 && visible.length === 0 && (
            <p className="px-3 py-4 text-xs text-neutral-400 italic">
              {search ? "No results." : "Nothing in this category yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
