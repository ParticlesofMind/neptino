"use client"

import { useCallback, useEffect, useState } from "react"
import { SaveStatusBar, SetupColumn, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
    </div>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
    />
  )
}

export function ScheduleSection({ courseId }: { courseId: string | null }) {
  const [activeDays, setActiveDays] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([])
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

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
          setActiveDays((s.active_days as string[]) ?? [])
          setStartDate((s.start_date as string) ?? "")
          setEndDate((s.end_date as string) ?? "")
          setStartTime((s.start_time as string) ?? "")
          setEndTime((s.end_time as string) ?? "")
          setBreaks((s.breaks as { start: string; end: string }[]) ?? [])
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const { error } = await supabase
      .from("courses")
      .update({
        schedule_settings: {
          active_days: activeDays,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          breaks,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, activeDays, startDate, endDate, startTime, endTime, breaks])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  const toggle = (day: string) =>
    setActiveDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))

  return (
    <SetupSection title="Schedule" description="Define when the course takes place.">
      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-2 items-stretch">
        <SetupColumn className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <TextInput type="text" placeholder="DD.MM.YYYY" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <FieldLabel>End Date</FieldLabel>
              <TextInput type="text" placeholder="DD.MM.YYYY" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
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
          <div>
            <FieldLabel>Breaks</FieldLabel>
            <div className="rounded-lg border border-dashed border-border bg-background p-4 space-y-2">
              {breaks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No breaks added.</p>
              ) : (
                breaks.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="font-mono">{b.start || "??:??"}</span>
                    <span className="text-muted-foreground">–</span>
                    <span className="font-mono">{b.end || "??:??"}</span>
                    <button
                      type="button"
                      onClick={() => setBreaks((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-auto text-muted-foreground hover:text-destructive transition text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => setBreaks((prev) => [...prev, { start: "", end: "" }])}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:border-primary/30 transition"
              >
                + Add Break
              </button>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:border-primary/30 transition"
          >
            Generate Schedule
          </button>
        </SetupColumn>

        <SetupColumn>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={`py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide transition ${
                    activeDays.includes(day) ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-border">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={`flex flex-col gap-1 p-1.5 min-h-[80px] transition ${activeDays.includes(day) ? "bg-accent/30" : ""}`}
                >
                  {activeDays.includes(day) && (
                    <>
                      <div className="rounded bg-primary/15 border border-primary/30 px-1.5 py-1 text-center">
                        <p className="text-[9px] font-semibold text-primary">{startTime || "—"}</p>
                        <p className="text-[8px] text-primary/60">{endTime ? `→ ${endTime}` : ""}</p>
                      </div>
                      {breaks.map((b, i) => (
                        <div key={i} className="rounded bg-muted border border-border px-1.5 py-0.5 text-center">
                          <p className="text-[8px] text-muted-foreground">
                            Break {b.start && b.end ? `${b.start}–${b.end}` : ""}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          {(startDate || endDate) && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {startDate || "—"} → {endDate || "—"}
            </p>
          )}
          {activeDays.length === 0 && (
            <p className="mt-2 text-center text-xs italic text-muted-foreground/50">Select days to see the schedule.</p>
          )}
        </SetupColumn>
      </div>
      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}
