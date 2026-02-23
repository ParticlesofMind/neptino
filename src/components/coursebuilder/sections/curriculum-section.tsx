"use client"

import { useCallback, useEffect, useState } from "react"
import { PRIMARY_ACTION_BUTTON_CLASS, SetupColumn, SetupPanelLayout, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"
import { buildGenerationContext, callGenerationAPI } from "@/lib/curriculum/ai-generation-service"
import type { GenerationExtras, ClassificationContext, PedagogyContext, NamingRules, StudentsContext } from "@/lib/curriculum/ai-generation-service"
import { getPedagogyApproach } from "@/components/coursebuilder/sections/pedagogy-section"
import {
  calculateSessionDuration,
  getContentLoadConfig,
  listDurationPresets,
} from "@/lib/curriculum/content-load-service"
import type { CurriculumCompetency } from "@/lib/curriculum/competency-types"
import type { TemplateDesignConfig, TemplateType } from "@/lib/curriculum/template-blocks"
import { createDefaultTemplateDesign } from "@/lib/curriculum/template-blocks"

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

type CourseType = "minimalist" | "essential" | "complete" | "custom"
type CertificateMode = "end-module" | "end-course" | "never"

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
  const settings = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
  const templates = Array.isArray(settings?.templates)
    ? (settings?.templates as Array<Record<string, unknown>>)
    : Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : []

  return templates.map((template, index) => ({
    id: String(template.id ?? `tpl-${index + 1}`),
    name: String(template.name ?? `Template ${index + 1}`),
    type: String(template.type ?? "lesson"),
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

const TEMPLATE_TYPE_COLORS: Record<TemplateType, { border: string; bg: string; text: string; badge: string }> = {
  assessment: {
    border: "border-teal-500",
    bg: "bg-teal-50",
    text: "text-teal-700",
    badge: "bg-teal-100 text-teal-800",
  },
  quiz: {
    border: "border-violet-500",
    bg: "bg-violet-50",
    text: "text-violet-700",
    badge: "bg-violet-100 text-violet-800",
  },
  exam: {
    border: "border-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-800",
  },
  lesson: {
    border: "border-sky-500",
    bg: "bg-sky-50",
    text: "text-sky-700",
    badge: "bg-sky-100 text-sky-800",
  },
  certificate: {
    border: "border-yellow-500",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-800",
  },
}

function getTemplateTypeColor(templateType?: TemplateType) {
  return TEMPLATE_TYPE_COLORS[templateType ?? "lesson"]
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
      const topicCount = (r.topics as number) || 0
      const objectiveCount = (r.objectives as number) || 0
      const taskCount = (r.tasks as number) || 0
      return {
        id: (r.id as string) || createRowId(),
        schedule_entry_id: (r.schedule_entry_id as string) || "",
        session_number: (r.session_number as number) || index + 1,
        title: (r.title as string) || `Session ${index + 1}`,
        notes: (r.notes as string) || "",
        template_type: templateType,
        duration_minutes: (r.duration_minutes as number) || undefined,
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

    // Determine template type
    const templateType = (base?.template_type || "lesson") as TemplateType

    return {
      id: base?.id || createRowId(),
      schedule_entry_id: entry.id,
      session_number: index + 1,
      title: base?.title || `Session ${index + 1}`,
      notes: base?.notes || "",
      template_type: templateType,
      duration_minutes: base?.duration_minutes ?? durationMinutes ?? undefined,
      topics: base?.topics ?? contentLoadConfig?.topicsPerLesson,
      objectives: base?.objectives ?? contentLoadConfig?.objectivesPerTopic,
      tasks: base?.tasks ?? contentLoadConfig?.tasksPerObjective,
      competencies: base?.competencies,
      template_design: base?.template_design || createDefaultTemplateDesign(templateType),
    }
  })
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{label}</p>
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
  const [resourceConstraints, setResourceConstraints] = useState("")
  const [courseLanguage, setCourseLanguage] = useState("")
  const [studentsData, setStudentsData] = useState<StudentsContext | null>(null)
  const [optCtx, setOptCtx] = useState({ schedule: true, structure: true, existing: false })
  const [previewMode, setPreviewMode] = useState<PreviewMode>("modules")
  const [lastAction, setLastAction] = useState<GenerationAction | null>(null)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runProgress, setRunProgress] = useState(0)
  const [readinessIssues, setReadinessIssues] = useState<string[]>([])
  const [missing, setMissing] = useState<{ essentials: boolean; schedule: boolean; curriculum: boolean }>({
    essentials: false,
    schedule: false,
    curriculum: false,
  })

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("course_name, course_description, course_language, curriculum_data, schedule_settings, generation_settings, template_settings, classification_data, course_layout, students_overview")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const c = (data.curriculum_data as Record<string, unknown>) ?? {}
          const s = (data.schedule_settings as Record<string, unknown>) ?? {}
          const gs = (data.generation_settings as Record<string, unknown> | null) ?? {}
          const aiSettings = (gs.ai_generation as Record<string, unknown> | undefined) ?? gs
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
          if (typeof layout.resource_constraints === "string") setResourceConstraints(layout.resource_constraints)

          // Load students overview for generation context
          const so = (data.students_overview as Record<string, unknown>) ?? {}
          const totalStudents = typeof so.total === "number" ? so.total : (Array.isArray(so.students) ? (so.students as unknown[]).length : 0)
          if (totalStudents > 0) {
            setStudentsData({ totalStudents, method: (so.method as string) ?? "unknown" })
          }

          const optional = aiSettings.optional_context as Record<string, boolean> | undefined
          if (optional) {
            setOptCtx({
              schedule: optional.schedule ?? true,
              structure: optional.structure ?? true,
              existing: optional.existing ?? false,
            })
          }
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
          setTopics((c.topics as number) ?? 2)
          setObjectives((c.objectives as number) ?? 2)
          setTasks((c.tasks as number) ?? 2)
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
      })
  }, [courseId])

  // Hook up contentVolume to auto-update topics/objectives/tasks
  useEffect(() => {
    const presets = listDurationPresets()
    const preset = presets.find((p) => p.name === contentVolume)
    if (preset) {
      setTopics(preset.config.topicsPerLesson)
      setObjectives(preset.config.objectivesPerTopic)
      setTasks(preset.config.tasksPerObjective)
    }
  }, [contentVolume])

  // Initialize/update module names when module config changes
  useEffect(() => {
    const modulesCount = moduleOrg === "linear" ? 1 : moduleOrg === "equal" ? moduleCount : moduleCount
    const newNames = Array.from({ length: modulesCount }, (_, i) => moduleNames[i] || `Module ${i + 1}`)
    setModuleNames(newNames)
  }, [moduleOrg, moduleCount])

  const hasGeneratedSchedule = scheduleEntries.length > 0
  const effectiveLessonCount = hasGeneratedSchedule ? scheduleEntries.length : lessonCount
  const toggle = (key: keyof typeof optCtx) => setOptCtx((prev) => ({ ...prev, [key]: !prev[key] }))
  const selectedCourseType = (courseType as CourseType)
  const filteredTemplates = savedTemplates.filter((template) => {
    const allowed = COURSE_TYPE_TEMPLATE_FILTERS[selectedCourseType]
    return allowed.length === 0 || allowed.includes(template.type)
  })
  const availableTemplateTypes = Array.from(
    new Set(
      filteredTemplates
        .map((template) => template.type)
        .filter((type): type is TemplateType => TEMPLATE_TYPE_OPTIONS.some((option) => option.value === type as TemplateType)),
    ),
  )
  const defaultTemplateOptions: TemplateType[] = availableTemplateTypes.length > 0 ? availableTemplateTypes : ["lesson"]
  const lessonTemplateOptions: TemplateType[] = defaultTemplateOptions.includes("certificate") || certificateMode === "never"
    ? defaultTemplateOptions
    : [...defaultTemplateOptions, "certificate"]

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

  const certificateLessonIndexes = (() => {
    if (certificateMode === "never" || effectiveLessonCount < 1) return new Set<number>()
    if (certificateMode === "end-course") return new Set<number>([effectiveLessonCount - 1])

    const modules = Math.max(1, moduleOrg === "linear" ? 1 : moduleCount)
    const perModule = Math.ceil(effectiveLessonCount / modules)
    const indexes = new Set<number>()

    for (let moduleIndex = 0; moduleIndex < modules; moduleIndex += 1) {
      const moduleEnd = Math.min((moduleIndex + 1) * perModule, effectiveLessonCount)
      indexes.add(Math.max(0, moduleEnd - 1))
    }

    return indexes
  })()

  const resolveTemplateTypeForLesson = (row: Partial<CurriculumSessionRow> | undefined, index: number): TemplateType => {
    if (row?.template_type) return row.template_type
    if (certificateLessonIndexes.has(index)) return "certificate"
    return templateDefaultType
  }

  const handleSave = useCallback(async () => {
    if (!courseId) return
    const supabase = createClient()

    const serializedSessionRows = sessionRows.map((row, index) => ({
      id: row.id,
      schedule_entry_id: row.schedule_entry_id,
      session_number: index + 1,
      title: row.title,
      notes: row.notes,
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

    const { error } = await supabase
      .from("courses")
      .update({
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
      .eq("id", courseId)
    if (error) return
  }, [courseId, moduleOrg, contentVolume, courseType, templateDefaultType, certificateMode, effectiveLessonCount, moduleCount, moduleNames, topics, objectives, tasks, sequencingMode, namingRules, sessionRows, scheduleEntries, resolveTemplateTypeForLesson])

  const persistGenerationSettings = useCallback(async () => {
    if (!courseId) return
    const supabase = createClient()

    const { data: existing } = await supabase
      .from("courses")
      .select("generation_settings")
      .eq("id", courseId)
      .single()

    const existingSettings = (existing?.generation_settings as Record<string, unknown> | null) ?? {}
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

    const { error } = await supabase
      .from("courses")
      .update({ generation_settings: nextSettings, updated_at: new Date().toISOString() })
      .eq("id", courseId)
    if (error) return
  }, [courseId, optCtx, previewMode, lastAction, moduleOrg, moduleCount, moduleNames, effectiveLessonCount, topics, objectives, tasks, sessionRows])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))
  useDebouncedChangeSave(persistGenerationSettings, 600, Boolean(courseId))

  const isGenerationReady = readinessIssues.length === 0
  const goToSection = (sectionId: "essentials" | "schedule" | "curriculum") => {
    window.dispatchEvent(new CustomEvent("coursebuilder:navigate-section", { detail: { sectionId } }))
  }

  const clearAllGenerated = useCallback(async () => {
    if (!courseId) return
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
    const supabase = createClient()
    const { data: snap } = await supabase
      .from("courses")
      .select("curriculum_data")
      .eq("id", courseId)
      .single()

    const snapData = (snap?.curriculum_data as Record<string, unknown> | null) ?? {}
    const { error } = await supabase
      .from("courses")
      .update({
        curriculum_data: {
          ...snapData,
          module_names: blankModuleNames,
          session_rows: blankRows,
          generated_at: null,
          last_generation_action: null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)

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
  }, [courseId, sessionRows, moduleNames])

  const actionButtons: Array<{ key: GenerationAction; label: string; primary?: boolean }> = [
    { key: "all", label: "Generate All", primary: true },
    { key: "modules", label: "Generate Module Names" },
    { key: "lessons", label: "Generate Lesson Names" },
    { key: "topics", label: "Generate Topic Titles" },
    { key: "objectives", label: "Generate Objectives" },
    { key: "tasks", label: "Generate Tasks" },
  ]

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
      if (!isGenerationReady) {
        setRunProgress(0)
        setRunStatus("Generation is locked until required setup data is complete.")
        setTimeout(() => setRunStatus(null), 3000)
        return
      }

      setLastAction(action)
      setRunStatus("Building curriculum context…")
      setRunProgress(10)

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
          resourceConstraints: resourceConstraints || undefined,
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
        setRunStatus("Calling AI generation service…")
        setRunProgress(35)

        const response = await callGenerationAPI(context)
        setRunProgress(70)

        if (!response.success) {
          setRunStatus(`Generation failed: ${response.error || response.message}`)
          setTimeout(() => setRunStatus(null), 3000)
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
        const wipedModuleNames = (action === "all" || action === "modules")
          ? moduleNames.map((_, i) => `Module ${i + 1}`)
          : moduleNames

        // Flush the wipe to the database so a re-fetch never resurrects stale content
        {
          const supabase = createClient()
          const { data: snap } = await supabase
            .from("courses")
            .select("curriculum_data")
            .eq("id", courseId)
            .single()

          const snapData = (snap?.curriculum_data as Record<string, unknown> | null) ?? {}
          await supabase
            .from("courses")
            .update({
              curriculum_data: {
                ...snapData,
                module_names: wipedModuleNames,
                session_rows: wipedRows,
                wiped_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", courseId)
        }

        setModuleNames(wipedModuleNames)
        setSessionRows(wipedRows)
        setRunProgress(80)

        setRunStatus("Processing generated curriculum…")
        setRunProgress(85)
        await new Promise((resolve) => setTimeout(resolve, 300))

        if (response.content?.lessons) {
          const supabase = createClient()
          const { data: existing } = await supabase
            .from("courses")
            .select("curriculum_data")
            .eq("id", courseId)
            .single()

          const curriculumData = (existing?.curriculum_data as Record<string, unknown> | null) ?? {}
          const baseRows = wipedRows.length > 0
            ? wipedRows
            : (Array.isArray(curriculumData.session_rows) ? (curriculumData.session_rows as CurriculumSessionRow[]) : [])

          const generatedLessons = response.content.lessons
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
            const generatedLesson = response.content?.lessons?.[index]
            if (!generatedLesson) return row

            const updates: Partial<CurriculumSessionRow> = {}
            if (action === "all" || action === "lessons") updates.title = generatedLesson.lessonTitle
            if (action === "all" || action === "topics") {
              updates.topics = generatedLesson.topics?.length ?? row.topics
              updates.topic_names = generatedLesson.topics ?? []
            }
            if (action === "all" || action === "objectives") {
              updates.objectives = generatedLesson.objectives?.length ?? row.objectives
              updates.objective_names = generatedLesson.objectives ?? []
            }
            if (action === "all" || action === "tasks") {
              updates.tasks = generatedLesson.tasks?.length ?? row.tasks
              updates.task_names = generatedLesson.tasks ?? []
            }
            return { ...row, ...updates }
          })

          const generatedModuleNames = Array.isArray(response.content.modules)
            ? response.content.modules.sort((a, b) => a.moduleNumber - b.moduleNumber).map((module) => module.moduleTitle)
            : moduleNames

          const nextCurriculumData = {
            ...curriculumData,
            module_names: generatedModuleNames,
            session_rows: updatedSessionRows,
            generated_at: new Date().toISOString(),
            last_generation_action: action,
          }

          const { error } = await supabase
            .from("courses")
            .update({ curriculum_data: nextCurriculumData, updated_at: new Date().toISOString() })
            .eq("id", courseId)

          if (error) {
            setRunStatus(`Failed to save generated curriculum: ${error.message}`)
            setTimeout(() => setRunStatus(null), 3000)
            return
          }

          setSessionRows(updatedSessionRows)
          setModuleNames(generatedModuleNames)
        }

        setRunProgress(100)
        setRunStatus("Generation complete!")
        setTimeout(() => setRunStatus(null), 2000)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        setRunStatus(`Error: ${message}`)
        setTimeout(() => setRunStatus(null), 3000)
      }
    },
    [courseId, courseInfo, scheduleEntries, moduleOrg, moduleCount, effectiveLessonCount, topics, objectives, tasks, sessionRows, optCtx, isGenerationReady, moduleNames, classificationData, pedagogyData, courseGoalsList, keyTerms, mandatoryTopics, priorKnowledge, applicationContext, resourceConstraints, sequencingMode, namingRules, courseLanguage, studentsData],
  )

  const modulesForPreview = (() => {
    if (moduleOrg === "linear") {
      return [{ title: moduleNames[0] || "Module 1", lessonStart: 1, lessonEnd: effectiveLessonCount, index: 0 }]
    }
    const mods = Math.max(1, moduleCount)
    const perMod = Math.ceil(effectiveLessonCount / mods)
    return Array.from({ length: mods }, (_, mi) => {
      const from = mi * perMod + 1
      const to = Math.min((mi + 1) * perMod, effectiveLessonCount)
      return {
        title: moduleNames[mi] || `Module ${mi + 1}`,
        lessonStart: from,
        lessonEnd: Math.max(from, to),
        index: mi,
      }
    })
  })()

  const lessonRowsForPreview = Array.from({ length: effectiveLessonCount }, (_, index) => {
    const row = sessionRows[index]
    const rowTopics = Math.max(1, row?.topics ?? topics)
    const rowObjectives = Math.max(1, row?.objectives ?? objectives)
    const rowTasks = Math.max(1, row?.tasks ?? tasks)
    return {
      ...(row ?? {}),
      id: row?.id ?? `lesson-${index + 1}`,
      session_number: row?.session_number ?? index + 1,
      title: row?.title?.trim() || `Lesson ${index + 1}`,
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
                <RadioCard key={opt.value} name="module-org" {...opt} checked={moduleOrg === opt.value} onChange={setModuleOrg} />
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
              {hasGeneratedSchedule && (
                <p className="mt-1 text-xs text-muted-foreground">Synced from Schedule ({scheduleEntries.length} sessions).</p>
              )}
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
              { value: "fullday", title: "Full Day", meta: "> 180 min", description: "Workshop-style." },
            ].map((opt) => (
              <RadioCard key={opt.value} name="content-volume" {...opt} checked={contentVolume === opt.value} onChange={setContentVolume} />
            ))}
          </div>

          <Divider label="Content Density" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">Per-lesson detail level.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Topics / lesson", value: topics, set: setTopics, min: 1, max: 10 },
              { label: "Objectives / topic", value: objectives, set: setObjectives, min: 1, max: 5 },
              { label: "Tasks / objective", value: tasks, set: setTasks, min: 1, max: 5 },
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
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-foreground">Optional Context</h4>
            </div>
            <div className="space-y-2.5">
              {(
                [
                  { key: "schedule" as const, label: "Schedule Settings" },
                  { key: "structure" as const, label: "Content Structure" },
                  { key: "existing" as const, label: "Existing Curriculum Content" },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optCtx[key]}
                    onChange={() => toggle(key)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
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
                    <button type="button" onClick={() => goToSection("essentials")} className="rounded border border-amber-600/30 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/30">Go to Essentials</button>
                  )}
                  {missing.schedule && (
                    <button type="button" onClick={() => goToSection("schedule")} className="rounded border border-amber-600/30 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/30">Go to Schedule</button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {actionButtons.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => runGeneration(action.key)}
                  disabled={!isGenerationReady}
                  className={`${action.primary ? `${PRIMARY_ACTION_BUTTON_CLASS} sm:col-span-2` : "w-full rounded-md border border-border bg-background px-3 py-2.5 text-left text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"}`}
                >
                  {action.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={clearAllGenerated}
              className="mt-2 w-full rounded-md border border-red-300 bg-background px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-400 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:border-red-600 dark:hover:bg-red-950/30"
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
          </div>
        </SetupColumn>

        <SetupColumn>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {modeButtons.map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setPreviewMode(mode.key)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  previewMode === mode.key
                    ? "border-primary bg-accent text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
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
                        <div className="w-[180px]">
                          <select
                            value={row.template_type ?? templateDefaultType}
                            onChange={(e) => upsertSessionRow(index, { template_type: e.target.value as TemplateType })}
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                          >
                            {lessonTemplateOptions.map((type) => (
                              <option key={`${row.id}-${type}`} value={type}>{templateTypeLabel(type)}</option>
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
