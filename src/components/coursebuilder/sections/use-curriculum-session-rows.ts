"use client"

import { useCallback, useEffect, useMemo } from "react"
import type React from "react"
import { calculateSessionDuration, normalizeContentLoadConfig } from "@/lib/curriculum/content-load-service"
import {
  createRowId,
  normalizeObjectiveNames,
  normalizeTaskNames,
  type CurriculumSessionRow,
  type ScheduleGeneratedEntry,
} from "./curriculum-section-utils"

export function useCurriculumSessionRows(params: {
  sessionRows: CurriculumSessionRow[]
  setSessionRows: React.Dispatch<React.SetStateAction<CurriculumSessionRow[]>>
  effectiveSessionCount: number
  scheduleEntries: ScheduleGeneratedEntry[]
  topics: number
  objectives: number
  tasks: number
  certificateLessonIndexes: Set<number>
}) {
  const {
    sessionRows, setSessionRows, effectiveSessionCount, scheduleEntries,
    topics, objectives, tasks, certificateLessonIndexes,
  } = params

  useEffect(() => {
    setSessionRows((prev) => {
      const targetCount = Math.max(1, effectiveSessionCount)
      let changed = prev.length !== targetCount

      const next = Array.from({ length: targetCount }, (_, index) => {
        const existing = prev[index]
        const schedule = scheduleEntries[index]
        const scheduleDuration = calculateSessionDuration(schedule?.start_time, schedule?.end_time)
        const durationForCaps = existing?.duration_minutes ?? scheduleDuration ?? null
        const defaultTemplateType = certificateLessonIndexes.has(index) ? "certificate" : "lesson"
        const norm = normalizeContentLoadConfig(
          { topicsPerLesson: topics, objectivesPerTopic: objectives, tasksPerObjective: tasks },
          durationForCaps,
        )

        const nextRow: CurriculumSessionRow = {
          id: existing?.id ?? createRowId(),
          schedule_entry_id: existing?.schedule_entry_id ?? schedule?.id ?? "",
          session_number: index + 1,
          title: existing?.title ?? `Session ${index + 1}`,
          notes: existing?.notes ?? "",
          duration_minutes: existing?.duration_minutes ?? scheduleDuration ?? undefined,
          topics: norm.topicsPerLesson,
          objectives: norm.objectivesPerTopic,
          tasks: norm.tasksPerObjective,
          topic_names: Array.from({ length: norm.topicsPerLesson }, (_, i) => existing?.topic_names?.[i] ?? ""),
          objective_names: normalizeObjectiveNames(existing?.objective_names, norm.topicsPerLesson, norm.objectivesPerTopic),
          task_names: normalizeTaskNames(existing?.task_names, norm.topicsPerLesson, norm.objectivesPerTopic, norm.tasksPerObjective),
          competencies: existing?.competencies,
          template_id: existing?.template_id,
          template_type: existing?.template_type ?? defaultTemplateType,
          template_design: existing?.template_design,
        }

        if (!existing) { changed = true; return nextRow }

        if (
          existing.session_number !== nextRow.session_number ||
          existing.topics !== nextRow.topics ||
          existing.objectives !== nextRow.objectives ||
          existing.tasks !== nextRow.tasks ||
          (existing.topic_names?.length ?? 0) !== (nextRow.topic_names?.length ?? 0) ||
          (existing.objective_names?.length ?? 0) !== (nextRow.objective_names?.length ?? 0) ||
          (existing.task_names?.length ?? 0) !== (nextRow.task_names?.length ?? 0) ||
          existing.schedule_entry_id !== nextRow.schedule_entry_id ||
          existing.template_id !== nextRow.template_id ||
          existing.template_type !== nextRow.template_type ||
          existing.template_design !== nextRow.template_design
        ) changed = true

        return nextRow
      })

      return changed ? next : prev
    })
  }, [certificateLessonIndexes, effectiveSessionCount, scheduleEntries, topics, objectives, tasks, setSessionRows])

  const sessionRowsForPreview = useMemo(
    () =>
      Array.from({ length: effectiveSessionCount }, (_, index) => {
        const row = sessionRows[index]
        const defaultTemplateType = certificateLessonIndexes.has(index) ? "certificate" : "lesson"
        const norm = normalizeContentLoadConfig(
          {
            topicsPerLesson: row?.topics ?? topics,
            objectivesPerTopic: row?.objectives ?? objectives,
            tasksPerObjective: row?.tasks ?? tasks,
          },
          row?.duration_minutes ?? null,
        )
        return {
          ...(row ?? {}),
          id: row?.id ?? `session-${index + 1}`,
          session_number: row?.session_number ?? index + 1,
          title: row?.title?.trim() || `Session ${index + 1}`,
          topics: norm.topicsPerLesson,
          objectives: norm.objectivesPerTopic,
          tasks: norm.tasksPerObjective,
          topic_names: Array.from({ length: norm.topicsPerLesson }, (_, i) => row?.topic_names?.[i] || ""),
          objective_names: normalizeObjectiveNames(row?.objective_names, norm.topicsPerLesson, norm.objectivesPerTopic),
          task_names: normalizeTaskNames(row?.task_names, norm.topicsPerLesson, norm.objectivesPerTopic, norm.tasksPerObjective),
          template_id: row?.template_id,
          template_type: row?.template_type ?? defaultTemplateType,
          template_design: row?.template_design,
        }
      }),
    [certificateLessonIndexes, effectiveSessionCount, sessionRows, topics, objectives, tasks],
  )

  const upsertSessionRow = useCallback(
    (index: number, updates: Partial<CurriculumSessionRow>) => {
      setSessionRows((prev) => {
        const next = [...prev]
        const preview = sessionRowsForPreview[index]
        if (!preview) return prev

        const existing = next[index] ?? {
          id: preview.id,
          schedule_entry_id: preview.schedule_entry_id ?? "",
          session_number: preview.session_number ?? index + 1,
          title: preview.title,
          notes: preview.notes ?? "",
          duration_minutes: preview.duration_minutes,
          topics: preview.topics,
          objectives: preview.objectives,
          tasks: preview.tasks,
          topic_names: preview.topic_names,
          objective_names: preview.objective_names,
          task_names: preview.task_names,
          competencies: preview.competencies,
          template_id: preview.template_id,
          template_type: preview.template_type ?? (certificateLessonIndexes.has(index) ? "certificate" : "lesson"),
          template_design: preview.template_design,
        }

        next[index] = { ...existing, ...updates }
        return next
      })
    },
    [certificateLessonIndexes, setSessionRows, sessionRowsForPreview],
  )

  return { sessionRowsForPreview, upsertSessionRow }
}
