import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type AtlasRepositoryRole = "teacher" | "admin"

type AccessAllowed = {
  ok: true
  userId: string
  role: AtlasRepositoryRole
}

type AccessDenied = {
  ok: false
  response: NextResponse
}

export type AtlasRepositoryAccess = AccessAllowed | AccessDenied

export async function requireAtlasRepositoryAccess(): Promise<AtlasRepositoryAccess> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    }
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (error || !profile || !["teacher", "admin"].includes(String(profile.role))) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Teacher or admin access required." }, { status: 403 }),
    }
  }

  return {
    ok: true,
    userId: user.id,
    role: profile.role as AtlasRepositoryRole,
  }
}
