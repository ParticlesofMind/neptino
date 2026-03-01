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
