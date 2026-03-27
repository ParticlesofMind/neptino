import { useEffect, useRef, useState } from "react"

type UseSteadyLoadingOptions = {
  delayMs?: number
  minVisibleMs?: number
}

/**
 * Smooth loading indicator visibility to avoid flash when requests complete quickly.
 */
export function useSteadyLoading(
  isLoading: boolean,
  { delayMs = 120, minVisibleMs = 240 }: UseSteadyLoadingOptions = {},
) {
  const [visible, setVisible] = useState(false)
  const visibleSinceRef = useRef<number | null>(null)

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | null = null
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    if (isLoading) {
      if (!visible) {
        delayTimer = setTimeout(() => {
          visibleSinceRef.current = Date.now()
          setVisible(true)
        }, delayMs)
      }
    } else if (visible) {
      const shownAt = visibleSinceRef.current ?? Date.now()
      const elapsed = Date.now() - shownAt
      const remaining = Math.max(0, minVisibleMs - elapsed)
      hideTimer = setTimeout(() => {
        visibleSinceRef.current = null
        setVisible(false)
      }, remaining)
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [delayMs, isLoading, minVisibleMs, visible])

  return visible
}
