import type { EncyclopediaItemRow, MediaRow } from "./atlas-page-utils"
import { isLikelyVideoUrl, isLikelyAudioUrl, isLikelyImageUrl, isLikelyImageMediaType } from "./atlas-page-utils"

interface Props {
  item: EncyclopediaItemRow
  resource: MediaRow
  index: number
  isLarge: boolean
}

export function AtlasMediaCard({ item, resource, index, isLarge }: Props) {
  const mediaTitle       = resource.title || `${resource.media_type} resource`
  const mediaDescription = resource.description || "No description available yet."
  const mediaUrl         = resource.url
  const mediaTypeLower   = resource.media_type.toLowerCase()

  return (
    <article
      className={isLarge
        ? "rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-6 backdrop-blur-sm"
        : "rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-4 backdrop-blur-sm"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={isLarge ? "text-xl font-semibold text-foreground" : "text-base font-semibold text-foreground"}>{mediaTitle}</h2>
        <span className="rounded-full bg-accent/60 px-2 py-0.5 text-xs text-muted-foreground">{resource.media_type}</span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{item.title} · {item.knowledge_type}</p>

      <p className={isLarge ? "mt-3 text-sm leading-relaxed text-muted-foreground" : "mt-3 text-sm line-clamp-3 text-muted-foreground"}>
        {mediaDescription}
      </p>

      {mediaUrl && (
        <div className="mt-3 rounded-xl border border-border/30 bg-background/70 p-3">
          {mediaTypeLower === "video" && isLikelyVideoUrl(mediaUrl) && (
            <video controls preload="metadata" className="w-full rounded-lg" src={mediaUrl} />
          )}
          {mediaTypeLower === "audio" && isLikelyAudioUrl(mediaUrl) && (
            <audio controls preload="metadata" className="w-full" src={mediaUrl} />
          )}
          {(mediaTypeLower === "maps" || mediaTypeLower === "image") && isLikelyImageUrl(mediaUrl) && (
            <img src={mediaUrl} alt={mediaTitle} className="w-full rounded-lg object-cover" />
          )}
          {mediaTypeLower !== "video" && mediaTypeLower !== "audio"
            && !((mediaTypeLower === "maps" || mediaTypeLower === "image") && isLikelyImageUrl(mediaUrl)) && (
            <a href={mediaUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-medium text-primary hover:underline">
              Open {resource.media_type}
            </a>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-border/30 pt-3 text-xs text-muted-foreground">Media card #{index + 1}</div>
    </article>
  )
}
