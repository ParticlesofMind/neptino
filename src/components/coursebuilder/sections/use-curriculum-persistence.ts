"use client"

import { useCallback, useEffect, useRef } from "react"
import { updateCourseById } from "@/components/coursebuilder"
import type { GenerationAction, NamingRules } from "@/lib/curriculum/ai-generation-service"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import type { CertificateMode } from "./curriculum-derived"
import type { CurriculumSessionRow, ScheduleGeneratedEntry, PreviewMode } from "./curriculum-section-utils"
import type { MutableRefObject } from "react"

export interface CurriculumPersistenceParams {
  courseId: string | null
  moduleOrg: string
  contentVolume: string
  courseType: string
  templateDefaultType: TemplateType
  certificateMode: CertificateMode
  effectiveSessionCount: number
  moduleCount: number
  moduleNames: string[]
  topics: number
  objectives: number
  tasks: number
  sequencingMode: string
  namingRules: NamingRules
  sessionRows: CurriculumSessionRow[]
  scheduleEntries: ScheduleGeneratedEntry[]
  resolveTemplateTypeForSession: (row: Partial<CurriculumSessionRow> | undefined, index: number) => TemplateType
  optCtx: { schedule: boolean; structure: boolean; existing: boolean }
  previewMode: PreviewMode
  lastAction: GenerationAction | null
  generationSettingsRef: MutableRefObject<Record<string, unknown> | null>
}

export function useCurriculumPersistence(params: CurriculumPersistenceParams) {
  // Stable ref so callbacks never go stale with rapidly changing params.
  const paramsRef = useRef(params)
  paramsRef.current = params

  const handleSave = useCallback(async () => {
    const p = paramsRef.current
    if (!p.courseId) return

    const serializedRows = p.sessionRows.map((row, i) => ({
      id: row.id,
      schedule_entry_id: row.schedule_entry_id,
      session_number: i + 1,
      title: row.title,
      notes: row.notes,
      template_id: row.template_id,
      template_type: p.resolveTemplateTypeForSession(row, i),
      duration_minutes: row.duration_minutes,
      topics: row.topics,
      objectives: row.objectives,
      tasks: row.tasks,
      topic_names: row.topic_names,
      objective_names: row.objective_names,
      task_names: row.task_names,
      competencies: row.competencies,
      template_design: row.template_design,
    }))

    const sessions = p.sessionRows.map((row, i) => {
      const schedule = p.scheduleEntries[i]
      return {
        sessionNumber: i + 1,
        title: row.title,
        notes: row.notes,
        scheduleEntryId: row.schedule_entry_id,
        schedule: schedule
          ? { day: schedule.day, date: schedule.date, startTime: schedule.start_time, endTime: schedule.end_time }
          : null,
      }
    })

    const { error } = await updateCourseById(p.courseId, {
      curriculum_data: {
        module_org: p.moduleOrg,
        content_volume: p.contentVolume,
        course_type: p.courseType,
        template_default_type: p.templateDefaultType,
        certificate_mode: p.certificateMode,
        session_count: p.effectiveSessionCount,
        module_count: p.moduleCount,
        module_names: p.moduleNames,
        topics: p.topics,
        objectives: p.objectives,
        tasks: p.tasks,
        sequencing_mode: p.sequencingMode,
        naming_rules: p.namingRules,
        session_rows: serializedRows,
        sessions,
      },
      updated_at: new Date().toISOString(),
    })
    if (error) return
  }, [])

  const persistGenerationSettings = useCallback(async () => {
    const p = paramsRef.current
    if (!p.courseId) return

    const existing = p.generationSettingsRef.current ?? {}
    const next = {
      ...existing,
      ai_generation: {
        required_context: ["essentials", "classification", "pedagogy"],
        optional_context: {
          schedule: p.optCtx.schedule,
          structure: p.optCtx.structure,
          existing: p.optCtx.existing,
        },
        preview_mode: p.previewMode,
        last_action: p.lastAction,
        curriculum_context: {
          module_org: p.moduleOrg,
          module_count: p.moduleCount,
          module_names: p.moduleNames,
          session_count: p.effectiveSessionCount,
          topics_per_lesson: p.topics,
          objectives_per_topic: p.objectives,
          tasks_per_objective: p.tasks,
          session_rows: p.sessionRows.map((row, i) => ({
            id: row.id,
            session_number: row.session_number ?? i + 1,
            title: row.title ?? `Session ${i + 1}`,
            notes: row.notes ?? "",
          })),
        },
        updated_at: new Date().toISOString(),
      },
    }

    const { error } = await updateCourseById(p.courseId, {
      generation_settings: next,
      updated_at: new Date().toISOString(),
    })
    if (error) return
    p.generationSettingsRef.current = next
  }, [])

  // ── Debounced curriculum_data save ────────────────────────────────────────
  //
  // useDebouncedChangeSave watches the callback reference for changes.
  // handleSave has an empty deps array (reads via paramsRef) so its reference
  // never changes — the debounce would therefore fire only once and be skipped
  // by the isFirstRun guard, meaning saves would never run.
  //
  // Fix: watch a serialized fingerprint of the key fields we want to save.
  // When any value changes the fingerprint changes, the effect re-runs, and
  // the 800 ms debounce fires handleSave with fresh data from paramsRef.

  const sessionRowsFingerprint = params.sessionRows
    .map((r) => `${r.id}:${r.title}:${r.template_type ?? ""}:${r.topics ?? ""}:${r.objectives ?? ""}:${r.tasks ?? ""}`)
    .join("|")
  const moduleNamesFingerprint = params.moduleNames.join(",")
  const namingRulesFingerprint = `${params.namingRules.lessonTitleRule}:${params.namingRules.topicRule}:${params.namingRules.objectiveRule}:${params.namingRules.taskRule}`

  const isFirstCurriculumSave = useRef(true)
  useEffect(() => {
    if (!params.courseId) return
    if (isFirstCurriculumSave.current) {
      isFirstCurriculumSave.current = false
      return
    }
    const timer = setTimeout(() => { void handleSave() }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.courseId,
    params.moduleOrg,
    params.contentVolume,
    params.courseType,
    params.templateDefaultType,
    params.certificateMode,
    params.effectiveSessionCount,
    params.moduleCount,
    params.topics,
    params.objectives,
    params.tasks,
    params.sequencingMode,
    sessionRowsFingerprint,
    moduleNamesFingerprint,
    namingRulesFingerprint,
  ])

  // ── Debounced generation_settings save ────────────────────────────────────

  const isFirstGenSave = useRef(true)
  useEffect(() => {
    if (!params.courseId) return
    if (isFirstGenSave.current) {
      isFirstGenSave.current = false
      return
    }
    const timer = setTimeout(() => { void persistGenerationSettings() }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.courseId,
    params.optCtx.schedule,
    params.optCtx.structure,
    params.optCtx.existing,
    params.previewMode,
    params.lastAction,
    params.topics,
    params.objectives,
    params.tasks,
    params.moduleOrg,
    params.moduleCount,
    params.effectiveSessionCount,
    sessionRowsFingerprint,
  ])

  return { handleSave, persistGenerationSettings }
}
