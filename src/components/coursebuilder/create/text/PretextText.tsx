"use client"

import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext"
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type PretextTextTone = "plain" | "soft" | "paper" | "source" | "caption"

interface PretextTextProps {
  text: string
  emptyText?: ReactNode
  className?: string
  lineClassName?: string
  tone?: PretextTextTone
  fontSizePx?: number
  lineHeightPx?: number
  fontWeight?: number
  italic?: boolean
  maxLines?: number
  preserveWhitespace?: boolean
  measureWidthPx?: number
}

interface PretextLineState {
  layoutKey: string
  lines: string[]
  lineCount: number
  maxWidth: number
  truncated: boolean
}

const DEFAULT_FONT_FAMILY = '"Open Sans", Arial, sans-serif'

const toneClassName: Record<PretextTextTone, string> = {
  plain: "",
  soft: "bg-accent/70",
  paper: "bg-neutral-50 ring-1 ring-neutral-200/70",
  source: "bg-[#fff7e6] ring-1 ring-[#f1dfb8]",
  caption: "bg-neutral-100/80",
}

function stripControlCharacters(value: string): string {
  return value.replace(/\u0000/g, "")
}

function makeFont({
  fontSizePx,
  fontWeight,
  italic,
}: Required<Pick<PretextTextProps, "fontSizePx" | "fontWeight" | "italic">>): string {
  const style = italic ? "italic " : ""
  return `${style}${fontWeight} ${fontSizePx}px ${DEFAULT_FONT_FAMILY}`
}

function clampLines(lines: string[], maxLines?: number): { lines: string[]; truncated: boolean } {
  if (!maxLines || maxLines <= 0 || lines.length <= maxLines) {
    return { lines, truncated: false }
  }

  const visible = lines.slice(0, maxLines)
  const last = visible[visible.length - 1] ?? ""
  visible[visible.length - 1] = last.endsWith("...") ? last : `${last.replace(/\s+$/g, "")}...`
  return { lines: visible, truncated: true }
}

export function PretextText({
  text,
  emptyText,
  className,
  lineClassName,
  tone = "plain",
  fontSizePx = 12,
  lineHeightPx = 18,
  fontWeight = 400,
  italic = false,
  maxLines,
  preserveWhitespace = true,
  measureWidthPx,
}: PretextTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const cleanText = useMemo(() => stripControlCharacters(text), [text])
  const [state, setState] = useState<PretextLineState | null>(null)
  const font = useMemo(
    () => makeFont({ fontSizePx, fontWeight, italic }),
    [fontSizePx, fontWeight, italic],
  )
  const hasText = cleanText.trim().length > 0
  const displayText = hasText ? cleanText : emptyText
  const layoutKey = useMemo(
    () => JSON.stringify([cleanText, font, lineHeightPx, maxLines ?? null, measureWidthPx ?? null, preserveWhitespace]),
    [cleanText, font, lineHeightPx, maxLines, measureWidthPx, preserveWhitespace],
  )
  const layoutState = hasText && state?.layoutKey === layoutKey ? state : null

  useEffect(() => {
    const element = containerRef.current
    if (!element || !hasText) {
      return
    }

    let cancelled = false
    const prepared = (() => {
      try {
        return prepareWithSegments(cleanText, font, {
          whiteSpace: preserveWhitespace ? "pre-wrap" : "normal",
        })
      } catch {
        return null
      }
    })()

    if (!prepared) {
      return
    }

    const measure = () => {
      const width = Math.floor(measureWidthPx ?? element.clientWidth)
      if (!Number.isFinite(width) || width <= 0) {
        if (!cancelled) setState(null)
        return
      }

      try {
        const result = layoutWithLines(prepared, width, lineHeightPx)
        const clamped = clampLines(result.lines.map((line) => line.text), maxLines)
        if (!cancelled) {
          setState({
            layoutKey,
            lines: clamped.lines,
            lineCount: result.lineCount,
            maxWidth: width,
            truncated: clamped.truncated,
          })
        }
      } catch {
        if (!cancelled) setState(null)
      }
    }

    const cancelScheduledMeasure = (() => {
      if (typeof window.requestAnimationFrame === "function") {
        const frame = window.requestAnimationFrame(measure)
        return () => window.cancelAnimationFrame(frame)
      }

      const timeout = window.setTimeout(measure, 0)
      return () => window.clearTimeout(timeout)
    })()

    if (typeof measureWidthPx === "number") {
      return () => {
        cancelled = true
        cancelScheduledMeasure()
      }
    }

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)
      return () => {
        cancelled = true
        cancelScheduledMeasure()
        window.removeEventListener("resize", measure)
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      cancelled = true
      cancelScheduledMeasure()
      observer.disconnect()
    }
  }, [cleanText, font, hasText, layoutKey, lineHeightPx, maxLines, measureWidthPx, preserveWhitespace])

  const fallbackStyle: CSSProperties | undefined = maxLines
    ? {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: maxLines,
        overflow: "hidden",
      }
    : undefined

  return (
    <span
      ref={containerRef}
      className={cn("block min-w-0", className)}
      data-pretext-text
      data-pretext-state={layoutState ? "laid-out" : "fallback"}
      data-pretext-line-count={layoutState?.lineCount}
      data-pretext-measured-width={layoutState?.maxWidth}
      data-pretext-truncated={layoutState?.truncated ? "true" : undefined}
      aria-label={hasText ? cleanText : undefined}
      style={!layoutState ? fallbackStyle : undefined}
    >
      {layoutState ? (
        <span aria-hidden="true" className="block">
          {layoutState.lines.map((line, index) => (
            <span key={`${line}-${index}`} className="block min-w-0" style={{ minHeight: lineHeightPx }}>
              <span
                className={cn(
                  "box-decoration-clone rounded-[3px] px-0.5",
                  toneClassName[tone],
                  lineClassName,
                )}
              >
                {line || "\u00a0"}
              </span>
            </span>
          ))}
        </span>
      ) : (
        displayText
      )}
    </span>
  )
}
