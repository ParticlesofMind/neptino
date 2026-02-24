import { NextRequest, NextResponse } from "next/server"
import { retrieveSourceExcerpts } from "@/lib/curriculum/source-retrieval"

type RequestBody = {
  context: {
    courseName: string
    courseDescription?: string
    keyTerms?: string[]
    mandatoryTopics?: string[]
  }
  resourcesPreferences?: Array<{ id: string; label: string; priority: string }>
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    if (!body?.context?.courseName) {
      return NextResponse.json({ error: "Missing context" }, { status: 400 })
    }

    const preferences = Array.isArray(body.resourcesPreferences) ? body.resourcesPreferences : []
    const result = await retrieveSourceExcerpts(body.context, preferences)

    return NextResponse.json({ excerpts: result.excerpts, skipped: result.skipped })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
