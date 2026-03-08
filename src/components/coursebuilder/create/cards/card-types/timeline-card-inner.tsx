"use client"

import { useEffect, useRef } from "react"

interface TimelineEvent {
  date: string
  label: string
  description?: string
  color?: string
}

interface Props {
  content: Record<string, unknown>
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
    el.onerror = () => reject(new Error(`Failed to load TimelineJS: ${src}`))
    document.head.appendChild(el)
  })
}

function convertDate(dateStr: string): TLDate {
  // Extract a 4-digit year; fall back to "2000"
  const m = dateStr.match(/-?\d{1,4}/)
  return { year: m ? m[0] : "2000" }
}

export default function TimelineCardInner({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<TLTimeline | null>(null)
  const containerIdRef = useRef(`tl-${Math.random().toString(36).slice(2, 9)}`)

  const rawEvents = Array.isArray(content.events) ? (content.events as TimelineEvent[]) : []
  // Stringify for stable dep comparison
  const eventsKey = JSON.stringify(rawEvents)

  useEffect(() => {
    const el = containerRef.current
    if (!el || rawEvents.length === 0) return

    let active = true

    // Tear down any previous instance
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
        events: rawEvents.map((ev) => ({
          start_date: convertDate(ev.date),
          text: {
            headline: ev.label,
            text: ev.description ? `<p>${ev.description}</p>` : "",
          },
          ...(ev.color ? { background: { color: ev.color } } : {}),
        })),
      }

      try {
        tlRef.current = new window.TL.Timeline(containerIdRef.current, data, {
          timenav_position: "top",
          is_embed: true,
          hash_bookmark: false,
        })
        // Suppress the story/text panel — show only the horizontal nav strip.
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
        console.error("[TimelineCard] init error:", err)
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
  }, [eventsKey])

  if (rawEvents.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-[12px] text-neutral-400">
        No timeline events configured.
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
