"use client"

import type { DroppedCard } from "../../types"

interface ImageCardProps {
  card: DroppedCard
  onRemove?: () => void
}

export function ImageCard({ card, onRemove }: ImageCardProps) {
  const url   = typeof card.content["url"]   === "string" ? card.content["url"]   : ""
  const alt   = typeof card.content["alt"]   === "string" ? card.content["alt"]   : ""
  const title = typeof card.content["title"] === "string" ? card.content["title"] : ""

  return (
    <div className="group relative rounded border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-1 top-1 z-10 hidden h-5 w-5 items-center justify-center rounded bg-white/80 text-neutral-400 shadow hover:text-neutral-600 group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt || title || "Image"}
          className="w-full h-auto block"
          style={{ maxHeight: card.dimensions.height || 200 }}
        />
      ) : (
        <div
          className="flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs italic"
          style={{ height: 80 }}
        >
          No image
        </div>
      )}
      {title && (
        <div className="px-2 py-1 text-[10px] text-neutral-500 border-t border-neutral-100">
          {title}
        </div>
      )}
    </div>
  )
}
