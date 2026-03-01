"use client"

import type { DroppedCard } from "../../types"

interface VideoCardProps {
  card: DroppedCard
  onRemove?: () => void
}

export function VideoCard({ card, onRemove }: VideoCardProps) {
  const url   = typeof card.content["url"]   === "string" ? card.content["url"]   : ""
  const title = typeof card.content["title"] === "string" ? card.content["title"] : ""

  // Detect embed-able URL (YouTube, Vimeo, etc.)
  const embedUrl = resolveEmbedUrl(url)

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
      {embedUrl ? (
        <div className="relative" style={{ paddingTop: "56.25%" /* 16:9 */ }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || "Video"}
          />
        </div>
      ) : url ? (
        <video
          src={url}
          controls
          className="w-full block"
          style={{ maxHeight: 200 }}
        />
      ) : (
        <div className="flex h-20 items-center justify-center bg-neutral-100 text-xs italic text-neutral-400">
          No video
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

function resolveEmbedUrl(url: string): string | null {
  if (!url) return null

  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`

  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`

  return null
}
