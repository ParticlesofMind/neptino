import { NextRequest, NextResponse } from "next/server"
import { importWikidataAtlasQuery } from "@/lib/atlas/import-service"
import { requireAtlasRepositoryAccess } from "@/lib/atlas/server-access"
import { createAdminClient } from "@/lib/supabase/admin"

type ImportRequestBody = {
  query?: unknown
  limit?: unknown
  includeAssets?: unknown
  promote?: unknown
  assemblePack?: unknown
}

export async function POST(request: NextRequest) {
  const access = await requireAtlasRepositoryAccess()
  if (!access.ok) {
    return access.response
  }

  let body: ImportRequestBody
  try {
    body = (await request.json()) as ImportRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const query = typeof body.query === "string" ? body.query.trim() : ""
  if (query.length < 2) {
    return NextResponse.json({ error: "A query with at least 2 characters is required." }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase admin access is not configured."
    return NextResponse.json({ error: message }, { status: 503 })
  }

  try {
    const result = await importWikidataAtlasQuery(admin, {
      query,
      limit: typeof body.limit === "number" ? body.limit : 1,
      includeAssets: typeof body.includeAssets === "boolean" ? body.includeAssets : true,
      promote: typeof body.promote === "boolean" ? body.promote : false,
      assemblePack: typeof body.assemblePack === "boolean" ? body.assemblePack : false,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Atlas import failed."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
