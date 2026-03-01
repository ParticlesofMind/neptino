"use client"
// Media preview and drop-zone components for template-blueprint.

import React from "react"
import { useDroppable } from "@dnd-kit/core"
import type { TemplateAreaMediaItem } from "./template-blueprint-types"

function resolveEmbedUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase()
    if (host === "youtube.com" || host === "youtu.be") {
      const videoId = host === "youtu.be"
        ? parsed.pathname.replace(/^\//, "")
        : parsed.searchParams.get("v")
      if (!videoId) return null
      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
    }
    if (host === "vimeo.com") {
      const vimeoId = parsed.pathname.replace(/^\//, "")
      if (!vimeoId) return null
      return `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`
    }
    return null
  } catch {
    return null
  }
}

function looksLikeFileType(url: string, extensions: string[]): boolean {
  const normalized = url.toLowerCase().split("?")[0]
  return extensions.some((ext) => normalized.endsWith(ext))
}

export function MediaPreview({ media }: { media: TemplateAreaMediaItem }) {
  if (media.category === "images" && media.url) {
    return (
      <div
        className="aspect-video w-full rounded border border-border/60 bg-muted/10 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${media.url})` }}
        role="img"
        aria-label={media.title}
      />
    )
  }

  if (media.category === "videos" && media.url) {
    const embedUrl = resolveEmbedUrl(media.url)
    if (embedUrl) {
      return (
        <iframe
          src={embedUrl}
          title={media.title}
          className="aspect-video w-full rounded border border-border/60 bg-background"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )
    }
    const canUseVideoTag = looksLikeFileType(media.url, [".mp4", ".webm", ".ogg", ".mov", ".m4v"]) || media.mediaType.toLowerCase().includes("video")
    if (!canUseVideoTag) {
      return (
        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded border border-border/60 bg-background/90 p-2 text-[10px] text-foreground hover:bg-accent/30"
        >
          <p className="font-medium">Open video: {media.title}</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground">This source does not provide a direct playable stream in-canvas.</p>
        </a>
      )
    }
    return (
      <video
        src={media.url}
        controls
        preload="metadata"
        className="aspect-video w-full rounded border border-border/60 bg-black/80 object-contain"
      />
    )
  }

  if (media.category === "audio" && media.url) {
    const canUseAudioTag = looksLikeFileType(media.url, [".mp3", ".wav", ".ogg", ".aac", ".m4a", ".flac"]) || media.mediaType.toLowerCase().includes("audio")
    if (!canUseAudioTag) {
      return (
        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded border border-border/60 bg-background/90 p-2 text-[10px] text-foreground hover:bg-accent/30"
        >
          <p className="font-medium">Open audio: {media.title}</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground">This source does not expose an embeddable audio stream.</p>
        </a>
      )
    }
    return (
      <div className="rounded border border-border/60 bg-background/90 p-2">
        <audio src={media.url} controls className="w-full" preload="metadata" />
      </div>
    )
  }

  if (media.category === "text") {
    if (media.url) {
      return (
        <>
          <iframe
            src={media.url}
            title={media.title}
            className="aspect-video w-full rounded border border-border/60 bg-background"
            loading="lazy"
          />
          <a
            href={media.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded border border-border/60 bg-background/90 p-2 text-[10px] text-foreground hover:bg-accent/30"
          >
            Open text source in new tab
          </a>
        </>
      )
    }
    return (
      <div className="rounded border border-border/60 bg-background/90 p-2 text-[10px] text-foreground">
        <p className="font-medium">{media.title}</p>
        <p className="mt-0.5 whitespace-pre-wrap text-[9px] text-muted-foreground">{media.description || "Text content"}</p>
      </div>
    )
  }

  if (media.url) {
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noreferrer"
        className="block rounded border border-border/60 bg-background/90 p-2 text-[10px] text-foreground hover:bg-accent/30"
      >
        <p className="line-clamp-2 font-medium">{media.title}</p>
        {media.description ? <p className="mt-0.5 line-clamp-2 text-[9px] text-muted-foreground">{media.description}</p> : null}
      </a>
    )
  }

  return (
    <div className="rounded border border-border/60 bg-background/90 p-2 text-[10px] text-muted-foreground">
      <p className="font-medium">{media.title}</p>
      <p className="text-[9px]">{media.mediaType}</p>
    </div>
  )
}

export function TaskAreaDropZone({
  seedText,
  areaKey,
  droppedMedia,
  mediaDragActive,
  areaHeightClass,
  onRemoveMedia,
}: {
  seedText?: string
  areaKey: string
  droppedMedia: TemplateAreaMediaItem[]
  mediaDragActive: boolean
  areaHeightClass: string
  onRemoveMedia?: (areaKey: string, mediaId: string) => void
}) {
  const { active, isOver, setNodeRef } = useDroppable({
    id: areaKey,
    data: {
      accepts: ["MediaItem"],
    },
  })

  const isMediaDrag = active?.data?.current?.type === "MediaItem"
  const isActiveDropTarget = isOver && isMediaDrag

  return (
    <div className="space-y-1">
      <div className="space-y-1.5">
        {droppedMedia.map((media, idx) => (
          <div
            key={`${areaKey}-${media.id}-${idx}`}
            className="rounded border border-border/60 bg-muted/5 p-1.5 space-y-1"
          >
            <div className="flex items-center justify-between gap-1">
              <p className="truncate text-[10px] font-medium text-foreground flex-1">{media.title}</p>
              <button
                type="button"
                onClick={() => onRemoveMedia?.(areaKey, media.id)}
                className="shrink-0 rounded text-[10px] px-1.5 py-0.5 bg-destructive/20 text-destructive hover:bg-destructive/30 transition"
              >
                Remove
              </button>
            </div>
            <MediaPreview media={media} />
          </div>
        ))}
        <div
          ref={setNodeRef}
          className={`${droppedMedia.length > 0 ? "min-h-24" : areaHeightClass} rounded border border-dashed bg-muted/5 p-1.5 pointer-events-auto flex items-center justify-center ${isActiveDropTarget ? "border-primary bg-primary/10" : mediaDragActive && isMediaDrag ? "border-primary/60 bg-primary/5" : "border-border/60"}`}
        >
          <p className="text-[9px] text-muted-foreground/70 text-center">
            {seedText && seedText.trim() ? seedText : "Drop media here"}
          </p>
        </div>
      </div>
    </div>
  )
}

