"use client"

import React from "react"
import { TEMPLATE_TYPE_META, type TemplateType, type BlockId, type TemplateFieldState } from "@/components/coursebuilder/sections/templates-section"
import {
  DEFAULT_TEMPLATE_BODY_BLOCK_GAP,
  DEFAULT_TEMPLATE_VISUAL_DENSITY,
  type TemplateVisualDensity,
} from "@/lib/curriculum/template-source-of-truth"
import {
  TEMPLATE_BLUEPRINTS,
  slotToBlockId,
  type BodySlot,
} from "@/lib/curriculum/template-json-blueprints"


import {
  TemplateBlueprintContext,
  SCALE_CONFIG,
  useTemplateBlueprintContext,
  type TemplateAreaMediaItem,
  type TaskAreaKind,
  type TemplateBlueprintData,
  type TemplateBlueprintContextValue,
} from "./template-blueprint-types"
import { BlueprintBodySlot, MarginBand } from "./template-blueprint-live"
interface TemplateBlueprintProps {
  type: TemplateType
  enabled: Record<BlockId, boolean>
  fieldEnabled: TemplateFieldState
  blockOrder?: BlockId[]
  taskAreaOrder?: TaskAreaKind[]
  name?: string
  scale?: "sm" | "md" | "lg"
  scrollable?: boolean
  density?: TemplateVisualDensity
  bodyBlockGap?: number
  data?: TemplateBlueprintData
  droppedMediaByArea?: Record<string, TemplateAreaMediaItem[]>
  mediaDragActive?: boolean
  onRemoveAreaMedia?: (areaKey: string, mediaId: string) => void
  /**
   * When true, the canvas is in "render" mode:
   *  - The name/type badge header is omitted (TemplateSurface owns the chrome)
   *  - Margin bands (header/footer) are omitted (TemplateSurface renders them in page margins)
   *  - Body slots receive actual data and render real content
   */
  canvasMode?: boolean
}


export function JsonTemplatePreview({
  type,
  blockOrder,
  bodyBlockGap = DEFAULT_TEMPLATE_BODY_BLOCK_GAP,
  omitMargins = false,
}: {
  type: TemplateType
  blockOrder?: BlockId[]
  bodyBlockGap?: number
  omitMargins?: boolean
}) {
  const { data } = useTemplateBlueprintContext()
  const blueprint = TEMPLATE_BLUEPRINTS[type]
  if (!blueprint) return null

  const headerValues = data?.fieldValues?.header
  const footerValues = data?.fieldValues?.footer
  const continuation = data?.continuation
  const orderedBodySlots = React.useMemo(() => {
    if (!blockOrder || blockOrder.length === 0) return blueprint.body
    const rank = new Map(blockOrder.map((blockId, index) => [blockId, index]))
    return [...blueprint.body].sort((leftSlot, rightSlot) => {
      const leftBlock = slotToBlockId(leftSlot.kind) as BlockId | null
      const rightBlock = slotToBlockId(rightSlot.kind) as BlockId | null
      const leftRank = leftBlock ? (rank.get(leftBlock) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
      const rightRank = rightBlock ? (rank.get(rightBlock) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
      return leftRank - rightRank
    })
  }, [blockOrder, blueprint.body])

  return (
    <div className={`flex h-full min-h-full w-full flex-col ${omitMargins ? "bg-transparent" : "bg-background"}`}>
      {/* ── Top margin ── Header ───────────────────────────────────── */}
      {!omitMargins && (
        <MarginBand
          side="top"
          left={blueprint.header.left}
          right={blueprint.header.right}
          fieldValues={headerValues}
        />
      )}

      {/* ── Body ── content blocks ─────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 px-2 py-2"
        style={{ display: "flex", flexDirection: "column", gap: `${Math.max(0, bodyBlockGap)}px` }}
      >
        {orderedBodySlots.map((slot, idx) => (
          <div
            key={idx}
            className={slot.kind === "content_nested" || slot.kind === "assignment_nested" ? "min-h-0" : undefined}
          >
            <BlueprintBodySlot
              slot={slot}
              isContinuation={Boolean(continuation?.[slotToBlockId(slot.kind) as BlockId])}
            />
          </div>
        ))}
      </div>

      {/* ── Bottom margin ── Footer ────────────────────────────────── */}
      {!omitMargins && (
        <MarginBand
          side="bottom"
          left={blueprint.footer.left}
          right={blueprint.footer.right}
          fieldValues={footerValues}
        />
      )}
    </div>
  )
}

export function TemplateBlueprint({
  type,
  enabled,
  fieldEnabled,
  blockOrder,
  taskAreaOrder,
  name,
  scale = "md",
  scrollable = true,
  density = DEFAULT_TEMPLATE_VISUAL_DENSITY,
  bodyBlockGap = DEFAULT_TEMPLATE_BODY_BLOCK_GAP,
  data,
  droppedMediaByArea,
  mediaDragActive = false,
  onRemoveAreaMedia,
  canvasMode = false,
}: TemplateBlueprintProps) {
  const config = SCALE_CONFIG[scale]
  const meta = TEMPLATE_TYPE_META[type]

  const densityAreaHeightClass = {
    compact: "min-h-8",
    balanced: "min-h-10",
    comfortable: "min-h-12",
  }[density]

  const orderedTaskAreas: TaskAreaKind[] = (() => {
    const defaults: TaskAreaKind[] = ["instruction", "student", "teacher"]
    if (!taskAreaOrder || taskAreaOrder.length === 0) return defaults
    const deduped = Array.from(new Set(taskAreaOrder))
    const missing = defaults.filter((kind) => !deduped.includes(kind))
    return [...deduped, ...missing]
  })()

  const contextValue = React.useMemo<TemplateBlueprintContextValue>(
    () => ({
      enabled,
      data,
      droppedMediaByArea,
      mediaDragActive,
      onRemoveAreaMedia,
      orderedTaskAreas,
      densityAreaHeightClass,
    }),
    // orderedTaskAreas is a derived array computed above — stable reference not guaranteed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, data, droppedMediaByArea, mediaDragActive, onRemoveAreaMedia, taskAreaOrder, densityAreaHeightClass],
  )

  // Canvas mode: TemplateSurface owns the page chrome (margins, header band, footer band).
  // Render only the body content blocks — omit the name badge and margin bands.
  if (canvasMode) {
    return (
      <TemplateBlueprintContext.Provider value={contextValue}>
        <div className={`h-full w-full ${scrollable ? "overflow-auto" : "overflow-hidden"} bg-background`}>
          <JsonTemplatePreview type={type} blockOrder={blockOrder} bodyBlockGap={bodyBlockGap} omitMargins />
        </div>
      </TemplateBlueprintContext.Provider>
    )
  }

  // Preview mode (configurator / interface section): show the name + type badge and the full
  // tri-region blueprint (header band → body blocks → footer band).
  return (
    <TemplateBlueprintContext.Provider value={contextValue}>
      <div className="flex w-full flex-col overflow-hidden rounded-xl bg-background">
        {/* Type + name badge — identifies the template */}
        <div
          className={`flex items-center justify-between border-b border-border bg-muted/40 ${config.headerPadding}`}
        >
          <div className="min-w-0">
            <p className={`truncate font-semibold text-foreground ${config.headerFontSize}`}>
              {name || "Untitled template"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 text-muted-foreground">{meta.icon}</span>
            <span className={`rounded border ${meta.badge} px-2 py-1 text-xs font-semibold`}>
              {meta.label}
            </span>
          </div>
        </div>

        {/* JSON blueprint — canonical tri-region layout */}
        <div className={`flex-1 ${scrollable ? "overflow-y-auto" : "overflow-hidden"}`}>
          <JsonTemplatePreview type={type} blockOrder={blockOrder} bodyBlockGap={bodyBlockGap} />
        </div>
      </div>
    </TemplateBlueprintContext.Provider>
  )
}
