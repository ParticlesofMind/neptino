"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DANGER_ACTION_BUTTON_CLASS,
  FieldLabel,
  PRIMARY_ACTION_BUTTON_CLASS,
  SECONDARY_ACTION_BUTTON_CLASS,
  selectCourseById,
  SetupColumn,
  SetupPanelLayout,
  SetupSection,
  updateCourseById,
  useDebouncedChangeSave,
} from "@/components/coursebuilder"
import { OverlineLabel } from "@/components/ui/overline-label"
import { buildGenerationContext, callGenerationAPI } from "@/lib/curriculum/ai-generation-service"
import type { GenerationExtras, ClassificationContext, PedagogyContext, NamingRules, StudentsContext } from "@/lib/curriculum/ai-generation-service"
import { getPedagogyApproach } from "@/components/coursebuilder/sections/pedagogy-section"
import { getModelInfo } from "@/lib/ollama/models"
import { buildDefaultResourcePreferences, mergeResourcePreferences, type ResourcePreference } from "@/lib/curriculum/resources"
import {
  calculateSessionDuration,
  getContentLoadConfig,
  getObjectiveCapForDuration,
  listDurationPresets,
  MIN_TASKS_PER_OBJECTIVE,
  normalizeContentLoadConfig,
} from "@/lib/curriculum/content-load-service"
import { normalizeTemplateSettings } from "@/lib/curriculum/template-source-of-truth"
import type { CurriculumCompetency } from "@/lib/curriculum/competency-types"
import type { TemplateDesignConfig, TemplateType } from "@/lib/curriculum/template-blocks"
import { createDefaultTemplateDesign } from "@/lib/curriculum/template-blocks"
import {
  buildCertificateLessonIndexes,
  buildModulesForPreview,
  deriveTemplateOptions,
  type CertificateMode,
  type CourseType,
} from "@/components/coursebuilder/sections/curriculum-derived"

interface ScheduleGeneratedEntry {
  id: string
  day: string
  date: string
  start_time?: string
  end_time?: string
  session?: number
}

interface CurriculumSessionRow {
  id: string
  schedule_entry_id: string
  session_number: number
  title: string
  notes: string
  template_id?: string
  template_type?: TemplateType
  duration_minutes?: number
  topics?: number
  objectives?: number
  tasks?: number
  topic_names?: string[]
  objective_names?: string[]
  task_names?: string[]
  competencies?: CurriculumCompetency[]
  template_design?: TemplateDesignConfig
}

interface SavedTemplateSummary {
  id: string
  name: string
  type: string
}

const COURSE_TYPE_TEMPLATE_FILTERS: Record<CourseType, string[]> = {
  minimalist: ["lesson"],
  essential: ["lesson", "quiz", "assessment", "exam", "certificate"],
  complete: [],
  custom: [],
}

function extractSavedTemplates(raw: unknown): SavedTemplateSummary[] {
  return normalizeTemplateSettings(raw).map((template) => ({
    id: template.id,
    name: template.name,
    type: template.type,
  }))
}

type GenerationAction = "all" | "modules" | "lessons" | "topics" | "objectives" | "tasks"
type PreviewMode = "modules" | "lessons" | "topics" | "objectives" | "tasks" | "all"

const TEMPLATE_TYPE_OPTIONS: Array<{ value: TemplateType; label: string }> = [
  { value: "lesson", label: "Lesson" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "assessment", label: "Assessment" },
  { value: "certificate", label: "Certificate" },
]

const CONTENT_VOLUME_DURATION_MAP: Record<string, number> = {
  mini: 30,
  single: 60,
  double: 120,
  triple: 180,
  fullday: 240,
  marathon: 241,
}

function createRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `curr-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function extractExistingSessionRows(curriculumData: Record<string, unknown>): CurriculumSessionRow[] {
  const sessionRows = curriculumData.session_rows
  if (Array.isArray(sessionRows)) {
    return sessionRows.map((row, index) => {
      const r = row as Record<string, unknown>
      const templateType = ((r.template_type as string) || "lesson") as TemplateType
      const durationMinutes = (r.duration_minutes as number) || undefined
      const normalizedCounts = normalizeContentLoadConfig(
        {
          topicsPerLesson: (r.topics as number) || 1,
          objectivesPerTopic: (r.objectives as number) || 2,
          tasksPerObjective: (r.tasks as number) || MIN_TASKS_PER_OBJECTIVE,
        },
        durationMinutes ?? null,
      )
      const topicCount = normalizedCounts.topicsPerLesson
      const objectiveCount = normalizedCounts.objectivesPerTopic
      const taskCount = normalizedCounts.tasksPerObjective
      return {
        id: (r.id as string) || createRowId(),
        schedule_entry_id: (r.schedule_entry_id as string) || "",
        session_number: (r.session_number as number) || index + 1,
        title: (r.title as string) || `Session ${index + 1}`,
        notes: (r.notes as string) || "",
        template_id: (r.template_id as string) || undefined,
        template_type: templateType,
        duration_minutes: durationMinutes,
        topics: topicCount,
        objectives: objectiveCount,
        tasks: taskCount,
        topic_names: Array.isArray(r.topic_names) ? (r.topic_names as string[]) : Array.from({ length: topicCount }, (_, i) => `Topic ${i + 1}`),
        objective_names: Array.isArray(r.objective_names) ? (r.objective_names as string[]) : Array.from({ length: objectiveCount }, (_, i) => `Objective ${i + 1}`),
        task_names: Array.isArray(r.task_names) ? (r.task_names as string[]) : Array.from({ length: taskCount }, (_, i) => `Task ${i + 1}`),
        competencies: (r.competencies as CurriculumCompetency[]) || undefined,
        template_design:
          (r.template_design as TemplateDesignConfig) || createDefaultTemplateDesign(templateType),
      }
    })
  }

  const lessons = curriculumData.lessons
  if (Array.isArray(lessons)) {
    return lessons.map((lesson, index) => {
      const l = lesson as Record<string, unknown>
      return {
        id: createRowId(),
        schedule_entry_id: (l.scheduleEntryId as string) || "",
        session_number: (l.lessonNumber as number) || index + 1,
        title: (l.title as string) || `Session ${index + 1}`,
        notes: (l.notes as string) || "",
        topic_names: [],
        objective_names: [],
        task_names: [],
      }
    })
  }

  return []
}

function syncSessionRowsToSchedule(
  scheduleEntries: ScheduleGeneratedEntry[],
  existingRows: CurriculumSessionRow[],
): CurriculumSessionRow[] {
  if (scheduleEntries.length === 0) return existingRows

  const byScheduleId = new Map(existingRows.map((row) => [row.schedule_entry_id, row]))

  return scheduleEntries.map((entry, index) => {
    const byId = byScheduleId.get(entry.id)
    const byIndex = existingRows[index]
    const base = byId ?? byIndex

    // Calculate duration and content load config
    const durationMinutes = calculateSessionDuration(entry.start_time, entry.end_time)
    const contentLoadConfig = durationMinutes ? getContentLoadConfig(durationMinutes) : null
    const normalizedCounts = normalizeContentLoadConfig(
      {
        topicsPerLesson: base?.topics ?? contentLoadConfig?.topicsPerLesson ?? 1,
        objectivesPerTopic: base?.objectives ?? contentLoadConfig?.objectivesPerTopic ?? 2,
        tasksPerObjective: base?.tasks ?? contentLoadConfig?.tasksPerObjective ?? MIN_TASKS_PER_OBJECTIVE,
      },
      durationMinutes,
    )

    // Determine template type
    const templateType = (base?.template_type || "lesson") as TemplateType

    return {
      id: base?.id || createRowId(),
      schedule_entry_id: entry.id,
      session_number: index + 1,
      title: base?.title || `Session ${index + 1}`,
      notes: base?.notes || "",
      template_id: base?.template_id,
      template_type: templateType,
      duration_minutes: base?.duration_minutes ?? durationMinutes ?? undefined,
      topics: normalizedCounts.topicsPerLesson,
      objectives: normalizedCounts.objectivesPerTopic,
      tasks: normalizedCounts.tasksPerObjective,
      competencies: base?.competencies,
      template_design: base?.template_design || createDefaultTemplateDesign(templateType),
    }
  })
}

function Divider({ label }: { label: string }) {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <OverlineLabel className="mb-4">{label}</OverlineLabel>
    </div>
  )
}

function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  meta,
  description,
  compact = false,
}: {
  name: string
  value: string
  checked: boolean
  onChange: (v: string) => void
  title: string
  meta?: string
  description: string
  compact?: boolean
}) {
  return (
    <label
      className={`relative flex cursor-pointer rounded-lg border transition ${compact ? "p-2.5" : "p-4"} ${
        checked ? "border-primary bg-accent" : "border-border bg-background hover:border-primary/30"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`${compact ? "text-xs" : "text-sm"} font-medium ${checked ? "text-primary" : "text-foreground"}`}>{title}</span>
          {meta && <span className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground`}>{meta}</span>}
        </div>
        <p className={`${compact ? "mt-0.5 text-[11px] leading-snug" : "mt-1 text-xs leading-relaxed"} text-muted-foreground`}>{description}</p>
      </div>
    </label>
  )
}

export function CurriculumSection({ courseId }: { courseId: string | null }) {
  const generationCooldownMs = 10_000
  const estimateStorageKey = "curriculum-generation-estimate-v1"
  const [moduleOrg, setModuleOrg] = useState("linear")
  const [contentVolume, setContentVolume] = useState("single")
  const [courseType, setCourseType] = useState("essential")
  const [lessonCount, setLessonCount] = useState(8)
  const [moduleCount, setModuleCount] = useState(3)
  const [topics, setTopics] = useState(2)
  const [objectives, setObjectives] = useState(2)
  const [tasks, setTasks] = useState(2)
  const [moduleNames, setModuleNames] = useState<string[]>([])
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleGeneratedEntry[]>([])
  const [sessionRows, setSessionRows] = useState<CurriculumSessionRow[]>([])
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplateSummary[]>([])
  const [templateDefaultType, setTemplateDefaultType] = useState<TemplateType>("lesson")
  const [certificateMode, setCertificateMode] = useState<CertificateMode>("never")
  const [courseInfo, setCourseInfo] = useState<{ name: string; description?: string; goals?: string } | null>(null)
  const [sequencingMode, setSequencingMode] = useState("linear")
  const [namingRules, setNamingRules] = useState<NamingRules>({ lessonTitleRule: "", topicRule: "", objectiveRule: "", taskRule: "" })
  const [classificationData, setClassificationData] = useState<ClassificationContext | null>(null)
  const [pedagogyData, setPedagogyData] = useState<PedagogyContext | null>(null)
  const [courseGoalsList, setCourseGoalsList] = useState<string[]>([])
  const [keyTerms, setKeyTerms] = useState<string[]>([])
  const [mandatoryTopics, setMandatoryTopics] = useState<string[]>([])
  const [priorKnowledge, setPriorKnowledge] = useState("")
  const [applicationContext, setApplicationContext] = useState("")
  const [courseLanguage, setCourseLanguage] = useState("")
  const [studentsData, setStudentsData] = useState<StudentsContext | null>(null)
  const [selectedLLMModel, setSelectedLLMModel] = useState<string | null>(null)
  const [resourcePreferences, setResourcePreferences] = useState<ResourcePreference[]>(() => buildDefaultResourcePreferences())
  const [optCtx, setOptCtx] = useState({ schedule: true, structure: true, existing: false })
  const [previewMode, setPreviewMode] = useState<PreviewMode>("modules")
  const [lastAction, setLastAction] = useState<GenerationAction | null>(null)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runProgress, setRunProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeGenerationAction, setActiveGenerationAction] = useState<GenerationAction | null>(null)
  const [generationCooldownUntil, setGenerationCooldownUntil] = useState<number | null>(null)
  const [generationCooldownLeft, setGenerationCooldownLeft] = useState(0)
  const [avgMsPerUnitByAction, setAvgMsPerUnitByAction] = useState<Partial<Record<GenerationAction, number>>>({})
  const [ollamaHealthy, setOllamaHealthy] = useState<boolean | null>(null)
  const [runningModels, setRunningModels] = useState<string[]>([])
  const [highLoadModelActive, setHighLoadModelActive] = useState(false)
  const [readinessIssues, setReadinessIssues] = useState<string[]>([])
  const [missing, setMissing] = useState<{ essentials: boolean; schedule: boolean; curriculum: boolean }>({
    essentials: false,
    schedule: false,
    curriculum: false,
  })
  const generationSettingsRef = useRef<Record<string, unknown> | null>(null)
  const generationLockRef = useRef(false)
  const generationAbortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let isActive = true

    const checkOllamaHealth = async () => {
      try {
        const response = await fetch("/api/ollama-health", { cache: "no-store" })
        const data = (await response.json()) as {
          healthy?: boolean
          runningModels?: string[]
          highLoad?: boolean
        }

        if (!isActive) return
        setOllamaHealthy(Boolean(data.healthy))
        setRunningModels(Array.isArray(data.runningModels) ? data.runningModels : [])
        setHighLoadModelActive(Boolean(data.highLoad))
      } catch {
        if (!isActive) return
        setOllamaHealthy(false)
        setRunningModels([])
        setHighLoadModelActive(false)
      }
    }

    void checkOllamaHealth()
    const interval = setInterval(() => {
      void checkOllamaHealth()
    }, 15000)

    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!generationCooldownUntil) {
      setGenerationCooldownLeft(0)
      return
    }

    const tick = () => {
      const remainingMs = generationCooldownUntil - Date.now()
      if (remainingMs <= 0) {
        setGenerationCooldownUntil(null)
        setGenerationCooldownLeft(0)
        return
      }
      setGenerationCooldownLeft(Math.ceil(remainingMs / 1000))
    }

    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [generationCooldownUntil])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(estimateStorageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<Record<GenerationAction, number>>
      if (parsed && typeof parsed === "object") {
        setAvgMsPerUnitByAction(parsed)
      }
    } catch {
    }
  }, [estimateStorageKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(estimateStorageKey, JSON.stringify(avgMsPerUnitByAction))
    } catch {
    }
  }, [avgMsPerUnitByAction, estimateStorageKey])

  useEffect(() => {
    if (!courseId) return
    void (async () => {
      const { data, error } = await selectCourseById<Record<string, unknown>>(
        courseId,
        "course_name, course_description, course_language, curriculum_data, schedule_settings, generation_settings, template_settings, classification_data, course_layout, students_overview",
      )
      if (!error && data) {
          const c = (data.curriculum_data as Record<string, unknown>) ?? {}
          const s = (data.schedule_settings as Record<string, unknown>) ?? {}
          const gs = (data.generation_settings as Record<string, unknown> | null) ?? {}
          const aiSettings = (gs.ai_generation as Record<string, unknown> | undefined) ?? gs
          generationSettingsRef.current = gs
          const loadedScheduleEntries = Array.isArray(s.generated_entries)
            ? (s.generated_entries as ScheduleGeneratedEntry[]).map((entry, index) => {
                const e = entry as ScheduleGeneratedEntry
                return {
                  ...e,
                  id: e.id || `sched-${index + 1}`,
                }
              })
            : []

          // Load course goals from generation_settings
          const loadedGoals = Array.isArray(gs.course_goals) ? (gs.course_goals as string[]) : []
          setCourseGoalsList(loadedGoals)

          // Load selected LLM model
          const savedModel = (gs.selected_llm_model as string | undefined) ?? null
          setSelectedLLMModel(savedModel)

          const savedResources = gs.resources_preferences as ResourcePreference[] | undefined
          setResourcePreferences(mergeResourcePreferences(Array.isArray(savedResources) ? savedResources : null))

          setCourseInfo({
            name: (data.course_name as string) ?? "Untitled Course",
            description: (data.course_description as string) ?? undefined,
            goals: loadedGoals.length > 0 ? loadedGoals.join("; ") : undefined,
          })

          // Load course language
          if (data.course_language) setCourseLanguage(data.course_language as string)

          // Load classification data for generation context
          const cd = (data.classification_data as Record<string, unknown>) ?? {}
          if (cd.subject || cd.domain || cd.topic) {
            setClassificationData({
              classYear: (cd.class_year as string) ?? "",
              framework: (cd.curricular_framework as string) ?? "",
              domain: (cd.domain as string) ?? "",
              subject: (cd.subject as string) ?? "",
              topic: (cd.topic as string) ?? "",
              subtopic: (cd.subtopic as string) ?? "",
              previousCourse: (cd.previous_course as string) ?? "",
              nextCourse: (cd.next_course as string) ?? "",
            })
            if (Array.isArray(cd.key_terms)) setKeyTerms(cd.key_terms as string[])
            if (Array.isArray(cd.mandatory_topics)) setMandatoryTopics(cd.mandatory_topics as string[])
            if (typeof cd.prior_knowledge === "string") setPriorKnowledge(cd.prior_knowledge)
            if (typeof cd.application_context === "string") setApplicationContext(cd.application_context)
          }

          // Load pedagogy data for generation context
          const layout = (data.course_layout as Record<string, unknown>) ?? {}
          if (layout.pedagogy) {
            const p = layout.pedagogy as { x: number; y: number }
            const approach = getPedagogyApproach(p.x, p.y)
            setPedagogyData({
              x: p.x,
              y: p.y,
              approach: approach.title,
              teacherRole: approach.teacherRole,
              studentRole: approach.studentRole,
              activitiesMethods: approach.activitiesMethods,
              assessment: approach.assessment,
              classroomEnvironment: approach.classroomEnvironment,
            })
          }

          // Load students overview for generation context
          const so = (data.students_overview as Record<string, unknown>) ?? {}
          const totalStudents = typeof so.total === "number" ? so.total : (Array.isArray(so.students) ? (so.students as unknown[]).length : 0)
          if (totalStudents > 0) {
            setStudentsData({ totalStudents, method: (so.method as string) ?? "unknown" })
          }

          setOptCtx({
            schedule: true,
            structure: true,
            existing: true,
          })
          const loadedMode = aiSettings.preview_mode as PreviewMode | undefined
          if (loadedMode) setPreviewMode(loadedMode)
          const loadedAction = aiSettings.last_action as GenerationAction | undefined
          if (loadedAction) setLastAction(loadedAction)

          const existingRows = extractExistingSessionRows(c)
          const syncedRows = syncSessionRowsToSchedule(loadedScheduleEntries, existingRows)

          setModuleOrg((c.module_org as string) ?? "linear")
          setContentVolume((c.content_volume as string) ?? "single")
          setCourseType((c.course_type as string) ?? "essential")
          setSequencingMode((c.sequencing_mode as string) ?? "linear")
          if (c.naming_rules && typeof c.naming_rules === "object") {
            const nr = c.naming_rules as Record<string, string>
            setNamingRules({
              lessonTitleRule: nr.lessonTitleRule ?? "",
              topicRule: nr.topicRule ?? "",
              objectiveRule: nr.objectiveRule ?? "",
              taskRule: nr.taskRule ?? "",
            })
          }
          setTemplateDefaultType((c.template_default_type as TemplateType) ?? "lesson")
          setCertificateMode((c.certificate_mode as CertificateMode) ?? "never")
          setLessonCount(loadedScheduleEntries.length > 0 ? loadedScheduleEntries.length : ((c.lesson_count as number) ?? 8))
          setModuleCount((c.module_count as number) ?? 3)
          const normalizedContentLoad = normalizeContentLoadConfig({
            topicsPerLesson: (c.topics as number) ?? 2,
            objectivesPerTopic: (c.objectives as number) ?? 2,
            tasksPerObjective: (c.tasks as number) ?? MIN_TASKS_PER_OBJECTIVE,
          })
          setTopics(normalizedContentLoad.topicsPerLesson)
          setObjectives(normalizedContentLoad.objectivesPerTopic)
          setTasks(normalizedContentLoad.tasksPerObjective)
          setModuleNames(Array.isArray(c.module_names) ? (c.module_names as string[]) : [])
          setScheduleEntries(loadedScheduleEntries)
          setSessionRows(syncedRows)
          setSavedTemplates(extractSavedTemplates(data.template_settings))

          const nextIssues: string[] = []
          const essentialsReady = Boolean((data.course_name as string | undefined)?.trim()) && Boolean((data.course_description as string | undefined)?.trim())
          if (!essentialsReady) nextIssues.push("Complete Essentials (title and description).")
          if (loadedScheduleEntries.length === 0) nextIssues.push("Generate a schedule with at least 1 session.")
          if (syncedRows.length === 0) nextIssues.push("Set up curriculum session rows in Curriculum.")
          setReadinessIssues(nextIssues)
          setMissing({
            essentials: !essentialsReady,
            schedule: loadedScheduleEntries.length === 0,
            curriculum: syncedRows.length === 0,
          })
      }
    })()
  }, [courseId])

  // Hook up contentVolume to auto-update topics/objectives/tasks
  useEffect(() => {
    const presets = listDurationPresets()
    const preset = presets.find((p) => p.name === contentVolume)
    if (preset) {
      const normalizedPreset = normalizeContentLoadConfig(preset.config, preset.maxDuration)
      setTopics(normalizedPreset.topicsPerLesson)
      setObjectives(normalizedPreset.objectivesPerTopic)
      setTasks(normalizedPreset.tasksPerObjective)
    }
  }, [contentVolume])

  const objectiveInputMax = useMemo(() => {
    const representativeDuration = CONTENT_VOLUME_DURATION_MAP[contentVolume] ?? null
    return getObjectiveCapForDuration(representativeDuration)
  }, [contentVolume])

  // Initialize/update module names when module config changes
  useEffect(() => {
    const modulesCount = moduleOrg === "linear" ? 1 : moduleOrg === "equal" ? moduleCount : moduleCount
    setModuleNames((prev) => {
      const newNames = Array.from({ length: modulesCount }, (_, i) => prev[i] || `Module ${i + 1}`)
      const unchanged = prev.length === newNames.length && prev.every((value, idx) => value === newNames[idx])
      return unchanged ? prev : newNames
    })
  }, [moduleOrg, moduleCount])

  const hasGeneratedSchedule = scheduleEntries.length > 0
  const effectiveLessonCount = hasGeneratedSchedule ? scheduleEntries.length : lessonCount
  const selectedCourseType = courseType as CourseType
  const {
    filteredTemplates,
    defaultTemplateOptions,
    lessonTemplateOptions,
  } = useMemo(
    () => deriveTemplateOptions({
      savedTemplates,
      selectedCourseType,
      certificateMode,
      courseTypeTemplateFilters: COURSE_TYPE_TEMPLATE_FILTERS,
    }),
    [savedTemplates, selectedCourseType, certificateMode],
  )

  useEffect(() => {
    const preferredDefault: TemplateType = defaultTemplateOptions.includes("lesson")
      ? "lesson"
      : defaultTemplateOptions[0]
    if (!defaultTemplateOptions.includes(templateDefaultType)) {
      setTemplateDefaultType(preferredDefault)
    }
  }, [defaultTemplateOptions, templateDefaultType])

  const templateCountByCourseType = (type: CourseType): number => {
    const allowed = COURSE_TYPE_TEMPLATE_FILTERS[type]
    if (allowed.length === 0) return savedTemplates.length
    return savedTemplates.filter((template) => allowed.includes(template.type)).length
  }

  const templateTypeLabel = (type: TemplateType): string =>
    TEMPLATE_TYPE_OPTIONS.find((option) => option.value === type)?.label
    ?? `${type.charAt(0).toUpperCase()}${type.slice(1)}`

  const certificateLessonIndexes = useMemo(
    () => buildCertificateLessonIndexes({
      certificateMode,
      effectiveLessonCount,
      moduleOrg,
      moduleCount,
    }),
    [certificateMode, effectiveLessonCount, moduleOrg, moduleCount],
  )

  const resolveTemplateTypeForLesson = useCallback((row: Partial<CurriculumSessionRow> | undefined, index: number): TemplateType => {
    if (row?.template_type) return row.template_type
    if (certificateLessonIndexes.has(index)) return "certificate"
    return templateDefaultType
  }, [certificateLessonIndexes, templateDefaultType])

  useEffect(() => {
    setSessionRows((prev) => {
      const targetLessonCount = Math.max(1, effectiveLessonCount)
      let changed = prev.length !== targetLessonCount

      const next = Array.from({ length: targetLessonCount }, (_, index) => {
        const existing = prev[index]
        const schedule = scheduleEntries[index]
        const resolvedTemplateType = resolveTemplateTypeForLesson(existing, index)
        const scheduleDuration = calculateSessionDuration(schedule?.start_time, schedule?.end_time)
        const durationForCaps = existing?.duration_minutes ?? scheduleDuration ?? null
        const normalizedCounts = normalizeContentLoadConfig(
          {
            topicsPerLesson: topics,
            objectivesPerTopic: objectives,
            tasksPerObjective: tasks,
          },
          durationForCaps,
        )

        const nextRow: CurriculumSessionRow = {
          id: existing?.id ?? createRowId(),
          schedule_entry_id: existing?.schedule_entry_id ?? schedule?.id ?? "",
          session_number: index + 1,
          title: existing?.title ?? `Session ${index + 1}`,
          notes: existing?.notes ?? "",
          template_id: existing?.template_id,
          template_type: resolvedTemplateType,
          duration_minutes: existing?.duration_minutes ?? scheduleDuration ?? undefined,
          topics: normalizedCounts.topicsPerLesson,
          objectives: normalizedCounts.objectivesPerTopic,
          tasks: normalizedCounts.tasksPerObjective,
          topic_names: Array.from({ length: normalizedCounts.topicsPerLesson }, (_, i) => existing?.topic_names?.[i] ?? ""),
          objective_names: Array.from({ length: normalizedCounts.objectivesPerTopic }, (_, i) => existing?.objective_names?.[i] ?? ""),
          task_names: Array.from({ length: normalizedCounts.tasksPerObjective }, (_, i) => existing?.task_names?.[i] ?? ""),
          competencies: existing?.competencies,
          template_design: existing?.template_design ?? createDefaultTemplateDesign(resolvedTemplateType),
        }

        if (!existing) {
          changed = true
          return nextRow
        }

        if (
          existing.session_number !== nextRow.session_number
          || existing.topics !== nextRow.topics
          || existing.objectives !== nextRow.objectives
          || existing.tasks !== nextRow.tasks
          || (existing.topic_names?.length ?? 0) !== (nextRow.topic_names?.length ?? 0)
          || (existing.objective_names?.length ?? 0) !== (nextRow.objective_names?.length ?? 0)
          || (existing.task_names?.length ?? 0) !== (nextRow.task_names?.length ?? 0)
          || existing.schedule_entry_id !== nextRow.schedule_entry_id
        ) {
          changed = true
        }

        return nextRow
      })

      return changed ? next : prev
    })
  }, [effectiveLessonCount, scheduleEntries, topics, objectives, tasks, resolveTemplateTypeForLesson])

  const handleSave = useCallback(async () => {
    if (!courseId) return

    const serializedSessionRows = sessionRows.map((row, index) => ({
      id: row.id,
      schedule_entry_id: row.schedule_entry_id,
      session_number: index + 1,
      title: row.title,
      notes: row.notes,
      template_id: row.template_id,
      template_type: resolveTemplateTypeForLesson(row, index),
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

    const lessons = sessionRows.map((row, index) => {
      const schedule = scheduleEntries[index]
      return {
        lessonNumber: index + 1,
        title: row.title,
        notes: row.notes,
        scheduleEntryId: row.schedule_entry_id,
        schedule: schedule
          ? {
              day: schedule.day,
              date: schedule.date,
              startTime: schedule.start_time,
              endTime: schedule.end_time,
            }
          : null,
      }
    })

    const { error } = await updateCourseById(courseId, {
      curriculum_data: {
        module_org: moduleOrg,
        content_volume: contentVolume,
        course_type: courseType,
        template_default_type: templateDefaultType,
        certificate_mode: certificateMode,
        lesson_count: effectiveLessonCount,
        module_count: moduleCount,
        module_names: moduleNames,
        topics,
        objectives,
        tasks,
        sequencing_mode: sequencingMode,
        naming_rules: namingRules,
        session_rows: serializedSessionRows,
        lessons,
      },
      updated_at: new Date().toISOString(),
    })
    if (error) return
  }, [courseId, moduleOrg, contentVolume, courseType, templateDefaultType, certificateMode, effectiveLessonCount, moduleCount, moduleNames, topics, objectives, tasks, sequencingMode, namingRules, sessionRows, scheduleEntries, resolveTemplateTypeForLesson])

  const persistGenerationSettings = useCallback(async () => {
    if (!courseId) return
    const existingSettings = generationSettingsRef.current ?? {}
    const nextSettings = {
      ...existingSettings,
      ai_generation: {
        required_context: ["essentials", "classification", "pedagogy"],
        optional_context: {
          schedule: optCtx.schedule,
          structure: optCtx.structure,
          existing: optCtx.existing,
        },
        preview_mode: previewMode,
        last_action: lastAction,
        curriculum_context: {
          module_org: moduleOrg,
          module_count: moduleCount,
          module_names: moduleNames,
          lesson_count: effectiveLessonCount,
          topics_per_lesson: topics,
          objectives_per_topic: objectives,
          tasks_per_objective: tasks,
          session_rows: sessionRows.map((row, index) => ({
            id: row.id,
            session_number: row.session_number ?? index + 1,
            title: row.title ?? `Lesson ${index + 1}`,
            notes: row.notes ?? "",
          })),
        },
        updated_at: new Date().toISOString(),
      },
    }

    const { error } = await updateCourseById(courseId, {
      generation_settings: nextSettings,
      updated_at: new Date().toISOString(),
    })
    if (error) return
    generationSettingsRef.current = nextSettings
  }, [courseId, optCtx, previewMode, lastAction, moduleOrg, moduleCount, moduleNames, effectiveLessonCount, topics, objectives, tasks, sessionRows])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))
  useDebouncedChangeSave(persistGenerationSettings, 600, Boolean(courseId))

  const isGenerationReady = readinessIssues.length === 0
  const goToSection = (sectionId: "essentials" | "schedule" | "curriculum") => {
    window.dispatchEvent(new CustomEvent("coursebuilder:navigate-section", { detail: { sectionId } }))
  }

  const clearAllGenerated = useCallback(async () => {
    if (!courseId) return
    if (isGenerating) {
      setRunStatus("Generation is currently running. Cancel or wait for it to finish before deleting content.")
      setTimeout(() => setRunStatus(null), 3000)
      return
    }
    setRunStatus("Deleting all generated content…")
    setRunProgress(20)

    // Build wiped rows: keep structural fields (id, schedule_entry_id, template_type, duration)
    // but blank out every generated name/content field
    const blankRows = sessionRows.map((row, index) => ({
      id: row.id,
      schedule_entry_id: row.schedule_entry_id,
      session_number: index + 1,
      title: `Session ${index + 1}`,
      notes: "",
      template_id: row.template_id,
      template_type: row.template_type,
      duration_minutes: row.duration_minutes,
      topics: row.topics,
      objectives: row.objectives,
      tasks: row.tasks,
      topic_names: [] as string[],
      objective_names: [] as string[],
      task_names: [] as string[],
      competencies: undefined,
      template_design: row.template_design,
    }))
    const blankModuleNames = moduleNames.map((_, i) => `Module ${i + 1}`)

    setRunProgress(40)

    // Flush to backend
    const { data: snap } = await selectCourseById<Record<string, unknown>>(courseId, "curriculum_data")

    const snapData = (snap?.curriculum_data as Record<string, unknown> | null) ?? {}
    const { error } = await updateCourseById(courseId, {
      curriculum_data: {
        ...snapData,
        module_names: blankModuleNames,
        session_rows: blankRows,
        generated_at: null,
        last_generation_action: null,
      },
      updated_at: new Date().toISOString(),
    })

    setRunProgress(80)

    if (error) {
      setRunStatus(`Failed to delete: ${error.message}`)
      setTimeout(() => setRunStatus(null), 3000)
      return
    }

    // Apply to local state
    setSessionRows(blankRows)
    setModuleNames(blankModuleNames)
    setLastAction(null)
    setRunProgress(100)
    setRunStatus("All generated content deleted.")
    setTimeout(() => setRunStatus(null), 2000)
  }, [courseId, sessionRows, moduleNames, isGenerating])

  const actionButtons = useMemo<Array<{ key: GenerationAction; label: string; description: string; primary?: boolean }>>(() => [
    { key: "all", label: "Generate All", description: "Modules, lessons, topics, objectives, and tasks.", primary: true },
    { key: "modules", label: "Generate Module Names", description: "Auto-title modules based on structure." },
    { key: "lessons", label: "Generate Lesson Names", description: "Create lesson titles for each session." },
    { key: "topics", label: "Generate Topic Titles", description: "Fill in topics per lesson." },
    { key: "objectives", label: "Generate Objectives", description: "Add objectives aligned to topics." },
    { key: "tasks", label: "Generate Tasks", description: "Create tasks per objective." },
  ], [])

  const modelInfo = selectedLLMModel ? getModelInfo(selectedLLMModel) : undefined
  const modelSpeed = modelInfo?.speed ?? "medium"

  const actionUnits = useCallback((action: GenerationAction) => {
    const lessons = Math.max(1, effectiveLessonCount)
    const modules = Math.max(1, moduleOrg === "linear" ? 1 : moduleCount)
    const unitsByAction: Record<GenerationAction, number> = {
      all: lessons * 2.4,
      modules: modules,
      lessons: lessons,
      topics: lessons,
      objectives: lessons * 1.2,
      tasks: lessons * 1.4,
    }
    return Math.max(1, unitsByAction[action])
  }, [effectiveLessonCount, moduleOrg, moduleCount])

  const formatEstimate = (totalSeconds: number) => {
    if (!Number.isFinite(totalSeconds)) return "Est. varies"
    const seconds = Math.max(15, Math.round(totalSeconds / 10) * 10)
    if (seconds < 90) return `Est. ${seconds}s`
    const mins = Math.floor(seconds / 60)
    const rem = seconds % 60
    return rem > 0 ? `Est. ${mins}m ${rem}s` : `Est. ${mins}m`
  }

  const estimateForAction = (action: GenerationAction) => {
    const units = actionUnits(action)
    const knownMsPerUnit = avgMsPerUnitByAction[action]
    if (typeof knownMsPerUnit === "number" && Number.isFinite(knownMsPerUnit) && knownMsPerUnit > 0) {
      return formatEstimate((knownMsPerUnit * units) / 1000)
    }

    const learnedValues = Object.values(avgMsPerUnitByAction).filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    )
    if (learnedValues.length > 0) {
      const avgLearnedMsPerUnit = learnedValues.reduce((sum, value) => sum + value, 0) / learnedValues.length
      return `${formatEstimate((avgLearnedMsPerUnit * units) / 1000)}*`
    }

    return modelSpeed === "slow" ? "Est. learning… (likely longer)" : "Est. learning…"
  }

  const modeButtons: Array<{ key: PreviewMode; label: string }> = [
    { key: "modules", label: "Modules" },
    { key: "lessons", label: "Lessons" },
    { key: "topics", label: "Topics" },
    { key: "objectives", label: "Objectives" },
    { key: "tasks", label: "Tasks" },
    { key: "all", label: "All" },
  ]

  const runGeneration = useCallback(
    async (action: GenerationAction) => {
      if (!courseId || !courseInfo) return
      if (generationCooldownLeft > 0) {
        setRunStatus(`Cooling down… wait ${generationCooldownLeft}s before starting another run.`)
        setTimeout(() => setRunStatus(null), 2000)
        return
      }
      if (generationLockRef.current || isGenerating) {
        setRunStatus("Generation already in progress. Please wait or cancel the current run.")
        setTimeout(() => setRunStatus(null), 2500)
        return
      }
      if (!isGenerationReady) {
        setRunProgress(0)
        setRunStatus("Generation is locked until required setup data is complete.")
        setTimeout(() => setRunStatus(null), 3000)
        return
      }

      generationLockRef.current = true
      setIsGenerating(true)
      setActiveGenerationAction(action)
      const abortController = new AbortController()
      generationAbortControllerRef.current = abortController

      setLastAction(action)
      setRunStatus("Building curriculum context…")
      setRunProgress(10)
      let completedSuccessfully = false

      try {
        await new Promise((resolve) => setTimeout(resolve, 200))
        setRunStatus("Preparing AI request…")
        setRunProgress(20)

        const extras: GenerationExtras = {
          classification: classificationData ?? undefined,
          pedagogy: pedagogyData ?? undefined,
          courseGoalsList: courseGoalsList.length > 0 ? courseGoalsList : undefined,
          keyTerms: keyTerms.length > 0 ? keyTerms : undefined,
          mandatoryTopics: mandatoryTopics.length > 0 ? mandatoryTopics : undefined,
          priorKnowledge: priorKnowledge || undefined,
          applicationContext: applicationContext || undefined,
          resourcesPreferences: resourcePreferences,
          sequencingMode: sequencingMode !== "linear" ? sequencingMode : undefined,
          namingRules: Object.values(namingRules).some(Boolean) ? namingRules : undefined,
          courseLanguage: courseLanguage || undefined,
          students: studentsData ?? undefined,
        }

        const context = buildGenerationContext(
          courseInfo.name,
          courseInfo.description,
          courseInfo.goals,
          scheduleEntries,
          moduleOrg,
          moduleCount,
          effectiveLessonCount,
          topics,
          objectives,
          tasks,
          sessionRows,
          {
            schedule: optCtx.schedule,
            structure: optCtx.structure,
            existing: optCtx.existing,
          },
          extras,
        )

        await new Promise((resolve) => setTimeout(resolve, 300))
        const modelName = selectedLLMModel ? selectedLLMModel.split("-")[0].charAt(0).toUpperCase() + selectedLLMModel.split("-")[0].slice(1) : "Ollama"
        setRunStatus(`Calling ${modelName} for ${actionButtons.find((btn) => btn.key === action)?.label ?? "generation"}…`)
        setRunProgress(35)
        const startedAt = Date.now()

        const response = await callGenerationAPI(context, selectedLLMModel ?? undefined, abortController.signal, action)
        setRunProgress(70)

        console.log("[CurriculumSection] Generation response:", response.success, response.message)

        if (!response.success) {
          setRunStatus(`Generation failed: ${response.error || response.message}`)
          setTimeout(() => setRunStatus(null), 8000)
          return
        }

        setRunStatus("Clearing previous generation…")
        setRunProgress(75)

        // Wipe previously generated content for the targeted scope — both local state AND backend
        const wipedRows = sessionRows.map((row) => {
          const cleared: Partial<CurriculumSessionRow> = {}
          if (action === "all" || action === "lessons") cleared.title = `Session ${row.session_number ?? 0}`
          if (action === "all" || action === "topics") { cleared.topic_names = [] }
          if (action === "all" || action === "objectives") { cleared.objective_names = [] }
          if (action === "all" || action === "tasks") { cleared.task_names = [] }
          return { ...row, ...cleared }
        })
        const wipedModuleNames = action === "all"
          ? moduleNames.map((_, i) => `Module ${i + 1}`)
          : moduleNames

        // Flush the wipe to the database so a re-fetch never resurrects stale content
        {
          const { data: snap } = await selectCourseById<Record<string, unknown>>(courseId, "curriculum_data")

          const snapData = (snap?.curriculum_data as Record<string, unknown> | null) ?? {}
          await updateCourseById(courseId, {
            curriculum_data: {
              ...snapData,
              module_names: wipedModuleNames,
              session_rows: wipedRows,
              wiped_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
        }

        setModuleNames(wipedModuleNames)
        setSessionRows(wipedRows)
        setRunProgress(80)

        setRunStatus("Processing generated curriculum…")
        setRunProgress(85)
        await new Promise((resolve) => setTimeout(resolve, 300))

        const generatedLessons = response.content?.lessons ?? []
        const generatedModules = response.content?.modules ?? []
        const needsLessons = action !== "modules"
        if (needsLessons && generatedLessons.length === 0) {
          setRunStatus("Generation returned no lesson data for this action. Please try again.")
          setTimeout(() => setRunStatus(null), 4000)
          return
        }
        if (action === "modules" && generatedModules.length === 0) {
          setRunStatus("Generation returned no module names. Please try again.")
          setTimeout(() => setRunStatus(null), 4000)
          return
        }

        const { data: existing } = await selectCourseById<Record<string, unknown>>(courseId, "curriculum_data")

        const curriculumData = (existing?.curriculum_data as Record<string, unknown> | null) ?? {}
        const baseRows = wipedRows.length > 0
          ? wipedRows
          : (Array.isArray(curriculumData.session_rows) ? (curriculumData.session_rows as CurriculumSessionRow[]) : [])

        const seedRows: CurriculumSessionRow[] = baseRows.length > 0
          ? baseRows
          : generatedLessons.map((lesson) => ({
              id: createRowId(),
              schedule_entry_id: "",
              session_number: lesson.lessonNumber,
              title: lesson.lessonTitle,
              notes: "",
              template_type: "lesson" as TemplateType,
            }))

        const updatedSessionRows = seedRows.map((row, index) => {
          const generatedLesson = generatedLessons[index]
          if (!generatedLesson) return row

          const normalizedCounts = normalizeContentLoadConfig(
            {
              topicsPerLesson: row.topics ?? topics,
              objectivesPerTopic: row.objectives ?? objectives,
              tasksPerObjective: row.tasks ?? tasks,
            },
            row.duration_minutes ?? null,
          )

          const updates: Partial<CurriculumSessionRow> = {}
          if (action === "all" || action === "lessons") updates.title = generatedLesson.lessonTitle
          if (action === "all" || action === "topics") {
            const nextTopicNames = (generatedLesson.topics ?? []).slice(0, normalizedCounts.topicsPerLesson)
            updates.topics = normalizedCounts.topicsPerLesson
            updates.topic_names = Array.from(
              { length: normalizedCounts.topicsPerLesson },
              (_, topicIndex) => nextTopicNames[topicIndex] ?? row.topic_names?.[topicIndex] ?? "",
            )
          }
          if (action === "all" || action === "objectives") {
            const nextObjectiveNames = (generatedLesson.objectives ?? []).slice(0, normalizedCounts.objectivesPerTopic)
            updates.objectives = normalizedCounts.objectivesPerTopic
            updates.objective_names = Array.from(
              { length: normalizedCounts.objectivesPerTopic },
              (_, objectiveIndex) => nextObjectiveNames[objectiveIndex] ?? row.objective_names?.[objectiveIndex] ?? "",
            )
          }
          if (action === "all" || action === "tasks") {
            const nextTaskNames = (generatedLesson.tasks ?? []).slice(0, normalizedCounts.tasksPerObjective)
            updates.tasks = normalizedCounts.tasksPerObjective
            updates.task_names = Array.from(
              { length: normalizedCounts.tasksPerObjective },
              (_, taskIndex) => nextTaskNames[taskIndex] ?? row.task_names?.[taskIndex] ?? "",
            )
          }
          return { ...row, ...updates }
        })

        const generatedModuleNames = generatedModules.length > 0
          ? generatedModules
            .sort((a, b) => a.moduleNumber - b.moduleNumber)
            .map((module) => module.moduleTitle)
          : moduleNames

        const nextCurriculumData = {
          ...curriculumData,
          module_names: generatedModuleNames,
          session_rows: updatedSessionRows,
          generated_at: new Date().toISOString(),
          last_generation_action: action,
        }

        const { error } = await updateCourseById(courseId, {
          curriculum_data: nextCurriculumData,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          setRunStatus(`Failed to save generated curriculum: ${error.message}`)
          setTimeout(() => setRunStatus(null), 3000)
          return
        }

        setSessionRows(updatedSessionRows)
        setModuleNames(generatedModuleNames)

        const elapsedMs = Date.now() - startedAt
        const units = actionUnits(action)
        if (elapsedMs > 0 && units > 0) {
          const currentMsPerUnit = elapsedMs / units
          setAvgMsPerUnitByAction((prev) => {
            const prior = prev[action]
            const blended = typeof prior === "number" && Number.isFinite(prior)
              ? prior * 0.7 + currentMsPerUnit * 0.3
              : currentMsPerUnit
            return { ...prev, [action]: blended }
          })
        }

        setRunProgress(100)
        setRunStatus("Generation complete!")
        completedSuccessfully = true
        setTimeout(() => setRunStatus(null), 2000)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        setRunStatus(`Error: ${message}`)
        setTimeout(() => setRunStatus(null), 3000)
      } finally {
        if (completedSuccessfully) {
          setGenerationCooldownUntil(Date.now() + generationCooldownMs)
        }
        generationLockRef.current = false
        setIsGenerating(false)
        setActiveGenerationAction(null)
        generationAbortControllerRef.current = null
      }
    },
    [courseId, courseInfo, scheduleEntries, moduleOrg, moduleCount, effectiveLessonCount, topics, objectives, tasks, sessionRows, optCtx, isGenerationReady, moduleNames, classificationData, pedagogyData, courseGoalsList, keyTerms, mandatoryTopics, priorKnowledge, applicationContext, resourcePreferences, sequencingMode, namingRules, courseLanguage, studentsData, selectedLLMModel, isGenerating, generationCooldownLeft, generationCooldownMs, actionButtons, actionUnits],
  )

  const cancelGeneration = useCallback(() => {
    if (!generationAbortControllerRef.current) return
    generationAbortControllerRef.current.abort()
    setRunStatus("Generation canceled.")
    setTimeout(() => setRunStatus(null), 2000)
  }, [])

  const modulesForPreview = useMemo(
    () => buildModulesForPreview({
      moduleOrg,
      moduleCount,
      moduleNames,
      effectiveLessonCount,
    }),
    [moduleOrg, moduleCount, moduleNames, effectiveLessonCount],
  )

  const lessonRowsForPreview = Array.from({ length: effectiveLessonCount }, (_, index) => {
    const row = sessionRows[index]
    const normalizedCounts = normalizeContentLoadConfig(
      {
        topicsPerLesson: row?.topics ?? topics,
        objectivesPerTopic: row?.objectives ?? objectives,
        tasksPerObjective: row?.tasks ?? tasks,
      },
      row?.duration_minutes ?? null,
    )
    const rowTopics = normalizedCounts.topicsPerLesson
    const rowObjectives = normalizedCounts.objectivesPerTopic
    const rowTasks = normalizedCounts.tasksPerObjective
    return {
      ...(row ?? {}),
      id: row?.id ?? `lesson-${index + 1}`,
      session_number: row?.session_number ?? index + 1,
      title: row?.title?.trim() || `Lesson ${index + 1}`,
      template_id: row?.template_id,
      template_type: resolveTemplateTypeForLesson(row, index),
      topics: rowTopics,
      objectives: rowObjectives,
      tasks: rowTasks,
      topic_names: Array.from({ length: rowTopics }, (_, i) => row?.topic_names?.[i] || ""),
      objective_names: Array.from({ length: rowObjectives }, (_, i) => row?.objective_names?.[i] || ""),
      task_names: Array.from({ length: rowTasks }, (_, i) => row?.task_names?.[i] || ""),
    }
  })

  const upsertSessionRow = (index: number, updates: Partial<CurriculumSessionRow>) => {
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
  }

  return (
    <SetupSection title="Curriculum" description="Structure, generation, and preview of your course curriculum.">
      <SetupPanelLayout>
        <SetupColumn className="space-y-5">
          <div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { value: "linear", title: "No Modules", description: "Lessons in a single flat list." },
                { value: "equal", title: "Equal Modules", description: "Evenly distributed across modules." },
                { value: "custom", title: "Custom Modules", description: "Define your own module boundaries." },
              ].map((opt) => (
                <RadioCard key={opt.value} name="module-org" {...opt} checked={moduleOrg === opt.value} onChange={setModuleOrg} compact />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Number of Lessons</FieldLabel>
              <input
                type="number"
                min={1}
                max={60}
                value={effectiveLessonCount}
                onChange={(e) => setLessonCount(Math.min(60, Math.max(1, Number(e.target.value))))}
                disabled={hasGeneratedSchedule}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
              />
            </div>
            {moduleOrg !== "linear" && (
              <div>
                <FieldLabel>Number of Modules</FieldLabel>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={moduleCount}
                  onChange={(e) => setModuleCount(Math.min(12, Math.max(1, Number(e.target.value))))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                />
              </div>
            )}
          </div>

          <Divider label="Content Volume" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">Target session length per lesson.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[
              { value: "mini", title: "Mini", meta: "≤ 30 min", description: "Short session, 1–2 topics." },
              { value: "single", title: "Standard", meta: "≤ 60 min", description: "Normal lesson, balanced." },
              { value: "double", title: "Extended", meta: "≤ 120 min", description: "Double-length with practice." },
              { value: "triple", title: "Intensive", meta: "≤ 180 min", description: "Long block, deeper coverage." },
              { value: "fullday", title: "Full Day", meta: "≤ 240 min", description: "Workshop-style." },
              { value: "marathon", title: "Marathon", meta: "> 240 min", description: "Full immersion sessions." },
            ].map((opt) => (
              <RadioCard key={opt.value} name="content-volume" {...opt} checked={contentVolume === opt.value} onChange={setContentVolume} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Topics / lesson", value: topics, set: setTopics, min: 1, max: 10 },
              { label: "Objectives / topic", value: objectives, set: setObjectives, min: 1, max: objectiveInputMax },
              { label: "Tasks / objective", value: tasks, set: setTasks, min: MIN_TASKS_PER_OBJECTIVE, max: 5 },
            ].map(({ label, value, set, min, max }) => (
              <div key={label}>
                <FieldLabel>{label}</FieldLabel>
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => set(Math.min(max, Math.max(min, Number(e.target.value))))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                />
              </div>
            ))}
          </div>

          <Divider label="Curriculum Sequencing" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">How topics progress through the course.</p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { value: "linear", title: "Linear", description: "Topics progress sequentially, each building on the last." },
              { value: "spiral", title: "Spiral", description: "Topics revisited with increasing depth and complexity." },
              { value: "thematic", title: "Thematic", description: "Topics organized around themes or projects." },
            ].map((opt) => (
              <RadioCard key={opt.value} name="sequencing-mode" {...opt} checked={sequencingMode === opt.value} onChange={setSequencingMode} />
            ))}
          </div>

          <Divider label="Course Type" />
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "minimalist", title: "Minimalist", description: "Core instructional templates only." },
              { value: "essential", title: "Essential", description: "Plus evaluation and certification." },
              { value: "complete", title: "Complete", description: "Every available template included." },
              { value: "custom", title: "Custom", description: "Manually select any combination." },
            ].map((opt) => (
              <RadioCard
                key={opt.value}
                name="course-type"
                value={opt.value}
                title={opt.title}
                description={opt.description}
                meta={`${templateCountByCourseType(opt.value as CourseType)} templates`}
                checked={courseType === opt.value}
                onChange={setCourseType}
                compact
              />
            ))}
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Templates in {selectedCourseType}
            </p>
            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No matching templates created yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filteredTemplates.map((template) => (
                  <span key={template.id} className="rounded border border-border bg-muted/30 px-2 py-0.5 text-xs text-foreground">
                    {template.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Select as default</FieldLabel>
              <select
                value={templateDefaultType}
                onChange={(e) => setTemplateDefaultType(e.target.value as TemplateType)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
              >
                {defaultTemplateOptions.map((type) => (
                  <option key={type} value={type}>{templateTypeLabel(type)}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Include certificate</FieldLabel>
              <select
                value={certificateMode}
                onChange={(e) => setCertificateMode(e.target.value as CertificateMode)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
              >
                <option value="end-module">At the end of each module</option>
                <option value="end-course">At the end of the course</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>

          <Divider label="Naming Conventions" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">How generated content items should be named.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { key: "lessonTitleRule" as const, label: "Lesson Titles" },
              { key: "topicRule" as const, label: "Topics" },
              { key: "objectiveRule" as const, label: "Objectives" },
              { key: "taskRule" as const, label: "Tasks" },
            ] as const).map(({ key, label }) => (
              <div key={key}>
                <FieldLabel>{label}</FieldLabel>
                <select
                  value={namingRules[key]}
                  onChange={(e) => setNamingRules((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                >
                  <option value="">No specific rule</option>
                  <option value="gerund">Start with a gerund (Exploring, Understanding…)</option>
                  <option value="verb">Start with an action verb (Analyze, Compare…)</option>
                  <option value="noun">Start with a noun phrase (Introduction to…)</option>
                  <option value="blooms">Bloom&apos;s taxonomy verb (Identify, Apply, Evaluate…)</option>
                  <option value="question">Question format (What is…? How does…?)</option>
                </select>
              </div>
            ))}
          </div>

          <Divider label="Generation" />
          <p className="-mt-2 text-sm text-muted-foreground">
            Generation uses your full setup data (essentials, classification, pedagogy, students,
            schedule, templates, and curriculum structure). It improves accuracy and reduces
            rework, but it may take longer for larger courses.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                ollamaHealthy === null
                  ? "border-border bg-muted/40 text-muted-foreground"
                  : ollamaHealthy
                    ? "border-emerald-300/70 bg-emerald-100/60 text-emerald-800 dark:border-emerald-600/50 dark:bg-emerald-900/30 dark:text-emerald-200"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {ollamaHealthy === null ? "Checking Ollama…" : ollamaHealthy ? "Ollama Connected" : "Ollama Disconnected"}
            </span>
            {ollamaHealthy !== null && (
              <span className="rounded-md border border-border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                Running: {runningModels.length > 0 ? runningModels.join(", ") : "none"}
              </span>
            )}
            {highLoadModelActive && (
              <span className="rounded-md border border-amber-300/70 bg-amber-100/70 px-2 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-600/50 dark:bg-amber-900/30 dark:text-amber-200">
                High-load model active
              </span>
            )}
          </div>

          {!isGenerationReady && (
            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-3 dark:bg-amber-950/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Generation is locked until setup is complete.</p>
              <ul className="mt-1 space-y-1">
                {readinessIssues.map((issue) => (
                  <li key={issue} className="text-xs text-amber-700/90 dark:text-amber-300/90">• {issue}</li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missing.essentials && (
                  <button type="button" onClick={() => goToSection("essentials")} className={PRIMARY_ACTION_BUTTON_CLASS}>Go to Essentials</button>
                )}
                {missing.schedule && (
                  <button type="button" onClick={() => goToSection("schedule")} className={SECONDARY_ACTION_BUTTON_CLASS}>Go to Schedule</button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {actionButtons.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => runGeneration(action.key)}
                disabled={!isGenerationReady || isGenerating || ollamaHealthy === false || generationCooldownLeft > 0}
                className={`group flex h-full flex-col gap-1 rounded-md border px-3 py-2.5 text-left transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.primary
                    ? "border-primary/40 bg-accent/70 text-foreground backdrop-blur-sm sm:col-span-2 hover:bg-accent/80"
                    : "border-border/80 bg-background/60 text-foreground backdrop-blur-sm hover:border-primary/30 hover:bg-background/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{action.label}</span>
                  <span className="text-[11px] opacity-70">{estimateForAction(action.key)}</span>
                </div>
                <span className="text-xs opacity-70">{action.description}</span>
              </button>
            ))}
          </div>

          {generationCooldownLeft > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Cooldown active: {generationCooldownLeft}s remaining before the next generation run.
            </p>
          )}

          {isGenerating && (
            <button
              type="button"
              onClick={cancelGeneration}
              className={`mt-3 ${SECONDARY_ACTION_BUTTON_CLASS}`}
            >
              Cancel Running Generation{activeGenerationAction ? ` (${actionButtons.find((a) => a.key === activeGenerationAction)?.label ?? "Current Action"})` : ""}
            </button>
          )}

          <button
            type="button"
            onClick={clearAllGenerated}
            disabled={isGenerating}
            className={`mt-3 ${DANGER_ACTION_BUTTON_CLASS}`}
          >
            Delete All Generated Content
          </button>

          {runStatus && (
            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground">{runStatus}</p>
                <p className="text-[11px] font-semibold text-muted-foreground">{runProgress}%</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${runProgress}%` }} />
              </div>
            </div>
          )}
        </SetupColumn>

        <SetupColumn>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {modeButtons.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setPreviewMode(mode.key)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium backdrop-blur-sm transition ${
                  previewMode === mode.key
                    ? "border-primary/50 bg-accent/70 text-primary"
                    : "border-border/80 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="max-h-[780px] min-h-[420px] overflow-y-auto rounded-xl border border-border bg-background p-2.5">
            {previewMode === "modules" &&
              <div className="space-y-3">
                {modulesForPreview.map((module) => {
                  const lessonsInModule = lessonRowsForPreview.slice(module.lessonStart - 1, module.lessonEnd)
                  return (
                    <div key={module.title} className="rounded-md border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Module {module.index + 1}</span>
                        <span className="text-xs text-muted-foreground">{lessonsInModule.length} lessons</span>
                      </div>
                      <input
                        type="text"
                        value={module.title}
                        onChange={(e) => {
                          setModuleNames((prev) => {
                            const updated = [...prev]
                            updated[module.index] = e.target.value
                            return updated
                          })
                        }}
                        className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        placeholder={`Module ${module.index + 1}`}
                      />
                      <div className="space-y-1.5 rounded-md border border-border/50 bg-background p-2">
                        {lessonsInModule.map((row, lessonIndex) => (
                          <div key={row.id} className="border-l-2 border-primary/30 pl-2.5 py-1 text-sm text-muted-foreground">
                            <span className="font-semibold">L{module.lessonStart + lessonIndex}:</span> {row.title || "Untitled"}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            }

            {previewMode === "lessons" &&
              <div className="space-y-2.5">
                {lessonRowsForPreview.map((row, index) => {
                  const schedule = scheduleEntries[index]
                  return (
                    <div key={row.id} className="rounded-md border border-border bg-card p-3">
                      <div className="mb-2 flex items-end justify-between gap-2">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Lesson {index + 1}
                          {schedule && ` · ${schedule.day}`}
                        </label>
                        <div className="grid w-[360px] grid-cols-2 gap-2">
                          <select
                            value={row.template_type ?? templateDefaultType}
                            onChange={(e) => {
                              const nextType = e.target.value as TemplateType
                              const firstMatchingTemplate = filteredTemplates.find((template) => template.type === nextType)
                              upsertSessionRow(index, {
                                template_type: nextType,
                                template_id: firstMatchingTemplate?.id,
                              })
                            }}
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                          >
                            {lessonTemplateOptions.map((type) => (
                              <option key={`${row.id}-${type}`} value={type}>{templateTypeLabel(type)}</option>
                            ))}
                          </select>
                          <select
                            value={row.template_id ?? ""}
                            onChange={(e) => {
                              const nextTemplateId = e.target.value || undefined
                              const matchedTemplate = filteredTemplates.find((template) => template.id === nextTemplateId)
                              upsertSessionRow(index, {
                                template_id: nextTemplateId,
                                template_type: (matchedTemplate?.type as TemplateType | undefined) ?? row.template_type,
                              })
                            }}
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                          >
                            <option value="">Template auto</option>
                            {filteredTemplates
                              .filter((template) => template.type === (row.template_type ?? templateDefaultType))
                              .map((template) => (
                                <option key={`${row.id}-${template.id}`} value={template.id}>{template.name}</option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => upsertSessionRow(index, { title: e.target.value })}
                        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        placeholder={`Lesson ${index + 1}`}
                      />
                    </div>
                  )
                })}
              </div>
            }

            {previewMode === "topics" && (
              <div className="space-y-3">
                {lessonRowsForPreview.map((row, index) => (
                  <div key={row.id} className="rounded-md border border-border bg-card p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">L{index + 1}: {row.title}</h4>
                      <span className="text-xs text-muted-foreground">{row.topics ?? topics} topics</span>
                    </div>
                    <div className="space-y-2.5">
                      {Array.from({ length: row.topics ?? topics }, (_, topicIdx) => (
                        <div key={`${row.id}-topic-${topicIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{topicIdx + 1}</label>
                          <input
                            type="text"
                            value={row.topic_names?.[topicIdx] || ""}
                            onChange={(e) => {
                              setSessionRows((prev) =>
                                prev.map((current, currentIndex) =>
                                  currentIndex === index
                                    ? {
                                        ...current,
                                        topic_names: [
                                          ...(current.topic_names?.slice(0, topicIdx) || []),
                                          e.target.value,
                                          ...(current.topic_names?.slice(topicIdx + 1) || []),
                                        ],
                                      }
                                    : current,
                                ),
                              )
                            }}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previewMode === "objectives" && (
              <div className="space-y-3">
                {lessonRowsForPreview.map((row, index) => (
                  <div key={row.id} className="rounded-md border border-border bg-card p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">L{index + 1}: {row.title}</h4>
                      <span className="text-xs text-muted-foreground">{row.objectives ?? objectives} objectives</span>
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: row.topics ?? topics }, (_, topicIdx) => (
                        <div key={`${row.id}-topic-${topicIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                          <h5 className="mb-2 text-xs font-semibold text-muted-foreground">{topicIdx + 1}</h5>
                          <div className="ml-1.5 space-y-2">
                            {Array.from({ length: row.objectives ?? objectives }, (_, objIdx) => (
                              <div key={`${row.id}-topic-${topicIdx}-obj-${objIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{objIdx + 1}</label>
                                <input
                                  type="text"
                                  value={row.objective_names?.[objIdx] || ""}
                                  onChange={(e) => {
                                    setSessionRows((prev) =>
                                      prev.map((current, currentIndex) =>
                                        currentIndex === index
                                          ? {
                                              ...current,
                                              objective_names: [
                                                ...(current.objective_names?.slice(0, objIdx) || []),
                                                e.target.value,
                                                ...(current.objective_names?.slice(objIdx + 1) || []),
                                              ],
                                            }
                                          : current,
                                      ),
                                    )
                                  }}
                                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previewMode === "tasks" && (
              <div className="space-y-3">
                {lessonRowsForPreview.map((row, index) => (
                  <div key={row.id} className="rounded-md border border-border bg-card p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-foreground">L{index + 1}: {row.title}</h4>
                      <span className="text-xs text-muted-foreground">{row.tasks ?? tasks} tasks</span>
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: row.topics ?? topics }, (_, topicIdx) => (
                        <div key={`${row.id}-topic-${topicIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                          <h5 className="mb-2 text-xs font-semibold text-muted-foreground">{topicIdx + 1}</h5>
                          <div className="ml-1.5 space-y-2.5">
                            {Array.from({ length: row.objectives ?? objectives }, (_, objIdx) => (
                              <div key={`${row.id}-topic-${topicIdx}-obj-${objIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">{objIdx + 1}</p>
                                <div className="ml-1.5 space-y-1.5">
                                  {Array.from({ length: row.tasks ?? tasks }, (_, taskIdx) => (
                                    <div key={`${row.id}-task-${objIdx}-${taskIdx}`} className="rounded-md border border-border/50 bg-background p-1.5">
                                      <label className="mb-1 block text-xs font-medium text-muted-foreground">{taskIdx + 1}</label>
                                      <input
                                        type="text"
                                        value={row.task_names?.[taskIdx] || ""}
                                        onChange={(e) => {
                                          setSessionRows((prev) =>
                                            prev.map((current, currentIndex) =>
                                              currentIndex === index
                                                ? {
                                                    ...current,
                                                    task_names: [
                                                      ...(current.task_names?.slice(0, taskIdx) || []),
                                                      e.target.value,
                                                      ...(current.task_names?.slice(taskIdx + 1) || []),
                                                    ],
                                                  }
                                                : current,
                                            ),
                                          )
                                        }}
                                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {previewMode === "all" && (
              <div className="space-y-4">
                {modulesForPreview.map((module) => {
                  const lessonsInModule = lessonRowsForPreview.slice(module.lessonStart - 1, module.lessonEnd)
                  return (
                    <div key={module.title} className="rounded-md border border-border bg-card p-3.5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="text-base font-bold text-foreground">{module.title}</h2>
                        <span className="text-xs text-muted-foreground">{lessonsInModule.length} lessons</span>
                      </div>
                      <div className="space-y-3">
                        {lessonsInModule.map((row, lessonIdx) => {
                          const lessonIndex = module.lessonStart - 1 + lessonIdx
                          return (
                            <div key={row.id} className="rounded-md border border-border/50 bg-background p-2.5">
                              <input
                                type="text"
                                value={row.title}
                                onChange={(e) =>
                                  setSessionRows((prev) =>
                                    prev.map((current, currentIndex) =>
                                      currentIndex === lessonIndex ? { ...current, title: e.target.value } : current,
                                    ),
                                  )
                                }
                                className="mb-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                              />
                              <div className="space-y-2.5">
                                {Array.from({ length: row.topics ?? topics }, (_, topicIdx) => (
                                  <div key={`${row.id}-topic-${topicIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                                    <div className="mb-2 flex items-center gap-2">
                                      <label className="min-w-fit text-xs font-semibold text-muted-foreground">{topicIdx + 1}</label>
                                      <input
                                        type="text"
                                        value={row.topic_names?.[topicIdx] || ""}
                                        onChange={(e) => {
                                          setSessionRows((prev) =>
                                            prev.map((current, currentIndex) =>
                                              currentIndex === lessonIndex
                                                ? {
                                                    ...current,
                                                    topic_names: [
                                                      ...(current.topic_names?.slice(0, topicIdx) || []),
                                                      e.target.value,
                                                      ...(current.topic_names?.slice(topicIdx + 1) || []),
                                                    ],
                                                  }
                                                : current,
                                            ),
                                          )
                                        }}
                                        className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                      />
                                    </div>
                                    <div className="ml-1.5 space-y-2">
                                      {Array.from({ length: row.objectives ?? objectives }, (_, objIdx) => (
                                        <div key={`${row.id}-topic-${topicIdx}-obj-${objIdx}`} className="rounded-md border border-border/50 bg-background p-2">
                                          <div className="mb-2 flex items-center gap-2">
                                            <label className="min-w-fit text-xs font-medium text-muted-foreground">{objIdx + 1}</label>
                                            <input
                                              type="text"
                                              value={row.objective_names?.[objIdx] || ""}
                                              onChange={(e) => {
                                                setSessionRows((prev) =>
                                                  prev.map((current, currentIndex) =>
                                                    currentIndex === lessonIndex
                                                      ? {
                                                          ...current,
                                                          objective_names: [
                                                            ...(current.objective_names?.slice(0, objIdx) || []),
                                                            e.target.value,
                                                            ...(current.objective_names?.slice(objIdx + 1) || []),
                                                          ],
                                                        }
                                                      : current,
                                                  ),
                                                )
                                              }}
                                              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                            />
                                          </div>
                                          <div className="ml-1.5 space-y-1.5">
                                            {Array.from({ length: row.tasks ?? tasks }, (_, taskIdx) => (
                                              <div key={`${row.id}-task-${objIdx}-${taskIdx}`} className="flex items-center gap-2">
                                                <label className="min-w-fit text-[11px] text-muted-foreground">{taskIdx + 1}</label>
                                                <input
                                                  type="text"
                                                  value={row.task_names?.[taskIdx] || ""}
                                                  onChange={(e) => {
                                                    setSessionRows((prev) =>
                                                      prev.map((current, currentIndex) =>
                                                        currentIndex === lessonIndex
                                                          ? {
                                                              ...current,
                                                              task_names: [
                                                                ...(current.task_names?.slice(0, taskIdx) || []),
                                                                e.target.value,
                                                                ...(current.task_names?.slice(taskIdx + 1) || []),
                                                              ],
                                                            }
                                                          : current,
                                                      ),
                                                    )
                                                  }}
                                                  className="flex-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {lastAction && (
              <p className="pt-2 text-xs text-muted-foreground">
                Last action: {actionButtons.find((a) => a.key === lastAction)?.label}
              </p>
            )}
          </div>
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}
