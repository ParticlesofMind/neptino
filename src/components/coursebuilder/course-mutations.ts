import { createClient } from "@/lib/supabase/client"

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
