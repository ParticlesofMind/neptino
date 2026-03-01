import type { EncyclopediaItemRow } from "./atlas-page-utils"

interface Props {
  item: EncyclopediaItemRow
  previewMedia: { url: string; title: string } | undefined
  hasCompendium: boolean
}

export function AtlasSmallCard({ item, previewMedia, hasCompendium }: Props) {
  return (
    <article className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-elevated)]/40 p-4 backdrop-blur-sm">
      {previewMedia && (
        <div className="mb-3 w-full overflow-hidden rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/20">
          <img
            src={previewMedia.url}
            alt={previewMedia.title || `${item.title} image`}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {!previewMedia && hasCompendium && (
        <div className="mb-3 w-full aspect-[4/3] overflow-hidden rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg)]/20">
          <div className="flex h-full w-full items-center justify-center gap-2 text-[var(--atlas-text-dim)]">
            <img src="/icons-coursebuilder/media/media-image.svg" alt="" aria-hidden="true" className="h-5 w-5 opacity-80" />
            <span className="text-xs font-medium">Compendium preview</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="atlas-serif text-base font-light tracking-[0.05em] text-[var(--atlas-text)]">{item.title}</h2>
        <span className="rounded-full border border-[var(--atlas-accent-entity)] bg-[var(--atlas-accent-entity)]/10 px-2 py-0.5 text-xs text-[var(--atlas-accent-entity)]">
          {item.knowledge_type}
        </span>
      </div>

      <p className="mt-1 text-xs text-[var(--atlas-text-dim)]">
        {[item.domain, item.era_label, item.depth].filter(Boolean).join(" · ") || "No metadata"}
      </p>

      <p className="mt-3 text-sm text-[var(--atlas-text-dim)] line-clamp-3">
        {item.summary ?? "No summary available yet."}
      </p>

      {item.tags && item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map(tag => (
            <span key={`${item.id}-${tag}`} className="rounded-full border border-border/40 px-2 py-0.5 text-[11px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
