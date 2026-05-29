import type { SupabaseClient } from "@supabase/supabase-js"
import {
  groupMembershipRows,
  resolveActiveInstitutionContext,
  type InstitutionContext,
  type LegacyUserRole,
  type MembershipRow,
} from "@/lib/institutions/core"

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const prefix = `${name}=`
  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
  return found ? decodeURIComponent(found.slice(prefix.length)) : null
}

export async function loadMembershipContexts(
  supabase: SupabaseClient,
  userId: string,
): Promise<InstitutionContext[]> {
  const { data, error } = await supabase
    .from("institution_memberships")
    .select("institution_id, role, status, institutions(id, name, slug, institution_type)")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) {
    throw error
  }

  return groupMembershipRows((data ?? []) as MembershipRow[])
}

export async function setActiveInstitution(institutionId: string): Promise<void> {
  const response = await fetch("/api/institutions/active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ institutionId }),
  })

  if (!response.ok) {
    throw new Error("Unable to switch institution.")
  }
}

export async function resolvePostAuthDestination(input: {
  supabase: SupabaseClient
  userId: string
  nextPath: string | null
}): Promise<string> {
  const contexts = await loadMembershipContexts(input.supabase, input.userId)
  const active = resolveActiveInstitutionContext(contexts, readCookie("active_institution_id"))

  if (active) {
    await setActiveInstitution(active.institutionId)
  }

  if (input.nextPath) {
    return input.nextPath
  }

  if (contexts.length > 1) {
    return "/select-institution"
  }

  if (active) {
    return active.dashboardPath
  }

  const { data: profile } = await input.supabase
    .from("users")
    .select("role")
    .eq("id", input.userId)
    .maybeSingle()

  return getLegacyDashboardPath((profile?.role as LegacyUserRole | null) ?? "student")
}

export function getLegacyDashboardPath(role: LegacyUserRole): string {
  if (role === "admin") return "/admin"
  if (role === "teacher") return "/teacher"
  return "/student"
}
