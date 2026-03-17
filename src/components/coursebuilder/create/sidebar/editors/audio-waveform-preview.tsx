import type { RefObject } from "react"
import { AudioLines, Pause, Play } from "lucide-react"
import { EditorPreviewFrame } from "./editor-preview-frame"
import { MAKE_BLUE_BUTTON } from "../make-theme"
import { formatTimestampLabel, type TranscriptSegment } from "@/lib/audio-transcript"
import { formatSeconds, toSeconds, type Chapter } from "./audio-editor-shared"

interface AudioWaveformPreviewProps {
  title: string
  url: string
  currentTime: number
  duration: number
  isPlaying: boolean
  audioError: string | null
  chapters: Chapter[]
  activeSegment: TranscriptSegment | null
  audioRef: RefObject<HTMLAudioElement | null>
  waveformRef: RefObject<HTMLDivElement | null>
  onSeekToChapter: (timecode: string) => void
  onSeekToSecond: (seconds: number) => void
  onTitleChange: (title: string) => void
  onTogglePlay: () => void
  onLoadedMetadata: () => void
  onAudioError: () => void
}

export function AudioWaveformPreview({
  title,
  url,
  currentTime,
  duration,
  isPlaying,
  audioError,
  chapters,
  activeSegment,
  audioRef,
  waveformRef,
  onSeekToChapter,
  onSeekToSecond,
  onTitleChange,
  onTogglePlay,
  onLoadedMetadata,
  onAudioError,
}: AudioWaveformPreviewProps) {
  if (!url) {
    return (
      <EditorPreviewFrame
        cardType="audio"
        title={title}
        onTitleChange={onTitleChange}
        className="w-full"
        bodyClassName="flex min-h-[20rem] flex-1 flex-col items-center justify-center gap-3 bg-white px-8 py-12 text-center"
      >
        <AudioLines size={30} className="text-neutral-300" />
        <p className="text-[13px] font-medium text-neutral-700">No audio loaded</p>
        <p className="max-w-sm text-[11px] leading-relaxed text-neutral-400">Add a direct audio source to review the waveform and chapter timing.</p>
      </EditorPreviewFrame>
    )
  }

  return (
    <EditorPreviewFrame
      cardType="audio"
      title={title}
      onTitleChange={onTitleChange}
      className="w-full"
      bodyClassName="flex min-h-[20rem] flex-1 flex-col justify-center bg-white px-6 py-6"
    >
      <div className="relative">
        <div ref={waveformRef} className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50" />
        {duration > 0 && chapters.map((chapter, index) => {
          const seconds = toSeconds(chapter.time)
          const left = `${Math.min(100, Math.max(0, (seconds / duration) * 100))}%`
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSeekToChapter(chapter.time)}
              style={{ left }}
              className="group absolute inset-y-0 -translate-x-1/2 pointer-events-auto"
              title={chapter.title || `Chapter ${index + 1}`}
            >
              <div className="absolute inset-y-0 w-px bg-[#8ea9c8] group-hover:bg-[#233f5d]" />
              <div className="absolute top-0 -translate-x-1/2 flex h-4 w-4 items-center justify-center rounded-b bg-[#233f5d] text-[8px] font-bold text-white shadow-sm">
                {index + 1}
              </div>
            </button>
          )
        })}
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        controls
        controlsList="nodownload"
        onLoadedMetadata={onLoadedMetadata}
        onError={onAudioError}
        className="mt-4 w-full"
      />

      {audioError && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
          {audioError}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors ${MAKE_BLUE_BUTTON}`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="flex-1 text-[11px] font-mono text-neutral-600">
          {formatSeconds(currentTime)}
          <span className="mx-1 text-neutral-300">/</span>
          {formatSeconds(duration)}
        </div>
        {activeSegment && (
          <button
            type="button"
            onClick={() => onSeekToSecond(activeSegment.start)}
            className="rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            {formatTimestampLabel(activeSegment.start)} active line
          </button>
        )}
      </div>
    </EditorPreviewFrame>
  )
}