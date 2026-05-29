import { NextRequest, NextResponse } from "next/server"
import {
  assembleEntityPack,
  promoteAssetCandidate,
  promoteEntityCandidate,
  promoteProductCandidate,
  promoteTaskCandidate,
  setAssetCandidateReviewStatus,
  setEntityCandidateReviewStatus,
} from "@/lib/atlas/repository"
import { requireAtlasRepositoryAccess } from "@/lib/atlas/server-access"
import { createAdminClient } from "@/lib/supabase/admin"

type PromoteRequestBody = {
  candidateId?: unknown
  kind?: unknown
  approve?: unknown
  assemblePack?: unknown
}

export async function POST(request: NextRequest) {
  const access = await requireAtlasRepositoryAccess()
  if (!access.ok) {
    return access.response
  }

  let body: PromoteRequestBody
  try {
    body = (await request.json()) as PromoteRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const candidateId = typeof body.candidateId === "string" ? body.candidateId.trim() : ""
  const kind = typeof body.kind === "string" ? body.kind : "entity"
  const approve = body.approve !== false

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId is required." }, { status: 400 })
  }
  if (!["entity", "asset", "product", "task"].includes(kind)) {
    return NextResponse.json({ error: "kind must be entity, asset, product, or task." }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase admin access is not configured."
    return NextResponse.json({ error: message }, { status: 503 })
  }

  try {
    if (kind === "entity") {
      if (approve) {
        await setEntityCandidateReviewStatus(admin, candidateId, "approved")
      }
      const promoted = await promoteEntityCandidate(admin, candidateId, { approveIfNeeded: approve })
      const pack = body.assemblePack ? await assembleEntityPack(admin, candidateId, { reviewStatus: "approved" }) : null
      return NextResponse.json({ promoted, pack })
    }

    if (kind === "asset") {
      if (approve) {
        await setAssetCandidateReviewStatus(admin, candidateId, "approved")
      }
      const promoted = await promoteAssetCandidate(admin, candidateId, { approveIfNeeded: approve })
      return NextResponse.json({ promoted })
    }

    if (kind === "product") {
      const promoted = await promoteProductCandidate(admin, candidateId, { approveIfNeeded: approve })
      return NextResponse.json({ promoted })
    }

    const promoted = await promoteTaskCandidate(admin, candidateId, { approveIfNeeded: approve })
    return NextResponse.json({ promoted })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to promote Atlas candidate."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
