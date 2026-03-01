"use client"

import {
  DANGER_ACTION_BUTTON_SM_CLASS,
  SetupColumn,
  SetupPanelLayout,
  SetupSection,
} from "@/components/coursebuilder/layout-primitives"
import { useScheduleState } from "./use-schedule-state"
import { ScheduleFormColumn } from "./schedule-form-column"


export function ScheduleSection({ courseId }: { courseId: string | null }) {
  const state = useScheduleState(courseId)
  const {
    generatedEntries,
    startTime,
    endTime,
    sessionsPerDay,
    breaks,
    activeDays,
    removeEntry,
  } = state



  return (
    <SetupSection title="Schedule" description="Define when the course takes place.">
      <SetupPanelLayout>
        <SetupColumn className="space-y-4">
          <ScheduleFormColumn {...state} />
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
