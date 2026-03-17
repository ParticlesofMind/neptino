"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"
import { Upload } from "lucide-react"
import {
  StudioSection,
  StudioUrlInput,
  StudioDropZone,
  StudioPillGroup,
  StudioSegment,
} from "./studio-primitives"
import { EditorSplitLayout } from "./editor-split-layout"
import { AudioTranscriptPanel } from "./audio-transcript-panel"
import { AudioChaptersPanel } from "./audio-chapters-panel"
import { AudioWaveformPreview } from "./audio-waveform-preview"
import { formatSeconds, parseChapters, toSeconds, type Chapter } from "./audio-editor-shared"
import { MAKE_BLUE_AXIS_HEX, MAKE_BLUE_TEXT_HEX } from "../make-theme"
import {
  findActiveTranscriptSegmentIndex,
  normalizeTranscriptSegments,
  serializeTranscriptSegments,
  type TranscriptSegment,
} from "@/lib/audio-transcript"

interface AudioEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

const SPEED_OPTIONS = [
  { value: "0.5x", label: "0.5×" },
  { value: "0.75x", label: "0.75×" },
  { value: "1x", label: "1×" },
  { value: "1.25x", label: "1.25×" },
  { value: "1.5x", label: "1.5×" },
  { value: "2x", label: "2×" },
] as const

function getAudioSourceErrorMessage(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) {
    return "YouTube links are not supported in the audio block. Use the video block for YouTube URLs, or provide a direct MP3, WAV, or OGG file URL here."
  }
  if (/vimeo\.com/i.test(url)) {
    return "Vimeo links are not supported in the audio block. Use the video block for Vimeo URLs, or provide a direct MP3, WAV, or OGG file URL here."
  }
  return "This audio URL could not be loaded. Check that it points directly to an MP3, WAV, or OGG file with browser access."
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError")
    || (error instanceof Error && error.name === "AbortError")
  )
}

export function AudioEditor({ content, onChange }: AudioEditorProps) {
  const [sourceTab, setSourceTab] = useState<"url" | "upload">("url")
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false)
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)
  const latestUrlRef = useRef("")

  const url = typeof content.url === "string" ? content.url : ""
  const title = typeof content.title === "string" ? content.title : ""
  const playback = typeof content.playback === "string" ? content.playback : "1x"
  const chapters = parseChapters(content.chapters)
  const transcriptSegments = useMemo(
    () => normalizeTranscriptSegments(content.transcriptSegments, content.transcript),
    [content.transcript, content.transcriptSegments],
  )
  const playbackRate = useMemo(() => Number(playback.replace("x", "")) || 1, [playback])
  const activeTranscriptSegmentIndex = useMemo(
    () => findActiveTranscriptSegmentIndex(transcriptSegments, currentTime),
    [currentTime, transcriptSegments],
  )

  useEffect(() => {
    latestUrlRef.current = url
  }, [url])

  useEffect(() => {
    if (!waveformRef.current || !audioRef.current) return
    const audioElement = audioRef.current
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      media: audioElement,
      waveColor: "#334155",
      progressColor: MAKE_BLUE_TEXT_HEX,
      cursorColor: MAKE_BLUE_AXIS_HEX,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 96,
      normalize: true,
      autoScroll: true,
    })
    ws.on("ready", () => {
      setAudioError(null)
      setDuration(ws.getDuration())
      ws.setPlaybackRate(playbackRate)
    })
    ws.on("timeupdate", (t) => setCurrentTime(t))
    ws.on("play", () => setIsPlaying(true))
    ws.on("pause", () => setIsPlaying(false))
    ws.on("finish", () => setIsPlaying(false))
    ws.on("error", () => setAudioError(getAudioSourceErrorMessage(latestUrlRef.current)))
    waveSurferRef.current = ws
    return () => {
      waveSurferRef.current = null
      try {
        ws.unAll()
        audioElement.pause()
        audioElement.removeAttribute("src")
        audioElement.load()
        ws.destroy()
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("[AudioEditor] Failed to clean up audio waveform", error)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setAudioError(null)
    setCurrentTime(0)
    setDuration(0)
  }, [url])

  useEffect(() => {
    setTranscriptError(null)
    setAudioError(null)
  }, [url])

  useEffect(() => {
    waveSurferRef.current?.setPlaybackRate(playbackRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  const togglePlay = () => { void waveSurferRef.current?.playPause() }

  const handleAudioError = () => {
    setAudioError(getAudioSourceErrorMessage(url))
    setIsPlaying(false)
  }

  const handleLoadedMetadata = () => {
    const nextDuration = audioRef.current?.duration
    if (typeof nextDuration === "number" && Number.isFinite(nextDuration)) {
      setDuration(nextDuration)
    }
    setAudioError(null)
  }

  const syncTranscript = (nextSegments: TranscriptSegment[]) => {
    onChange("transcriptSegments", nextSegments)
    onChange("transcript", serializeTranscriptSegments(nextSegments))
  }

  const seekToSecond = (targetSeconds: number) => {
    const ws = waveSurferRef.current
    if (!ws) return
    const mediaDuration = duration > 0 ? duration : ws.getDuration()
    if (mediaDuration <= 0) return
    const target = Math.min(Math.max(0, targetSeconds), mediaDuration)
    ws.seekTo(target / mediaDuration)
    setCurrentTime(target)
  }

  const seekToChapter = (timecode: string) => { seekToSecond(toSeconds(timecode)) }

  const addChapter = () => {
    const t = duration > 0 ? formatSeconds(currentTime) : "0:00"
    onChange("chapters", [...chapters, { time: t, title: `Chapter ${chapters.length + 1}` }])
  }

  const removeChapter = (i: number) => {
    onChange("chapters", chapters.filter((_, idx) => idx !== i))
  }

  const updateChapter = (i: number, field: keyof Chapter, value: string) => {
    onChange("chapters", chapters.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)))
  }

  const moveChapter = (i: number, dir: -1 | 1) => {
    const next = [...chapters]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange("chapters", next)
  }

  const addTranscriptSegmentAtPlayhead = () => {
    const nextSegments = [...transcriptSegments, {
      id: `segment-manual-${Date.now()}`,
      start: Math.max(0, currentTime),
      end: Math.max(currentTime + 5, currentTime),
      text: "",
    }].sort((left, right) => left.start - right.start)
    syncTranscript(nextSegments)
  }

  const updateTranscriptSegmentText = (index: number, text: string) => {
    syncTranscript(transcriptSegments.map((segment, segmentIndex) => (
      segmentIndex === index ? { ...segment, text } : segment
    )))
  }

  const removeTranscriptSegment = (index: number) => {
    syncTranscript(transcriptSegments.filter((_, segmentIndex) => segmentIndex !== index))
  }

  const generateTranscript = async () => {
    if (!url.trim() || isGeneratingTranscript) return

    setIsGeneratingTranscript(true)
    setTranscriptError(null)

    try {
      const response = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: url.trim() }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        segments?: TranscriptSegment[]
      }

      if (!response.ok) {
        throw new Error(payload.error || "Transcript generation failed.")
      }

      const nextSegments = normalizeTranscriptSegments(payload.segments)
      if (nextSegments.length === 0) {
        throw new Error("No transcript was returned for this audio source.")
      }

      syncTranscript(nextSegments)
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : "Transcript generation failed.")
    } finally {
      setIsGeneratingTranscript(false)
    }
  }

  return (
    <EditorSplitLayout
      previewClassName="bg-white"
      previewContentClassName="overflow-hidden"
      sidebar={(
        <>
          <StudioSection className="pt-4">
            <StudioSegment
              options={[
                { value: "url", label: "URL" },
                { value: "upload", label: "Upload" },
              ]}
              value={sourceTab}
              onChange={setSourceTab}
            />
            {sourceTab === "url" ? (
              <StudioUrlInput
                value={url}
                placeholder="https://example.com/audio.mp3"
                hint="Direct audio files only. Use the video block for YouTube or Vimeo links."
                onCommit={(u) => onChange("url", u)}
              />
            ) : (
              <StudioDropZone
                icon={<Upload size={22} />}
                label="Drop an MP3, WAV, or OGG file"
                hint="Upload to Supabase storage — coming soon"
                onDrop={() => {}}
                accept="audio/*"
              />
            )}
          </StudioSection>

          <StudioSection label="Playback speed">
            <StudioPillGroup
              options={SPEED_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={playback}
              onChange={(v) => onChange("playback", v)}
            />
          </StudioSection>

          <AudioChaptersPanel
            chapters={chapters}
            currentTime={currentTime}
            duration={duration}
            onAdd={addChapter}
            onMove={moveChapter}
            onRemove={removeChapter}
            onSeek={seekToChapter}
            onUpdate={updateChapter}
          />

          <AudioTranscriptPanel
            segments={transcriptSegments}
            activeSegmentIndex={activeTranscriptSegmentIndex}
            canGenerate={url.trim().length > 0}
            isGenerating={isGeneratingTranscript}
            error={transcriptError}
            onGenerate={generateTranscript}
            onAddAtPlayhead={addTranscriptSegmentAtPlayhead}
            onSeek={seekToSecond}
            onChangeText={updateTranscriptSegmentText}
            onRemove={removeTranscriptSegment}
          />
        </>
      )}
      preview={(
        <div className="flex h-full min-h-0 flex-col justify-center px-6 py-6 md:px-8">
          <AudioWaveformPreview
            title={title}
            url={url}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            audioError={audioError}
            chapters={chapters}
            activeSegment={activeTranscriptSegmentIndex >= 0 ? transcriptSegments[activeTranscriptSegmentIndex] : null}
            audioRef={audioRef}
            waveformRef={waveformRef}
            onSeekToChapter={seekToChapter}
            onSeekToSecond={seekToSecond}
            onTitleChange={(next) => onChange("title", next)}
            onTogglePlay={togglePlay}
            onLoadedMetadata={handleLoadedMetadata}
            onAudioError={handleAudioError}
          />
        </div>
      )}
    />
  )
}
