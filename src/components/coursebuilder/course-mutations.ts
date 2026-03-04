import { createClient } from "@/lib/supabase/client"

// ─── Lesson mutations ─────────────────────────────────────────────────────────

/**
 * Upsert a single lesson row keyed by (course_id, lesson_number).
 * `payload` stores the full CourseSession snapshot (topics, canvases, fieldEnabled)
 * — ephemeral render fields (measuredContentHeightPx) are stripped by the caller.
 */
export async function upsertLessonSession(
  courseId: string,
  lessonNumber: number,
  title: string,
  payload: Record<string, unknown>,
) {
  const supabase = createClient()
  const { error } = await supabase
    .from("lessons")
    .upsert(
      {
        course_id:     courseId,
        lesson_number: lessonNumber,
        title,
        payload,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: "course_id,lesson_number" },
    )
  return { error }
}

// ─── Template mutations ───────────────────────────────────────────────────────

/**
 * Upsert a template row in the `templates` table.
 *
 * Uses `templateId` (the UUID we generate in the app) as the unique conflict key
 * (`templates.template_id`). Calling this again with the same `templateId`
 * updates name, description, type, and data — it does not create a duplicate.
 *
 * `templateData` should contain at minimum `{ fieldState, blocks }`.
 */
export async function upsertTemplateRecord(params: {
  templateId:  string
  courseId:    string
  name:        string
  description?: string
  type:        string
  templateData: Record<string, unknown>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from("templates")
    .upsert(
      {
        template_id:          params.templateId,
        course_id:            params.courseId,
        name:                 params.name,
        template_description: params.description ?? null,
        template_type:        params.type,
        template_data:        params.templateData,
        created_by:           user?.id ?? null,
        updated_at:           new Date().toISOString(),
      },
      { onConflict: "template_id" },
    )
  return { error }
}

/**
 * Update only the `template_data` column for an existing template row.
 * Used for debounced field-state sync after a template has been created.
 */
export async function updateTemplateData(
  templateId: string,
  templateData: Record<string, unknown>,
) {
  const supabase = createClient()
  const { error } = await supabase
    .from("templates")
    .update({
      template_data: templateData,
      updated_at:    new Date().toISOString(),
    })
    .eq("template_id", templateId)
  return { error }
}

// ─── Course mutations ─────────────────────────────────────────────────────────

export async function updateCourseById(courseId: string, payload: Record<string, unknown>) {
  const supabase = createClient()
  const { error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", courseId)

  return { error }
}

export async function insertCourseReturningId(payload: Record<string, unknown>) {
  const supabase = createClient()
  return supabase
    .from("courses")
    .insert(payload)
    .select("id")
    .single()
}

export async function deleteCourseById(courseId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)

  return { error }
}
