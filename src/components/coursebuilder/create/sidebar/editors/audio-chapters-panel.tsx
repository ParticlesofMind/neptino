import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { StudioSection } from "./studio-primitives"
import type { Chapter } from "./audio-editor-shared"

interface AudioChaptersPanelProps {
  chapters: Chapter[]
  currentTime: number
  duration: number
  onAdd: () => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (index: number) => void
  onSeek: (timecode: string) => void
  onUpdate: (index: number, field: keyof Chapter, value: string) => void
}

export function AudioChaptersPanel({
  chapters,
  currentTime,
  duration,
  onAdd,
  onMove,
  onRemove,
  onSeek,
  onUpdate,
}: AudioChaptersPanelProps) {
  return (
    <StudioSection
      label="Chapter markers"
      action={(
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
        >
          <Plus size={10} />
          {duration > 0 || currentTime > 0 ? "Add at playhead" : "Add"}
        </button>
      )}
    >
      {chapters.length === 0 && (
        <p className="text-[11px] italic text-neutral-400">No chapters. Add one to mark key moments.</p>
      )}
      <div className="space-y-1.5">
        {chapters.map((chapter, index) => (
          <div key={index} className="flex items-center gap-1.5 rounded-md border border-neutral-100 bg-neutral-50 px-2.5 py-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#233f5d] text-[8px] font-bold text-white">
              {index + 1}
            </span>
            <input
              type="text"
              value={chapter.time}
              onChange={(event) => onUpdate(index, "time", event.target.value)}
              onBlur={() => onSeek(chapter.time)}
              placeholder="0:00"
              className="w-14 shrink-0 bg-transparent font-mono text-[10px] text-neutral-500 outline-none focus:text-neutral-800"
            />
            <input
              type="text"
              value={chapter.title}
              onChange={(event) => onUpdate(index, "title", event.target.value)}
              placeholder="Chapter title"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-neutral-700 outline-none focus:text-neutral-900"
            />
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => onMove(index, -1)} className="p-0.5 text-neutral-400 hover:text-neutral-700">
                <ChevronUp size={12} />
              </button>
              <button type="button" onClick={() => onMove(index, 1)} className="p-0.5 text-neutral-400 hover:text-neutral-700">
                <ChevronDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => onSeek(chapter.time)}
                className="ml-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-[#233f5d] transition-colors hover:bg-[#dbe8f6]"
              >
                Seek
              </button>
              <button type="button" onClick={() => onRemove(index)} className="ml-0.5 p-0.5 text-neutral-400 transition-colors hover:text-red-500">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </StudioSection>
  )
}