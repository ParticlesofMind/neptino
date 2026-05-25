"use client"

import type { DroppedCard } from "../../types"
import { ResourceCardFrame } from "./ResourceCardFrame"
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
    <ResourceCardFrame card={card} onRemove={onRemove} bodyClassName="p-0">
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
    </ResourceCardFrame>
  )
}
