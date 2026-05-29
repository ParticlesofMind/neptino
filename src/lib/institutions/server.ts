import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import {
  groupMembershipRows,
  resolveActiveInstitutionContext,
  type InstitutionContext,
  type MembershipRow,
} from "@/lib/institutions/core"

export async function loadServerMembershipContexts(
  supabase: SupabaseClient,
  userId: string,
): Promise<InstitutionContext[]> {
  const { data, error } = await supabase
    .from("institution_memberships")
    .select("institution_id, role, status, institutions(id, name, slug, institution_type)")
    .eq("user_id", userId)
    .eq("status", "active")

  if (error) {
    return []
  }

  return groupMembershipRows((data ?? []) as MembershipRow[])
}

export async function resolveServerInstitutionContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ current: InstitutionContext | null; all: InstitutionContext[] }> {
  const cookieStore = await cookies()
  const contexts = await loadServerMembershipContexts(supabase, userId)
  const current = resolveActiveInstitutionContext(contexts, cookieStore.get("active_institution_id")?.value ?? null)

  return { current, all: contexts }
}
