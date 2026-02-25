import { createClient } from "@/lib/supabase/client"

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
