import { useEffect, useRef } from "react"

export function useDebouncedChangeSave(
  callback: () => void | Promise<void>,
  delayMs = 800,
  enabled = true,
) {
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (!enabled) return
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    const timer = setTimeout(() => {
      void callback()
    }, delayMs)
    return () => clearTimeout(timer)
  }, [callback, delayMs, enabled])
}
