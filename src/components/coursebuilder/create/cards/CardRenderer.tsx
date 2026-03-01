"use client"

/**
 * Card Renderer
 *
 * Single switch between DOM-rendered card components and canvas-backed
 * components. The decision is driven by `cardRenderMode(card.cardType)`.
 *
 * Adding a new DOM card type → add a case in the DOM branch below.
 * Adding a new canvas card type → add to CANVAS_BACKED_CARD_TYPES in types.ts
 *   and wire up the engine inside RichCard.
 */

import type { DroppedCard } from "../types"
import { cardRenderMode } from "../types"

import { TextCard }  from "./card-types/TextCard"
import { ImageCard } from "./card-types/ImageCard"
import { VideoCard } from "./card-types/VideoCard"
import { RichCard }  from "./card-types/RichCard"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardRendererProps {
  card: DroppedCard
  onRemove?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardRenderer({ card, onRemove }: CardRendererProps) {
  const mode = cardRenderMode(card.cardType)

  // ── Canvas-backed path ─────────────────────────────────────────────────────
  if (mode === "canvas") {
    return <RichCard card={card} onRemove={onRemove} />
  }

  // ── DOM path ───────────────────────────────────────────────────────────────
  switch (card.cardType) {
    case "text":
      return <TextCard  card={card} onRemove={onRemove} />
    case "image":
      return <ImageCard card={card} onRemove={onRemove} />
    case "video":
      return <VideoCard card={card} onRemove={onRemove} />
    case "audio":
    case "document":
    case "table":
    default:
      return <GenericDomCard card={card} onRemove={onRemove} />
  }
}

// ─── Generic DOM fallback ─────────────────────────────────────────────────────

function GenericDomCard({ card, onRemove }: CardRendererProps) {
  const title = typeof card.content["title"] === "string" ? card.content["title"] : card.cardType

  return (
    <div className="group relative flex items-center gap-2 rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs shadow-sm">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
      <span className="text-[10px] px-1 py-0.5 rounded bg-neutral-100 text-neutral-500 uppercase font-medium">
        {card.cardType}
      </span>
      <span className="text-neutral-700 truncate">{title}</span>
    </div>
  )
}
