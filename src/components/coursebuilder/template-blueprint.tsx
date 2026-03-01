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

function toAreaKeyToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function hashAreaIdentity(value: string): string {
  let hash = 2166136261
  for (let idx = 0; idx < value.length; idx += 1) {
    hash ^= value.charCodeAt(idx)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function buildStableTaskKey(args: {
  block: "content" | "assignment"
  topic: string
  objective: string
  task: string
}): string {
  const topicToken = toAreaKeyToken(args.topic) || "topic"
  const objectiveToken = toAreaKeyToken(args.objective) || "objective"
  const taskToken = toAreaKeyToken(args.task) || "task"
  const identity = `${args.block}|${topicToken}|${objectiveToken}|${taskToken}`
  return `${topicToken}~${objectiveToken}~${taskToken}~${hashAreaIdentity(identity)}`
}

export function buildTaskAreaKey(
  block: "content" | "assignment",
  stableTaskKey: string,
  area: TaskAreaKind,
): string {
  return `${block}:key:${stableTaskKey}:${area}`
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
          stableTaskKey?: string
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
          stableTaskKey?: string
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

// ─── Template render context ──────────────────────────────────────────────
// Shared payload created by TemplateBlueprint and consumed by JsonTemplatePreview and
// BlueprintBodySlot without threading props through every intermediate layer.

interface TemplateBlueprintContextValue {
  enabled: Record<BlockId, boolean>
  data?: TemplateBlueprintData
  droppedMediaByArea?: Record<string, TemplateAreaMediaItem[]>
  mediaDragActive: boolean
  onRemoveAreaMedia?: (areaKey: string, mediaId: string) => void
  orderedTaskAreas: TaskAreaKind[]
  densityAreaHeightClass: string
}

const TemplateBlueprintContext = React.createContext<TemplateBlueprintContextValue | null>(null)

function useTemplateBlueprintContext(): TemplateBlueprintContextValue {
  const ctx = React.useContext(TemplateBlueprintContext)
  if (!ctx) throw new Error("useTemplateBlueprintContext must be used inside TemplateBlueprint")
  return ctx
}

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

function MediaPreview({ media }: { media: TemplateAreaMediaItem }) {
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

function TaskAreaDropZone({
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

// ─── JSON Blueprint Renderer ──────────────────────────────────────────────────
// All template types use this unified renderer. It reads from TEMPLATE_BLUEPRINTS
// and renders the canonical tri-region structure:
//   Header margin  →  body content blocks  →  Footer margin

function SlotSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
      {children}
    </p>
  )
}

function TableSlotView({
  label,
  columns,
}: {
  label: string
  columns: Array<{ key: string; label: string }>
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>{label}</SlotSectionLabel>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[8px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-border/50 bg-muted/20 px-1.5 py-0.5 text-left font-semibold text-muted-foreground last:border-r-0"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1].map((rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    className="border-b border-r border-border/40 px-1.5 py-1 last:border-r-0"
                  >
                    <div
                      className="h-2 rounded-sm bg-muted/50"
                      style={{ width: colIdx === 0 ? "80%" : colIdx === columns.length - 1 ? "55%" : "70%" }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NestedSlotView({
  label,
  areas,
}: {
  label: string
  areas: ("instruction" | "student" | "teacher")[]
}) {
  const areaLabels: Record<string, string> = {
    instruction: "Phase 1",
    student: "Phase 2",
    teacher: "Phase 3",
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>{label}</SlotSectionLabel>
      </div>
      <div className="p-1.5 space-y-1">
        <div className="rounded border border-border/60 bg-background p-1">
          <p className="mb-0.5 text-[7px] font-bold uppercase tracking-wide text-muted-foreground/50">Topic</p>
          <div className="h-1.5 w-4/5 rounded-sm bg-muted/60" />
          <div className="mt-1 ml-1.5 rounded border border-border/50 bg-muted/5 p-1">
            <p className="mb-0.5 text-[7px] font-bold uppercase tracking-wide text-muted-foreground/40">Objective</p>
            <div className="h-1.5 w-3/4 rounded-sm bg-muted/50" />
            <div className="mt-1 ml-1.5 rounded border border-border/40 bg-background p-1">
              <p className="mb-0.5 text-[7px] font-bold uppercase tracking-wide text-muted-foreground/35">Task</p>
              <div className="ml-1 space-y-0.5">
                {areas.map((area) => (
                  <div key={area} className="flex items-center gap-1">
                    <span className="w-12 flex-shrink-0 text-[6px] font-medium uppercase tracking-wide text-muted-foreground/35">
                      {areaLabels[area]}
                    </span>
                    <div className="h-1.5 flex-1 rounded-sm bg-muted/40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoringRubricView({
  columns,
}: {
  columns: Array<{ key: string; label: string }>
}) {
  const previewWeights = ["30 %", "20 %", "25 %"]
  const previewPoints = ["30", "20", "25"]
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>Scoring</SlotSectionLabel>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-[8px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="border-b border-r border-border/50 bg-muted/20 px-1.5 py-0.5 text-left font-semibold text-muted-foreground last:border-r-0"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    className="border-b border-r border-border/40 px-1.5 py-1 last:border-r-0"
                  >
                    {col.key === "weight" ? (
                      <span className="text-[8px] text-muted-foreground/70">{previewWeights[rowIdx]}</span>
                    ) : col.key === "max_points" ? (
                      <span className="text-[8px] text-muted-foreground/70">{previewPoints[rowIdx]}</span>
                    ) : (
                      <div
                        className="h-2 rounded-sm bg-muted/50"
                        style={{ width: colIdx === 0 ? "85%" : "65%" }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TocListView() {
  const entries = [
    { level: "module", label: "Module 1 — Introduction",     page: "1" },
    { level: "lesson", label: "Lesson 1.1 — Overview",        page: "2" },
    { level: "lesson", label: "Lesson 1.2 — Core Concepts",   page: "4" },
    { level: "module", label: "Module 2 — Fundamentals",      page: "7" },
    { level: "lesson", label: "Lesson 2.1 — Principles",      page: "8" },
    { level: "lesson", label: "Lesson 2.2 — Application",     page: "10"},
    { level: "module", label: "Module 3 — Advanced Topics",   page: "13"},
    { level: "lesson", label: "Lesson 3.1 — Deep Dive",       page: "14"},
  ]
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>Table of Contents</SlotSectionLabel>
      </div>
      <div className="p-2">
        <div className="space-y-0.5">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-baseline gap-1 ${entry.level === "lesson" ? "pl-3" : ""}`}
            >
              <span
                className={`flex-shrink-0 text-[8px] leading-snug ${
                  entry.level === "module"
                    ? "font-semibold text-foreground/70"
                    : "text-muted-foreground/65"
                }`}
              >
                {entry.label}
              </span>
              <span className="flex-1 overflow-hidden text-[7px] leading-snug text-muted-foreground/25 tracking-widest">
                ···································································
              </span>
              <span className="flex-shrink-0 text-[8px] font-semibold tabular-nums text-muted-foreground/60">
                {entry.page}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CertificateBodyView() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>Certificate</SlotSectionLabel>
      </div>
      <div className="flex flex-col items-center gap-2 p-4 text-center">
        <div className="h-px w-full bg-border/50" />
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/55">
          Certificate of Completion
        </p>
        <div className="h-px w-full bg-border/50" />
        <div className="space-y-1.5 py-1">
          <p className="text-[8px] text-muted-foreground/55">This is to certify that</p>
          <div className="mx-auto h-px w-32 bg-border/60" />
          <p className="text-[8px] text-muted-foreground/55">has successfully completed</p>
          <div className="mx-auto h-2 w-36 rounded-sm bg-muted/50" />
        </div>
        <div className="flex w-full items-end justify-around pt-1">
          {["Signature", "Date"].map((label) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <div className="h-px w-20 bg-border/55" />
              <p className="text-[7px] text-muted-foreground/45">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DiscussionPromptView() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>Discussion Prompt</SlotSectionLabel>
      </div>
      <div className="p-1.5 space-y-2">
        <div className="rounded border border-border/40 bg-background p-1.5 space-y-1">
          {[1, 0.85, 0.6].map((w, i) => (
            <div key={i} className="h-1.5 rounded-sm bg-muted/50" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
        <div className="space-y-0.5">
          <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/45">Response</p>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-px w-full border-b border-border/30" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ReflectionJournalView() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>Reflection Journal</SlotSectionLabel>
      </div>
      <div className="p-1.5 space-y-0.5">
        <div className="mb-2 h-1.5 w-3/4 rounded-sm bg-muted/40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-px w-full border-b border-border/25" />
        ))}
      </div>
    </div>
  )
}

function SurveyFormView() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
        <SlotSectionLabel>Survey</SlotSectionLabel>
      </div>
      <div className="p-1.5 space-y-2">
        {[1, 2, 3].map((qNum) => (
          <div key={qNum} className="space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-semibold text-muted-foreground/50">{qNum}.</span>
              <div className="h-1.5 flex-1 rounded-sm bg-muted/50" />
            </div>
            <div className="flex items-center gap-2 pl-3">
              {["A", "B", "C", "D"].map((opt) => (
                <span key={opt} className="inline-flex items-center gap-0.5 text-[7px] text-muted-foreground/45">
                  <span className="h-1.5 w-1.5 rounded-full border border-border/45" />
                  {opt}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveNestedSlot({
  label,
  block,
  topicGroups,
  areaFilter,
  isContinuation,
}: {
  label: string
  block: "content" | "assignment"
  topicGroups: NonNullable<TemplateBlueprintData["contentItems"]>["topicGroups"]
  areaFilter: TaskAreaKind[]
  isContinuation: boolean
}) {
  const { orderedTaskAreas, droppedMediaByArea, mediaDragActive, onRemoveAreaMedia, densityAreaHeightClass } = useTemplateBlueprintContext()
  if (!topicGroups || topicGroups.length === 0) {
    return <NestedSlotView label={label} areas={areaFilter} />
  }
  const resolvedAreas = orderedTaskAreas.filter((a) => areaFilter.includes(a))
  const phaseLabels = ["Phase I", "Phase II", "Phase III"] as const
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/60">
      {!isContinuation && (
        <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
          <SlotSectionLabel>{label}</SlotSectionLabel>
        </div>
      )}
      <div className="min-h-0 overflow-hidden p-1.5 space-y-1.5 text-[10px] text-muted-foreground">
        {topicGroups.map((group, topicIdx) => (
          <div key={topicIdx} className="rounded border border-border/70 bg-background p-1.5">
            <p className="font-semibold">Topic {topicIdx + 1}: {group.topic}</p>
            <div className="mt-1 space-y-1 border-l-2 border-border/60 pl-1.5">
              {group.objectives.map((objective, objIdx) => (
                <div key={objIdx} className="rounded border border-border/60 bg-muted/10 p-1.5">
                  <p className="font-semibold">Objective {objIdx + 1}: {objective.objective}</p>
                  <div className="mt-1 space-y-1 border-l-2 border-border/60 pl-1.5">
                    {objective.tasks.map((task, taskIdx) => {
                      const stableTaskKey = task.stableTaskKey ?? buildStableTaskKey({
                        block,
                        topic: group.topic,
                        objective: objective.objective,
                        task: task.task,
                      })
                      return (
                        <div key={taskIdx} className="rounded border border-border/60 bg-background p-1.5">
                          <p className="font-semibold">Task {taskIdx + 1}: {task.task}</p>
                          <div className="mt-1 flex flex-col gap-1">
                            {resolvedAreas.map((areaKind, areaIndex) => {
                              const areaKey = buildTaskAreaKey(block, stableTaskKey, areaKind)
                              const phaseLabel = phaseLabels[Math.min(areaIndex, phaseLabels.length - 1)]
                              return (
                                <div key={`${areaKey}:wrap`} className="space-y-0.5">
                                  <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">
                                    {phaseLabel}
                                  </p>
                                  <TaskAreaDropZone
                                    key={`${areaKey}:zone`}
                                    seedText={phaseLabel}
                                    areaKey={areaKey}
                                    droppedMedia={droppedMediaByArea?.[areaKey] ?? []}
                                    mediaDragActive={mediaDragActive}
                                    areaHeightClass={densityAreaHeightClass}
                                    onRemoveMedia={onRemoveAreaMedia}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BlueprintBodySlot({
  slot,
  isContinuation = false,
}: {
  slot: BodySlot
  isContinuation?: boolean
}) {
  const { enabled, data } = useTemplateBlueprintContext()

  const blockId = slotToBlockId(slot.kind) as BlockId | null
  if (blockId && !enabled[blockId]) return null


  switch (slot.kind) {
    case "program_table": {
      if (data?.programRows && data.programRows.length > 0) {
        const cols = slot.columns
        return (
          <div className="overflow-hidden rounded-lg border border-border/60">
            {!isContinuation && (
              <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
                <SlotSectionLabel>Program</SlotSectionLabel>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[10px] text-muted-foreground">
                <thead>
                  <tr>
                    {cols.map((col) => (
                      <th key={col.key} className="border-b border-r border-border/50 bg-muted/20 px-1.5 py-0.5 text-left font-semibold text-muted-foreground last:border-r-0">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.programRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {cols.map((col) => {
                        const rawValue = row[col.key] || "—"
                        const segmentedLines = (col.key === "objective" || col.key === "task")
                          ? String(rawValue).split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
                          : []
                        if (segmentedLines.length > 0) {
                          return (
                            <td key={col.key} className="border-b border-r border-border/40 bg-background p-0 align-top last:border-r-0">
                              <div className="flex flex-col">
                                {segmentedLines.map((line, lineIdx) => (
                                  <div key={lineIdx} className={`px-1.5 py-1 ${lineIdx > 0 ? "border-t border-border/40" : ""}`}>{line}</div>
                                ))}
                              </div>
                            </td>
                          )
                        }
                        return (
                          <td key={col.key} className="whitespace-pre-wrap border-b border-r border-border/40 bg-background px-1.5 py-1 align-top last:border-r-0">
                            {rawValue}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
      return <TableSlotView label="Program" columns={slot.columns} />
    }

    case "resources_table": {
      if (data?.resourceRows && data.resourceRows.length > 0) {
        const cols = slot.columns
        return (
          <div className="overflow-hidden rounded-lg border border-border/60">
            {!isContinuation && (
              <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
                <SlotSectionLabel>Resources</SlotSectionLabel>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[10px] text-muted-foreground">
                <thead>
                  <tr>
                    {cols.map((col) => (
                      <th key={col.key} className="border-b border-r border-border/50 bg-muted/20 px-1.5 py-0.5 text-left font-semibold text-muted-foreground last:border-r-0">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.resourceRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {cols.map((col) => (
                        <td key={col.key} className="whitespace-pre-wrap border-b border-r border-border/40 bg-background px-1.5 py-1 align-top last:border-r-0">
                          {row[col.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
      return <TableSlotView label="Resources" columns={slot.columns} />
    }

    case "content_nested":
      return (
        <LiveNestedSlot
          label="Content"
          block="content"
          topicGroups={data?.contentItems?.topicGroups}
          areaFilter={slot.areas}
          isContinuation={isContinuation}
        />
      )

    case "assignment_nested":
      return (
        <LiveNestedSlot
          label="Assignment"
          block="assignment"
          topicGroups={data?.assignmentItems?.topicGroups}
          areaFilter={slot.areas}
          isContinuation={isContinuation}
        />
      )

    case "scoring_rubric": {
      if (data?.scoringItems && data.scoringItems.length > 0) {
        return (
          <div className="overflow-hidden rounded-lg border border-border/60">
            {!isContinuation && (
              <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
                <SlotSectionLabel>Scoring</SlotSectionLabel>
              </div>
            )}
            <div className="p-1.5 space-y-1 text-[10px] text-muted-foreground">
              {data.scoringItems.map((criterion, idx) => (
                <p key={idx} className="rounded border border-border/70 bg-background px-1.5 py-0.5">{criterion}</p>
              ))}
            </div>
          </div>
        )
      }
      return <ScoringRubricView columns={slot.columns} />
    }

    case "toc_list":
      return <TocListView />
    case "certificate_body":
      return <CertificateBodyView />
    case "discussion_prompt":
      return <DiscussionPromptView />
    case "reflection_journal":
      return <ReflectionJournalView />
    case "survey_form":
      return <SurveyFormView />
    default:
      return null
  }
}

function MarginBand({
  side,
  left,
  right,
  fieldValues,
}: {
  side: "top" | "bottom"
  left: Array<{ key: string; label: string }>
  right: Array<{ key: string; label: string }>
  fieldValues?: Record<string, string>
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 bg-muted/[0.13] px-2 py-1 ${
        side === "top" ? "border-b" : "border-t"
      } border-border/40`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {left.map((field, idx) => (
          <React.Fragment key={field.key}>
            {idx > 0 && <span className="text-[8px] text-muted-foreground/30">·</span>}
            <span className="rounded border border-border/40 bg-background/70 px-1.5 py-0.5 text-[8px] text-muted-foreground/65">
              {fieldValues?.[field.key] ?? field.label}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1">
        {right.map((field) => (
          <span
            key={field.key}
            className={`rounded border px-1.5 py-0.5 text-[8px] ${
              field.key === "page_number"
                ? "border-border/45 bg-background font-semibold text-foreground/55"
                : "border-border/40 bg-background/70 text-muted-foreground/65"
            }`}
          >
            {fieldValues?.[field.key] ?? (field.key === "page_number" ? "1" : field.label)}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Unified JSON-driven template preview.
 *
 * Reads TEMPLATE_BLUEPRINTS for the given type and renders the canonical
 * tri-region layout:
 *   Header margin  /  Body content blocks  /  Footer margin
 *
 * The same visual logic is used in the configurator preview and when a
 * template is baked into the canvas, ensuring identical appearance everywhere.
 *
 * Set `omitMargins` to skip the header/footer band rendering — used in canvas
 * mode where TemplateSurface renders the margin bands itself.
 */
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
