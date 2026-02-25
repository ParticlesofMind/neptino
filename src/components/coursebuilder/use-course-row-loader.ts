import { useEffect, useRef, useState } from "react"
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
  const onLoadedRef = useRef(onLoaded)

  useEffect(() => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  useEffect(() => {
    if (!enabled || !courseId) return

    let isCancelled = false

    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      try {
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

        if (!result.error && result.data && onLoadedRef.current) {
          onLoadedRef.current(result.data)
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isCancelled = true
    }
  }, [enabled, courseId, select])

  return { loading }
}
