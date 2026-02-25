"use client"

import {
  AreaChart,
  AudioLines,
  Blocks,
  BookOpenText,
  File,
  Film,
  Gamepad2,
  Image as ImageIcon,
  Link,
} from "lucide-react"
import type { MediaAsset, OverlayUi } from "@/components/canvas/create-view-types"

interface MediaItem {
  id: string
  label: string
  iconNode: React.ReactNode
}

export type MediaLibraryAsset = MediaAsset

const MEDIA_ITEMS: MediaItem[] = [
  { id: "files", label: "Files", iconNode: <File className="h-5 w-5" /> },
  { id: "images", label: "Images", iconNode: <ImageIcon className="h-5 w-5" /> },
  { id: "videos", label: "Videos", iconNode: <Film className="h-5 w-5" /> },
  { id: "audio", label: "Audio", iconNode: <AudioLines className="h-5 w-5" /> },
  { id: "text", label: "Text", iconNode: <BookOpenText className="h-5 w-5" /> },
  { id: "plugins", label: "Plugins", iconNode: <Blocks className="h-5 w-5" /> },
  { id: "links", label: "Links", iconNode: <Link className="h-5 w-5" /> },
  { id: "games", label: "Games", iconNode: <Gamepad2 className="h-5 w-5" /> },
  { id: "graphs", label: "Graphs", iconNode: <AreaChart className="h-5 w-5" /> },
]

interface MediaLibraryPanelProps {
  width: number
  overlayUi: OverlayUi
  activeMedia: string
  onChangeActiveMedia: (media: string) => void
  mediaSearch: string
  onChangeMediaSearch: (value: string) => void
  mediaLoading: boolean
  wikipediaLoading: boolean
  mediaItems: MediaLibraryAsset[]
  onDragStartMedia: (asset: MediaLibraryAsset, event: React.DragEvent) => void
  onDragEndMedia: () => void
}

export function MediaLibraryPanel({
  width,
  overlayUi,
  activeMedia,
  onChangeActiveMedia,
  mediaSearch,
  onChangeMediaSearch,
  mediaLoading,
  wikipediaLoading,
  mediaItems,
  onDragStartMedia,
  onDragEndMedia,
}: MediaLibraryPanelProps) {
  if (width <= 0) return null

  return (
    <div className="flex shrink-0 border-r border-border bg-background overflow-hidden" style={{ width }}>
      <div className="flex w-14 shrink-0 flex-col border-r border-border overflow-y-auto">
        <div className={`flex flex-col items-center gap-0.5 ${overlayUi.panelContentPadding} pt-2`}>
          {MEDIA_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onChangeActiveMedia(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 h-12 w-12 rounded border transition ${
                activeMedia === item.id
                  ? "border-primary bg-blue-100 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <span className={overlayUi.mediaCategoryIcon}>{item.iconNode}</span>
              <span className={`${overlayUi.mediaCategoryLabel} leading-tight`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className={`border-b border-border ${overlayUi.panelSearchPadding}`}>
          <input
            type="search"
            value={mediaSearch}
            onChange={(e) => onChangeMediaSearch(e.target.value)}
            placeholder="Search…"
            className={`w-full rounded-md border border-border bg-muted/40 ${overlayUi.panelSearchInput} text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring`}
          />
        </div>
        <div className={`flex-1 overflow-y-auto ${overlayUi.panelContentPadding}`}>
          {mediaLoading || wikipediaLoading ? (
            <p className={`${overlayUi.panelItemText} italic text-muted-foreground/50 px-1 py-2`}>
              Loading encyclopedia and Wikipedia media…
            </p>
          ) : mediaItems.length === 0 ? (
            <p className={`${overlayUi.panelItemText} italic text-muted-foreground/50 px-1 py-2`}>
              No media found in this category.
            </p>
          ) : (
            <ul className="space-y-1">
              {mediaItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => onDragStartMedia(item, event)}
                    onDragEnd={onDragEndMedia}
                    className={`w-full rounded border border-border bg-background/70 text-left ${overlayUi.panelItemPadding} transition hover:border-primary/40 hover:bg-accent/40 active:scale-[0.99]`}
                    title={item.url || item.description || item.title}
                  >
                    {item.category === "images" && item.url ? (
                      <div
                        className="mb-1 h-20 w-full rounded border border-border/60 bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.url})` }}
                        role="img"
                        aria-label={item.title}
                      />
                    ) : item.category === "videos" && item.url ? (
                      <video
                        src={item.url}
                        className="mb-1 h-20 w-full rounded border border-border/60 object-cover"
                        controls
                        muted
                        preload="metadata"
                      />
                    ) : item.category === "audio" && item.url ? (
                      <div className="mb-1 rounded border border-border/60 bg-muted/20 px-2 py-1">
                        <audio src={item.url} controls className="w-full" preload="metadata" />
                      </div>
                    ) : item.category === "text" ? (
                      <div className="mb-1 rounded border border-border/60 bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground">Text resource</div>
                    ) : null}
                    <p className={`${overlayUi.panelItemText} font-medium text-foreground truncate`}>{item.title}</p>
                    <p className={`${overlayUi.controlLabel} text-muted-foreground truncate`}>{item.mediaType}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
