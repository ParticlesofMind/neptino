"use client"

import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import type {
  CanvasPageConfig,
  CanvasViewportInfo,
  PixiTemplateLayoutMeasurement,
  PixiTemplateLayoutModel,
  PixiTemplateMediaItem,
  ToolConfig,
} from "@/components/canvas/PixiCanvas"

// PixiJS touches browser APIs at import time — must be loaded client-only
interface PixiCanvasProps {
  config?: CanvasPageConfig
  zoom?: number
  onZoomChange?: (pct: number) => void
  activeTool?: string
  toolConfig?: ToolConfig
  activePage?: number
  focusPage?: number
  onViewportChange?: (info: CanvasViewportInfo) => void
  onActivePageChange?: (page: number) => void
  templateLayoutModel?: PixiTemplateLayoutModel | null
  enableTemplateLayout?: boolean
  onTemplateMediaActivate?: (media: PixiTemplateMediaItem) => void
  onTemplateAreaDrop?: (areaKey: string, rawPayload: string) => void
  onTemplateLayoutMeasured?: (measurement: PixiTemplateLayoutMeasurement) => void
}

const PixiCanvas = dynamic<PixiCanvasProps>(
  () => import("@/components/canvas/PixiCanvas").then((m) => m.PixiCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
        <span className="text-xs text-muted-foreground">Loading canvas…</span>
      </div>
    ),
  },
)

interface ActiveCanvasMedia {
  id: string
  title: string
  description: string
  mediaType: string
  category: string
  url: string
}

interface PixiWidgetSurfaceProps {
  config: CanvasPageConfig
  zoom: number
  onZoomChange: (pct: number) => void
  activeTool: string
  toolConfig: ToolConfig
  activePage: number
  focusPage: number
  onViewportChange: (info: CanvasViewportInfo) => void
  onActivePageChange: (page: number) => void
  templateLayoutModel: PixiTemplateLayoutModel | null
  enableTemplateLayout: boolean
  onTemplateAreaDrop?: (areaKey: string, rawPayload: string) => void
  onTemplateLayoutMeasured?: (measurement: PixiTemplateLayoutMeasurement) => void
}

export function PixiWidgetSurface({
  config,
  zoom,
  onZoomChange,
  activeTool,
  toolConfig,
  activePage,
  focusPage,
  onViewportChange,
  onActivePageChange,
  templateLayoutModel,
  enableTemplateLayout,
  onTemplateAreaDrop,
  onTemplateLayoutMeasured,
}: PixiWidgetSurfaceProps) {
  const [activeCanvasMedia, setActiveCanvasMedia] = useState<ActiveCanvasMedia | null>(null)

  const onPixiMediaActivate = useCallback((media: PixiTemplateMediaItem) => {
    setActiveCanvasMedia({
      id: media.id,
      title: media.title,
      description: media.description ?? "",
      mediaType: media.mediaType ?? "media",
      category: media.category ?? "media",
      url: media.url ?? "",
    })
  }, [])

  return (
    <>
      <div className="absolute inset-0">
        <PixiCanvas
          config={config}
          zoom={zoom}
          onZoomChange={onZoomChange}
          activeTool={activeTool}
          toolConfig={toolConfig}
          activePage={activePage}
          focusPage={focusPage}
          onViewportChange={onViewportChange}
          onActivePageChange={onActivePageChange}
          templateLayoutModel={templateLayoutModel}
          enableTemplateLayout={enableTemplateLayout}
          onTemplateMediaActivate={enableTemplateLayout ? onPixiMediaActivate : undefined}
          onTemplateAreaDrop={enableTemplateLayout ? onTemplateAreaDrop : undefined}
          onTemplateLayoutMeasured={enableTemplateLayout ? onTemplateLayoutMeasured : undefined}
        />
      </div>

      {activeCanvasMedia && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-background p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-foreground">{activeCanvasMedia.title}</p>
              <button
                type="button"
                onClick={() => setActiveCanvasMedia(null)}
                className="rounded border border-border px-2 py-1 text-xs text-foreground hover:bg-muted/50"
              >
                Close
              </button>
            </div>

            {activeCanvasMedia.category === "videos" && activeCanvasMedia.url ? (
              <video src={activeCanvasMedia.url} controls className="max-h-[60vh] w-full rounded border border-border/60 bg-black object-contain" preload="metadata" />
            ) : activeCanvasMedia.category === "audio" && activeCanvasMedia.url ? (
              <audio src={activeCanvasMedia.url} controls className="w-full" preload="metadata" />
            ) : activeCanvasMedia.category === "images" && activeCanvasMedia.url ? (
              <div
                className="h-[50vh] w-full rounded border border-border/60 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${activeCanvasMedia.url})` }}
                role="img"
                aria-label={activeCanvasMedia.title}
              />
            ) : activeCanvasMedia.url ? (
              <iframe src={activeCanvasMedia.url} title={activeCanvasMedia.title} className="h-[60vh] w-full rounded border border-border/60" />
            ) : (
              <p className="text-xs text-muted-foreground">No preview URL available.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
