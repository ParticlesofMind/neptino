"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { MediaAsset } from "@/components/canvas/create-view-types"

type WikimediaSearchResponse = {
  query?: {
    pages?: Record<string, {
      pageid?: number
      title?: string
      imageinfo?: Array<{ url?: string; mime?: string }>
    }>
  }
}

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{
      pageid?: number
      title?: string
      snippet?: string
    }>
  }
}

export function normalizeMediaCategory(mediaType: string): string {
  const normalized = mediaType.toLowerCase()
  if (normalized.includes("video")) return "videos"
  if (normalized.includes("audio") || normalized.includes("podcast")) return "audio"
  if (normalized.includes("image") || normalized.includes("map") || normalized.includes("diagram")) return "images"
  if (normalized.includes("text") || normalized.includes("article") || normalized.includes("compendium") || normalized.includes("book")) return "text"
  if (normalized.includes("link")) return "links"
  if (normalized.includes("plugin")) return "plugins"
  return "files"
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim()
}

function dedupeMediaAssets(assets: MediaAsset[]): MediaAsset[] {
  const seen = new Set<string>()
  const unique: MediaAsset[] = []
  assets.forEach((asset) => {
    const key = `${asset.category}::${asset.url || asset.title}`.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    unique.push(asset)
  })
  return unique
}

async function fetchWikimediaAssets(query: string, signal?: AbortSignal): Promise<MediaAsset[]> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return []

  const commonsUrl = new URL("https://commons.wikimedia.org/w/api.php")
  commonsUrl.searchParams.set("action", "query")
  commonsUrl.searchParams.set("format", "json")
  commonsUrl.searchParams.set("origin", "*")
  commonsUrl.searchParams.set("generator", "search")
  commonsUrl.searchParams.set("gsrnamespace", "6")
  commonsUrl.searchParams.set("gsrlimit", "40")
  commonsUrl.searchParams.set("gsrsearch", normalizedQuery)
  commonsUrl.searchParams.set("prop", "imageinfo")
  commonsUrl.searchParams.set("iiprop", "url|mime")

  const wikipediaUrl = new URL("https://en.wikipedia.org/w/api.php")
  wikipediaUrl.searchParams.set("action", "query")
  wikipediaUrl.searchParams.set("format", "json")
  wikipediaUrl.searchParams.set("origin", "*")
  wikipediaUrl.searchParams.set("list", "search")
  wikipediaUrl.searchParams.set("srlimit", "24")
  wikipediaUrl.searchParams.set("srsearch", normalizedQuery)

  const [commonsResponse, wikipediaResponse] = await Promise.all([
    fetch(commonsUrl.toString(), { signal }),
    fetch(wikipediaUrl.toString(), { signal }),
  ])

  const assets: MediaAsset[] = []

  if (commonsResponse.ok) {
    const commonsPayload = (await commonsResponse.json()) as WikimediaSearchResponse
    const pages = Object.values(commonsPayload.query?.pages ?? {})
    pages.forEach((page) => {
      const mediaUrl = page.imageinfo?.[0]?.url
      const mimeType = String(page.imageinfo?.[0]?.mime ?? "")
      if (!mediaUrl || !mimeType) return

      let mediaType = "image"
      if (mimeType.startsWith("video/")) mediaType = "video"
      else if (mimeType.startsWith("audio/")) mediaType = "audio"

      assets.push({
        id: `commons:${page.pageid ?? mediaUrl}`,
        category: normalizeMediaCategory(mediaType),
        mediaType,
        title: String(page.title ?? "Wikimedia media"),
        description: `Wikimedia Commons (${mimeType})`,
        url: mediaUrl,
      })
    })
  }

  if (wikipediaResponse.ok) {
    const wikipediaPayload = (await wikipediaResponse.json()) as WikipediaSearchResponse
    const results = wikipediaPayload.query?.search ?? []
    results.forEach((entry) => {
      const pageId = entry.pageid
      const title = String(entry.title ?? "Wikipedia article")
      const articleUrl = pageId ? `https://en.wikipedia.org/?curid=${pageId}` : ""

      assets.push({
        id: `wikipedia:${pageId ?? title}`,
        category: "text",
        mediaType: "article",
        title,
        description: stripHtmlTags(String(entry.snippet ?? "Wikipedia article")),
        url: articleUrl,
      })
    })
  }

  return dedupeMediaAssets(assets)
}

export function useMediaLibraryAssets({
  supabase,
  courseTitle,
}: {
  supabase: SupabaseClient
  courseTitle: string
}) {
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [wikipediaAssets, setWikipediaAssets] = useState<MediaAsset[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [wikipediaLoading, setWikipediaLoading] = useState(false)
  const [activeMedia, setActiveMedia] = useState<string>("files")
  const [mediaSearch, setMediaSearch] = useState("")

  const consumeMediaAsset = useCallback((media: { id?: string; url?: string }) => {
    const matches = (entry: MediaAsset) =>
      (media.id && entry.id === media.id) || (media.url && entry.url && entry.url === media.url)

    setMediaAssets((prev) => prev.filter((entry) => !matches(entry)))
    setWikipediaAssets((prev) => prev.filter((entry) => !matches(entry)))
  }, [])

  useEffect(() => {
    let active = true

    async function loadMedia() {
      setMediaLoading(true)
      const { data } = await supabase
        .from("encyclopedia_media")
        .select("id,media_type,title,description,url")
        .limit(200)

      if (!active) return

      const fetched = (Array.isArray(data) ? data : []).map((row) => {
        const mediaType = String((row as Record<string, unknown>).media_type ?? "file")
        return {
          id: String((row as Record<string, unknown>).id ?? crypto.randomUUID()),
          category: normalizeMediaCategory(mediaType),
          mediaType,
          title: String((row as Record<string, unknown>).title ?? `${mediaType} resource`),
          description: String((row as Record<string, unknown>).description ?? ""),
          url: String((row as Record<string, unknown>).url ?? ""),
        } satisfies MediaAsset
      })

      setMediaAssets(fetched)
      setMediaLoading(false)
    }

    void loadMedia()
    return () => {
      active = false
    }
  }, [supabase])

  useEffect(() => {
    const seedQuery = mediaSearch.trim().length >= 2
      ? mediaSearch.trim()
      : (courseTitle.trim() && courseTitle.trim().toLowerCase() !== "untitled course"
        ? courseTitle.trim()
        : "world history")

    let active = true
    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      try {
        setWikipediaLoading(true)
        const assets = await fetchWikimediaAssets(seedQuery, controller.signal)
        if (!active) return
        setWikipediaAssets(assets)
      } catch {
        if (!active) return
        setWikipediaAssets([])
      } finally {
        if (active) {
          setWikipediaLoading(false)
        }
      }
    }, 300)

    return () => {
      active = false
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [courseTitle, mediaSearch])

  const combinedMediaAssets = useMemo(
    () => dedupeMediaAssets([...mediaAssets, ...wikipediaAssets]),
    [mediaAssets, wikipediaAssets],
  )

  const mediaItems = useMemo(() => {
    const term = mediaSearch.trim().toLowerCase()
    return combinedMediaAssets
      .filter((item) => item.category === activeMedia)
      .filter((item) => {
        if (!term) return true
        return `${item.title} ${item.description}`.toLowerCase().includes(term)
      })
      .slice(0, 80)
  }, [activeMedia, combinedMediaAssets, mediaSearch])

  return {
    activeMedia,
    setActiveMedia,
    mediaSearch,
    setMediaSearch,
    mediaLoading,
    wikipediaLoading,
    mediaItems,
    consumeMediaAsset,
  }
}
