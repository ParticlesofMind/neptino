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
  baseKey: string
  area: TaskAreaKind
  siblingAreaKeys: string[]
}

const TASK_AREA_KINDS: TaskAreaKind[] = ["instruction", "student", "teacher"]

interface PlacementConstraints {
  containerWidthPx: number
}

type DropPlacementResult = {
  status: "placed-current" | "placed-next" | "rejected-no-fit" | "rejected-invalid"
  areaKey: string
  targetPageGlobal?: number
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

function parseDraggedMediaPayload(raw: string): TemplateAreaMediaItem | null {
  try {
    const parsed = JSON.parse(raw) as Partial<MediaAsset>
    return {
      id: String(parsed.id ?? crypto.randomUUID()),
      title: String(parsed.title ?? "Media"),
      description: String(parsed.description ?? ""),
      mediaType: String(parsed.mediaType ?? "media"),
      category: String(parsed.category ?? normalizeMediaCategory(String(parsed.mediaType ?? "media"))),
      url: String(parsed.url ?? ""),
    }
  } catch {
    return null
  }
}

function parseTaskAreaKey(areaKey: string): ParsedTaskAreaKey | null {
  const parts = areaKey.split(":")
  if (parts.length < 5) return null

  const block = parts[0]
  if (block !== "content" && block !== "assignment") return null

  const areaRaw = parts[4]
  if (!TASK_AREA_KINDS.includes(areaRaw as TaskAreaKind)) return null

  const area = areaRaw as TaskAreaKind
  const baseKey = parts.slice(0, 4).join(":")
  const siblingAreaKeys = TASK_AREA_KINDS.map((kind) => `${baseKey}:${kind}`)

  return {
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
  onDropPlacementResult,
}: {
  supabase: SupabaseClient
  courseId?: string | null
  lessonPages: LessonCanvasPageProjection[]
  currentLessonPageGlobal: number | null
  currentDocumentKey: string | null
  currentCanvasScopeKey: string
  setMediaDragActive: (active: boolean) => void
  onDropPlacementResult?: (result: DropPlacementResult) => void
}) {
  const [droppedMediaByScope, setDroppedMediaByScope] = useState<Record<string, Record<string, TemplateAreaMediaItem[]>>>({})
  const [canvasDocumentId, setCanvasDocumentId] = useState<string | null>(null)
  const [documentReadyKey, setDocumentReadyKey] = useState<string | null>(null)

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
      map.set(page.globalPage, new Set(chunksOnPage.map((chunk) => chunk.blockId)))
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
    const block = areaKey.startsWith("assignment:") ? "assignment" : "content"
    return activeBlocksByGlobalPage.get(pageGlobal)?.has(block) ?? false
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
    if (!courseId) return
    const documentPayload: CanvasDocumentPayload = {
      schemaVersion: 1,
      droppedMediaByArea: normalizeDroppedMediaByArea(droppedMediaByArea),
    }

    await supabase
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
  }, [courseId, supabase])

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
    if (!(courseId && typeof currentLessonPageGlobal === "number" && canvasDocumentId)) return
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
    })
  }, [canvasDocumentId, courseId, currentLessonPageGlobal, supabase])

  const onDropAreaMedia = useCallback((areaKey: string, event: React.DragEvent<HTMLDivElement>) => {
    let operationMedia: TemplateAreaMediaItem | null = null
    let targetPageGlobal: number | null = null
    try {
      if (!parseTaskAreaKey(areaKey)) {
        onDropPlacementResult?.({ status: "rejected-invalid", areaKey })
        return
      }

      const raw = event.dataTransfer.getData("application/json") || event.dataTransfer.getData("text/plain")
      if (!raw) return
      const mediaItem = parseDraggedMediaPayload(raw)
      if (!mediaItem) return
      operationMedia = mediaItem

      const containerWidthPx = event.currentTarget?.clientWidth || 320

      targetPageGlobal = resolveDropTargetPageGlobal(areaKey, mediaItem, { containerWidthPx })
      const resolvedPageGlobal = targetPageGlobal ?? currentLessonPageGlobal
      if (typeof targetPageGlobal === "number" && typeof resolvedPageGlobal === "number") {
        const targetScopeKey = buildScopeKeyForPage(resolvedPageGlobal)
        const nextScopeValue = appendMediaToArea(targetScopeKey, areaKey, mediaItem)
        void persistDroppedMediaForPage(resolvedPageGlobal, nextScopeValue)
        onDropPlacementResult?.({
          status: resolvedPageGlobal === currentLessonPageGlobal ? "placed-current" : "placed-next",
          areaKey,
          targetPageGlobal: resolvedPageGlobal,
        })
      } else {
        onDropPlacementResult?.({ status: "rejected-no-fit", areaKey })
      }
    } catch {
      // ignore malformed payload
    } finally {
      setMediaDragActive(false)
    }

    if (operationMedia && targetPageGlobal === currentLessonPageGlobal) {
      recordMediaDropOp(areaKey, operationMedia)
    }
  }, [appendMediaToArea, buildScopeKeyForPage, currentLessonPageGlobal, onDropPlacementResult, persistDroppedMediaForPage, recordMediaDropOp, resolveDropTargetPageGlobal, setMediaDragActive])

  const onPixiAreaDrop = useCallback((areaKey: string, rawPayload: string) => {
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
  }, [appendMediaToArea, buildScopeKeyForPage, currentLessonPageGlobal, onDropPlacementResult, persistDroppedMediaForPage, recordMediaDropOp, resolveDropTargetPageGlobal, setMediaDragActive])

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

  useEffect(() => {
    if (!courseId || typeof currentLessonPageGlobal !== "number" || !currentDocumentKey) {
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
  }, [buildScopeKeyForPage, courseId, currentDocumentKey, currentLessonPageGlobal, currentSessionPageGlobals, supabase])

  useEffect(() => {
    if (!courseId || typeof currentLessonPageGlobal !== "number" || !currentDocumentKey) return
    if (documentReadyKey !== currentDocumentKey) return

    const documentPayload: CanvasDocumentPayload = {
      schemaVersion: 1,
      droppedMediaByArea: currentDroppedMediaByArea,
    }

    const timeoutHandle = window.setTimeout(async () => {
      const { data } = await supabase
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

      if (data && typeof (data as { id?: unknown }).id === "string") {
        setCanvasDocumentId((data as { id: string }).id)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeoutHandle)
    }
  }, [courseId, currentDocumentKey, currentDroppedMediaByArea, currentLessonPageGlobal, documentReadyKey, supabase])

  return {
    currentDroppedMediaByArea,
    onDropAreaMedia,
    onPixiAreaDrop,
    onRemoveAreaMedia,
  }
}
