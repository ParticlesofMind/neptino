import { NextRequest, NextResponse } from "next/server"
import { assembleEntityPack } from "@/lib/atlas/repository"
import { requireAtlasRepositoryAccess } from "@/lib/atlas/server-access"
import { createAdminClient } from "@/lib/supabase/admin"

type PackRequestBody = {
  entityCandidateId?: unknown
  approve?: unknown
}

export async function POST(request: NextRequest) {
  const access = await requireAtlasRepositoryAccess()
  if (!access.ok) {
    return access.response
  }

  let body: PackRequestBody
  try {
    body = (await request.json()) as PackRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const entityCandidateId = typeof body.entityCandidateId === "string" ? body.entityCandidateId.trim() : ""
  if (!entityCandidateId) {
    return NextResponse.json({ error: "entityCandidateId is required." }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase admin access is not configured."
    return NextResponse.json({ error: message }, { status: 503 })
  }

  try {
    const pack = await assembleEntityPack(admin, entityCandidateId, {
      reviewStatus: body.approve === false ? "draft" : "approved",
    })
    return NextResponse.json({ pack })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to assemble Atlas pack."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
