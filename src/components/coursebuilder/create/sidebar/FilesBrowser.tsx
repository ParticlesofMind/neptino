"use client"

/**
 * Files Browser (sidebar — Curate mode)
 *
 * Two-panel layout:
 *   - Narrow icon rail on the left for category switching
 *   - Search + draggable card list (single column) on the right
 *
 * Categories mirror CARD-HIERARCHY.md:
 *   All       — everything
 *   Media     — Layer 2: text, image, audio, video, animation, model-3d, document
 *   Data      — Layer 3 structured views: map, chart, diagram, table, dataset
 *   Products  — Layer 3 assembled/passive: chat, text-editor, code-editor, whiteboard, rich-sim
 *   Activities — Layer 4: interactive (quiz), games
 */

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import {
  AudioLines,
  BarChart2,
  Bot,
  Box,
  Code2,
  Columns2,
  Columns3,
  Database,
  FileText,
  Film,
  FolderOpen,
  Gamepad2,
  Grid3X3,
  Grid3x2,
  HelpCircle,
  ImageIcon,
  Layout,
  LayoutDashboard,
  LayoutGrid,
  LayoutPanelLeft,
  LayoutPanelTop,
  LayoutTemplate,
  Layers,
  LineChart,
  Map as MapIcon,
  Network,
  PanelLeft,
  PanelLeftOpen,
  PenTool,
  PlayCircle,
  Rows2,
  Rows3,
  Sparkles,
  Table2,
  X,
} from "lucide-react"
import type { CardType, CardId } from "../types"
import type { DragSourceData } from "../hooks/useCardDrop"
import { getSampleCardContent } from "../utils/cardDefaults"
import { CARD_TYPE_META } from "../cards/CardTypePreview"
import { useMakeLibraryStore, type StudioCard } from "../store/makeLibraryStore"
import { useCourseStore } from "../store/courseStore"

// ─── Categories — aligned with CARD-HIERARCHY.md ──────────────────────────────

interface Category {
  id:    string
  label: string
  Icon:  React.ComponentType<{ size?: number; strokeWidth?: number }>
  types: CardType[] | "all"
}

const CATEGORIES: Category[] = [
  {
    id: "all",
    label: "All",
    Icon: FolderOpen,
    types: "all",
  },
  {
    id: "media",
    label: "Media",
    Icon: Layers,
    types: ["text", "image", "audio", "video", "animation", "model-3d", "document"],
  },
  {
    id: "data",
    label: "Data",
    Icon: BarChart2,
    types: ["map", "chart", "diagram", "table", "dataset"],
  },
  {
    id: "products",
    label: "Products",
    Icon: Sparkles,
    types: ["chat", "text-editor", "code-editor", "whiteboard", "rich-sim", "village-3d"],
  },
  {
    id: "activities",
    label: "Activities",
    Icon: Gamepad2,
    types: ["interactive", "games"],
  },
  {
    id: "layout",
    label: "Layout",
    Icon: LayoutGrid,
    types: ["layout-split", "layout-stack", "layout-feature", "layout-sidebar", "layout-quad", "layout-mosaic", "layout-triptych", "layout-trirow", "layout-banner", "layout-broadside", "layout-tower", "layout-pinboard", "layout-annotated", "layout-sixgrid"],
  },
]

// ─── Library items ─────────────────────────────────────────────────────────────
// Every item uses the real CardType that backs it. Types that don't exist as
// cards yet (Timeline, Exercise, Profile, etc.) are not included — they will
// appear once the cards are built.

interface LibraryItem {
  id:       CardId
  cardType: CardType
  title:    string
}

const LIBRARY_ITEMS: LibraryItem[] = [
  // ── Media — Text ────────────────────────────────────────────────────────────
  { id: "lib-text-1"    as CardId, cardType: "text",      title: "Marie Curie: A Life of Discovery"         },
  { id: "lib-text-2"    as CardId, cardType: "text",      title: "Leonardo da Vinci: Renaissance Genius"    },
  { id: "lib-text-3"    as CardId, cardType: "text",      title: "The French Revolution: Causes and Effects" },
  { id: "lib-text-4"    as CardId, cardType: "text",      title: "Natural Selection Explained"              },

  // ── Media — Image ───────────────────────────────────────────────────────────
  { id: "lib-img-1"     as CardId, cardType: "image",     title: "Renaissance Art Collection"               },
  { id: "lib-img-2"     as CardId, cardType: "image",     title: "Cell Division Diagram"                    },
  { id: "lib-img-3"     as CardId, cardType: "image",     title: "Ottoman Empire Territory Map (1683)"      },

  // ── Media — Audio ───────────────────────────────────────────────────────────
  { id: "lib-audio-1"   as CardId, cardType: "audio",     title: "Shakespeare in Conversation"              },
  { id: "lib-audio-2"   as CardId, cardType: "audio",     title: "Lecture: Cell Division"                   },

  // ── Media — Video ───────────────────────────────────────────────────────────
  { id: "lib-vid-1"     as CardId, cardType: "video",     title: "The French Revolution Explained"          },
  { id: "lib-vid-2"     as CardId, cardType: "video",     title: "Evolution: Darwin's Theory"               },
  { id: "lib-vid-3"     as CardId, cardType: "video",     title: "Apollo 11 Launch Footage"                 },

  // ── Media — Animation ───────────────────────────────────────────────────────
  { id: "lib-anim-1"    as CardId, cardType: "animation", title: "Mitosis — Cell Division"                  },
  { id: "lib-anim-2"    as CardId, cardType: "animation", title: "Plate Tectonics Over 250 Million Years"   },

  // ── Media — 3D Model ────────────────────────────────────────────────────────
  { id: "lib-3d-1"      as CardId, cardType: "model-3d",  title: "Machu Picchu 3D Reconstruction"           },
  { id: "lib-3d-2"      as CardId, cardType: "model-3d",  title: "Human Skull — Anatomical Model"           },

  // ── Media — Document ────────────────────────────────────────────────────────
  { id: "lib-doc-1"     as CardId, cardType: "document",  title: "Newton's Principia Mathematica (excerpt)" },
  { id: "lib-doc-2"     as CardId, cardType: "document",  title: "Declaration of Independence (1776)"       },
  { id: "lib-doc-3"     as CardId, cardType: "document",  title: "Darwin's On the Origin of Species"        },

  // ── Data — Map ──────────────────────────────────────────────────────────────
  { id: "lib-map-1"     as CardId, cardType: "map",       title: "World Population Density"                 },
  { id: "lib-map-2"     as CardId, cardType: "map",       title: "Ottoman Empire at Peak Extent"            },
  { id: "lib-map-3"     as CardId, cardType: "map",       title: "Amazon Rainforest Coverage"               },

  // ── Data — Chart ────────────────────────────────────────────────────────────
  { id: "lib-chart-1"   as CardId, cardType: "chart",     title: "Global Temperature Anomaly 1880–2020"     },
  { id: "lib-chart-2"   as CardId, cardType: "chart",     title: "CO₂ Emissions by Country (2023)"          },
  { id: "lib-chart-3"   as CardId, cardType: "chart",     title: "Human Population Growth 1800–2100"        },

  // ── Data — Diagram ──────────────────────────────────────────────────────────
  { id: "lib-diag-1"    as CardId, cardType: "diagram",   title: "Krebs Cycle"                              },
  { id: "lib-diag-2"    as CardId, cardType: "diagram",   title: "French Revolution — Cause & Effect"       },
  { id: "lib-diag-3"    as CardId, cardType: "diagram",   title: "OSI Network Model"                        },

  // ── Data — Table ────────────────────────────────────────────────────────────
  { id: "lib-table-1"   as CardId, cardType: "table",     title: "Climate Data 1850–2024"                   },
  { id: "lib-table-2"   as CardId, cardType: "table",     title: "Periodic Table — First 20 Elements"       },
  { id: "lib-table-3"   as CardId, cardType: "table",     title: "WW2 Casualties by Country"                },

  // ── Data — Dataset ──────────────────────────────────────────────────────────
  { id: "lib-ds-1"      as CardId, cardType: "dataset",   title: "Amazon Rainforest Species Dataset"        },
  { id: "lib-ds-2"      as CardId, cardType: "dataset",   title: "NASA Exoplanet Archive (CSV)"             },

  // ── Products — Simulation ────────────────────────────────────────────────────
  { id: "lib-chat-product-1" as CardId, cardType: "chat",        title: "Chat with Darwin"                         },
  { id: "lib-chat-product-2" as CardId, cardType: "chat",        title: "Ada Lovelace Coding Mentor"              },
  { id: "lib-text-editor-1"  as CardId, cardType: "text-editor", title: "Writing studio"                           },
  { id: "lib-code-editor-1"  as CardId, cardType: "code-editor", title: "Code lab"                                 },
  { id: "lib-whiteboard-1"   as CardId, cardType: "whiteboard",  title: "Systems whiteboard"                       },
  { id: "lib-sim-1"     as CardId, cardType: "rich-sim",  title: "Photosynthesis Process Simulation"        },
  { id: "lib-sim-2"     as CardId, cardType: "rich-sim",  title: "Newton's Cradle — Momentum Lab"           },
  { id: "lib-sim-3"     as CardId, cardType: "rich-sim",  title: "Wave Interference Simulator"              },

  // ── Activities — Quiz ────────────────────────────────────────────────────────
  { id: "lib-quiz-1"    as CardId, cardType: "interactive", title: "French Revolution Knowledge Quiz"        },
  { id: "lib-quiz-2"    as CardId, cardType: "interactive", title: "Marie Curie: Life and Discoveries Quiz" },
  { id: "lib-quiz-3"    as CardId, cardType: "interactive", title: "Photosynthesis Equation Quiz"           },
  { id: "lib-quiz-4"    as CardId, cardType: "interactive", title: "Relativity: True or False"              },

  // ── Activities — Game ────────────────────────────────────────────────────────
  { id: "lib-game-1"    as CardId, cardType: "games",     title: "Cell Biology Vocabulary Match"            },
  { id: "lib-game-2"    as CardId, cardType: "games",     title: "Apollo 11 Mission Sequence"               },
  { id: "lib-game-3"    as CardId, cardType: "games",     title: "Periodic Elements Memory Game"            },

  // ── Layout ──────────────────────────────────────────────────────────
  { id: "lib-layout-split"   as CardId, cardType: "layout-split",   title: "Split — Two Equal Columns"          },
  { id: "lib-layout-stack"   as CardId, cardType: "layout-stack",   title: "Stack — Primary / Secondary Rows"   },
  { id: "lib-layout-feature" as CardId, cardType: "layout-feature", title: "Feature — Anchor + Content + Strip" },
  { id: "lib-layout-sidebar" as CardId, cardType: "layout-sidebar", title: "Sidebar — 30 / 70 Columns"         },
  { id: "lib-layout-quad"    as CardId, cardType: "layout-quad",    title: "Quad — 2 × 2 Grid"                },
  { id: "lib-layout-mosaic"     as CardId, cardType: "layout-mosaic",     title: "Mosaic — 3 × 3 Grid"                        },
  { id: "lib-layout-triptych"   as CardId, cardType: "layout-triptych",   title: "Triptych — Three Equal Columns"             },
  { id: "lib-layout-trirow"     as CardId, cardType: "layout-trirow",     title: "Trirow — Header / Body / Footer"             },
  { id: "lib-layout-banner"     as CardId, cardType: "layout-banner",     title: "Banner — Full-Width Header + Two Columns"   },
  { id: "lib-layout-broadside"  as CardId, cardType: "layout-broadside",  title: "Broadside — Full-Width Header + Three Cols" },
  { id: "lib-layout-tower"      as CardId, cardType: "layout-tower",      title: "Tower — Wide Feature + Three Side Panels"  },
  { id: "lib-layout-pinboard"   as CardId, cardType: "layout-pinboard",   title: "Pinboard — Header + 2 × 2 Cards"           },
  { id: "lib-layout-annotated"  as CardId, cardType: "layout-annotated",  title: "Annotated — Margin Notes + 2 × 2 Grid"     },
  { id: "lib-layout-sixgrid"    as CardId, cardType: "layout-sixgrid",    title: "Six-Grid — 3 × 2 Storyboard"              },]

// ─── Card-type colour palette ─────────────────────────────────────────────────

const CARD_TYPE_COLORS: Record<CardType, { bg: string; text: string }> = {
  text:         { bg: "bg-blue-50",    text: "text-blue-500"   },
  image:        { bg: "bg-emerald-50", text: "text-emerald-500" },
  audio:        { bg: "bg-orange-50",  text: "text-orange-500" },
  video:        { bg: "bg-violet-50",  text: "text-violet-500" },
  animation:    { bg: "bg-pink-50",    text: "text-pink-500"   },
  dataset:      { bg: "bg-sky-50",     text: "text-sky-500"    },
  "model-3d":   { bg: "bg-amber-50",   text: "text-amber-500"  },
  map:          { bg: "bg-teal-50",    text: "text-teal-500"   },
  chart:        { bg: "bg-cyan-50",    text: "text-cyan-600"   },
  diagram:      { bg: "bg-indigo-50",  text: "text-indigo-500" },
  media:        { bg: "bg-purple-50",  text: "text-purple-500" },
  document:     { bg: "bg-slate-100",  text: "text-slate-500"  },
  table:        { bg: "bg-cyan-50",    text: "text-cyan-600"   },
  "rich-sim":   { bg: "bg-amber-50",   text: "text-amber-600"  },
  "village-3d": { bg: "bg-amber-50",   text: "text-amber-500"  },
  interactive:  { bg: "bg-teal-50",    text: "text-teal-500"   },
  games:        { bg: "bg-violet-50",  text: "text-violet-500" },
  chat:         { bg: "bg-rose-50",    text: "text-rose-500"   },
  "text-editor": { bg: "bg-sky-50",  text: "text-sky-600"    },
  "code-editor": { bg: "bg-slate-100", text: "text-slate-700" },
  whiteboard:   { bg: "bg-emerald-50", text: "text-emerald-600" },
  timeline:     { bg: "bg-sky-50",     text: "text-sky-600"    },
  legend:       { bg: "bg-emerald-50", text: "text-emerald-600" },
  // ── Layout containers ─────────────────────────────────────────────────
  "layout-split":   { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-stack":   { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-feature": { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-sidebar": { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-quad":    { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-mosaic":    { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-triptych":  { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-trirow":    { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-banner":    { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-broadside": { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-tower":     { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-pinboard":  { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-annotated": { bg: "bg-neutral-100", text: "text-neutral-500" },
  "layout-sixgrid":   { bg: "bg-neutral-100", text: "text-neutral-500" },
}

// ─── Card type label overrides for the browser (shorter than CardTypeMeta) ────

const TYPE_LABEL: Partial<Record<CardType, string>> = {
  "rich-sim":    "Simulation",
  "village-3d":  "3D Scene",
  "interactive": "Quiz",
  "text-editor": "Text Editor",
  "code-editor": "Code Editor",
  whiteboard: "Whiteboard",
  "layout-split":   "Split",
  "layout-stack":   "Stack",
  "layout-feature": "Feature",
  "layout-sidebar": "Sidebar",
  "layout-quad":    "Quad",
  "layout-mosaic":    "Mosaic",
  "layout-triptych":  "Triptych",
  "layout-trirow":    "Trirow",
  "layout-banner":    "Banner",
  "layout-broadside": "Broadside",
  "layout-tower":     "Tower",
  "layout-pinboard":  "Pinboard",
  "layout-annotated": "Annotated",
  "layout-sixgrid":   "Six-Grid",
}

// ─── Card type icons for the "type" column in the browser ─────────────────────

const TYPE_ICONS: Partial<Record<CardType, React.ComponentType<{ size?: number; className?: string }>>> = {
  text:        FileText,
  image:       ImageIcon,
  audio:       AudioLines,
  video:       PlayCircle,
  animation:   Film,
  "model-3d":  Box,
  document:    FileText,
  map:         MapIcon,
  chart:       LineChart,
  diagram:     Network,
  table:       Table2,
  dataset:     Database,
  "rich-sim":  Sparkles,
  interactive: HelpCircle,
  games:       Gamepad2,
  chat:        Bot,
  "text-editor": FileText,
  "code-editor": Code2,
  whiteboard: PenTool,
  // Layout containers
  "layout-split":   Columns2,
  "layout-stack":   Rows2,
  "layout-feature": Layout,
  "layout-sidebar": PanelLeft,
  "layout-quad":    LayoutGrid,
  "layout-mosaic":    Grid3X3,
  "layout-triptych":  Columns3,
  "layout-trirow":    Rows3,
  "layout-banner":    LayoutPanelTop,
  "layout-broadside": LayoutTemplate,
  "layout-tower":     LayoutPanelLeft,
  "layout-pinboard":  LayoutDashboard,
  "layout-annotated": PanelLeftOpen,
  "layout-sixgrid":   Grid3x2,
}

// ─── Draggable user-created card (from Make studio) ──────────────────────────

function DraggableUserCard({ card, onRemove }: { card: StudioCard; onRemove: () => void }) {
  const dragData: DragSourceData = {
    type:     "card",
    cardId:   card.id as CardId,
    cardType: card.cardType,
    title:    card.title,
    content:  card.content,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `drag-studio-${card.id}`,
    data: dragData,
  })

  const meta   = CARD_TYPE_META[card.cardType]
  const colors = CARD_TYPE_COLORS[card.cardType]
  const Icon   = TYPE_ICONS[card.cardType] ?? meta.icon
  const typeLabel = TYPE_LABEL[card.cardType] ?? meta.label

  return (
    <div className="relative group">
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={[
          "flex items-center gap-2.5 rounded-lg border border-[#4a94ff]/30 bg-[#4a94ff]/5 px-2 py-2.5",
          "cursor-grab select-none transition-all",
          "hover:border-[#4a94ff]/50 hover:shadow-sm",
          isDragging ? "opacity-40 shadow-md" : "",
        ].filter(Boolean).join(" ")}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
          <Icon size={18} className={colors.text} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-neutral-800 leading-tight line-clamp-2">
            {card.title}
          </p>
          <p className="mt-0.5 text-[9px] uppercase tracking-wide font-semibold text-[#4a94ff]">
            {typeLabel}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove card"
        className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 hover:bg-red-100 hover:text-red-500 group-hover:flex transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  )
}

// ─── Draggable item ───────────────────────────────────────────────────────────

function DraggableItem({ item }: { item: LibraryItem }) {
  const dragData: DragSourceData = {
    type:     "card",
    cardId:   item.id,
    cardType: item.cardType,
    title:    item.title,
    content:  getSampleCardContent(item.cardType, item.title),
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `drag-${item.id}`,
    data: dragData,
  })

  const meta   = CARD_TYPE_META[item.cardType]
  const colors = CARD_TYPE_COLORS[item.cardType]
  const Icon   = TYPE_ICONS[item.cardType] ?? meta.icon

  const typeLabel = TYPE_LABEL[item.cardType] ?? meta.label

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        "flex items-center gap-2.5 rounded-lg border border-neutral-200 px-2 py-2.5",
        "cursor-grab select-none transition-all bg-white",
        "hover:border-neutral-300 hover:shadow-sm",
        isDragging ? "opacity-40 shadow-md" : "",
      ].filter(Boolean).join(" ")}
    >
      {/* Icon thumbnail */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
        <Icon size={18} className={colors.text} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-neutral-800 leading-tight line-clamp-2">
          {item.title}
        </p>
        <p className="mt-0.5 text-[9px] uppercase tracking-wide font-semibold text-neutral-400">
          {typeLabel}
        </p>
      </div>
    </div>
  )
}

// ─── Icon rail button ─────────────────────────────────────────────────────────

function RailButton({
  cat,
  isActive,
  needsLayout,
  onClick,
}: {
  cat: Category
  isActive: boolean
  needsLayout?: boolean
  onClick: () => void
}) {
  const highlight = cat.id === "layout" && needsLayout
  return (
    <button
      onClick={onClick}
      title={cat.label}
      className={[
        "relative flex flex-col items-center gap-1 w-full py-2 transition-colors border-l-2",
        isActive
          ? "border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d]"
          : highlight
            ? "border-amber-400 bg-amber-50 text-amber-600"
            : "border-transparent text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50",
      ].join(" ")}
    >
      <cat.Icon size={17} strokeWidth={1.5} />
      <span className="text-[8px] leading-none font-medium">{cat.label}</span>
      {highlight && (
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
      )}
    </button>
  )
}

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

  return (
    <div className="flex h-full w-full overflow-hidden border-r border-neutral-200 bg-white">
      {/* Narrow icon rail */}
      <div
        className="flex flex-col w-12 shrink-0 border-r border-neutral-100 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {CATEGORIES.map((c) => (
          <RailButton
            key={c.id}
            cat={c}
            isActive={activeCategory === c.id}
            needsLayout={needsLayoutHint}
            onClick={() => setActiveCategory(c.id)}
          />
        ))}
      </div>

      {/* Content column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Category label + search */}
        <div className="px-2 pt-2 pb-1.5 border-b border-neutral-100 shrink-0 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 px-0.5">
            {cat.label === "All" ? "All cards" : cat.label}
            <span className="ml-1.5 font-normal text-neutral-300">({visibleStudio.length + visible.length})</span>
          </p>
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] outline-none focus:border-neutral-400 placeholder:text-neutral-400"
          />
        </div>

        {/* Items list */}
        <div
          className="flex-1 overflow-y-auto p-2"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Layout guidance banner ──────────────────────────────── */}
          {needsLayoutHint && activeCategory !== "layout" && (
            <button
              type="button"
              onClick={() => setActiveCategory("layout")}
              className="mb-2 w-full rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-left text-[9px] text-amber-700 transition-colors hover:bg-amber-100"
            >
              Start by placing a layout container. <span className="underline">Go to Layouts</span>
            </button>
          )}
          <div className="flex flex-col gap-1.5">
            {/* Studio cards (user-created) */}
            {visibleStudio.length > 0 && (
              <>
                <p className="px-0.5 pt-1 pb-0.5 text-[8px] font-bold uppercase tracking-widest text-[#4a94ff]">
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
