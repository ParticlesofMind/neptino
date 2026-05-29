import { NextRequest, NextResponse } from "next/server"
import { searchAtlasSources, type AtlasResourceType } from "@/lib/atlas/source-registry"

type SourceSearchBody = {
  query?: unknown
  resourceType?: unknown
  limit?: unknown
}

const RESOURCE_TYPES = new Set<AtlasResourceType>([
  "text",
  "image",
  "audio",
  "video",
  "animation",
  "dataset",
  "map",
  "chart",
  "diagram",
  "document",
  "timeline",
  "composition",
])

function normalizeResourceType(value: unknown): AtlasResourceType {
  return typeof value === "string" && RESOURCE_TYPES.has(value as AtlasResourceType)
    ? value as AtlasResourceType
    : "composition"
}

export async function POST(request: NextRequest) {
  let body: SourceSearchBody
  try {
    body = (await request.json()) as SourceSearchBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const query = typeof body.query === "string" ? body.query.trim() : ""
  if (query.length < 2) {
    return NextResponse.json({ error: "A query with at least 2 characters is required." }, { status: 400 })
  }

  try {
    const result = await searchAtlasSources({
      query,
      resourceType: normalizeResourceType(body.resourceType),
      limit: typeof body.limit === "number" ? body.limit : 6,
      licensePolicy: "attribution-ok",
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Atlas source search failed."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
