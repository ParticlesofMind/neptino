import { describe, expect, it } from "vitest"

import {
  findActiveTranscriptSegmentIndex,
  normalizeInferenceTranscript,
  normalizeTranscriptSegments,
  serializeTranscriptSegments,
} from "@/lib/audio-transcript"

describe("audio transcript helpers", () => {
  it("normalizes a legacy transcript string into ordered segments", () => {
    const segments = normalizeTranscriptSegments(undefined, "[0:00] Intro\n[0:15] Main idea")

    expect(segments).toHaveLength(2)
    expect(segments[0]).toMatchObject({ start: 0, end: 15, text: "Intro" })
    expect(segments[1]).toMatchObject({ start: 15, text: "Main idea" })
  })

  it("normalizes inference chunks with timestamps", () => {
    const segments = normalizeInferenceTranscript("", [
      { text: "First line", timestamp: [0, 4.2] },
      { text: "Second line", timestamp: [4.2, 9.8] },
    ])

    expect(segments).toEqual([
      { id: "segment-0-0", start: 0, end: 4.2, text: "First line" },
      { id: "segment-1-4200", start: 4.2, end: 9.8, text: "Second line" },
    ])
    expect(serializeTranscriptSegments(segments)).toBe("[0:00] First line\n[0:04] Second line")
  })

  it("finds the active transcript segment for a playhead time", () => {
    const segments = normalizeTranscriptSegments([
      { id: "a", start: 0, end: 5, text: "Intro" },
      { id: "b", start: 5, end: 12, text: "Body" },
    ])

    expect(findActiveTranscriptSegmentIndex(segments, 0)).toBe(0)
    expect(findActiveTranscriptSegmentIndex(segments, 6)).toBe(1)
    expect(findActiveTranscriptSegmentIndex(segments, 14)).toBe(-1)
  })
})