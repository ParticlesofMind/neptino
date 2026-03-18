"use client"

import { useDraggable } from "@dnd-kit/core"
import { X } from "lucide-react"

import { CARD_TYPE_META } from "../cards/CardTypePreview"
import type { DragSourceData } from "../hooks/useCardDrop"
import type { StudioCard } from "../store/makeLibraryStore"
import type { CardId } from "../types"
import { getSampleCardContent } from "../utils/cardDefaults"
import {
  CARD_TYPE_COLORS,
  type LibraryItem,
  TYPE_ICONS,
  TYPE_LABEL,
} from "./files-browser-data"
import { MAKE_BLUE_SUBTLE_SURFACE, MAKE_BLUE_SUBTLE_SURFACE_HOVER, MAKE_BLUE_TEXT } from "./make-theme"

export function DraggableUserCard({ card, onRemove }: { card: StudioCard; onRemove: () => void }) {
  const dragData: DragSourceData = {
    type: "card",
    cardId: card.id as CardId,
    cardType: card.cardType,
    title: card.title,
    content: card.content,
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drag-studio-${card.id}`,
    data: dragData,
  })

  const meta = CARD_TYPE_META[card.cardType]
  const colors = CARD_TYPE_COLORS[card.cardType]
  const Icon = TYPE_ICONS[card.cardType] ?? meta.icon
  const typeLabel = TYPE_LABEL[card.cardType] ?? meta.label

  return (
    <div className="relative group">
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={[
          `flex items-center gap-2.5 rounded-lg border px-2 py-2.5 ${MAKE_BLUE_SUBTLE_SURFACE}`,
          "cursor-grab select-none transition-all",
          `${MAKE_BLUE_SUBTLE_SURFACE_HOVER} hover:shadow-sm`,
          isDragging ? "opacity-40 shadow-md" : "",
        ].filter(Boolean).join(" ")}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
          <Icon size={18} className={colors.text} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-neutral-800 leading-tight line-clamp-2">{card.title}</p>
          <p className={["mt-0.5 text-[9px] uppercase tracking-wide font-semibold", MAKE_BLUE_TEXT].join(" ")}>{typeLabel}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove block"
        className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 hover:bg-destructive/10 hover:text-destructive group-hover:flex transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  )
}

export function DraggableItem({ item }: { item: LibraryItem }) {
  const dragData: DragSourceData = {
    type: "card",
    cardId: item.id,
    cardType: item.cardType,
    title: item.title,
    content: getSampleCardContent(item.cardType, item.title),
  }

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drag-${item.id}`,
    data: dragData,
  })

  const meta = CARD_TYPE_META[item.cardType]
  const colors = CARD_TYPE_COLORS[item.cardType]
  const Icon = TYPE_ICONS[item.cardType] ?? meta.icon
  const typeLabel = TYPE_LABEL[item.cardType] ?? meta.label

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        "flex items-center gap-2.5 rounded-lg border border-border px-2 py-2.5",
        "cursor-grab select-none transition-all bg-background",
        "hover:border-border/70 hover:shadow-sm",
        isDragging ? "opacity-40 shadow-md" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
        <Icon size={18} className={colors.text} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground leading-tight line-clamp-2">{item.title}</p>
        <p className="mt-0.5 text-[9px] uppercase tracking-wide font-semibold text-muted-foreground/70">{typeLabel}</p>
      </div>
    </div>
  )
}