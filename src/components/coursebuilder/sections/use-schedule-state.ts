"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import {
  JS_DAY_TO_LABEL,
  parseDMY, fmtDMY,
  type ScheduleEntry, type ScheduleMode, type RepeatUnit,
  createScheduleEntryId, ensureScheduleEntryIds,
  parseTimeToMinutes, formatMinutesToTime,
  parseImportedEntries, parseIcsEntries, extractPdfText,
} from "./schedule-section-utils"

export function useScheduleState(courseId: string | null) {
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
    if (!start || activeDays.length === 0) {
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

  return {
    scheduleMode, setScheduleMode,
    activeDays,
    generatedEntries,
    startDate, setStartDate,
    endDate, setEndDate,
    targetSessions, setTargetSessions,
    sessionsPerDay, setSessionsPerDay,
    repeatUnit, setRepeatUnit,
    repeatEvery, setRepeatEvery,
    repeatCycles, setRepeatCycles,
    startTime, setStartTime,
    endTime, setEndTime,
    breaks, setBreaks,
    importText, setImportText,
    importStatus,
    hasSchedule: generatedEntries.length > 0,
    toggle,
    generateSchedule,
    removeEntry,
    deleteSchedule,
    applyImportedSchedule,
    handleImportFile,
  }
}
