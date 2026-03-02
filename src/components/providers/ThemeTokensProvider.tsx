"use client"

import { useEffect } from "react"

export const THEME_TOKENS_KEY = "neptino-theme-tokens"

export const DEFAULT_TOKENS: Record<string, string> = {
  "--primary":              "#4a94ff",
  "--primary-foreground":   "#ffffff",
  "--secondary":            "#00ccb3",
  "--secondary-foreground": "#ffffff",
  "--background":           "#ffffff",
  "--foreground":           "#171717",
  "--muted":                "#f5f5f5",
  "--muted-foreground":     "#737373",
  "--accent":               "#f5f9ff",
  "--accent-foreground":    "#1f5fb3",
  "--destructive":          "#ef4444",
  "--destructive-foreground": "#ffffff",
  "--border":               "#e5e5e5",
  "--radius":               "0.5rem",
}

export function applyTokens(tokens: Record<string, string>) {
  for (const [key, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(key, value)
  }
}

export function loadStoredTokens(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(THEME_TOKENS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return null
  }
}

export function saveTokens(tokens: Record<string, string>) {
  try {
    localStorage.setItem(THEME_TOKENS_KEY, JSON.stringify(tokens))
  } catch {
    // ignore
  }
}

/**
 * Invisible provider that hydrates CSS custom property overrides from
 * localStorage on the first client render, so saved theme tokens persist
 * across page loads without a flash.
 */
export function ThemeTokensProvider() {
  useEffect(() => {
    const stored = loadStoredTokens()
    if (stored) applyTokens(stored)
  }, [])

  return null
}
