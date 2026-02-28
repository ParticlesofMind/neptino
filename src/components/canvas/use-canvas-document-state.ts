"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { TemplateAreaMediaItem } from "@/components/coursebuilder/template-blueprint"
import type { MediaAsset } from "@/components/canvas/create-view-types"
import { normalizeMediaCategory } from "@/components/canvas/use-media-library-assets"
import { planLessonBodyLayout, type LessonCanvasPageProjection } from "@/lib/curriculum/canvas-projection"

interface CanvasDocumentPayload {
  schemaVersion: number
  droppedMediaByArea: Record<string, TemplateAreaMediaItem[]>
}

type TaskAreaKind = "instruction" | "student" | "teacher"

interface ParsedTaskAreaKey {
  block: "content" | "assignment"
  baseKey: string
  area: TaskAreaKind
  siblingAreaKeys: string[]
}

const TASK_AREA_KINDS: TaskAreaKind[] = ["instruction", "student", "teacher"]

interface PlacementConstraints {
  containerWidthPx: number
}

let canvasTablesMissingDetected = false

type DropPlacementResult = {
  status: "placed-current" | "placed-next" | "rejected-no-fit" | "rejected-invalid"
  areaKey: string
  targetPageGlobal?: number
}

function isMissingCanvasTableError(error: unknown, tableName: string): boolean {
  if (!error || typeof error !== "object") return false
  const maybe = error as { code?: string; message?: string; details?: string; hint?: string }
  const text = [maybe.message, maybe.details, maybe.hint].filter(Boolean).join(" ").toLowerCase()
  return maybe.code === "PGRST205" || text.includes(tableName)
}

function normalizeDroppedMediaByArea(
  value: unknown,
): Record<string, TemplateAreaMediaItem[]> {
  if (!value || typeof value !== "object") {
    return {}
  }

  const entries = Object.entries(value as Record<string, unknown>).map(([areaKey, areaValue]) => {
    const normalizedItems = Array.isArray(areaValue)
      ? areaValue
          .filter((item): item is Partial<TemplateAreaMediaItem> => Boolean(item) && typeof item === "object")
          .map((item) => ({
            id: String(item.id ?? crypto.randomUUID()),
            title: String(item.title ?? "Media"),
            description: String(item.description ?? ""),
            mediaType: String(item.mediaType ?? "media"),
            category: String(item.category ?? normalizeMediaCategory(String(item.mediaType ?? "media"))),
            url: String(item.url ?? ""),
          }))
      : []
    return [areaKey, normalizedItems] as const
  })

  return Object.fromEntries(entries)
}

function normalizeMediaItem(input: Partial<MediaAsset> | TemplateAreaMediaItem | null | undefined): TemplateAreaMediaItem | null {
  if (!input) return null
  const base = input as Partial<MediaAsset>
  return {
    id: String(base.id ?? crypto.randomUUID()),
    title: String(base.title ?? "Media"),
    description: String(base.description ?? ""),
    mediaType: String(base.mediaType ?? "media"),
    category: String(base.category ?? normalizeMediaCategory(String(base.mediaType ?? "media"))),
    url: String(base.url ?? ""),
  }
}

function parseDraggedMediaPayload(raw: string): TemplateAreaMediaItem | null {
  try {
    const parsed = JSON.parse(raw) as Partial<MediaAsset>
    return normalizeMediaItem(parsed)
  } catch {
    return null
  }
}

function parseTaskAreaKey(areaKey: string): ParsedTaskAreaKey | null {
  const parts = areaKey.split(":")
  if (parts.length !== 4) return null

  const block = parts[0]
  if (block !== "content" && block !== "assignment") return null

  if (parts[1] !== "key") return null
  const stableTaskKey = parts[2]
  if (!stableTaskKey) return null

  const areaRaw = parts[3]
  if (!TASK_AREA_KINDS.includes(areaRaw as TaskAreaKind)) return null

  const area = areaRaw as TaskAreaKind
  const baseKey = `${block}:key:${stableTaskKey}`
  const siblingAreaKeys = TASK_AREA_KINDS.map((kind) => `${baseKey}:${kind}`)

  return {
    block,
    baseKey,
    area,
    siblingAreaKeys,
  }
}

export function useCanvasDocumentState({
  supabase,
  courseId,
  lessonPages,
  currentLessonPageGlobal,
  currentDocumentKey,
  currentCanvasScopeKey,
  setMediaDragActive,
  onMediaConsumed,
  onDropPlacementResult,
}: {
  supabase: SupabaseClient
  courseId?: string | null
  lessonPages: LessonCanvasPageProjection[]
  currentLessonPageGlobal: number | null
  currentDocumentKey: string | null
  currentCanvasScopeKey: string
  setMediaDragActive: (active: boolean) => void
  onMediaConsumed?: (media: TemplateAreaMediaItem) => void
  onDropPlacementResult?: (result: DropPlacementResult) => void
}) {
  const [droppedMediaByScope, setDroppedMediaByScope] = useState<Record<string, Record<string, TemplateAreaMediaItem[]>>>({})
  const [canvasDocumentId, setCanvasDocumentId] = useState<string | null>(null)
  const [documentReadyKey, setDocumentReadyKey] = useState<string | null>(null)
  const [canvasPersistenceDisabled, setCanvasPersistenceDisabled] = useState(canvasTablesMissingDetected)

  const disableCanvasPersistence = useCallback(() => {
    canvasTablesMissingDetected = true
    setCanvasPersistenceDisabled(true)
  }, [])

  const lessonPagesByGlobal = useMemo(() => {
    const map = new Map<number, LessonCanvasPageProjection>()
    lessonPages.forEach((page) => map.set(page.globalPage, page))
    return map
  }, [lessonPages])

  const currentLessonProjection = useMemo(
    () => (typeof currentLessonPageGlobal === "number" ? lessonPagesByGlobal.get(currentLessonPageGlobal) ?? null : null),
    [currentLessonPageGlobal, lessonPagesByGlobal],
  )

  const currentSessionPageGlobals = useMemo(() => {
    if (!currentLessonProjection) return [] as number[]
    return lessonPages
      .filter((page) => page.sessionId === currentLessonProjection.sessionId)
      .map((page) => page.globalPage)
      .sort((a, b) => a - b)
  }, [currentLessonProjection, lessonPages])

  const activeBlocksByGlobalPage = useMemo(() => {
    const map = new Map<number, Set<string>>()

    lessonPages.forEach((page) => {
      const topicsPerLesson = Math.max(1, page.topicCount || page.topics.length || 1)
      const objectivesPerTopic = Math.max(1, page.objectiveCount || page.objectives.length || 1)
      const tasksPerObjective = Math.max(1, page.taskCount || page.tasks.length || 1)
      const enabledBlocks = page.enabledBlocks.filter((block) => (
        block === "program" || block === "resources" || block === "content" || block === "assignment" || block === "scoring"
      ))

      const layoutPlan = planLessonBodyLayout({
        topicCount: topicsPerLesson,
        objectiveCount: objectivesPerTopic,
        taskCount: tasksPerObjective,
        enabledBlocks,
      })

      const chunksOnPage = layoutPlan.chunks.filter((chunk) => chunk.page === page.localPage)
      const activeBlocksOnPage = new Set(chunksOnPage.map((chunk) => chunk.blockId))

      if (chunksOnPage.length === 0 && page.localPage > layoutPlan.totalPages) {
        const lastPageChunks = layoutPlan.chunks.filter((chunk) => chunk.page === layoutPlan.totalPages)
        const fallbackPriority = ["content", "assignment", "resources", "scoring", "program"] as const
        fallbackPriority.forEach((blockId) => {
          if (lastPageChunks.some((chunk) => chunk.blockId === blockId)) {
            activeBlocksOnPage.add(blockId)
          }
        })
      }

      map.set(page.globalPage, activeBlocksOnPage)
    })

    return map
  }, [lessonPages])

  const currentDroppedMediaByArea = useMemo(
    () => normalizeDroppedMediaByArea(droppedMediaByScope[currentCanvasScopeKey]),
    [currentCanvasScopeKey, droppedMediaByScope],
  )

  const estimateMediaHeightPx = useCallback((mediaItem: TemplateAreaMediaItem, containerWidthPx: number): number => {
    const clampedWidth = Math.max(220, Math.min(640, Math.round(containerWidthPx || 320)))
    const category = String(mediaItem.category || "").toLowerCase()
    if (category === "videos") return Math.round(clampedWidth * 9 / 16) + 56
    if (category === "images") return Math.round(clampedWidth * 9 / 16) + 36
    if (category === "audio") return 76
    if (category === "text") return Math.round(clampedWidth * 9 / 16) + 44
    return 98
  }, [])

  const estimateAreaHeightPx = useCallback((items: TemplateAreaMediaItem[], containerWidthPx: number): number => {
    if (items.length === 0) return 48
    const contentHeight = items.reduce((sum, item) => sum + estimateMediaHeightPx(item, containerWidthPx), 0)
    const gapHeight = Math.max(0, items.length - 1) * 8
    return contentHeight + gapHeight + 24
  }, [estimateMediaHeightPx])

  const buildScopeKeyForPage = useCallback((pageGlobal: number): string => {
    if (courseId) return `${courseId}:${pageGlobal}`
    return `local:${pageGlobal}`
  }, [courseId])

  const getDroppedMediaByPageGlobal = useCallback((pageGlobal: number): Record<string, TemplateAreaMediaItem[]> => {
    const scopeKey = buildScopeKeyForPage(pageGlobal)
    return normalizeDroppedMediaByArea(droppedMediaByScope[scopeKey])
  }, [buildScopeKeyForPage, droppedMediaByScope])

  const getScopeAreaItems = useCallback((scopeKey: string, areaKey: string): TemplateAreaMediaItem[] => {
    const scopeValue = droppedMediaByScope[scopeKey] ?? {}
    return Array.isArray(scopeValue[areaKey]) ? scopeValue[areaKey] : []
  }, [droppedMediaByScope])

  const getTaskGroupHeightForScope = useCallback((scopeKey: string, siblingAreaKeys: string[], containerWidthPx: number): number => {
    return siblingAreaKeys.reduce((sum, siblingAreaKey) => {
      return sum + estimateAreaHeightPx(getScopeAreaItems(scopeKey, siblingAreaKey), containerWidthPx)
    }, 0)
  }, [estimateAreaHeightPx, getScopeAreaItems])

  const findAnchoredPageForTask = useCallback((startPage: number, siblingAreaKeys: string[]): number => {
    let anchoredPage = startPage
    for (const page of currentSessionPageGlobals.filter((global) => global >= startPage)) {
      const scopeKey = buildScopeKeyForPage(page)
      const hasAnySiblingMedia = siblingAreaKeys.some((siblingAreaKey) => getScopeAreaItems(scopeKey, siblingAreaKey).length > 0)
      if (hasAnySiblingMedia) anchoredPage = page
    }
    return anchoredPage
  }, [buildScopeKeyForPage, currentSessionPageGlobals, getScopeAreaItems])

  const isAreaBlockActiveOnPage = useCallback((areaKey: string, pageGlobal: number): boolean => {
    const parsedArea = parseTaskAreaKey(areaKey)
    if (!parsedArea) return false
    return activeBlocksByGlobalPage.get(pageGlobal)?.has(parsedArea.block) ?? false
  }, [activeBlocksByGlobalPage])

  const appendMediaToArea = useCallback((scopeKey: string, areaKey: string, mediaItem: TemplateAreaMediaItem) => {
    let nextScopeValue: Record<string, TemplateAreaMediaItem[]> = {}
    setDroppedMediaByScope((prev) => {
      const scopeValue = prev[scopeKey] ?? {}
      const existing = Array.isArray(scopeValue[areaKey]) ? scopeValue[areaKey] : []
      const next = existing.some((entry) => entry.id === mediaItem.id || (entry.url && entry.url === mediaItem.url))
        ? existing
        : [...existing, mediaItem]
      nextScopeValue = {
        ...scopeValue,
        [areaKey]: next,
      }
      return {
        ...prev,
        [scopeKey]: nextScopeValue,
      }
    })
    return nextScopeValue
  }, [])

  const persistDroppedMediaForPage = useCallback(async (pageGlobal: number, droppedMediaByArea: Record<string, TemplateAreaMediaItem[]>) => {
    if (!courseId || canvasPersistenceDisabled) return
    const documentPayload: CanvasDocumentPayload = {
      schemaVersion: 1,
      droppedMediaByArea: normalizeDroppedMediaByArea(droppedMediaByArea),
    }

    const { error } = await supabase
      .from("canvas_documents")
      .upsert(
        {
          course_id: courseId,
          page_global: pageGlobal,
          schema_version: 1,
          document: documentPayload,
        },
        { onConflict: "course_id,page_global" },
      )
    if (isMissingCanvasTableError(error, "canvas_documents")) {
      disableCanvasPersistence()
    }
  }, [canvasPersistenceDisabled, courseId, disableCanvasPersistence, supabase])

  const resolveDropTargetPageGlobal = useCallback((
    areaKey: string,
    mediaItem: TemplateAreaMediaItem,
    constraints: PlacementConstraints,
  ): number | null => {
    if (typeof currentLessonPageGlobal !== "number") return null

    const parsedArea = parseTaskAreaKey(areaKey)
    if (!parsedArea) return null

    const widthPx = Math.max(220, Math.round(constraints.containerWidthPx || 320))
    const areaHeightBudgetPx = Math.max(220, Math.min(440, Math.round(widthPx * 1.1)))
    const groupHeightBudgetPx = Math.round(areaHeightBudgetPx * 2.25)
    const mediaHeightPx = estimateMediaHeightPx(mediaItem, widthPx)
    const anchoredStartPage = findAnchoredPageForTask(currentLessonPageGlobal, parsedArea.siblingAreaKeys)
    const candidatePages = currentSessionPageGlobals.filter((pageGlobal) => pageGlobal >= anchoredStartPage)

    for (const page of candidatePages) {
      if (!isAreaBlockActiveOnPage(areaKey, page)) continue
      const scopeKey = buildScopeKeyForPage(page)
      const areaItems = getScopeAreaItems(scopeKey, areaKey)
      const groupHeightPx = getTaskGroupHeightForScope(scopeKey, parsedArea.siblingAreaKeys, widthPx)
      const nextAreaHeightPx = estimateAreaHeightPx(areaItems, widthPx) + mediaHeightPx
      const nextGroupHeightPx = groupHeightPx + mediaHeightPx

      if (nextAreaHeightPx <= areaHeightBudgetPx && nextGroupHeightPx <= groupHeightBudgetPx) {
        return page
      }
    }

    return null
  }, [buildScopeKeyForPage, currentLessonPageGlobal, currentSessionPageGlobals, estimateAreaHeightPx, estimateMediaHeightPx, findAnchoredPageForTask, getScopeAreaItems, getTaskGroupHeightForScope, isAreaBlockActiveOnPage])

  const recordMediaDropOp = useCallback((areaKey: string, mediaItem: TemplateAreaMediaItem) => {
    if (!(courseId && typeof currentLessonPageGlobal === "number" && canvasDocumentId) || canvasPersistenceDisabled) return
    void supabase.from("canvas_document_ops").insert({
      document_id: canvasDocumentId,
      course_id: courseId,
      page_global: currentLessonPageGlobal,
      operation_type: "media_drop",
      operation_payload: {
        areaKey,
        media: mediaItem,
        at: Date.now(),
      },
    }).then(({ error }) => {
      if (isMissingCanvasTableError(error, "canvas_document_ops")) {
        disableCanvasPersistence()
      }
    })
  }, [canvasDocumentId, canvasPersistenceDisabled, courseId, currentLessonPageGlobal, disableCanvasPersistence, supabase])

  const onDropAreaMedia = useCallback((areaKey: string, media: MediaAsset, containerWidthPx?: number) => {
    if (!parseTaskAreaKey(areaKey)) {
      onDropPlacementResult?.({ status: "rejected-invalid", areaKey })
      setMediaDragActive(false)
      return
    }

    const mediaItem = normalizeMediaItem(media)
    if (!mediaItem) {
      setMediaDragActive(false)
      return
    }

    const widthPx = Math.max(220, Math.round(containerWidthPx ?? 320))
    const targetPageGlobal = resolveDropTargetPageGlobal(areaKey, mediaItem, { containerWidthPx: widthPx })
    const resolvedPageGlobal = targetPageGlobal ?? currentLessonPageGlobal

    if (typeof targetPageGlobal === "number" && typeof resolvedPageGlobal === "number") {
      const targetScopeKey = buildScopeKeyForPage(resolvedPageGlobal)
      const nextScopeValue = appendMediaToArea(targetScopeKey, areaKey, mediaItem)
      void persistDroppedMediaForPage(resolvedPageGlobal, nextScopeValue)
      onMediaConsumed?.(mediaItem)
      onDropPlacementResult?.({
        status: resolvedPageGlobal === currentLessonPageGlobal ? "placed-current" : "placed-next",
        areaKey,
        targetPageGlobal: resolvedPageGlobal,
      })
    } else {
      onDropPlacementResult?.({ status: "rejected-no-fit", areaKey })
    }

    if (targetPageGlobal === currentLessonPageGlobal) {
      recordMediaDropOp(areaKey, mediaItem)
    }
    setMediaDragActive(false)
  }, [appendMediaToArea, buildScopeKeyForPage, currentLessonPageGlobal, onDropPlacementResult, onMediaConsumed, persistDroppedMediaForPage, recordMediaDropOp, resolveDropTargetPageGlobal, setMediaDragActive])

  const onHtmlAreaDrop = useCallback((areaKey: string, rawPayload: string) => {
    if (!parseTaskAreaKey(areaKey)) {
      onDropPlacementResult?.({ status: "rejected-invalid", areaKey })
      return
    }

    const mediaItem = parseDraggedMediaPayload(rawPayload)
    if (!mediaItem) return
    const targetPageGlobal = resolveDropTargetPageGlobal(areaKey, mediaItem, { containerWidthPx: 320 })
    const resolvedPageGlobal = targetPageGlobal ?? currentLessonPageGlobal

    if (typeof targetPageGlobal === "number" && typeof resolvedPageGlobal === "number") {
      const targetScopeKey = buildScopeKeyForPage(resolvedPageGlobal)
      const nextScopeValue = appendMediaToArea(targetScopeKey, areaKey, mediaItem)
      void persistDroppedMediaForPage(resolvedPageGlobal, nextScopeValue)
      onMediaConsumed?.(mediaItem)
      onDropPlacementResult?.({
        status: resolvedPageGlobal === currentLessonPageGlobal ? "placed-current" : "placed-next",
        areaKey,
        targetPageGlobal: resolvedPageGlobal,
      })
    } else {
      onDropPlacementResult?.({ status: "rejected-no-fit", areaKey })
    }

    if (targetPageGlobal === currentLessonPageGlobal) {
      recordMediaDropOp(areaKey, mediaItem)
    }
    setMediaDragActive(false)
  }, [appendMediaToArea, buildScopeKeyForPage, currentLessonPageGlobal, onDropPlacementResult, onMediaConsumed, persistDroppedMediaForPage, recordMediaDropOp, resolveDropTargetPageGlobal, setMediaDragActive])

  const onRemoveAreaMedia = useCallback((areaKey: string, mediaId: string) => {
    setDroppedMediaByScope((prev) => {
      const scopeValue = prev[currentCanvasScopeKey] ?? {}
      const existing = Array.isArray(scopeValue[areaKey]) ? scopeValue[areaKey] : []
      const next = existing.filter((entry) => entry.id !== mediaId)
      if (next.length === 0) {
        const remainingAreas = Object.fromEntries(
          Object.entries(scopeValue).filter(([key]) => key !== areaKey),
        )
        return {
          ...prev,
          [currentCanvasScopeKey]: remainingAreas,
        }
      }
      return {
        ...prev,
        [currentCanvasScopeKey]: {
          ...scopeValue,
          [areaKey]: next,
        },
      }
    })
  }, [currentCanvasScopeKey])

  const rebalanceOverflowForPage = useCallback((pageGlobal: number, containerWidthPx = 320): boolean => {
    const currentPage = lessonPagesByGlobal.get(pageGlobal)
    if (!currentPage) return false

    const sessionPages = lessonPages
      .filter((page) => page.sessionId === currentPage.sessionId)
      .sort((a, b) => a.localPage - b.localPage)

    const nextPage = sessionPages.find((page) => page.localPage === currentPage.localPage + 1)
    if (!nextPage) return false

    const sourceScopeKey = buildScopeKeyForPage(pageGlobal)
    const targetScopeKey = buildScopeKeyForPage(nextPage.globalPage)
    const widthPx = Math.max(220, Math.round(containerWidthPx || 320))
    const areaHeightBudgetPx = Math.max(220, Math.min(440, Math.round(widthPx * 1.1)))
    const groupHeightBudgetPx = Math.round(areaHeightBudgetPx * 2.25)

    let movedAny = false
    let nextSourceScopeValue: Record<string, TemplateAreaMediaItem[]> = {}
    let nextTargetScopeValue: Record<string, TemplateAreaMediaItem[]> = {}

    setDroppedMediaByScope((prev) => {
      const sourceScopeValue = { ...(prev[sourceScopeKey] ?? {}) }
      const targetScopeValue = { ...(prev[targetScopeKey] ?? {}) }

      const getItems = (scopeValue: Record<string, TemplateAreaMediaItem[]>, areaKey: string): TemplateAreaMediaItem[] => {
        const items = scopeValue[areaKey]
        return Array.isArray(items) ? items : []
      }

      const sourceAreaKeys = Object.keys(sourceScopeValue)
      const groups = new Map<string, string[]>()

      sourceAreaKeys.forEach((areaKey) => {
        const parsedArea = parseTaskAreaKey(areaKey)
        if (!parsedArea) return
        if (!isAreaBlockActiveOnPage(areaKey, pageGlobal) || !isAreaBlockActiveOnPage(areaKey, nextPage.globalPage)) return
        groups.set(parsedArea.baseKey, parsedArea.siblingAreaKeys)
      })

      groups.forEach((siblingAreaKeys) => {
        let guard = 0
        while (guard < 80) {
          guard += 1
          const areaHeights = siblingAreaKeys.map((areaKey) => ({
            areaKey,
            height: estimateAreaHeightPx(getItems(sourceScopeValue, areaKey), widthPx),
            count: getItems(sourceScopeValue, areaKey).length,
          }))
          const groupHeight = areaHeights.reduce((sum, entry) => sum + entry.height, 0)
          const areaOverflow = areaHeights.some((entry) => entry.height > areaHeightBudgetPx)
          const groupOverflow = groupHeight > groupHeightBudgetPx

          if (!areaOverflow && !groupOverflow) {
            break
          }

          const candidate = areaHeights
            .filter((entry) => entry.count > 0)
            .sort((a, b) => b.height - a.height)[0]

          if (!candidate) {
            break
          }

          const sourceItems = getItems(sourceScopeValue, candidate.areaKey)
          if (sourceItems.length === 0) break

          const movedItem = sourceItems[sourceItems.length - 1]
          sourceScopeValue[candidate.areaKey] = sourceItems.slice(0, -1)
          const targetItems = getItems(targetScopeValue, candidate.areaKey)
          targetScopeValue[candidate.areaKey] = [movedItem, ...targetItems]
          movedAny = true
        }
      })

      const cleanedSourceScopeValue = Object.fromEntries(
        Object.entries(sourceScopeValue).filter(([, items]) => Array.isArray(items) && items.length > 0),
      )
      const cleanedTargetScopeValue = Object.fromEntries(
        Object.entries(targetScopeValue).filter(([, items]) => Array.isArray(items) && items.length > 0),
      )

      nextSourceScopeValue = cleanedSourceScopeValue
      nextTargetScopeValue = cleanedTargetScopeValue

      if (!movedAny) return prev

      return {
        ...prev,
        [sourceScopeKey]: cleanedSourceScopeValue,
        [targetScopeKey]: cleanedTargetScopeValue,
      }
    })

    if (movedAny) {
      void persistDroppedMediaForPage(pageGlobal, nextSourceScopeValue)
      void persistDroppedMediaForPage(nextPage.globalPage, nextTargetScopeValue)
    }

    return movedAny
  }, [buildScopeKeyForPage, estimateAreaHeightPx, isAreaBlockActiveOnPage, lessonPages, lessonPagesByGlobal, persistDroppedMediaForPage])

  useEffect(() => {
    if (!courseId || typeof currentLessonPageGlobal !== "number" || !currentDocumentKey || canvasPersistenceDisabled) {
      setCanvasDocumentId(null)
      setDocumentReadyKey(null)
      return
    }

    let active = true
    setDocumentReadyKey(null)

    async function loadCanvasDocument() {
      if (currentSessionPageGlobals.length === 0) {
        setCanvasDocumentId(null)
        setDocumentReadyKey(currentDocumentKey)
        return
      }

      const { data, error } = await supabase
        .from("canvas_documents")
        .select("id,page_global,schema_version,document")
        .eq("course_id", courseId)
        .in("page_global", currentSessionPageGlobals)

      if (!active) return

      if (error || !Array.isArray(data)) {
        if (isMissingCanvasTableError(error, "canvas_documents")) {
          disableCanvasPersistence()
        }
        setCanvasDocumentId(null)
        setDroppedMediaByScope((prev) => ({
          ...prev,
          ...Object.fromEntries(currentSessionPageGlobals.map((pageGlobal) => [buildScopeKeyForPage(pageGlobal), {}])),
        }))
        setDocumentReadyKey(currentDocumentKey)
        return
      }

      const rows = data as Array<{ id: string; page_global: number; schema_version?: number; document?: unknown }>
      const scopeEntries = currentSessionPageGlobals.map((pageGlobal) => {
        const row = rows.find((item) => item.page_global === pageGlobal)
        const payload = (row?.document ?? {}) as Partial<CanvasDocumentPayload>
        return [buildScopeKeyForPage(pageGlobal), normalizeDroppedMediaByArea(payload.droppedMediaByArea)] as const
      })

      const currentRow = rows.find((item) => item.page_global === currentLessonPageGlobal)
      setCanvasDocumentId(currentRow?.id ?? null)
      setDroppedMediaByScope((prev) => ({
        ...prev,
        ...Object.fromEntries(scopeEntries),
      }))
      setDocumentReadyKey(currentDocumentKey)
    }

    void loadCanvasDocument()
    return () => {
      active = false
    }
  }, [buildScopeKeyForPage, canvasPersistenceDisabled, courseId, currentDocumentKey, currentLessonPageGlobal, currentSessionPageGlobals, disableCanvasPersistence, supabase])

  useEffect(() => {
    if (!courseId || typeof currentLessonPageGlobal !== "number" || !currentDocumentKey || canvasPersistenceDisabled) return
    if (documentReadyKey !== currentDocumentKey) return

    const documentPayload: CanvasDocumentPayload = {
      schemaVersion: 1,
      droppedMediaByArea: currentDroppedMediaByArea,
    }

    const timeoutHandle = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("canvas_documents")
        .upsert(
          {
            course_id: courseId,
            page_global: currentLessonPageGlobal,
            schema_version: 1,
            document: documentPayload,
          },
          { onConflict: "course_id,page_global" },
        )
        .select("id")
        .single()

      if (isMissingCanvasTableError(error, "canvas_documents")) {
        disableCanvasPersistence()
        return
      }

      if (data && typeof (data as { id?: unknown }).id === "string") {
        setCanvasDocumentId((data as { id: string }).id)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeoutHandle)
    }
  }, [canvasPersistenceDisabled, courseId, currentDocumentKey, currentDroppedMediaByArea, currentLessonPageGlobal, disableCanvasPersistence, documentReadyKey, supabase])

  return {
    currentDroppedMediaByArea,
    getDroppedMediaByPageGlobal,
    onDropAreaMedia,
    onHtmlAreaDrop,
    onRemoveAreaMedia,
    rebalanceOverflowForPage,
  }
}
