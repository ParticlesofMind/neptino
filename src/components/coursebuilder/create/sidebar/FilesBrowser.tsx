"use client"

/**
 * Files Browser (sidebar)
 *
 * Two-column layout matching the original coursebuilder design:
 *   - Narrow icon rail on the left for category switching
 *   - Content list on the right (search + draggable items)
 */

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import {
  FolderOpen,
  ImageIcon,
  Video,
  Music,
  Type,
  Puzzle,
  Link2,
  Gamepad2,
  BarChart2,
} from "lucide-react"
import type { CardType, CardId } from "../types"
import type { DragSourceData } from "../hooks/useCardDrop"

// ─── Categories ───────────────────────────────────────────────────────────────

interface Category {
  id:    string
  label: string
  Icon:  React.ComponentType<{ size?: number; strokeWidth?: number }>
  types: CardType[] | "all"
}

const CATEGORIES: Category[] = [
  { id: "files",   label: "Files",   Icon: FolderOpen, types: "all"                       },
  { id: "images",  label: "Images",  Icon: ImageIcon,  types: ["image"]                   },
  { id: "videos",  label: "Videos",  Icon: Video,      types: ["video"]                   },
  { id: "audio",   label: "Audio",   Icon: Music,      types: ["audio"]                   },
  { id: "text",    label: "Text",    Icon: Type,       types: ["text", "document"]        },
  { id: "plugins", label: "Plugins", Icon: Puzzle,     types: ["interactive", "rich-sim"] },
  { id: "links",   label: "Links",   Icon: Link2,      types: []                          },
  { id: "games",   label: "Games",   Icon: Gamepad2,   types: ["village-3d"]              },
  { id: "graphs",  label: "Graphs",  Icon: BarChart2,  types: ["table"]                   },
]

// ─── Mock library items ───────────────────────────────────────────────────────

interface LibraryItem {
  id:       CardId
  cardType: CardType
  label:    string   // small category label shown below the title
  title:    string
}

const MOCK_ITEMS: LibraryItem[] = [
  { id: "c-dataset-1"    as CardId, cardType: "document",   label: "Dataset",               title: "Amazon Rainforest Species Dataset"        },
  { id: "c-3d-1"         as CardId, cardType: "village-3d", label: "3D Model",              title: "Machu Picchu 3D Reconstruction"           },
  { id: "c-timeline-1"   as CardId, cardType: "interactive",label: "Timeline",              title: "Apollo 11 Mission Timeline"              },
  { id: "c-timeline-2"   as CardId, cardType: "interactive",label: "Timeline",              title: "Enlightenment Movement Timeline"          },
  { id: "c-narr-1"       as CardId, cardType: "text",       label: "Narrative",             title: "Marie Curie: A Life of Discovery"         },
  { id: "c-narr-2"       as CardId, cardType: "text",       label: "Narrative",             title: "Leonardo da Vinci: Renaissance Genius"    },
  { id: "c-doc-1"        as CardId, cardType: "video",      label: "Documentary",           title: "Evolution: Darwin's Revolutionary Theory" },
  { id: "c-sim-1"        as CardId, cardType: "rich-sim",   label: "Simulation",            title: "Photosynthesis Process Simulation"        },
  { id: "c-profile-1"    as CardId, cardType: "document",   label: "Profile",               title: "United Nations: Organizational Profile"  },
  { id: "c-game-1"       as CardId, cardType: "village-3d", label: "Game",                  title: "Printing Press Story Game"               },
  { id: "c-exercise-1"   as CardId, cardType: "interactive",label: "Exercise",              title: "Photosynthesis Equation Practice"         },
  { id: "c-exercise-2"   as CardId, cardType: "interactive",label: "Exercise",              title: "Relativity Problem Set"                  },
  { id: "c-quiz-1"       as CardId, cardType: "interactive",label: "Quiz",                  title: "French Revolution Knowledge Quiz"         },
  { id: "c-quiz-2"       as CardId, cardType: "interactive",label: "Quiz",                  title: "Marie Curie: Life and Discoveries Quiz"   },
  { id: "c-assess-1"     as CardId, cardType: "document",   label: "Assessment",            title: "Enlightenment Movement Essay Assessment" },
  { id: "c-assess-2"     as CardId, cardType: "document",   label: "Assessment",            title: "Theory of Evolution: Research Assessment"},
  { id: "c-inter-1"      as CardId, cardType: "interactive",label: "Interactive Simulation", title: "Interactive Photosynthesis Lab"          },
  { id: "c-inter-2"      as CardId, cardType: "interactive",label: "Interactive Simulation", title: "Build Your Own Printing Press"           },
  { id: "c-game-2"       as CardId, cardType: "village-3d", label: "Game",                  title: "Apollo 11 Mission Control Game"          },
  { id: "c-audio-1"      as CardId, cardType: "audio",      label: "Audio",                 title: "Shakespeare in Conversation"             },
  { id: "c-img-1"        as CardId, cardType: "image",      label: "Image",                 title: "Renaissance Art Collection"             },
  { id: "c-vid-1"        as CardId, cardType: "video",      label: "Video",                 title: "The French Revolution Explained"         },
  { id: "c-table-1"      as CardId, cardType: "table",      label: "Data Table",            title: "Climate Data 1850–2024"                  },
]

// ─── Draggable card item ──────────────────────────────────────────────────────

function DraggableItem({ item }: { item: LibraryItem }) {
  const dragData: DragSourceData = {
    type:     "card",
    cardId:   item.id,
    cardType: item.cardType,
    title:    item.title,
    content:  { title: item.title },
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id:   `drag-${item.id}`,
    data: dragData,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        "px-3 py-2 cursor-grab select-none rounded-sm",
        "hover:bg-neutral-100 transition-colors",
        isDragging ? "opacity-40 bg-neutral-100" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-[12px] font-medium text-neutral-800 leading-tight truncate">
        {item.title}
      </p>
      <p className="text-[10px] text-neutral-400 mt-0.5">{item.label}</p>
    </div>
  )
}

// ─── Icon rail button ─────────────────────────────────────────────────────────

function RailButton({
  cat,
  isActive,
  onClick,
}: {
  cat: Category
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={cat.label}
      className={[
        "flex flex-col items-center gap-1 w-full py-3 transition-colors border-l-2",
        isActive
          ? "border-neutral-900 bg-neutral-100 text-neutral-900"
          : "border-transparent text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50",
      ].join(" ")}
    >
      <cat.Icon size={18} strokeWidth={1.5} />
      <span className="text-[9px] leading-none font-medium">{cat.label}</span>
    </button>
  )
}

// ─── Files Browser ────────────────────────────────────────────────────────────

export function FilesBrowser() {
  const [activeCategory, setActiveCategory] = useState<string>("files")
  const [search, setSearch]                 = useState("")

  const cat     = CATEGORIES.find((c) => c.id === activeCategory)!
  const visible = MOCK_ITEMS.filter((item) => {
    const matchesType = cat.types === "all" || (cat.types as CardType[]).includes(item.cardType)
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  return (
    <div className="flex h-full w-full overflow-hidden border-r border-neutral-200 bg-white">
      {/* Narrow icon rail */}
      <div className="flex flex-col w-12 shrink-0 border-r border-neutral-100 overflow-y-auto">
        {CATEGORIES.map((c) => (
          <RailButton
            key={c.id}
            cat={c}
            isActive={activeCategory === c.id}
            onClick={() => setActiveCategory(c.id)}
          />
        ))}
      </div>

      {/* Content list */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Search */}
        <div className="px-2 py-2 border-b border-neutral-100">
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] outline-none focus:border-neutral-400 placeholder:text-neutral-400"
          />
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {visible.map((item) => (
            <DraggableItem key={item.id} item={item} />
          ))}
          {visible.length === 0 && (
            <p className="px-3 py-4 text-xs text-neutral-400 italic">
              {search ? "No results." : "Nothing in this category yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

