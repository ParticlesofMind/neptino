import { NextRequest, NextResponse } from "next/server"
import { listRepositoryCandidates, type AtlasReviewStatus } from "@/lib/atlas/repository"
import { requireAtlasRepositoryAccess } from "@/lib/atlas/server-access"
import { createAdminClient } from "@/lib/supabase/admin"

const REVIEW_STATUSES = new Set(["new", "needs_review", "approved", "rejected", "promoted", "all"])

export async function GET(request: NextRequest) {
  const access = await requireAtlasRepositoryAccess()
  if (!access.ok) {
    return access.response
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase admin access is not configured."
    return NextResponse.json({ error: message }, { status: 503 })
  }

  const params = request.nextUrl.searchParams
  const status = params.get("status") ?? "all"
  const limit = Number.parseInt(params.get("limit") ?? "25", 10)
  const query = params.get("q") ?? ""

  if (!REVIEW_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid review status." }, { status: 400 })
  }

  try {
    const candidates = await listRepositoryCandidates(admin, {
      status: status as AtlasReviewStatus | "all",
      limit: Number.isNaN(limit) ? 25 : limit,
      query,
    })
    return NextResponse.json({ candidates })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list Atlas candidates."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
