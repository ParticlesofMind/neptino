"use client"

import type { DroppedCard } from "../../types"

interface TextCardProps {
  card: DroppedCard
  onRemove?: () => void
}

export function TextCard({ card, onRemove }: TextCardProps) {
  const text = typeof card.content["text"] === "string" ? card.content["text"] : ""
  const title = typeof card.content["title"] === "string" ? card.content["title"] : ""

  return (
    <div className="group relative rounded border border-neutral-200 bg-white p-2 text-xs shadow-sm">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-1 top-1 hidden h-4 w-4 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
      {title && (
        <div className="mb-1 font-medium text-neutral-700">{title}</div>
      )}
      <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
        {text || <span className="italic text-neutral-400">Empty text card</span>}
      </p>
    </div>
  )
}
