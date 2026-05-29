"use client"

import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function getInitialIsMobile(): boolean {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
}

/**
 * Returns true when the viewport width is below the mobile breakpoint (768px).
 * Updates reactively on window resize using matchMedia.
 * Safe for SSR — returns false on first render.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getInitialIsMobile)

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return isMobile
}
