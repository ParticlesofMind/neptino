"use client"

/**
 * Card Renderer
 *
 * Resolves the correct component for a card via the CardRegistry.
 * Adding a new card type:
 *   1. Create the component in ./card-types/
 *   2. Add an entry in CardRegistry.ts
 *   3. Nothing else — this file never needs to change.
 *
 * mode="editor"  (default) — shown in the coursebuilder canvas
 * mode="preview"           — shown in the student-facing published view
 */

import type { DroppedCard } from "../types"
import { DEFAULT_CARD_REGISTRY, resolveCardRenderer } from "./CardRegistry"
import type { CardRenderProps } from "./CardRegistry"

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardRendererProps {
  card: DroppedCard
  onRemove?: () => void
  /** Render mode — defaults to "editor" */
  mode?: "editor" | "preview"
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardRenderer({ card, onRemove, mode = "editor" }: CardRendererProps) {
  const Component = resolveCardRenderer(DEFAULT_CARD_REGISTRY, card.cardType, mode)

  if (Component) {
    return <Component card={card} onRemove={onRemove} />
  }

  // No registered renderer — use the generic fallback
  return <GenericDomCard card={card} onRemove={onRemove} />
}

// ─── Generic DOM fallback ─────────────────────────────────────────────────────
// Used for card types not yet in the registry (audio, document, table, etc.)

function GenericDomCard({ card, onRemove }: CardRenderProps) {
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
