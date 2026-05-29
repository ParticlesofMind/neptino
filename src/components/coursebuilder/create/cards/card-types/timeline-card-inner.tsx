"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSimulationTime } from "./simulation-time-context"

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

function yearFromDate(dateStr: string): number | null {
  const match = dateStr.match(/-?\d{1,4}/)
  if (!match) return null
  const year = Number(match[0])
  return Number.isFinite(year) ? year : null
}

export default function TimelineCardInner({ content }: Props) {
  const simulation = useSimulationTime()
  const containerRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<TLTimeline | null>(null)
  const containerIdRef = useRef(`tl-${Math.random().toString(36).slice(2, 9)}`)

  const rawEvents = useMemo(
    () => Array.isArray(content.events) ? (content.events as TimelineEvent[]) : [],
    [content.events],
  )
  const numericEvents = useMemo(
    () => rawEvents
      .map((event) => ({ ...event, year: yearFromDate(event.date) }))
      .filter((event): event is TimelineEvent & { year: number } => event.year !== null),
    [rawEvents],
  )
  const standaloneMinYear = numericEvents.length > 0 ? Math.min(...numericEvents.map((event) => event.year)) : 0
  const standaloneMaxYear = numericEvents.length > 0 ? Math.max(...numericEvents.map((event) => event.year)) : 0
  const [standaloneYear, setStandaloneYear] = useState(standaloneMinYear)
  const sliderMinYear = simulation?.minYear ?? standaloneMinYear
  const sliderMaxYear = simulation?.maxYear ?? standaloneMaxYear
  const currentYear = simulation?.year ?? standaloneYear
  const showSlider = Boolean(simulation || numericEvents.length >= 2)
  const activeEvent = numericEvents
    .filter((event) => event.year <= currentYear)
    .sort((left, right) => right.year - left.year)[0] ?? numericEvents[0]
  const activePhase = simulation?.phases.find((phase) => currentYear >= phase.startYear && currentYear <= phase.endYear)

  // Stringify for stable dep comparison
  const eventsKey = JSON.stringify(rawEvents)

  useEffect(() => {
    if (simulation) return
    setStandaloneYear((year) => (
      year >= standaloneMinYear && year <= standaloneMaxYear
        ? year
        : standaloneMinYear
    ))
  }, [simulation, standaloneMaxYear, standaloneMinYear])

  useEffect(() => {
    const el = containerRef.current
    if (!el || rawEvents.length === 0 || simulation) return

    let active = true
    const containerId = containerIdRef.current

    // Tear down any previous instance
    if (tlRef.current) {
      try { tlRef.current.destroy() } catch { /* no-op */ }
      tlRef.current = null
    }
    el.innerHTML = ""
    el.id = containerId

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
        tlRef.current = new window.TL.Timeline(containerId, data, {
          timenav_position: "top",
          is_embed: true,
          hash_bookmark: false,
        })
        // Suppress the story/text panel — show only the horizontal nav strip.
        const styleId = `tl-style-${containerId}`
        document.getElementById(styleId)?.remove()
        const styleEl = document.createElement("style")
        styleEl.id = styleId
        styleEl.textContent = [
          `#${containerId} .tl-storyslider { display: none !important; }`,
          `#${containerId} .tl-timenav { position: absolute !important; top: 0 !important; height: 100% !important; }`,
        ].join("\n")
        document.head.appendChild(styleEl)
      } catch (err) {
        console.error("[TimelineCard] init error:", err)
      }
    })

    return () => {
      active = false
      document.getElementById(`tl-style-${containerId}`)?.remove()
      if (tlRef.current) {
        try { tlRef.current.destroy() } catch { /* no-op */ }
        tlRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey])

  if (showSlider && sliderMaxYear > sliderMinYear) {
    return (
      <div className="flex h-full min-h-[120px] min-w-0 flex-col justify-center bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-neutral-800">
              {activePhase?.label ?? activeEvent?.label ?? "Timeline"}
            </div>
            {(activePhase?.description ?? activeEvent?.description) && (
              <div className="truncate text-[10px] text-neutral-500">
                {activePhase?.description ?? activeEvent?.description}
              </div>
            )}
          </div>
          <div className="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[12px] font-semibold text-neutral-800">
            {currentYear}
          </div>
        </div>
        <div className="relative mb-2 h-4">
          {simulation?.phases.map((phase) => {
            const start = ((phase.startYear - sliderMinYear) / (sliderMaxYear - sliderMinYear)) * 100
            const end = ((phase.endYear - sliderMinYear) / (sliderMaxYear - sliderMinYear)) * 100
            return (
              <div
                key={phase.id}
                className="absolute top-1 h-2 rounded-full"
                style={{
                  left: `${Math.min(100, Math.max(0, start))}%`,
                  width: `${Math.max(1, Math.min(100, end) - Math.max(0, start))}%`,
                  backgroundColor: phase.color ?? "#94a3b8",
                  opacity: activePhase?.id === phase.id ? 0.75 : 0.28,
                }}
                title={`${phase.startYear}-${phase.endYear}: ${phase.label}`}
              />
            )
          })}
          {numericEvents.map((event) => {
            const left = ((event.year - sliderMinYear) / (sliderMaxYear - sliderMinYear)) * 100
            return (
              <span
                key={`${event.date}-${event.label}`}
                title={`${event.date}: ${event.label}`}
                className="absolute top-0 h-4 w-px bg-neutral-400"
                style={{ left: `${Math.min(100, Math.max(0, left))}%` }}
              />
            )
          })}
        </div>
        <input
          aria-label="Timeline year"
          type="range"
          min={sliderMinYear}
          max={sliderMaxYear}
          step={1}
          value={currentYear}
          onChange={(event) => {
            const nextYear = Number(event.target.value)
            if (simulation) {
              simulation.setYear(nextYear)
            } else {
              setStandaloneYear(nextYear)
            }
          }}
          className="block w-full accent-neutral-900"
        />
        <div className="mt-1 flex justify-between font-mono text-[9px] text-neutral-400">
          <span>{sliderMinYear}</span>
          <span>{sliderMaxYear}</span>
        </div>
      </div>
    )
  }

  if (rawEvents.length === 0) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-[12px] text-neutral-400">
        No timeline events configured.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[160px] min-w-0 flex-col bg-white">
      <div
        ref={containerRef}
        className="min-h-[82px] flex-1"
        style={{ position: "relative", width: "100%" }}
      />
      {showSlider && sliderMaxYear > sliderMinYear && (
        <div className="border-t border-neutral-100 bg-white px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-semibold text-neutral-700">
                {activePhase?.label ?? activeEvent?.label ?? "Timeline"}
              </div>
              {(activePhase?.description ?? activeEvent?.description) && (
                <div className="truncate text-[10px] text-neutral-400">
                  {activePhase?.description ?? activeEvent?.description}
                </div>
              )}
            </div>
            <div className="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-neutral-700">
              {currentYear}
            </div>
          </div>
          <div className="relative h-3">
            {numericEvents.map((event) => {
              const left = ((event.year - sliderMinYear) / (sliderMaxYear - sliderMinYear)) * 100
              return (
                <span
                  key={`${event.date}-${event.label}`}
                  title={`${event.date}: ${event.label}`}
                  className="absolute top-1 h-2 w-px bg-neutral-300"
                  style={{ left: `${Math.min(100, Math.max(0, left))}%` }}
                />
              )
            })}
          </div>
          <input
            aria-label="Timeline year"
            type="range"
            min={sliderMinYear}
            max={sliderMaxYear}
            step={1}
          value={currentYear}
          onChange={(event) => {
            const nextYear = Number(event.target.value)
            if (simulation) {
              simulation.setYear(nextYear)
              } else {
                setStandaloneYear(nextYear)
              }
            }}
            className="block w-full accent-neutral-900"
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-neutral-400">
            <span>{sliderMinYear}</span>
            <span>{sliderMaxYear}</span>
          </div>
        </div>
      )}
    </div>
  )
}
