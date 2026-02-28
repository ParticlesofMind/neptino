"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DANGER_ACTION_BUTTON_CLASS,
  DANGER_ACTION_BUTTON_SM_CLASS,
  PRIMARY_ACTION_BUTTON_CLASS,
  SECONDARY_ACTION_BUTTON_CLASS,
  SetupColumn,
  SetupPanelLayout,
  SetupSection,
} from "@/components/coursebuilder/layout-primitives"
import { FieldLabel, TextInput } from "@/components/coursebuilder/form-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Map JS Date.getDay() (0=Sun..6=Sat) → our "Mon".."Sun" labels */
const JS_DAY_TO_LABEL: Record<number, string> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
}

/** Parse "DD.MM.YYYY" → Date (local midnight) or null */
function parseDMY(s: string): Date | null {
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return isNaN(d.getTime()) ? null : d
}

/** Format Date → "DD.MM.YYYY" */
function fmtDMY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}.${mm}.${d.getFullYear()}`
}

interface ScheduleEntry {
  id: string
  day: string   // "Mon", "Tue", …
  date: string  // "DD.MM.YYYY"
  start_time?: string
  end_time?: string
  session?: number
}

type ScheduleMode = "date-range" | "session-count" | "manual-list"
type RepeatUnit = "none" | "weeks" | "months" | "years"

function createScheduleEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `sched-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ensureScheduleEntryIds(entries: ScheduleEntry[]): ScheduleEntry[] {
  return entries.map((entry) => ({
    ...entry,
    id: entry.id || createScheduleEntryId(),
  }))
}

export function ScheduleSection({ courseId }: { courseId: string | null }) {
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("date-range")
  const [activeDays, setActiveDays] = useState<string[]>([])
  const [generatedEntries, setGeneratedEntries] = useState<ScheduleEntry[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [targetSessions, setTargetSessions] = useState(12)
  const [sessionsPerDay, setSessionsPerDay] = useState(1)
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>("none")
  const [repeatEvery, setRepeatEvery] = useState(1)
  const [repeatCycles, setRepeatCycles] = useState(1)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([])
  const [importText, setImportText] = useState("")
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const parseTimeToMinutes = (value: string): number | null => {
    const m = value.match(/^(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const hh = Number(m[1])
    const mm = Number(m[2])
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
    return hh * 60 + mm
  }

  const formatMinutesToTime = (minutes: number): string => {
    const safe = ((minutes % 1440) + 1440) % 1440
    const hh = String(Math.floor(safe / 60)).padStart(2, "0")
    const mm = String(safe % 60).padStart(2, "0")
    return `${hh}:${mm}`
  }

  const parseImportedEntries = (raw: string): ScheduleEntry[] => {
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

  const parseIcsEntries = (raw: string): ScheduleEntry[] => {
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

  const extractPdfText = async (file: File): Promise<string> => {
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

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("schedule_settings")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.schedule_settings) {
          const s = data.schedule_settings as Record<string, unknown>
          setScheduleMode((s.schedule_mode as ScheduleMode) ?? "date-range")
          setActiveDays((s.active_days as string[]) ?? [])
          setGeneratedEntries(ensureScheduleEntryIds((s.generated_entries as ScheduleEntry[]) ?? []))
          setStartDate((s.start_date as string) ?? "")
          setEndDate((s.end_date as string) ?? "")
          setTargetSessions((s.target_sessions as number) ?? 12)
          setSessionsPerDay((s.sessions_per_day as number) ?? 1)
          setRepeatUnit((s.repeat_unit as RepeatUnit) ?? "none")
          setRepeatEvery((s.repeat_every as number) ?? 1)
          setRepeatCycles((s.repeat_cycles as number) ?? 1)
          setStartTime((s.start_time as string) ?? "")
          setEndTime((s.end_time as string) ?? "")
          setBreaks((s.breaks as { start: string; end: string }[]) ?? [])
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    const supabase = createClient()
    const { error } = await supabase
      .from("courses")
      .update({
        schedule_settings: {
          schedule_mode: scheduleMode,
          active_days: activeDays,
          generated_entries: generatedEntries,
          start_date: startDate,
          end_date: endDate,
          target_sessions: targetSessions,
          sessions_per_day: sessionsPerDay,
          repeat_unit: repeatUnit,
          repeat_every: repeatEvery,
          repeat_cycles: repeatCycles,
          start_time: startTime,
          end_time: endTime,
          breaks,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) return
  }, [courseId, scheduleMode, activeDays, generatedEntries, startDate, endDate, targetSessions, sessionsPerDay, repeatUnit, repeatEvery, repeatCycles, startTime, endTime, breaks])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  const toggle = (day: string) =>
    setActiveDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))

  const generateSchedule = () => {
    const start = parseDMY(startDate)
    if (!start) {
      setGeneratedEntries([])
      return
    }

    if (activeDays.length === 0) {
      setGeneratedEntries([])
      return
    }

    const startM = parseTimeToMinutes(startTime)
    const endM = parseTimeToMinutes(endTime)
    const canSplit = startM !== null && endM !== null && endM > startM && sessionsPerDay > 1
    const daySpan = canSplit ? endM - startM : null
    const splitStartM = startM ?? 0
    const splitEndM = endM ?? 0

    const addSessionsForDate = (date: Date, entries: ScheduleEntry[]) => {
      const label = JS_DAY_TO_LABEL[date.getDay()]
      if (!activeDays.includes(label)) return
      for (let s = 0; s < sessionsPerDay; s++) {
        let sessionStart = startTime || undefined
        let sessionEnd = endTime || undefined
        if (daySpan !== null) {
          const slot = Math.floor(daySpan / sessionsPerDay)
          sessionStart = formatMinutesToTime(splitStartM + s * slot)
          sessionEnd = formatMinutesToTime(s === sessionsPerDay - 1 ? splitEndM : splitStartM + (s + 1) * slot)
        }
        entries.push({
          id: createScheduleEntryId(),
          day: label,
          date: fmtDMY(date),
          start_time: sessionStart,
          end_time: sessionEnd,
          session: s + 1,
        })
      }
    }

    const baseEntries: ScheduleEntry[] = []
    if (scheduleMode === "date-range") {
      const end = parseDMY(endDate)
      if (!end || end < start) {
        setGeneratedEntries([])
        return
      }
      const cur = new Date(start)
      while (cur <= end) {
        addSessionsForDate(cur, baseEntries)
        cur.setDate(cur.getDate() + 1)
      }
    } else if (scheduleMode === "session-count") {
      const cur = new Date(start)
      while (baseEntries.length < targetSessions) {
        addSessionsForDate(cur, baseEntries)
        cur.setDate(cur.getDate() + 1)
      }
      if (baseEntries.length > targetSessions) {
        baseEntries.splice(targetSessions)
      }
    }

    if (repeatUnit === "none" || scheduleMode !== "date-range") {
      setGeneratedEntries(baseEntries)
      return
    }

    const allEntries: ScheduleEntry[] = []
    const cycles = Math.max(1, repeatCycles)
    for (let cycle = 0; cycle < cycles; cycle++) {
      for (const entry of baseEntries) {
        const original = parseDMY(entry.date)
        if (!original) continue
        const shifted = new Date(original)
        if (cycle > 0) {
          const step = Math.max(1, repeatEvery) * cycle
          if (repeatUnit === "weeks") shifted.setDate(shifted.getDate() + step * 7)
          if (repeatUnit === "months") shifted.setMonth(shifted.getMonth() + step)
          if (repeatUnit === "years") shifted.setFullYear(shifted.getFullYear() + step)
        }
        allEntries.push({
          ...entry,
          id: createScheduleEntryId(),
          day: JS_DAY_TO_LABEL[shifted.getDay()],
          date: fmtDMY(shifted),
        })
      }
    }

    setGeneratedEntries(allEntries)
  }

  const removeEntry = (idx: number) => {
    setGeneratedEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  const deleteSchedule = () => {
    setGeneratedEntries([])
    setImportStatus(null)
  }

  const applyImportedSchedule = (raw: string) => {
    const imported = parseImportedEntries(raw)
    if (imported.length === 0) {
      setImportStatus("No valid schedule rows found. Use lines like: 12.03.2026 09:00-10:30")
      return
    }
    setGeneratedEntries(imported)
    setScheduleMode("manual-list")
    setImportStatus(`Imported ${imported.length} session${imported.length === 1 ? "" : "s"}.`)
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    setImportStatus(`Reading ${file.name}...`)
    try {
      const name = file.name.toLowerCase()

      if (name.endsWith(".ics")) {
        const ics = await file.text()
        const imported = parseIcsEntries(ics)
        setImportText(ics)
        if (imported.length > 0) {
          setGeneratedEntries(imported)
          setScheduleMode("manual-list")
          setImportStatus(`Imported ${imported.length} session${imported.length === 1 ? "" : "s"} from ICS.`)
          return
        }
        setImportStatus("No session rows found in ICS file.")
        return
      }

      if (name.endsWith(".pdf")) {
        const extracted = await extractPdfText(file)
        setImportText(extracted)
        applyImportedSchedule(extracted)
        return
      }

      const text = await file.text()
      setImportText(text)
      applyImportedSchedule(text)
    } catch {
      setImportStatus("Could not read file. Supported: PDF, ICS, TXT, CSV, JSON, or pasted text.")
    }
  }

  const hasSchedule = generatedEntries.length > 0

  return (
    <SetupSection title="Schedule" description="Define when the course takes place.">
      <SetupPanelLayout>
        <SetupColumn className="space-y-4">
          <div>
            <FieldLabel>Schedule Mode</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { value: "date-range", label: "Date Range" },
                { value: "session-count", label: "By Session Count" },
                { value: "manual-list", label: "Import / Manual" },
              ].map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setScheduleMode(mode.value as ScheduleMode)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                    scheduleMode === mode.value
                      ? "border-primary bg-accent text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <TextInput type="text" placeholder="DD.MM.YYYY" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {scheduleMode === "date-range" && (
              <div>
                <FieldLabel>End Date</FieldLabel>
                <TextInput type="text" placeholder="DD.MM.YYYY" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
            {scheduleMode === "session-count" && (
              <div>
                <FieldLabel>Target Sessions</FieldLabel>
                <TextInput
                  type="number"
                  min={1}
                  max={240}
                  value={targetSessions}
                  onChange={(e) => setTargetSessions(Math.min(240, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
            )}
          </div>

          {scheduleMode === "date-range" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>Repeats</FieldLabel>
                <select
                  value={repeatUnit}
                  onChange={(e) => setRepeatUnit(e.target.value as RepeatUnit)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                >
                  <option value="none">No Repeat</option>
                  <option value="weeks">Every X Weeks</option>
                  <option value="months">Every X Months</option>
                  <option value="years">Every X Years</option>
                </select>
              </div>
              {repeatUnit !== "none" && (
                <>
                  <div>
                    <FieldLabel>Repeat Every</FieldLabel>
                    <TextInput
                      type="number"
                      min={1}
                      max={24}
                      value={repeatEvery}
                      onChange={(e) => setRepeatEvery(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
                    />
                  </div>
                  <div>
                    <FieldLabel>Cycles to Generate</FieldLabel>
                    <TextInput
                      type="number"
                      min={1}
                      max={12}
                      value={repeatCycles}
                      onChange={(e) => setRepeatCycles(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div>
            <FieldLabel>Days of the Week</FieldLabel>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggle(day)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                    activeDays.includes(day)
                      ? "border-primary bg-accent text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Sessions Per Day</FieldLabel>
            <TextInput
              type="number"
              min={1}
              max={6}
              value={sessionsPerDay}
              onChange={(e) => setSessionsPerDay(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Start Time</FieldLabel>
              <TextInput type="text" placeholder="HH:MM" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <FieldLabel>End Time</FieldLabel>
              <TextInput type="text" placeholder="HH:MM" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {scheduleMode === "manual-list" && (
            <div className="space-y-2">
              <FieldLabel>Import Existing Schedule</FieldLabel>
              <input
                type="file"
                accept=".pdf,.ics,.txt,.csv,.json"
                onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={5}
                placeholder="Paste one session per line, e.g. 12.03.2026 09:00-10:30"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => applyImportedSchedule(importText)}
                className={PRIMARY_ACTION_BUTTON_CLASS}
              >
                Apply Imported Schedule
              </button>
              {importStatus && <p className="text-xs text-muted-foreground">{importStatus}</p>}
            </div>
          )}

          <div>
            <FieldLabel>Breaks</FieldLabel>
            <div className="rounded-lg border border-dashed border-border bg-background p-4 space-y-2">
              {breaks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No breaks added.</p>
              ) : (
                breaks.map((b, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 text-xs text-foreground">
                    <TextInput
                      type="text"
                      placeholder="HH:MM"
                      value={b.start}
                      onChange={(e) =>
                        setBreaks((prev) => prev.map((row, idx) => (idx === i ? { ...row, start: e.target.value } : row)))
                      }
                    />
                    <span className="text-muted-foreground">–</span>
                    <TextInput
                      type="text"
                      placeholder="HH:MM"
                      value={b.end}
                      onChange={(e) =>
                        setBreaks((prev) => prev.map((row, idx) => (idx === i ? { ...row, end: e.target.value } : row)))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setBreaks((prev) => prev.filter((_, j) => j !== i))}
                      className={`${DANGER_ACTION_BUTTON_CLASS} ml-auto`}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => setBreaks((prev) => [...prev, { start: "10:00", end: "10:15" }])}
                className={`${SECONDARY_ACTION_BUTTON_CLASS} mt-1`}
              >
                + Add Break
              </button>
            </div>
          </div>
          {scheduleMode !== "manual-list" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={generateSchedule}
                disabled={hasSchedule}
                className={PRIMARY_ACTION_BUTTON_CLASS}
              >
                Generate Schedule
              </button>
              <button
                type="button"
                onClick={deleteSchedule}
                disabled={!hasSchedule}
                className={DANGER_ACTION_BUTTON_CLASS}
              >
                Delete Schedule
              </button>
            </div>
          )}
        </SetupColumn>

        <SetupColumn>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="grid grid-cols-4 border-b border-border bg-muted/40 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Day</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time</p>
              <p className="text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Action</p>
            </div>
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {generatedEntries.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Generate schedule to preview all class dates.
                </div>
              ) : (
                generatedEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-4 items-center gap-2 px-3 py-2"
                  >
                    <p className="text-xs font-medium text-foreground">{entry.day}</p>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.start_time || startTime || "—"}
                      {entry.end_time || endTime ? ` → ${entry.end_time || endTime}` : ""}
                      {entry.session && sessionsPerDay > 1 ? ` (S${entry.session})` : ""}
                    </p>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => removeEntry(idx)}
                        className={DANGER_ACTION_BUTTON_SM_CLASS}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {breaks.length > 0 && generatedEntries.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Breaks: {breaks.map((b) => (b.start && b.end ? `${b.start}–${b.end}` : `${b.start || "—"}–${b.end || "—"}`)).join(", ")}
            </p>
          )}
          {activeDays.length === 0 && generatedEntries.length === 0 && (
            <p className="mt-2 text-center text-xs italic text-muted-foreground/50">Select days, then click Generate Schedule.</p>
          )}
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}
