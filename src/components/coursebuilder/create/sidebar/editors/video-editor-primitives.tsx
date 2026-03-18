"use client"

import { Trash2 } from "lucide-react"
import { MAKE_BLUE_ACTIVE_SOFT, MAKE_BLUE_INPUT_FOCUS } from "../make-theme"

interface Chapter {
  time: string
  title: string
}

interface ProviderBadgeProps {
  provider: "youtube" | "vimeo" | "direct"
}

interface ChapterTimelineProps {
  chapters: Chapter[]
  duration: number
  selectedIdx: number | null
  onSelect: (index: number | null) => void
  toSeconds: (timecode: string) => number
  formatSeconds: (seconds: number) => string
}

interface ChapterEditRowProps {
  chapter: Chapter
  idx: number
  onUpdate: (field: keyof Chapter, value: string) => void
  onDelete: () => void
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const cfg = {
    youtube: { label: "YouTube", dot: "bg-red-500", pill: "bg-[#f0d8d8] text-[#8a3030] border-[#f0d8d8]" },
    vimeo: { label: "Vimeo", dot: "bg-blue-500", pill: "bg-[#dbe8f6] text-[#3a6ea0] border-[#dbe8f6]" },
    direct: { label: "Direct", dot: "bg-neutral-400", pill: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  }[provider]

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export function ChapterTimeline({
  chapters,
  duration,
  selectedIdx,
  onSelect,
  toSeconds,
  formatSeconds,
}: ChapterTimelineProps) {
  const totalSecs =
    duration > 0
      ? duration
      : chapters.length > 0
        ? Math.max(...chapters.map((chapter) => toSeconds(chapter.time))) + 60
        : 300

  return (
    <div className="space-y-1.5">
      <div className="relative rounded-lg border border-neutral-200 bg-white" style={{ height: 54 }}>
        <div className="absolute inset-x-4 bg-neutral-200" style={{ height: 1, top: "50%" }} />

        {chapters.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-[10px] text-neutral-600">No chapters yet</p>
          </div>
        )}

        {chapters.map((chapter, index) => {
          const secs = toSeconds(chapter.time)
          const pct = Math.min(96, Math.max(4, (secs / totalSecs) * 100))
          const active = selectedIdx === index

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(active ? null : index)}
              style={{ left: `${pct}%` }}
              className="group absolute inset-y-0 -translate-x-1/2"
            >
              <div
                className={[
                  "absolute inset-y-0 w-px transition-colors",
                  active ? "bg-[#233f5d]" : "bg-neutral-300 group-hover:bg-neutral-400",
                ].join(" ")}
              />
              <div
                className={[
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all",
                  active
                    ? "border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[0_0_8px_rgba(219,232,246,0.8)]"
                    : "border-neutral-300 bg-white text-neutral-500 group-hover:border-neutral-400 group-hover:text-neutral-700",
                ].join(" ")}
              >
                {index + 1}
              </div>
              <div
                className={[
                  "absolute bottom-1.5 -translate-x-1/2 whitespace-nowrap text-[8px] font-mono transition-opacity",
                  active ? "text-[#233f5d] opacity-100" : "text-neutral-500 opacity-0 group-hover:opacity-100",
                ].join(" ")}
              >
                {chapter.time}
              </div>
            </button>
          )
        })}
      </div>
      <div className="flex justify-between px-1 text-[9px] font-mono text-neutral-500">
        <span>0:00</span>
        {duration > 0 && <span>{formatSeconds(duration)}</span>}
      </div>
    </div>
  )
}

export function ChapterEditRow({ chapter, idx, onUpdate, onDelete }: ChapterEditRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#9eb9da]/40 bg-[#dbe8f6]/45 px-3 py-2">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#233f5d] text-[9px] font-bold text-white">
        {idx + 1}
      </div>
      <input
        type="text"
        value={chapter.time}
        onChange={(e) => onUpdate("time", e.target.value)}
        placeholder="0:00"
        className={`w-16 shrink-0 rounded border border-[#9eb9da]/40 bg-white px-2 py-1 font-mono text-[11px] text-neutral-800 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
      />
      <input
        type="text"
        value={chapter.title}
        onChange={(e) => onUpdate("title", e.target.value)}
        placeholder="Chapter title"
        className={`min-w-0 flex-1 rounded border border-[#9eb9da]/40 bg-white px-2 py-1 text-[12px] text-neutral-800 outline-none ${MAKE_BLUE_INPUT_FOCUS}`}
      />
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 text-neutral-400 transition-colors hover:text-destructive"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}