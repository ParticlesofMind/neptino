"use client"

import { useEffect, useRef } from "react"

interface TimelineEvent {
  date: string
  label: string
  description?: string
  color?: string
}

interface Props {
  events: TimelineEvent[]
  /** Stable key that triggers re-initialization when events change */
  eventsKey?: string
}

const TL_JS_URL = "/vendor/timeline/js/timeline.js"
const TL_CSS_URL = "/vendor/timeline/css/timeline.css"

function loadCSS(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return
  const el = document.createElement("link")
  el.rel = "stylesheet"
  el.href = href
  document.head.appendChild(el)
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const el = document.createElement("script")
    el.src = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load TimelineJS`))
    document.head.appendChild(el)
  })
}

export default function TimelinePreviewInner({ events, eventsKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<TLTimeline | null>(null)
  const containerIdRef = useRef(`tl-prev-${Math.random().toString(36).slice(2, 9)}`)
  const stableKey = eventsKey ?? JSON.stringify(events)

  useEffect(() => {
    const el = containerRef.current
    if (!el || events.length === 0) return

    let active = true

    if (tlRef.current) {
      try { tlRef.current.destroy() } catch { /* no-op */ }
      tlRef.current = null
    }
    el.innerHTML = ""
    el.id = containerIdRef.current

    loadCSS(TL_CSS_URL)
    loadScript(TL_JS_URL).then(() => {
      if (!active || !containerRef.current || !window.TL) return

      const data: TLData = {
        events: events.map((ev) => ({
          start_date: { year: String(parseInt(ev.date) || 2000) },
          text: {
            headline: ev.label,
            text: ev.description ? `<p>${ev.description}</p>` : "",
          },
          ...(ev.color ? { background: { color: ev.color } } : {}),
        })),
      }

      // Compute year range to constrain the default zoom level
      const years = events.map((ev) => parseInt(ev.date) || 2000)
      const minYear = Math.min(...years)
      const maxYear = Math.max(...years)
      const yearSpan = Math.max(maxYear - minYear, 1)
      // Scale factor: lower = more zoomed in. Target ~5–10 years per visible unit.
      // For very long spans (>100y) scale further out; for short spans zoom in.
      const scaleFactor = Math.max(1, Math.min(Math.ceil(yearSpan / 5), 20))

      try {
        tlRef.current = new window.TL.Timeline(containerIdRef.current, data, {
          timenav_position: "top",
          is_embed: true,
          hash_bookmark: false,
          scale_factor: scaleFactor,
          // Limit zoom sequence to levels that approximately cover the event range
          zoom_sequence: [0.5, 1, 2].map((m) => scaleFactor * m),
          start_at_slide: 0,
        })
        const styleId = `tl-style-${containerIdRef.current}`
        document.getElementById(styleId)?.remove()
        const styleEl = document.createElement("style")
        styleEl.id = styleId
        styleEl.textContent = [
          `#${containerIdRef.current} .tl-storyslider { display: none !important; }`,
          `#${containerIdRef.current} .tl-timenav { position: absolute !important; top: 0 !important; height: 100% !important; }`,
        ].join("\n")
        document.head.appendChild(styleEl)
      } catch (err) {
        console.error("[TimelinePreview] init error:", err)
      }
    })

    return () => {
      active = false
      document.getElementById(`tl-style-${containerIdRef.current}`)?.remove()
      if (tlRef.current) {
        try { tlRef.current.destroy() } catch { /* no-op */ }
        tlRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey])

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center bg-muted/10 text-[11px] text-muted-foreground" style={{ height: 400 }}>
        No events yet.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: 160 }}
    />
  )
}
