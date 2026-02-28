/**
 * Server-side Supabase client for E2E test helpers.
 * Uses the service-role key so tests can read/write any row
 * without being constrained by RLS policies.
 *
 * NEVER import this in application code – only in e2e/ tests.
 */
import { createClient } from "@supabase/supabase-js"

function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`E2E helper: required env var "${key}" is not set. Add it to .env.test.local.`)
  }
  return value
}

export function createAdminClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  )
}

// ─── Course row type (columns written by the builder) ─────────────────────────

export interface CourseRow {
  id: string
  course_name: string
  course_subtitle: string | null
  course_description: string | null
  course_language: string | null
  course_type: string | null
  teacher_id: string | null
  institution: string | null
  course_image: string | null
  generation_settings: Record<string, unknown> | null
  students_overview: Record<string, unknown> | null
  classification_data: Record<string, unknown> | null
  course_layout: Record<string, unknown> | null
  schedule_settings: Record<string, unknown> | null
  visibility_settings: Record<string, boolean> | null
  marketplace_settings: Record<string, unknown> | null
  pricing_settings: Record<string, unknown> | null
  integration_settings: Record<string, unknown> | null
  communication_settings: Record<string, unknown> | null
  template_settings: Record<string, unknown> | null
  updated_at: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function fetchCourse(courseId: string): Promise<CourseRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single()

  if (error) throw new Error(`fetchCourse failed: ${error.message}`)
  return data as CourseRow | null
}

export async function deleteCourse(courseId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from("courses").delete().eq("id", courseId)
}

export async function fetchTemplatesForCourse(courseId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("templates")
    .select("*")
    .eq("course_id", courseId)

  if (error) throw new Error(`fetchTemplates failed: ${error.message}`)
  return data ?? []
}
