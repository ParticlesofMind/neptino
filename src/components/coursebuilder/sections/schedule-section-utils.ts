// Pure utility functions and types for ScheduleSection.
// Extracted from schedule-section.tsx to keep the component file under 300 lines.

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Map JS Date.getDay() (0=Sun..6=Sat) → our "Mon".."Sun" labels */
export const JS_DAY_TO_LABEL: Record<number, string> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
}

/** Parse "DD.MM.YYYY" → Date (local midnight) or null */
export function parseDMY(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return isNaN(d.getTime()) ? null : d
}

/** Format Date → "DD.MM.YYYY" */
export function fmtDMY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}.${mm}.${d.getFullYear()}`
}

export interface ScheduleEntry {
  id: string
  day: string   // "Mon", "Tue", …
  date: string  // "DD.MM.YYYY"
  start_time?: string
  end_time?: string
  session?: number
}

export type ScheduleMode = "date-range" | "session-count" | "manual-list"
export type RepeatUnit = "none" | "weeks" | "months" | "years"

export function createScheduleEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `sched-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function ensureScheduleEntryIds(entries: ScheduleEntry[]): ScheduleEntry[] {
  return entries.map((entry) => ({
    ...entry,
    id: entry.id || createScheduleEntryId(),
  }))
}

export function parseTimeToMinutes(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
  return hh * 60 + mm
}

export function formatMinutesToTime(minutes: number): string {
  const safe = ((minutes % 1440) + 1440) % 1440
  const hh = String(Math.floor(safe / 60)).padStart(2, "0")
  const mm = String(safe % 60).padStart(2, "0")
  return `${hh}:${mm}`
}

export function parseImportedEntries(raw: string): ScheduleEntry[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      const arr = Array.isArray(parsed) ? parsed : parsed.entries
      if (Array.isArray(arr)) {
        return arr
          .map((row: unknown) => {
            const r = row as Record<string, unknown>
            const date = String(r.date ?? "").trim()
            const start = String(r.start_time ?? r.start ?? "").trim()
            const end = String(r.end_time ?? r.end ?? "").trim()
            const d = parseDMY(date)
            if (!d) return null
            return {
              id: createScheduleEntryId(),
              day: JS_DAY_TO_LABEL[d.getDay()],
              date: fmtDMY(d),
              start_time: start || undefined,
              end_time: end || undefined,
            }
          })
          .filter(Boolean) as ScheduleEntry[]
      }
    } catch {
    }
  }

  const dateRegex = /(\d{1,2}\.\d{1,2}\.\d{4})/
  const timeRangeRegex = /(\d{1,2}:\d{2})\s*[-–—>]\s*(\d{1,2}:\d{2})/

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const dm = line.match(dateRegex)
      if (!dm) return null
      const d = parseDMY(dm[1])
      if (!d) return null
      const tm = line.match(timeRangeRegex)
      return {
        id: createScheduleEntryId(),
        day: JS_DAY_TO_LABEL[d.getDay()],
        date: fmtDMY(d),
        start_time: tm?.[1],
        end_time: tm?.[2],
      }
    })
    .filter(Boolean) as ScheduleEntry[]
}

export function parseIcsEntries(raw: string): ScheduleEntry[] {
  const dtStartRegex = /DTSTART(?:;[^:]+)?:([0-9TZ]+)/g
  const dtEndRegex = /DTEND(?:;[^:]+)?:([0-9TZ]+)/g
  const starts = [...raw.matchAll(dtStartRegex)].map((m) => m[1])
  const ends = [...raw.matchAll(dtEndRegex)].map((m) => m[1])

  const parseIcsDate = (value: string): Date | null => {
    if (/^\d{8}$/.test(value)) {
      const yyyy = Number(value.slice(0, 4))
      const mm = Number(value.slice(4, 6))
      const dd = Number(value.slice(6, 8))
      return new Date(yyyy, mm - 1, dd)
    }
    if (/^\d{8}T\d{6}Z?$/.test(value)) {
      const yyyy = Number(value.slice(0, 4))
      const mm = Number(value.slice(4, 6))
      const dd = Number(value.slice(6, 8))
      const hh = Number(value.slice(9, 11))
      const min = Number(value.slice(11, 13))
      const sec = Number(value.slice(13, 15))
      if (value.endsWith("Z")) {
        return new Date(Date.UTC(yyyy, mm - 1, dd, hh, min, sec))
      }
      return new Date(yyyy, mm - 1, dd, hh, min, sec)
    }
    return null
  }

  const fmtTime = (d: Date): string => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

  return starts
    .map((startValue, idx) => {
      const start = parseIcsDate(startValue)
      if (!start || isNaN(start.getTime())) return null
      const end = parseIcsDate(ends[idx] ?? "")
      return {
        id: createScheduleEntryId(),
        day: JS_DAY_TO_LABEL[start.getDay()],
        date: fmtDMY(start),
        start_time: startValue.includes("T") ? fmtTime(start) : undefined,
        end_time: end && !isNaN(end.getTime()) && (ends[idx] ?? "").includes("T") ? fmtTime(end) : undefined,
      }
    })
    .filter(Boolean) as ScheduleEntry[]
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data: bytes }).promise
  const chunks: string[] = []
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
    chunks.push(pageText)
  }
  return chunks.join("\n")
}
