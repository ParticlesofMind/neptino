export interface TranscriptSegment {
  id: string
  start: number
  end: number
  text: string
}

interface TranscriptSegmentCandidate {
  id?: unknown
  start?: unknown
  end?: unknown
  text?: unknown
}

interface AutomaticSpeechRecognitionChunk {
  text?: unknown
  timestamp?: unknown
}

const FALLBACK_SEGMENT_DURATION_SECONDS = 5
const TIMECODE_PATTERN = /^\s*\[([^\]]+)\]\s*(.*)$/

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function createSegmentId(index: number, start: number): string {
  return `segment-${index}-${Math.round(start * 1000)}`
}

export function parseTimestampLabel(label: string): number {
  const parts = label.trim().split(":").map((part) => Number(part))
  if (parts.length === 0 || parts.some((part) => Number.isNaN(part) || part < 0)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

export function formatTimestampLabel(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainingSeconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
}

function finalizeSegments(segments: Array<Omit<TranscriptSegment, "end">>): TranscriptSegment[] {
  return segments.map((segment, index) => {
    const next = segments[index + 1]
    const fallbackEnd = segment.start + FALLBACK_SEGMENT_DURATION_SECONDS
    const end = next && next.start > segment.start ? next.start : fallbackEnd
    return {
      ...segment,
      end,
    }
  })
}

function normalizeSegment(rawSegment: TranscriptSegmentCandidate, index: number): TranscriptSegment | null {
  const start = Math.max(0, readNumber(rawSegment.start) ?? 0)
  const endCandidate = Math.max(start, readNumber(rawSegment.end) ?? start + FALLBACK_SEGMENT_DURATION_SECONDS)
  const text = readString(rawSegment.text)
  if (!text) return null

  return {
    id: readString(rawSegment.id) || createSegmentId(index, start),
    start,
    end: endCandidate > start ? endCandidate : start + FALLBACK_SEGMENT_DURATION_SECONDS,
    text,
  }
}

function parseLegacyTranscript(transcript: string): TranscriptSegment[] {
  const lines = transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const draftSegments: Array<Omit<TranscriptSegment, "end">> = []

  lines.forEach((line, index) => {
    const match = line.match(TIMECODE_PATTERN)
    const start = match ? parseTimestampLabel(match[1]) : draftSegments.at(-1)?.start ?? 0
    const text = match ? match[2].trim() : line
    if (!text) return
    draftSegments.push({
      id: createSegmentId(index, start),
      start,
      text,
    })
  })

  return finalizeSegments(draftSegments)
}

export function normalizeTranscriptSegments(rawSegments: unknown, fallbackTranscript?: unknown): TranscriptSegment[] {
  if (Array.isArray(rawSegments)) {
    const segments = rawSegments
      .map((segment, index) => {
        if (!segment || typeof segment !== "object") return null
        return normalizeSegment(segment as TranscriptSegmentCandidate, index)
      })
      .filter((segment): segment is TranscriptSegment => segment !== null)

    if (segments.length > 0) return segments
  }

  return parseLegacyTranscript(readString(fallbackTranscript))
}

export function serializeTranscriptSegments(segments: TranscriptSegment[]): string {
  return segments
    .map((segment) => `[${formatTimestampLabel(segment.start)}] ${segment.text.trim()}`)
    .join("\n")
}

function readTimestampPair(rawTimestamp: unknown): [number, number] | null {
  if (!Array.isArray(rawTimestamp) || rawTimestamp.length < 2) return null
  const start = readNumber(rawTimestamp[0])
  const end = readNumber(rawTimestamp[1])
  if (start === null || end === null) return null
  return [Math.max(0, start), Math.max(start, end)]
}

export function normalizeInferenceTranscript(rawText: unknown, rawChunks: unknown): TranscriptSegment[] {
  if (Array.isArray(rawChunks)) {
    const segments = rawChunks
      .map((chunk, index) => {
        if (!chunk || typeof chunk !== "object") return null
        const { text, timestamp } = chunk as AutomaticSpeechRecognitionChunk
        const pair = readTimestampPair(timestamp)
        const cleanText = readString(text)
        if (!pair || !cleanText) return null
        return {
          id: createSegmentId(index, pair[0]),
          start: pair[0],
          end: pair[1] > pair[0] ? pair[1] : pair[0] + FALLBACK_SEGMENT_DURATION_SECONDS,
          text: cleanText,
        }
      })
      .filter((segment): segment is TranscriptSegment => segment !== null)

    if (segments.length > 0) return segments
  }

  const text = readString(rawText)
  if (!text) return []

  return [{
    id: createSegmentId(0, 0),
    start: 0,
    end: FALLBACK_SEGMENT_DURATION_SECONDS,
    text,
  }]
}

export function findActiveTranscriptSegmentIndex(segments: TranscriptSegment[], currentTime: number): number {
  return segments.findIndex((segment, index) => {
    const nextStart = segments[index + 1]?.start
    const upperBound = typeof nextStart === "number" && nextStart > segment.start
      ? nextStart
      : segment.end
    return currentTime >= segment.start && currentTime < upperBound
  })
}