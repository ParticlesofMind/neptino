"use client"

import { useCallback, useEffect, useMemo } from "react"
import type React from "react"
import { calculateSessionDuration, normalizeContentLoadConfig } from "@/lib/curriculum/content-load-service"
import { createDefaultTemplateDesign } from "@/lib/curriculum/template-blocks"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import {
  createRowId,
  type CurriculumSessionRow,
  type ScheduleGeneratedEntry,
} from "./curriculum-section-utils"

export function useCurriculumSessionRows(params: {
  sessionRows: CurriculumSessionRow[]
  setSessionRows: React.Dispatch<React.SetStateAction<CurriculumSessionRow[]>>
  effectiveLessonCount: number
  scheduleEntries: ScheduleGeneratedEntry[]
  topics: number
  objectives: number
  tasks: number
  certificateLessonIndexes: Set<number>
  templateDefaultType: TemplateType
}) {
  const {
    sessionRows, setSessionRows, effectiveLessonCount, scheduleEntries,
    topics, objectives, tasks, certificateLessonIndexes, templateDefaultType,
  } = params

  const resolveTemplateTypeForLesson = useCallback(
    (row: Partial<CurriculumSessionRow> | undefined, index: number): TemplateType => {
      if (row?.template_type) return row.template_type
      if (certificateLessonIndexes.has(index)) return "certificate"
      return templateDefaultType
    },
    [certificateLessonIndexes, templateDefaultType],
  )

  useEffect(() => {
    setSessionRows((prev) => {
      const targetCount = Math.max(1, effectiveLessonCount)
      let changed = prev.length !== targetCount

      const next = Array.from({ length: targetCount }, (_, index) => {
        const existing = prev[index]
        const schedule = scheduleEntries[index]
        const resolvedType = resolveTemplateTypeForLesson(existing, index)
        const scheduleDuration = calculateSessionDuration(schedule?.start_time, schedule?.end_time)
        const durationForCaps = existing?.duration_minutes ?? scheduleDuration ?? null
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
          template_id: existing?.template_id,
          template_type: resolvedType,
          duration_minutes: existing?.duration_minutes ?? scheduleDuration ?? undefined,
          topics: norm.topicsPerLesson,
          objectives: norm.objectivesPerTopic,
          tasks: norm.tasksPerObjective,
          topic_names: Array.from({ length: norm.topicsPerLesson }, (_, i) => existing?.topic_names?.[i] ?? ""),
          objective_names: Array.from({ length: norm.objectivesPerTopic }, (_, i) => existing?.objective_names?.[i] ?? ""),
          task_names: Array.from({ length: norm.tasksPerObjective }, (_, i) => existing?.task_names?.[i] ?? ""),
          competencies: existing?.competencies,
          template_design: existing?.template_design ?? createDefaultTemplateDesign(resolvedType),
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
          existing.schedule_entry_id !== nextRow.schedule_entry_id
        ) changed = true

        return nextRow
      })

      return changed ? next : prev
    })
  }, [effectiveLessonCount, scheduleEntries, topics, objectives, tasks, resolveTemplateTypeForLesson, setSessionRows])

  const lessonRowsForPreview = useMemo(
    () =>
      Array.from({ length: effectiveLessonCount }, (_, index) => {
        const row = sessionRows[index]
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
          id: row?.id ?? `lesson-${index + 1}`,
          session_number: row?.session_number ?? index + 1,
          title: row?.title?.trim() || `Lesson ${index + 1}`,
          template_id: row?.template_id,
          template_type: resolveTemplateTypeForLesson(row, index),
          topics: norm.topicsPerLesson,
          objectives: norm.objectivesPerTopic,
          tasks: norm.tasksPerObjective,
          topic_names: Array.from({ length: norm.topicsPerLesson }, (_, i) => row?.topic_names?.[i] || ""),
          objective_names: Array.from({ length: norm.objectivesPerTopic }, (_, i) => row?.objective_names?.[i] || ""),
          task_names: Array.from({ length: norm.tasksPerObjective }, (_, i) => row?.task_names?.[i] || ""),
        }
      }),
    [effectiveLessonCount, sessionRows, topics, objectives, tasks, resolveTemplateTypeForLesson],
  )

  const upsertSessionRow = useCallback(
    (index: number, updates: Partial<CurriculumSessionRow>) => {
      setSessionRows((prev) => {
        const next = [...prev]
        const preview = lessonRowsForPreview[index]
        if (!preview) return prev

        const existing = next[index] ?? {
          id: preview.id,
          schedule_entry_id: preview.schedule_entry_id ?? "",
          session_number: preview.session_number ?? index + 1,
          title: preview.title,
          notes: preview.notes ?? "",
          template_type: preview.template_type,
          duration_minutes: preview.duration_minutes,
          topics: preview.topics,
          objectives: preview.objectives,
          tasks: preview.tasks,
          topic_names: preview.topic_names,
          objective_names: preview.objective_names,
          task_names: preview.task_names,
          competencies: preview.competencies,
          template_design: preview.template_design,
        }

        next[index] = { ...existing, ...updates }
        return next
      })
    },
    [setSessionRows, lessonRowsForPreview],
  )

  return { resolveTemplateTypeForLesson, lessonRowsForPreview, upsertSessionRow }
}
