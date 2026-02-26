"use client"

import React from "react"
import { TEMPLATE_TYPE_META, type TemplateType, ALL_BLOCKS, BLOCK_FIELDS, type BlockId, type TemplateFieldState } from "@/components/coursebuilder/sections/templates-section"
import {
  DEFAULT_TEMPLATE_BODY_BLOCK_GAP,
  DEFAULT_TEMPLATE_VISUAL_DENSITY,
  type TemplateVisualDensity,
} from "@/lib/curriculum/template-source-of-truth"

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
}

import { useDroppable } from "@dnd-kit/core"

export interface TemplateAreaMediaItem {
  id: string
  title: string
  description: string
  mediaType: string
  category: string
  url: string
}

export type TaskAreaKind = "instruction" | "student" | "teacher"

export function buildTaskAreaKey(
  block: "content" | "assignment",
  topicIdx: number,
  objectiveIdx: number,
  taskIdx: number,
  area: TaskAreaKind,
): string {
  return `${block}:${topicIdx}:${objectiveIdx}:${taskIdx}:${area}`
}

export interface TemplateBlueprintData {
  fieldValues?: Partial<Record<BlockId, Record<string, string>>>
  programRows?: Array<Record<string, string>>
  resourceRows?: Array<Record<string, string>>
  contentItems?: {
    topics?: string[]
    objectives?: string[]
    tasks?: string[]
    topicGroups?: Array<{
      topic: string
      objectives: Array<{
        objective: string
        tasks: Array<{
          task: string
          topicIndex?: number
          objectiveIndex?: number
          taskIndex?: number
          instructionArea: string
          studentArea: string
          teacherArea: string
        }>
      }>
    }>
  }
  assignmentItems?: {
    tasks?: string[]
    topicGroups?: Array<{
      topic: string
      objectives: Array<{
        objective: string
        tasks: Array<{
          task: string
          topicIndex?: number
          objectiveIndex?: number
          taskIndex?: number
          instructionArea: string
          studentArea: string
          teacherArea: string
        }>
      }>
    }>
  }
  resourceItems?: string[]
  scoringItems?: string[]
  continuation?: Partial<Record<BlockId, boolean>>
}

const SCALE_CONFIG = {
  sm: {
    containerPadding: "p-2",
    headerPadding: "px-3 py-2",
    headerFontSize: "text-xs",
    blockPadding: "p-2",
    blockTitleSize: "text-[9px]",
    fieldSize: "text-[8px]",
    blockGap: "gap-1",
    headerFieldGap: "gap-1",
    headerFieldPadding: "px-1 py-0.5",
  },
  md: {
    containerPadding: "p-3",
    headerPadding: "px-4 py-3",
    headerFontSize: "text-sm",
    blockPadding: "p-3",
    blockTitleSize: "text-[10px]",
    fieldSize: "text-xs",
    blockGap: "gap-2",
    headerFieldGap: "gap-1.5",
    headerFieldPadding: "px-1.5 py-0.5",
  },
  lg: {
    containerPadding: "p-4",
    headerPadding: "px-5 py-4",
    headerFontSize: "text-base",
    blockPadding: "p-4",
    blockTitleSize: "text-[11px]",
    fieldSize: "text-sm",
    blockGap: "gap-3",
    headerFieldGap: "gap-2",
    headerFieldPadding: "px-2 py-1",
  },
}

function TemplateHeaderBlueprint({
  type,
  fieldEnabled,
  scale = "md",
  fieldValues,
}: {
  type: TemplateType
  fieldEnabled: TemplateFieldState
  scale?: "sm" | "md" | "lg"
  fieldValues?: Record<string, string>
}) {
  const config = SCALE_CONFIG[scale]
  const headerFields = BLOCK_FIELDS.header
    .filter((f) => f.forTypes.includes(type))
    .filter((f) => f.required || Boolean(fieldEnabled.header?.[f.key]))

  return (
    <div className={`flex items-center overflow-x-auto ${config.headerFieldGap}`}>
      {headerFields.map((field, idx) => (
        <div key={field.key} className="flex items-center gap-1 flex-shrink-0">
          {idx > 0 && <span className="text-muted-foreground/40 text-xs">·</span>}
          <span
            className={`rounded border border-border/60 bg-muted/30 ${config.headerFieldPadding} text-foreground text-xs`}
          >
            {fieldValues?.[field.key] ? `${field.label}: ${fieldValues[field.key]}` : field.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function TemplateBlockBlueprint({
  blockId,
  type,
  fieldEnabled,
  scale = "md",
  fieldValues,
}: {
  blockId: BlockId
  type: TemplateType
  fieldEnabled: TemplateFieldState
  scale?: "sm" | "md" | "lg"
  fieldValues?: Record<string, string>
}) {
  const config = SCALE_CONFIG[scale]
  const block = ALL_BLOCKS.find((b) => b.id === blockId)

  if (!block) return null

  const fields = BLOCK_FIELDS[blockId]
    .filter((f) => f.forTypes.includes(type))
    .filter((f) => f.required || Boolean(fieldEnabled[blockId]?.[f.key]))

  if (fields.length === 0) return null

  return (
    <div className={`rounded-lg border border-border bg-muted/10 ${config.blockPadding}`}>
      <div className={`mb-2 ${config.blockTitleSize} font-semibold uppercase tracking-wide text-muted-foreground`}>
        {block.label}
      </div>
      <div className={`flex flex-wrap ${config.blockGap}`}>
        {fields.map((field) => (
          <span
            key={field.key}
            className={`rounded border border-border/50 bg-background ${config.headerFieldPadding} ${config.fieldSize} text-foreground/80`}
          >
            {fieldValues?.[field.key] ? `${field.label}: ${fieldValues[field.key]}` : field.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function PlaceholderLine({ widthClass = "w-full" }: { widthClass?: string }) {
  return <div className={`h-2.5 rounded bg-muted/60 ${widthClass}`} />
}

function DocumentSection({
  title,
  children,
  className,
  hideTitle = false,
  style,
}: {
  title: string
  children: React.ReactNode
  className?: string
  hideTitle?: boolean
  style?: React.CSSProperties
}) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className ?? ""}`} style={style}>
      {!hideTitle && (
        <div className="border-b border-border bg-muted/30 px-2 py-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        </div>
      )}
      <div className="p-1.5">{children}</div>
    </section>
  )
}

function TaskAreaDropZone({
  title,
  seedText,
  areaKey,
  droppedMedia,
  mediaDragActive,
  areaHeightClass,
  onRemoveMedia,
}: {
  title: string
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

  const resolveEmbedUrl = (url: string): string | null => {
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

  const looksLikeFileType = (url: string, extensions: string[]): boolean => {
    const normalized = url.toLowerCase().split("?")[0]
    return extensions.some((extension) => normalized.endsWith(extension))
  }

  const renderMediaPreview = (media: TemplateAreaMediaItem) => {
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

  return (
    <div className="space-y-1">
      <p className="font-medium">{title}</p>
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
            {renderMediaPreview(media)}
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

function NestedContent({
  topic = true,
  objective = true,
  task = true,
  instructionArea = true,
  studentArea = true,
  teacherArea = true,
  includeProject,
}: {
  topic?: boolean
  objective?: boolean
  task?: boolean
  instructionArea?: boolean
  studentArea?: boolean
  teacherArea?: boolean
  includeProject?: boolean
}) {
  const renderHierarchy = () => (
    <div className="space-y-1.5">
      {topic && (
        <div className="rounded-lg border border-border/70 bg-background p-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Topic</p>
          <div className="mt-1 space-y-1.5 border-l-2 border-border/70 pl-1.5">
            <PlaceholderLine widthClass="w-10/12" />
            {objective && (
              <div className="rounded-md border border-border/60 bg-muted/10 p-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Objective</p>
                <div className="mt-1 space-y-1.5 border-l-2 border-border/60 pl-1.5">
                  <PlaceholderLine widthClass="w-9/12" />
                  {task && (
                    <div className="rounded-md border border-border/60 bg-background p-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Task</p>
                      <div className="mt-1 space-y-1.5 border-l-2 border-border/60 pl-1.5">
                        {instructionArea && (
                          <div className="rounded-md border border-border/50 bg-muted/10 p-1.5">
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Instruction Area</p>
                            <PlaceholderLine widthClass="w-11/12" />
                          </div>
                        )}
                        {studentArea && (
                          <div className="rounded-md border border-border/50 bg-muted/10 p-1.5">
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Student Area</p>
                            <PlaceholderLine widthClass="w-10/12" />
                          </div>
                        )}
                        {teacherArea && (
                          <div className="rounded-md border border-border/50 bg-muted/10 p-1.5">
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Teacher Area</p>
                            <PlaceholderLine widthClass="w-8/12" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  if (!topic && !objective && !task && !instructionArea && !studentArea && !teacherArea && !includeProject) {
    return null
  }

  return (
    <div className="space-y-1.5">
      {renderHierarchy()}
      {includeProject && (
        <div className="rounded-lg border border-border bg-muted/10 p-1.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project</p>
          {renderHierarchy()}
        </div>
      )}
    </div>
  )
}

function LessonTemplatePreview({
  enabled,
  fieldEnabled,
  blockOrder,
  taskAreaOrder,
  scrollable = true,
  density = DEFAULT_TEMPLATE_VISUAL_DENSITY,
  bodyBlockGap = DEFAULT_TEMPLATE_BODY_BLOCK_GAP,
  data,
  droppedMediaByArea,
  mediaDragActive = false,
  onRemoveAreaMedia,
}: {
  enabled: Record<BlockId, boolean>
  fieldEnabled: TemplateFieldState
  blockOrder?: BlockId[]
  taskAreaOrder?: TaskAreaKind[]
  scrollable?: boolean
  density?: TemplateVisualDensity
  bodyBlockGap?: number
  data?: TemplateBlueprintData
  droppedMediaByArea?: Record<string, TemplateAreaMediaItem[]>
  mediaDragActive?: boolean
  onRemoveAreaMedia?: (areaKey: string, mediaId: string) => void
}) {
  const headerFields = BLOCK_FIELDS.header.filter((field) => field.required || Boolean(fieldEnabled.header?.[field.key]))
  const programFields = BLOCK_FIELDS.program
    .filter((field) => field.forTypes.includes("lesson"))
    .filter((field) => field.required || Boolean(fieldEnabled.program?.[field.key]))
  const resourceFields = BLOCK_FIELDS.resources
    .filter((field) => field.forTypes.includes("lesson"))
    .filter((field) => field.required || Boolean(fieldEnabled.resources?.[field.key]))
  const fieldValues = data?.fieldValues
  const densityConfig = {
    compact: {
      containerPadding: "p-0",
      areaHeightClass: "h-8",
    },
    balanced: {
      containerPadding: "p-1",
      areaHeightClass: "h-10",
    },
    comfortable: {
      containerPadding: "p-1.5 md:p-2",
      areaHeightClass: "h-12",
    },
  }[density]
  const orderedBlocks = (() => {
    const base: BlockId[] = ["header", "program", "resources", "content", "assignment", "scoring", "footer"]
    if (!blockOrder || blockOrder.length === 0) return base
    const baseSet = new Set(base)
    const preferred = blockOrder.filter((id) => baseSet.has(id))
    const preferredSet = new Set(preferred)
    const missing = base.filter((id) => !preferredSet.has(id))
    return [...preferred, ...missing]
  })()
  const sectionOrder = Object.fromEntries(orderedBlocks.map((blockId, index) => [blockId, index])) as Record<BlockId, number>
  const orderedTaskAreas: TaskAreaKind[] = (() => {
    const defaults: TaskAreaKind[] = ["instruction", "student", "teacher"]
    if (!taskAreaOrder || taskAreaOrder.length === 0) return defaults
    const deduped = Array.from(new Set(taskAreaOrder))
    const missing = defaults.filter((kind) => !deduped.includes(kind))
    return [...deduped, ...missing]
  })()

  return (
    <div className={`h-full ${scrollable ? "overflow-auto" : "overflow-hidden"} bg-background ${densityConfig.containerPadding}`}>
      <div className="flex w-full flex-col" style={{ rowGap: `${Math.max(0, bodyBlockGap)}px` }}>
            {enabled.header && (
              <DocumentSection title="Header" className="" style={{ order: sectionOrder.header }}>
                <div className="flex flex-wrap items-start gap-1">
                  {headerFields.map((field) => (
                    <span key={field.key} className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {fieldValues?.header?.[field.key] ? `${field.label}: ${fieldValues.header[field.key]}` : field.label}
                    </span>
                  ))}
                </div>
              </DocumentSection>
            )}

            {enabled.program && (
              <DocumentSection title="Program" className="" hideTitle={Boolean(data?.continuation?.program)} style={{ order: sectionOrder.program }}>
                {Array.isArray(data?.programRows) && data.programRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-[10px] text-muted-foreground">
                      <thead>
                        <tr>
                          {programFields.map((field) => (
                            <th key={`program-header-${field.key}`} className="border border-border/70 bg-muted/20 px-1.5 py-1 text-left font-semibold uppercase tracking-wide">
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.programRows.map((row, rowIdx) => (
                          <tr key={`program-row-${rowIdx}`}>
                            {programFields.map((field) => {
                              const rawValue = row[field.key] || "—"
                              const segmentedLines =
                                field.key === "objective" || field.key === "task"
                                  ? String(rawValue)
                                      .split("\n")
                                      .map((line) => line.trim())
                                      .filter((line) => line.length > 0)
                                  : []

                              if (segmentedLines.length > 0) {
                                return (
                                  <td key={`${field.key}-${rowIdx}`} className="border border-border/70 bg-background p-0 align-top">
                                    <div className="flex flex-col">
                                      {segmentedLines.map((line, lineIdx) => (
                                        <div
                                          key={`${field.key}-${rowIdx}-line-${lineIdx}`}
                                          className={`px-1.5 py-1 ${lineIdx > 0 ? "border-t border-border/70" : ""}`}
                                        >
                                          {line}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                )
                              }

                              return (
                                <td key={`${field.key}-${rowIdx}`} className="whitespace-pre-wrap border border-border/70 bg-background px-1.5 py-1 align-top">
                                  {rawValue}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start gap-1">
                    {programFields.map((field) => (
                      <span key={field.key} className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {fieldValues?.program?.[field.key] ? `${field.label}: ${fieldValues.program[field.key]}` : field.label}
                      </span>
                    ))}
                  </div>
                )}
              </DocumentSection>
            )}

            {enabled.resources && (
              <DocumentSection title="Resources" className="" hideTitle={Boolean(data?.continuation?.resources)} style={{ order: sectionOrder.resources }}>
                {Array.isArray(data?.resourceRows) && data.resourceRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-[10px] text-muted-foreground">
                      <thead>
                        <tr>
                          {resourceFields.map((field) => (
                            <th key={`resource-header-${field.key}`} className="border border-border/70 bg-muted/20 px-1.5 py-1 text-left font-semibold uppercase tracking-wide">
                              {field.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.resourceRows.map((row, rowIdx) => (
                          <tr key={`resource-row-${rowIdx}`}>
                            {resourceFields.map((field) => (
                              <td key={`${field.key}-${rowIdx}`} className="whitespace-pre-wrap border border-border/70 bg-background px-1.5 py-1 align-top">
                                {row[field.key] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : Array.isArray(data?.resourceItems) && data.resourceItems.length > 0 ? (
                  <div className="space-y-1">
                    {data.resourceItems.map((item, idx) => (
                      <p key={`resource-item-${idx}`} className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start gap-1">
                    {resourceFields.map((field) => (
                      <span key={field.key} className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {fieldValues?.resources?.[field.key] ? `${field.label}: ${fieldValues.resources[field.key]}` : field.label}
                      </span>
                    ))}
                  </div>
                )}
              </DocumentSection>
            )}

            {enabled.content && (
              <DocumentSection title="Content" className="" hideTitle={Boolean(data?.continuation?.content)} style={{ order: sectionOrder.content }}>
                {Array.isArray(data?.contentItems?.topicGroups) && data.contentItems.topicGroups.length > 0 ? (
                  <div className="space-y-1.5 text-[10px] text-muted-foreground">
                    {data.contentItems.topicGroups.map((group, topicIdx) => (
                      <div key={`content-topic-${topicIdx}`} className="rounded border border-border/70 bg-background p-1.5">
                        <p className="font-semibold">Topic {topicIdx + 1}: {group.topic}</p>
                        <div className="mt-1 space-y-1 border-l-2 border-border/60 pl-1.5">
                          {group.objectives.map((objective, objectiveIdx) => (
                            <div key={`content-objective-${topicIdx}-${objectiveIdx}`} className="rounded border border-border/60 bg-muted/10 p-1.5">
                              <p className="font-semibold">Objective {objectiveIdx + 1}: {objective.objective}</p>
                              <div className="mt-1 space-y-1 border-l-2 border-border/60 pl-1.5">
                                {objective.tasks.map((task, taskIdx) => (
                                  <div key={`content-task-${topicIdx}-${objectiveIdx}-${taskIdx}`} className="rounded border border-border/60 bg-background p-1.5">
                                    <p className="font-semibold">Task {taskIdx + 1}: {task.task}</p>
                                    <div className="mt-1 space-y-1">
                                      {(() => {
                                        const resolvedTopicIdx = typeof task.topicIndex === "number" ? task.topicIndex : topicIdx
                                        const resolvedObjectiveIdx = typeof task.objectiveIndex === "number" ? task.objectiveIndex : objectiveIdx
                                        const resolvedTaskIdx = typeof task.taskIndex === "number" ? task.taskIndex : taskIdx
                                        const instructionKey = buildTaskAreaKey("content", resolvedTopicIdx, resolvedObjectiveIdx, resolvedTaskIdx, "instruction")
                                        const studentKey = buildTaskAreaKey("content", resolvedTopicIdx, resolvedObjectiveIdx, resolvedTaskIdx, "student")
                                        const teacherKey = buildTaskAreaKey("content", resolvedTopicIdx, resolvedObjectiveIdx, resolvedTaskIdx, "teacher")
                                        return (
                                          <>
                                            {orderedTaskAreas.map((areaKind) => {
                                              const areaConfig = areaKind === "instruction"
                                                ? {
                                                    key: instructionKey,
                                                    title: "Instruction Area",
                                                    seedText: task.instructionArea,
                                                  }
                                                : areaKind === "student"
                                                  ? {
                                                      key: studentKey,
                                                      title: "Student Area",
                                                      seedText: task.studentArea,
                                                    }
                                                  : {
                                                      key: teacherKey,
                                                      title: "Teacher Area",
                                                      seedText: task.teacherArea,
                                                    }

                                              return (
                                                <TaskAreaDropZone
                                                  key={`${areaConfig.key}:zone`}
                                                  title={areaConfig.title}
                                                  seedText={areaConfig.seedText}
                                                  areaKey={areaConfig.key}
                                                  droppedMedia={droppedMediaByArea?.[areaConfig.key] ?? []}
                                                  mediaDragActive={mediaDragActive}
                                                  
                                                  areaHeightClass={densityConfig.areaHeightClass}
                                                  onRemoveMedia={onRemoveAreaMedia}
                                                />
                                              )
                                            })}
                                          </>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (data?.contentItems?.topics?.length || data?.contentItems?.objectives?.length || data?.contentItems?.tasks?.length) ? (
                  <div className="space-y-1.5 text-[10px] text-muted-foreground">
                    {data.contentItems?.topics?.length ? <p><span className="font-semibold">Topics:</span> {data.contentItems.topics.join(" · ")}</p> : null}
                    {data.contentItems?.objectives?.length ? <p><span className="font-semibold">Objectives:</span> {data.contentItems.objectives.join(" · ")}</p> : null}
                    {data.contentItems?.tasks?.length ? <p><span className="font-semibold">Tasks:</span> {data.contentItems.tasks.join(" · ")}</p> : null}
                  </div>
                ) : (
                  <NestedContent
                    topic={fieldEnabled.content?.topic}
                    objective={fieldEnabled.content?.objective}
                    task={fieldEnabled.content?.task}
                    instructionArea={fieldEnabled.content?.instruction_area}
                    studentArea={fieldEnabled.content?.student_area}
                    teacherArea={fieldEnabled.content?.teacher_area}
                    includeProject={fieldEnabled.content?.include_project}
                  />
                )}
              </DocumentSection>
            )}

            {enabled.assignment && (
              <DocumentSection title="Assignment" className="" hideTitle={Boolean(data?.continuation?.assignment)} style={{ order: sectionOrder.assignment }}>
                {Array.isArray(data?.assignmentItems?.topicGroups) && data.assignmentItems.topicGroups.length > 0 ? (
                  <div className="space-y-1.5 text-[10px] text-muted-foreground">
                    {data.assignmentItems.topicGroups.map((topicGroup, topicIdx) => (
                      <div key={`assignment-topic-${topicIdx}`} className="rounded border border-border/70 bg-background p-1.5">
                        <p className="font-semibold">Topic {topicIdx + 1}: {topicGroup.topic}</p>
                        <div className="mt-1 space-y-1 border-l-2 border-border/60 pl-1.5">
                          {topicGroup.objectives.map((objectiveGroup, objectiveIdx) => (
                            <div key={`assignment-objective-${topicIdx}-${objectiveIdx}`} className="rounded border border-border/60 bg-muted/10 p-1.5">
                              <p className="font-semibold">Objective {objectiveIdx + 1}: {objectiveGroup.objective}</p>
                              <div className="mt-1 space-y-1 border-l-2 border-border/60 pl-1.5">
                                {objectiveGroup.tasks.map((task, taskIdx) => (
                                  <div key={`assignment-task-${topicIdx}-${objectiveIdx}-${taskIdx}`} className="rounded border border-border/60 bg-background p-1.5">
                                    <p className="font-semibold">Task {taskIdx + 1}: {task.task}</p>
                                    <div className="mt-1 space-y-1">
                                      {(() => {
                                        const resolvedTopicIdx = typeof task.topicIndex === "number" ? task.topicIndex : topicIdx
                                        const resolvedObjectiveIdx = typeof task.objectiveIndex === "number" ? task.objectiveIndex : objectiveIdx
                                        const resolvedTaskIdx = typeof task.taskIndex === "number" ? task.taskIndex : taskIdx
                                        const instructionKey = buildTaskAreaKey("assignment", resolvedTopicIdx, resolvedObjectiveIdx, resolvedTaskIdx, "instruction")
                                        const studentKey = buildTaskAreaKey("assignment", resolvedTopicIdx, resolvedObjectiveIdx, resolvedTaskIdx, "student")
                                        const teacherKey = buildTaskAreaKey("assignment", resolvedTopicIdx, resolvedObjectiveIdx, resolvedTaskIdx, "teacher")
                                        return (
                                          <>
                                            {orderedTaskAreas.map((areaKind) => {
                                              const areaConfig = areaKind === "instruction"
                                                ? {
                                                    key: instructionKey,
                                                    title: "Instruction Area",
                                                    seedText: task.instructionArea,
                                                  }
                                                : areaKind === "student"
                                                  ? {
                                                      key: studentKey,
                                                      title: "Student Area",
                                                      seedText: task.studentArea,
                                                    }
                                                  : {
                                                      key: teacherKey,
                                                      title: "Teacher Area",
                                                      seedText: task.teacherArea,
                                                    }

                                              return (
                                                <TaskAreaDropZone
                                                  key={`${areaConfig.key}:zone`}
                                                  title={areaConfig.title}
                                                  seedText={areaConfig.seedText}
                                                  areaKey={areaConfig.key}
                                                  droppedMedia={droppedMediaByArea?.[areaConfig.key] ?? []}
                                                  mediaDragActive={mediaDragActive}
                                                  
                                                  areaHeightClass={densityConfig.areaHeightClass}
                                                  onRemoveMedia={onRemoveAreaMedia}
                                                />
                                              )
                                            })}
                                          </>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(data?.assignmentItems?.tasks) && data.assignmentItems.tasks.length > 0 ? (
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    {data.assignmentItems.tasks.map((task, idx) => (
                      <p key={`assignment-item-${idx}`} className="rounded border border-border/70 bg-background px-1.5 py-0.5">{task}</p>
                    ))}
                  </div>
                ) : (
                  <NestedContent
                    topic={fieldEnabled.assignment?.topic}
                    objective={fieldEnabled.assignment?.objective}
                    task={fieldEnabled.assignment?.task}
                    instructionArea={fieldEnabled.assignment?.instruction_area}
                    studentArea={fieldEnabled.assignment?.student_area}
                    teacherArea={fieldEnabled.assignment?.teacher_area}
                    includeProject={fieldEnabled.assignment?.include_project}
                  />
                )}
              </DocumentSection>
            )}

            {enabled.scoring && (
              <DocumentSection title="Scoring" className="" hideTitle={Boolean(data?.continuation?.scoring)} style={{ order: sectionOrder.scoring }}>
                {Array.isArray(data?.scoringItems) && data.scoringItems.length > 0 ? (
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    {data.scoringItems.map((criterion, idx) => (
                      <p key={`scoring-item-${idx}`} className="rounded border border-border/70 bg-background px-1.5 py-0.5">{criterion}</p>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground">Scoring criteria appear here.</div>
                )}
              </DocumentSection>
            )}

            {enabled.footer && (
              <DocumentSection title="Footer" className="" style={{ order: sectionOrder.footer }}>
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex min-w-[180px] flex-wrap items-center gap-1">
                    {fieldEnabled.footer?.copyright && <span className="rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">Copyright</span>}
                    {fieldEnabled.footer?.institution_name && <span className="rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">Institution</span>}
                    {fieldEnabled.footer?.teacher_name && <span className="rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">Teacher</span>}
                  </div>
                  {fieldEnabled.footer?.page_number && (
                    <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground">Page 1</span>
                  )}
                </div>
              </DocumentSection>
            )}
      </div>
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
}: TemplateBlueprintProps) {
  const config = SCALE_CONFIG[scale]
  const meta = TEMPLATE_TYPE_META[type]

  // Use lesson-specific styled preview for lesson type
  if (type === "lesson") {
    return (
      <div className={`h-full w-full ${scrollable ? "overflow-auto" : "overflow-hidden"} bg-background`}>
        <LessonTemplatePreview
          enabled={enabled}
          fieldEnabled={fieldEnabled}
          blockOrder={blockOrder}
          taskAreaOrder={taskAreaOrder}
          scrollable={scrollable}
          density={density}
          bodyBlockGap={bodyBlockGap}
          data={data}
          droppedMediaByArea={droppedMediaByArea}
          mediaDragActive={mediaDragActive}
          
          onRemoveAreaMedia={onRemoveAreaMedia}
        />
      </div>
    )
  }

  // Fallback blueprint for other template types
  const orderedForType = (() => {
    const base = ALL_BLOCKS.filter((block) => block.forTypes.includes(type)).map((block) => block.id)
    if (!blockOrder || blockOrder.length === 0) return base
    const baseSet = new Set(base)
    const preferred = blockOrder.filter((id) => baseSet.has(id))
    const preferredSet = new Set(preferred)
    const missing = base.filter((id) => !preferredSet.has(id))
    return [...preferred, ...missing]
  })()

  const visibleBlocks = orderedForType
    .map((blockId) => ALL_BLOCKS.find((block) => block.id === blockId))
    .filter((block): block is (typeof ALL_BLOCKS)[number] => Boolean(block))
    .filter(
      (b) => (enabled[b.id] || b.mandatory),
    )



  return (
    <div className={`w-full rounded-xl bg-background overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-border bg-muted/40 ${config.headerPadding}`}>
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

      {/* Blueprint Content */}
      <div className={`flex-1 ${scrollable ? "overflow-y-auto" : "overflow-hidden"} ${config.containerPadding}`}>
        <div className={`space-y-${scale === "sm" ? "1" : scale === "md" ? "2" : "3"}`}>
          {/* Header Row - Always First */}
          {enabled.header && (
            <TemplateHeaderBlueprint type={type} fieldEnabled={fieldEnabled} scale={scale} fieldValues={data?.fieldValues?.header} />
          )}

          {/* Other Blocks */}
          {visibleBlocks
            .filter((b) => b.id !== "header" && b.id !== "footer")
            .map((block) => (
              <TemplateBlockBlueprint
                key={block.id}
                blockId={block.id}
                type={type}
                fieldEnabled={fieldEnabled}
                scale={scale}
                fieldValues={data?.fieldValues?.[block.id]}
              />
            ))}

          {/* Footer - Always Last */}
          {enabled.footer && (
            <TemplateBlockBlueprint
              blockId="footer"
              type={type}
              fieldEnabled={fieldEnabled}
              scale={scale}
              fieldValues={data?.fieldValues?.footer}
            />
          )}
        </div>
      </div>
    </div>
  )
}
