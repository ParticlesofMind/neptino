"use client"

import { useEffect, useMemo } from "react"

type TimelineEvent = {
  year: number
  headline: string
  text?: string
}

type TimelineJsCardProps = {
  itemId: string
  events: TimelineEvent[]
}

declare global {
  interface Window {
    TL?: {
      Timeline: new (target: string | HTMLElement, data: unknown, options?: Record<string, unknown>) => unknown
    }
    __timelineJsPromise?: Promise<void>
    __timelineJsCssLoaded?: boolean
  }
}

function loadTimelineJs(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve()
  }

  if (!window.__timelineJsCssLoaded) {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://cdn.knightlab.com/libs/timeline3/latest/css/timeline.css"
    document.head.appendChild(link)
    window.__timelineJsCssLoaded = true
  }

  if (window.TL?.Timeline) {
    return Promise.resolve()
  }

  if (!window.__timelineJsPromise) {
    window.__timelineJsPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://cdn.knightlab.com/libs/timeline3/latest/js/timeline.js"
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load TimelineJS"))
      document.body.appendChild(script)
    })
  }

  return window.__timelineJsPromise
}

export function TimelineJsCard({ itemId, events }: TimelineJsCardProps) {
  const timelineId = useMemo(() => `timelinejs-${itemId}`, [itemId])

  useEffect(() => {
    if (events.length === 0) {
      return
    }

    let cancelled = false

    const mount = async () => {
      await loadTimelineJs()
      if (cancelled || !window.TL?.Timeline) {
        return
      }

      const element = document.getElementById(timelineId)
      if (!element || element.dataset.mounted === "1") {
        return
      }

      element.dataset.mounted = "1"

      const data = {
        events: events.map((event) => ({
          start_date: { year: event.year },
          text: {
            headline: event.headline,
            text: event.text ?? "",
          },
        })),
      }

      new window.TL.Timeline(element, data, {
        timenav_height: 130,
        timenav_height_percentage: 100,
        start_at_slide: 0,
        hash_bookmark: false,
        initial_zoom: 1,
        scale_factor: 1,
        optimal_tick_width: 80,
      })
    }

    void mount()

    return () => {
      cancelled = true
    }
  }, [events, timelineId])

  if (events.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground italic">No timeline points available.</p>
  }

  return <div id={timelineId} className="mt-2 h-[160px] w-full overflow-hidden rounded-lg" />
}
