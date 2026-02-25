"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { TemplateAreaMediaItem } from "@/components/coursebuilder/template-blueprint"
import type { MediaAsset } from "@/components/canvas/create-view-types"
import { normalizeMediaCategory } from "@/components/canvas/use-media-library-assets"

interface CanvasDocumentPayload {
  schemaVersion: number
  droppedMediaByArea: Record<string, TemplateAreaMediaItem[]>
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

export function useCanvasDocumentState({
  supabase,
  courseId,
  currentLessonPageGlobal,
  currentDocumentKey,
  currentCanvasScopeKey,
  setMediaDragActive,
}: {
  supabase: SupabaseClient
  courseId?: string | null
  currentLessonPageGlobal: number | null
  currentDocumentKey: string | null
  currentCanvasScopeKey: string
  setMediaDragActive: (active: boolean) => void
}) {
  const [droppedMediaByScope, setDroppedMediaByScope] = useState<Record<string, Record<string, TemplateAreaMediaItem[]>>>({})
  const [canvasDocumentId, setCanvasDocumentId] = useState<string | null>(null)
  const [documentReadyKey, setDocumentReadyKey] = useState<string | null>(null)

  const currentDroppedMediaByArea = useMemo(
    () => normalizeDroppedMediaByArea(droppedMediaByScope[currentCanvasScopeKey]),
    [currentCanvasScopeKey, droppedMediaByScope],
  )

  const appendMediaToArea = useCallback((areaKey: string, mediaItem: TemplateAreaMediaItem) => {
    setDroppedMediaByScope((prev) => {
      const scopeValue = prev[currentCanvasScopeKey] ?? {}
      const existing = Array.isArray(scopeValue[areaKey]) ? scopeValue[areaKey] : []
      const next = existing.some((entry) => entry.id === mediaItem.id || (entry.url && entry.url === mediaItem.url))
        ? existing
        : [...existing, mediaItem]
      return {
        ...prev,
        [currentCanvasScopeKey]: {
          ...scopeValue,
          [areaKey]: next,
        },
      }
    })
  }, [currentCanvasScopeKey])

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
    try {
      const raw = event.dataTransfer.getData("application/json") || event.dataTransfer.getData("text/plain")
      if (!raw) return
      const mediaItem = parseDraggedMediaPayload(raw)
      if (!mediaItem) return
      operationMedia = mediaItem

      appendMediaToArea(areaKey, mediaItem)
    } catch {
      // ignore malformed payload
    } finally {
      setMediaDragActive(false)
    }

    if (operationMedia) {
      recordMediaDropOp(areaKey, operationMedia)
    }
  }, [appendMediaToArea, recordMediaDropOp, setMediaDragActive])

  const onPixiAreaDrop = useCallback((areaKey: string, rawPayload: string) => {
    const mediaItem = parseDraggedMediaPayload(rawPayload)
    if (!mediaItem) return
    appendMediaToArea(areaKey, mediaItem)
    recordMediaDropOp(areaKey, mediaItem)
    setMediaDragActive(false)
  }, [appendMediaToArea, recordMediaDropOp, setMediaDragActive])

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
      const { data, error } = await supabase
        .from("canvas_documents")
        .select("id,schema_version,document")
        .eq("course_id", courseId)
        .eq("page_global", currentLessonPageGlobal)
        .maybeSingle()

      if (!active) return

      if (error || !data) {
        setCanvasDocumentId(null)
        setDroppedMediaByScope((prev) => {
          if (prev[currentCanvasScopeKey]) return prev
          return {
            ...prev,
            [currentCanvasScopeKey]: {},
          }
        })
        setDocumentReadyKey(currentDocumentKey)
        return
      }

      const record = data as { id: string; schema_version?: number; document?: unknown }
      const payload = (record.document ?? {}) as Partial<CanvasDocumentPayload>
      setCanvasDocumentId(record.id)
      setDroppedMediaByScope((prev) => ({
        ...prev,
        [currentCanvasScopeKey]: normalizeDroppedMediaByArea(payload.droppedMediaByArea),
      }))
      setDocumentReadyKey(currentDocumentKey)
    }

    void loadCanvasDocument()
    return () => {
      active = false
    }
  }, [courseId, currentCanvasScopeKey, currentDocumentKey, currentLessonPageGlobal, supabase])

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
