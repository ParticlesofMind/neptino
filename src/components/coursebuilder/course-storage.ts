import { createClient } from "@/lib/supabase/client"

export async function uploadCourseImage(file: File, userId: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split(".").pop() || "jpg"
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("courses")
    .upload(path, file, { upsert: false })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from("courses").getPublicUrl(path)
  if (!data.publicUrl) {
    throw new Error("Course image uploaded, but no public URL was returned.")
  }
  return data.publicUrl
}
