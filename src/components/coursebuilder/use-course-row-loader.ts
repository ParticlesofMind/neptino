import { useEffect, useLayoutEffect, useRef } from "react"
import { useQuery, type QueryClient } from "@tanstack/react-query"
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

export function makeCourseRowQueryKey(courseId: string, select: string) {
  return ["coursebuilder", "course-row", courseId, select] as const
}

async function fetchCourseRow<T>(courseId: string, select: string): Promise<LoadState<T>> {
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

export function prefetchCourseRow<T>(queryClient: QueryClient, courseId: string, select: string) {
  return queryClient.prefetchQuery({
    queryKey: makeCourseRowQueryKey(courseId, select),
    queryFn: () => fetchCourseRow<T>(courseId, select),
  })
}

export function useCourseRowLoader<T>({
  courseId,
  select,
  enabled = true,
  onLoaded,
}: UseCourseRowLoaderOptions<T>) {
  const onLoadedRef = useRef(onLoaded)

  useEffect(() => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  const query = useQuery({
    queryKey: courseId ? makeCourseRowQueryKey(courseId, select) : ["coursebuilder", "course-row", "disabled", select],
    queryFn: () => fetchCourseRow<T>(courseId as string, select),
    enabled: Boolean(enabled && courseId),
  })

  useLayoutEffect(() => {
    if (!query.data || query.data.error || !query.data.data || !onLoadedRef.current) return
    onLoadedRef.current(query.data.data)
  }, [query.data])

  return {
    loading: Boolean(enabled && courseId && query.isPending && !query.data),
    refreshing: Boolean(enabled && courseId && query.isFetching && Boolean(query.data)),
    hasData: Boolean(enabled && courseId && query.data && !query.data.error && query.data.data),
  }
}
