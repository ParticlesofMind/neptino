import { createClient } from "@/lib/supabase/client"

// ─── Lesson queries ───────────────────────────────────────────────────────────

export interface LessonRow {
  lesson_number: number
  title:         string
  payload:       Record<string, unknown>
}

/**
 * Load all saved lesson rows for a course, ordered by lesson_number.
 * Returns an empty array (not an error) when no rows exist yet.
 */
export async function selectLessonsByCourseId(courseId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("lessons")
    .select("lesson_number, title, payload")
    .eq("course_id", courseId)
    .order("lesson_number")
  return {
    data: (data as LessonRow[] | null) ?? [],
    error,
  }
}

// ─── Course queries ───────────────────────────────────────────────────────────

export async function selectCourseById<T = Record<string, unknown>>(courseId: string, select: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("courses")
    .select(select)
    .eq("id", courseId)
    .single()

  return {
    data: (data as T | null) ?? null,
    error,
  }
}

export async function selectTeacherCourseCount(teacherId: string, excludeCourseId?: string | null) {
  const supabase = createClient()
  let query = supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherId)

  if (excludeCourseId) {
    query = query.neq("id", excludeCourseId)
  }

  const { count, error } = await query

  return {
    count: count ?? 0,
    error,
  }
}
