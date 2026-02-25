import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type LoadState<T> = {
  data: T | null
  error: unknown
}

type UseCourseRowLoaderOptions<T> = {
  courseId: string | null
  select: string
  enabled?: boolean
  onLoaded?: (row: T) => void
}

export function useCourseRowLoader<T>({
  courseId,
  select,
  enabled = true,
  onLoaded,
}: UseCourseRowLoaderOptions<T>) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || !courseId) return

    let isCancelled = false

    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("courses")
        .select(select)
        .eq("id", courseId)
        .single()

      if (isCancelled) return

      const result: LoadState<T> = {
        data: (data as T | null) ?? null,
        error,
      }

      if (!result.error && result.data && onLoaded) {
        onLoaded(result.data)
      }

      setLoading(false)
    }

    void load()

    return () => {
      isCancelled = true
    }
  }, [enabled, courseId, select, onLoaded])

  return { loading }
}
