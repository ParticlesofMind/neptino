"use client"

import { useEffect, useRef } from "react"
import { TemplateBlueprint, type TaskAreaKind, type TemplateAreaMediaItem, type TemplateBlueprintData } from "@/components/coursebuilder/template-blueprint"
import type { BlockId, TemplateFieldState } from "@/components/coursebuilder/sections/templates-section"
import type { CanvasPageConfig } from "./create-view-types"
import type { LessonCanvasPageProjection } from "@/lib/curriculum/canvas-projection"
import type { TemplateVisualDensity } from "@/lib/curriculum/template-source-of-truth"
import { TEMPLATE_BLUEPRINTS } from "@/lib/curriculum/template-json-blueprints"

interface TemplateSurfaceProps {
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
  blockOrder?: BlockId[]
  taskAreaOrder?: TaskAreaKind[]
  templateFieldEnabled: TemplateFieldState
  templateVisualDensity: TemplateVisualDensity
  templateData?: TemplateBlueprintData
  currentDroppedMediaByArea: Record<string, TemplateAreaMediaItem[]>
  mediaDragActive: boolean
  onRemoveAreaMedia: (areaKey: string, mediaId: string) => void
  onBodyOverflowChange?: (args: { sessionId: string; localPage: number; overflowing: boolean }) => void
}

export function TemplateSurface({
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
  blockOrder,
  taskAreaOrder,
  templateFieldEnabled,
  templateVisualDensity,
  templateData,
  currentDroppedMediaByArea,
  mediaDragActive,
  onRemoveAreaMedia,
  onBodyOverflowChange,
}: TemplateSurfaceProps) {
  if (!currentLessonPage) return null
  const bodyContainerRef = useRef<HTMLDivElement | null>(null)

  // Look up the blueprint for the current template type to drive header/footer field order.
  // Falls back to the lesson blueprint if the type is not registered.
  const blueprint = TEMPLATE_BLUEPRINTS[currentLessonPage.templateType] ?? TEMPLATE_BLUEPRINTS.lesson
  const headerValueMap = Object.fromEntries(headerFieldValues.map((v) => [v.key, v.value]))
  const footerValueMap = Object.fromEntries(footerFieldValues.map((v) => [v.key, v.value]))

  useEffect(() => {
    if (!onBodyOverflowChange) return
    const element = bodyContainerRef.current
    if (!element) return

    let frameHandle: number | null = null

    const emitOverflowState = () => {
      const overflowing = (element.scrollHeight - element.clientHeight) > 1
      onBodyOverflowChange({
        sessionId: currentLessonPage.sessionId,
        localPage: currentLessonPage.localPage,
        overflowing,
      })
    }

    const queueEmit = () => {
      if (frameHandle !== null) return
      frameHandle = window.requestAnimationFrame(() => {
        frameHandle = null
        emitOverflowState()
      })
    }

    const observer = new ResizeObserver(() => queueEmit())
    observer.observe(element)
    queueEmit()

    return () => {
      observer.disconnect()
      if (frameHandle !== null) {
        window.cancelAnimationFrame(frameHandle)
      }
    }
  }, [currentLessonPage.localPage, currentLessonPage.sessionId, onBodyOverflowChange])

  return (
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
          {/* Blueprint-driven header: left group (identity fields) + right group (date / teacher) */}
          <div className="flex h-full items-center justify-between gap-2 overflow-hidden">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {blueprint.header.left.map((field) => {
                const value = headerValueMap[field.key]
                if (!value) return null
                return (
                  <span
                    key={field.key}
                    className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-foreground"
                    title={value}
                  >
                    {value}
                  </span>
                )
              })}
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {blueprint.header.right.map((field) => {
                const value = headerValueMap[field.key]
                if (!value) return null
                return (
                  <span
                    key={field.key}
                    className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {value}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div
        ref={bodyContainerRef}
        data-testid="template-body-viewport"
        className="absolute overflow-hidden"
        style={{
          left: canvasConfig.margins.left,
          right: canvasConfig.margins.right,
          top: hasHeaderBlock ? canvasConfig.margins.top : 0,
          bottom: hasFooterBlock ? canvasConfig.margins.bottom : 0,
        }}
      >
        <div className="w-full bg-transparent">
          <TemplateBlueprint
            type={currentLessonPage.templateType as never}
            enabled={perPageTemplateEnabledMap}
            fieldEnabled={templateFieldEnabled}
            blockOrder={blockOrder}
            taskAreaOrder={taskAreaOrder}
            name={currentLessonPage.lessonTitle}
            scale="md"
            scrollable={false}
            density={templateVisualDensity}
            data={templateData}
            droppedMediaByArea={currentDroppedMediaByArea}
            mediaDragActive={mediaDragActive}
            onRemoveAreaMedia={onRemoveAreaMedia}
            canvasMode
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
          {/* Blueprint-driven footer: left group (copyright / institution) + right group (page number) */}
          <div className="flex h-full items-center justify-between gap-2 overflow-hidden">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {blueprint.footer.left.map((field) => {
                const value = footerValueMap[field.key]
                if (!value) return null
                return (
                  <span
                    key={field.key}
                    className="truncate rounded border border-border/60 bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {value}
                  </span>
                )
              })}
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {blueprint.footer.right.map((field) => {
                const rawValue = footerValueMap[field.key]
                const displayValue = rawValue ?? (field.key === "page_number" ? `${clampedCurrentPage} / ${totalPages}` : field.label)
                return (
                  <span
                    key={field.key}
                    className={`shrink-0 rounded border px-2 py-0.5 text-xs ${
                      field.key === "page_number"
                        ? "border-border/60 bg-background font-semibold text-foreground"
                        : "border-border/60 bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    {displayValue}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
