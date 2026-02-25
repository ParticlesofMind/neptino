"use client"

import { TemplateBlueprint, type TemplateAreaMediaItem, type TemplateBlueprintData } from "@/components/coursebuilder/template-blueprint"
import type { BlockId, TemplateFieldState } from "@/components/coursebuilder/sections/templates-section"
import type { CanvasPageConfig, CanvasViewportInfo } from "@/components/canvas/PixiCanvas"
import type { LessonCanvasPageProjection } from "@/lib/curriculum/canvas-projection"
import type { TemplateVisualDensity } from "@/lib/curriculum/template-source-of-truth"

interface DomTemplateSurfaceProps {
  enabled: boolean
  viewportInfo: CanvasViewportInfo | null
  currentLessonPage: LessonCanvasPageProjection | null
  canvasConfig: CanvasPageConfig
  hasHeaderBlock: boolean
  hasFooterBlock: boolean
  headerPaddingClass: string
  lessonHeaderTooltip: string
  lessonMetaText: string
  headerFieldValues: Array<{ key: string; value: string }>
  footerFieldValues: Array<{ key: string; value: string }>
  clampedCurrentPage: number
  totalPages: number
  perPageTemplateEnabledMap: Record<BlockId, boolean>
  templateFieldEnabled: TemplateFieldState
  templateVisualDensity: TemplateVisualDensity
  templateData?: TemplateBlueprintData
  currentDroppedMediaByArea: Record<string, TemplateAreaMediaItem[]>
  mediaDragActive: boolean
  onDropAreaMedia: (areaKey: string, event: React.DragEvent<HTMLDivElement>) => void
  onRemoveAreaMedia: (areaKey: string, mediaId: string) => void
}

export function DomTemplateSurface({
  enabled,
  viewportInfo,
  currentLessonPage,
  canvasConfig,
  hasHeaderBlock,
  hasFooterBlock,
  headerPaddingClass,
  lessonHeaderTooltip,
  lessonMetaText,
  headerFieldValues,
  footerFieldValues,
  clampedCurrentPage,
  totalPages,
  perPageTemplateEnabledMap,
  templateFieldEnabled,
  templateVisualDensity,
  templateData,
  currentDroppedMediaByArea,
  mediaDragActive,
  onDropAreaMedia,
  onRemoveAreaMedia,
}: DomTemplateSurfaceProps) {
  if (!enabled || !viewportInfo || !currentLessonPage) return null

  return (
    <div
      key={`${currentLessonPage.sessionId}:${currentLessonPage.localPage}`}
      className="absolute pointer-events-auto overflow-hidden"
      style={{
        left: viewportInfo.pageRect.x,
        top: viewportInfo.pageRect.y,
        width: viewportInfo.pageRect.width,
        height: viewportInfo.pageRect.height,
      }}
    >
      <div
        className="relative origin-top-left"
        style={{
          width: canvasConfig.widthPx,
          height: canvasConfig.heightPx,
          transform: `scale(${viewportInfo.scale})`,
          transformOrigin: "top left",
        }}
      >
        <div className="relative h-full w-full bg-transparent">
          {hasHeaderBlock && (
            <div
              className={`absolute top-0 overflow-hidden border-b border-border/60 ${headerPaddingClass}`}
              style={{
                left: 0,
                right: 0,
                height: canvasConfig.margins.top,
              }}
            >
              <div className="flex h-full items-center gap-1.5 overflow-hidden">
                {currentLessonPage.templateType === "lesson" ? (
                  <>
                    <span className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground">
                      L{currentLessonPage.lessonNumber}
                    </span>
                    <span
                      className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground"
                      title={lessonHeaderTooltip}
                    >
                      {currentLessonPage.lessonTitle}
                    </span>
                    {lessonMetaText && (
                      <span
                        className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground"
                        title={lessonMetaText}
                      >
                        {lessonMetaText}
                      </span>
                    )}
                  </>
                ) : (
                  headerFieldValues.map((value, idx) => (
                    <span
                      key={`header-value-${value.key}-${idx}`}
                      className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground"
                    >
                      {value.value}
                    </span>
                  ))
                )}
              </div>
            </div>
          )}

          <div
            className="absolute overflow-hidden"
            style={{
              left: canvasConfig.margins.left,
              right: canvasConfig.margins.right,
              top: hasHeaderBlock ? canvasConfig.margins.top : 0,
              bottom: hasFooterBlock ? canvasConfig.margins.bottom : 0,
            }}
          >
            <div className="h-full w-full overflow-hidden bg-background/85">
              <TemplateBlueprint
                type={currentLessonPage.templateType as never}
                enabled={perPageTemplateEnabledMap}
                fieldEnabled={templateFieldEnabled}
                name={currentLessonPage.lessonTitle}
                scale="md"
                scrollable
                density={templateVisualDensity}
                data={templateData}
                droppedMediaByArea={currentDroppedMediaByArea}
                mediaDragActive={mediaDragActive}
                onDropAreaMedia={onDropAreaMedia}
                onRemoveAreaMedia={onRemoveAreaMedia}
              />
            </div>
          </div>

          {hasFooterBlock && (
            <div
              className="absolute bottom-0 overflow-hidden border-t border-border/60 px-3 py-1"
              style={{
                left: 0,
                right: 0,
                height: canvasConfig.margins.bottom,
              }}
            >
              <div className="flex h-full items-center justify-between gap-2 overflow-hidden">
                <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                  {footerFieldValues
                    .filter((entry) => entry.key !== "page_number")
                    .map((value, idx) => (
                      <span
                        key={`footer-value-${value.key}-${idx}`}
                        className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {value.value}
                      </span>
                    ))}
                </div>
                <span className="shrink-0 rounded border border-border/60 bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
                  {footerFieldValues.find((entry) => entry.key === "page_number")?.value ?? `Page ${clampedCurrentPage} / ${totalPages}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
