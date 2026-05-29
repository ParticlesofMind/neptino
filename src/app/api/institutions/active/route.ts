import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const { institutionId } = (await request.json().catch(() => ({}))) as {
    institutionId?: string
  }

  if (!institutionId) {
    return NextResponse.json({ error: "Missing institutionId." }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const { data: membership, error } = await supabase
    .from("institution_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("institution_id", institutionId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (error || !membership) {
    return NextResponse.json({ error: "Institution access not found." }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.set("active_institution_id", institutionId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  })

  return NextResponse.json({ ok: true })
}
