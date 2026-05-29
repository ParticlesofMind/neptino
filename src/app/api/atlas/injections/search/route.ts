import { NextRequest, NextResponse } from "next/server"
import { searchAtlasCompositionInjections } from "@/lib/atlas/composition-injection-service"

type InjectionSearchBody = {
  compositionPresetId?: unknown
  query?: unknown
  limit?: unknown
}

export async function POST(request: NextRequest) {
  let body: InjectionSearchBody
  try {
    body = (await request.json()) as InjectionSearchBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const compositionPresetId = typeof body.compositionPresetId === "string" ? body.compositionPresetId.trim() : ""
  const query = typeof body.query === "string" ? body.query.trim() : ""
  const limit = typeof body.limit === "number" ? body.limit : undefined

  if (!compositionPresetId) {
    return NextResponse.json({ error: "compositionPresetId is required." }, { status: 400 })
  }

  if (query.length < 2) {
    return NextResponse.json({ error: "A query with at least 2 characters is required." }, { status: 400 })
  }

  try {
    const result = await searchAtlasCompositionInjections({
      compositionPresetId,
      query,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Atlas source search failed."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
