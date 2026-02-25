import { createClient } from "@/lib/supabase/client"

export async function uploadCourseImage(file: File, userId: string): Promise<string | null> {
  const supabase = createClient()
  const ext = file.name.split(".").pop()
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("courses")
    .upload(path, file, { upsert: false })

  if (uploadError) {
    return null
  }

  const { data } = supabase.storage.from("courses").getPublicUrl(path)
  return data.publicUrl ?? null
}
