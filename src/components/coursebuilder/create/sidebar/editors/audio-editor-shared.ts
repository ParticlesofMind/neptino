export interface Chapter {
  time: string
  title: string
}

export function toSeconds(timecode: string): number {
  const parts = timecode.trim().split(":").map((part) => Number(part))
  if (parts.some((part) => Number.isNaN(part) || part < 0)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return 0
}

export function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
}

export function parseChapters(raw: unknown): Chapter[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (chapter): chapter is Chapter => typeof chapter === "object" && chapter !== null && "time" in chapter && "title" in chapter,
  )
}