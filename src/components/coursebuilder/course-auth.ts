import { createClient } from "@/lib/supabase/client"

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    user_metadata: (user.user_metadata ?? {}) as Record<string, unknown>,
  }
}

export function getAuthUserDisplayName(user: AuthUser): string {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName = metadata.full_name
  const displayName = metadata.display_name
  const name = metadata.name
  const fallback = user.email?.split("@")[0]

  if (typeof fullName === "string" && fullName.trim()) return fullName.trim()
  if (typeof displayName === "string" && displayName.trim()) return displayName.trim()
  if (typeof name === "string" && name.trim()) return name.trim()
  if (fallback && fallback.trim()) return fallback.trim()
  return "Me"
}

export function getAuthUserInstitution(user: AuthUser): string {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const institution = metadata.institution
  return typeof institution === "string" && institution.trim().length > 0 ? institution.trim() : ""
}
