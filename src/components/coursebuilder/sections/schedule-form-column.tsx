"use client"

import type React from "react"
import {
  DANGER_ACTION_BUTTON_CLASS,
  PRIMARY_ACTION_BUTTON_CLASS,
  SECONDARY_ACTION_BUTTON_CLASS,
} from "@/components/coursebuilder/layout-primitives"
import { FieldLabel, TextInput } from "@/components/coursebuilder/form-primitives"
import { DAYS, type ScheduleMode, type RepeatUnit } from "./schedule-section-utils"

export interface ScheduleFormColumnProps {
  scheduleMode: ScheduleMode
  setScheduleMode: (mode: ScheduleMode) => void
  startDate: string
  setStartDate: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
  targetSessions: number
  setTargetSessions: (v: number) => void
  repeatUnit: RepeatUnit
  setRepeatUnit: (v: RepeatUnit) => void
  repeatEvery: number
  setRepeatEvery: (v: number) => void
  repeatCycles: number
  setRepeatCycles: (v: number) => void
  activeDays: string[]
  toggle: (day: string) => void
  sessionsPerDay: number
  setSessionsPerDay: (v: number) => void
  startTime: string
  setStartTime: (v: string) => void
  endTime: string
  setEndTime: (v: string) => void
  importText: string
  setImportText: (v: string) => void
  importStatus: string | null
  applyImportedSchedule: (raw: string) => void
  handleImportFile: (file: File | null) => Promise<void>
  breaks: { start: string; end: string }[]
  setBreaks: React.Dispatch<React.SetStateAction<{ start: string; end: string }[]>>
  hasSchedule: boolean
  generateSchedule: () => void
  deleteSchedule: () => void
}

export function ScheduleFormColumn({
  scheduleMode, setScheduleMode,
  startDate, setStartDate,
  endDate, setEndDate,
  targetSessions, setTargetSessions,
  repeatUnit, setRepeatUnit,
  repeatEvery, setRepeatEvery,
  repeatCycles, setRepeatCycles,
  activeDays, toggle,
  sessionsPerDay, setSessionsPerDay,
  startTime, setStartTime,
  endTime, setEndTime,
  importText, setImportText,
  importStatus, applyImportedSchedule, handleImportFile,
  breaks, setBreaks,
  hasSchedule, generateSchedule, deleteSchedule,
}: ScheduleFormColumnProps) {
  return (
    <div className="space-y-4">
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
          <button type="button" onClick={() => applyImportedSchedule(importText)} className={PRIMARY_ACTION_BUTTON_CLASS}>
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
          <button type="button" onClick={generateSchedule} disabled={hasSchedule} className={PRIMARY_ACTION_BUTTON_CLASS}>
            Generate Schedule
          </button>
          <button type="button" onClick={deleteSchedule} disabled={!hasSchedule} className={DANGER_ACTION_BUTTON_CLASS}>
            Delete Schedule
          </button>
        </div>
      )}
    </div>
  )
}
