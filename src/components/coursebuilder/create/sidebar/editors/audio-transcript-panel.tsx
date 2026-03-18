"use client"

import { useEffect, useRef } from "react"
import { Plus, Sparkles, Trash2 } from "lucide-react"
import { StudioSection } from "./studio-primitives"
import { MAKE_BLUE_BUTTON, MAKE_BLUE_INPUT_FOCUS, MAKE_BLUE_SURFACE_HEX, MAKE_BLUE_TEXT_HEX } from "../make-theme"
import { formatTimestampLabel, type TranscriptSegment } from "@/lib/audio-transcript"

interface AudioTranscriptPanelProps {
  segments: TranscriptSegment[]
  activeSegmentIndex: number
  canGenerate: boolean
  isGenerating: boolean
  error: string | null
  onGenerate: () => void
  onAddAtPlayhead: () => void
  onSeek: (seconds: number) => void
  onChangeText: (index: number, text: string) => void
  onRemove: (index: number) => void
}

export function AudioTranscriptPanel({
  segments,
  activeSegmentIndex,
  canGenerate,
  isGenerating,
  error,
  onGenerate,
  onAddAtPlayhead,
  onSeek,
  onChangeText,
  onRemove,
}: AudioTranscriptPanelProps) {
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    if (activeSegmentIndex < 0) return
    segmentRefs.current[activeSegmentIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [activeSegmentIndex])

  return (
    <StudioSection
      label="Transcript"
      noBorder
      action={(
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAddAtPlayhead}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <Plus size={10} />
            Add note
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${MAKE_BLUE_BUTTON}`}
          >
            <Sparkles size={10} />
            {isGenerating ? "Transcribing..." : "Generate"}
          </button>
        </div>
      )}
    >
      {!canGenerate && segments.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] leading-relaxed text-neutral-500">
          Add a direct audio URL to generate a timestamped transcript.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive">
          {error}
        </p>
      )}

      {segments.length === 0 ? (
        <p className="text-[11px] italic text-neutral-400">No transcript yet. Generate one with AI or add a note manually.</p>
      ) : (
        <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
          {segments.map((segment, index) => {
            const isActive = index === activeSegmentIndex
            return (
              <div
                key={segment.id}
                ref={(element) => {
                  segmentRefs.current[index] = element
                }}
                className="rounded-xl border p-2.5 transition-colors"
                style={{
                  borderColor: isActive ? MAKE_BLUE_TEXT_HEX : "#e5e5e5",
                  backgroundColor: isActive ? MAKE_BLUE_SURFACE_HEX : "#fafafa",
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSeek(segment.start)}
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:bg-white/70"
                    style={{ color: MAKE_BLUE_TEXT_HEX }}
                  >
                    {formatTimestampLabel(segment.start)} - {formatTimestampLabel(segment.end)}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="p-0.5 text-neutral-400 transition-colors hover:text-destructive"
                    aria-label={`Remove transcript segment ${index + 1}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <textarea
                  value={segment.text}
                  onChange={(event) => onChangeText(index, event.target.value)}
                  rows={3}
                  className={`w-full resize-none rounded-lg border border-white/70 bg-white px-2.5 py-2 text-[12px] leading-relaxed text-neutral-700 outline-none transition-shadow ${MAKE_BLUE_INPUT_FOCUS}`}
                  placeholder="Transcript segment text"
                />
              </div>
            )
          })}
        </div>
      )}
    </StudioSection>
  )
}