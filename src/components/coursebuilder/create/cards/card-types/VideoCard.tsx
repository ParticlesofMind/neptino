"use client"

import type { DroppedCard } from "../../types"
import {
  getAspectRatioPadding,
  resolveVideoEmbedUrl,
  type VideoAspectRatio,
  type VideoFitMode,
} from "../../sidebar/editors/video-utils"

interface VideoCardProps {
  card: DroppedCard
  onRemove?: () => void
}

export function VideoCard({ card, onRemove }: VideoCardProps) {
  const url = typeof card.content["url"] === "string" ? card.content["url"] : ""
  const title = typeof card.content["title"] === "string" ? card.content["title"] : ""
  const poster = typeof card.content["poster"] === "string" ? card.content["poster"] : ""
  const captionsUrl = typeof card.content["captionsUrl"] === "string" ? card.content["captionsUrl"] : ""
  const startAtSeconds = typeof card.content["startAtSeconds"] === "number" ? card.content["startAtSeconds"] : 0
  const aspectRatio = (typeof card.content["aspectRatio"] === "string" ? card.content["aspectRatio"] : "16:9") as VideoAspectRatio
  const fitMode = (typeof card.content["fitMode"] === "string" ? card.content["fitMode"] : "contain") as VideoFitMode
  const autoplay = typeof card.content["autoplay"] === "boolean" ? card.content["autoplay"] : false
  const muted = typeof card.content["muted"] === "boolean" ? card.content["muted"] : false
  const loop = typeof card.content["loop"] === "boolean" ? card.content["loop"] : false
  const showControls = typeof card.content["showControls"] === "boolean" ? card.content["showControls"] : true

  const embedUrl = resolveVideoEmbedUrl(url, {
    startAtSeconds,
    autoplay,
    muted,
    loop,
    showControls,
  })
  const ratioPadding = getAspectRatioPadding(aspectRatio)

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
        <div className="relative" style={{ paddingTop: ratioPadding }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || "Video"}
          />
        </div>
      ) : url ? (
        <div className="relative" style={{ paddingTop: ratioPadding }}>
          <video
            src={url}
            controls={showControls}
            autoPlay={autoplay}
            muted={muted}
            loop={loop}
            playsInline
            poster={poster || undefined}
            className={[
              "absolute inset-0 h-full w-full bg-black",
              fitMode === "cover" ? "object-cover" : "object-contain",
            ].join(" ")}
            onLoadedMetadata={(event) => {
              if (startAtSeconds > 0) event.currentTarget.currentTime = startAtSeconds
            }}
          >
            {captionsUrl && <track kind="captions" src={captionsUrl} default />}
          </video>
        </div>
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
