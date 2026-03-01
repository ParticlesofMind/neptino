"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SetupPanelLayout, SetupSection } from "@/components/coursebuilder"
import { buildDefaultResourcePreferences, type ResourcePreference } from "@/lib/curriculum/resources"
import { getObjectiveCapForDuration, listDurationPresets, normalizeContentLoadConfig } from "@/lib/curriculum/content-load-service"
import type { GenerationAction, ClassificationContext, PedagogyContext, NamingRules, StudentsContext } from "@/lib/curriculum/ai-generation-service"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import {
  buildCertificateLessonIndexes,
  buildModulesForPreview,
  deriveTemplateOptions,
  type CertificateMode,
  type CourseType,
} from "./curriculum-derived"
import {
  CONTENT_VOLUME_DURATION_MAP,
  COURSE_TYPE_TEMPLATE_FILTERS,
  TEMPLATE_TYPE_OPTIONS,
  type CurriculumSessionRow,
  type PreviewMode,
  type SavedTemplateSummary,
  type ScheduleGeneratedEntry,
} from "./curriculum-section-utils"
import { useCurriculumLoader } from "./use-curriculum-loader"
import { useCurriculumSessionRows } from "./use-curriculum-session-rows"
import { useCurriculumPersistence } from "./use-curriculum-persistence"
import { useCurriculumGeneration } from "./use-curriculum-generation"
import { CurriculumStructurePanel } from "./curriculum-structure-panel"
import { CurriculumPreviewPanel } from "./curriculum-preview-panel"

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
  const [courseLanguage, setCourseLanguage] = useState("")
  const [studentsData, setStudentsData] = useState<StudentsContext | null>(null)
  const [selectedLLMModel, setSelectedLLMModel] = useState<string | null>(null)
  const [resourcePreferences, setResourcePreferences] = useState<ResourcePreference[]>(() => buildDefaultResourcePreferences())
  const [optCtx, setOptCtx] = useState({ schedule: true, structure: true, existing: false })
  const [previewMode, setPreviewMode] = useState<PreviewMode>("modules")
  const [lastAction, setLastAction] = useState<GenerationAction | null>(null)
  const [readinessIssues, setReadinessIssues] = useState<string[]>([])
  const [missing, setMissing] = useState({ essentials: false, schedule: false, curriculum: false })
  const generationSettingsRef = useRef<Record<string, unknown> | null>(null)

  useCurriculumLoader(courseId, {
    setCourseInfo, setCourseGoalsList, setSelectedLLMModel, setResourcePreferences,
    setCourseLanguage, setClassificationData, setKeyTerms, setMandatoryTopics,
    setPriorKnowledge, setApplicationContext, setPedagogyData, setStudentsData,
    setOptCtx, setPreviewMode, setLastAction,
    setModuleOrg, setContentVolume, setCourseType, setSequencingMode, setNamingRules,
    setTemplateDefaultType, setCertificateMode, setLessonCount, setModuleCount,
    setTopics, setObjectives, setTasks, setModuleNames, setScheduleEntries,
    setSessionRows, setSavedTemplates, setReadinessIssues, setMissing,
    generationSettingsRef,
  })

  // Sync topics/objectives/tasks when content volume preset changes.
  useEffect(() => {
    const preset = listDurationPresets().find((p) => p.name === contentVolume)
    if (preset) {
      const norm = normalizeContentLoadConfig(preset.config, preset.maxDuration)
      setTopics(norm.topicsPerLesson)
      setObjectives(norm.objectivesPerTopic)
      setTasks(norm.tasksPerObjective)
    }
  }, [contentVolume])

  // Keep module name array in sync with module count.
  useEffect(() => {
    const count = moduleOrg === "linear" ? 1 : moduleCount
    setModuleNames((prev) => {
      const next = Array.from({ length: count }, (_, i) => prev[i] || `Module ${i + 1}`)
      return prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next
    })
  }, [moduleOrg, moduleCount])

  const hasGeneratedSchedule = scheduleEntries.length > 0
  const effectiveLessonCount = hasGeneratedSchedule ? scheduleEntries.length : lessonCount
  const selectedCourseType = courseType as CourseType

  const objectiveInputMax = useMemo(
    () => getObjectiveCapForDuration(CONTENT_VOLUME_DURATION_MAP[contentVolume] ?? null),
    [contentVolume],
  )

  const { filteredTemplates, defaultTemplateOptions, lessonTemplateOptions } = useMemo(
    () => deriveTemplateOptions({ savedTemplates, selectedCourseType, certificateMode, courseTypeTemplateFilters: COURSE_TYPE_TEMPLATE_FILTERS }),
    [savedTemplates, selectedCourseType, certificateMode],
  )

  useEffect(() => {
    if (!defaultTemplateOptions.includes(templateDefaultType)) {
      setTemplateDefaultType(defaultTemplateOptions.includes("lesson") ? "lesson" : defaultTemplateOptions[0])
    }
  }, [defaultTemplateOptions, templateDefaultType])

  const certificateLessonIndexes = useMemo(
    () => buildCertificateLessonIndexes({ certificateMode, effectiveLessonCount, moduleOrg, moduleCount }),
    [certificateMode, effectiveLessonCount, moduleOrg, moduleCount],
  )

  const modulesForPreview = useMemo(
    () => buildModulesForPreview({ moduleOrg, moduleCount, moduleNames, effectiveLessonCount }),
    [moduleOrg, moduleCount, moduleNames, effectiveLessonCount],
  )

  const templateTypeLabel = useCallback(
    (type: TemplateType) =>
      TEMPLATE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? `${type.charAt(0).toUpperCase()}${type.slice(1)}`,
    [],
  )

  const templateCountByCourseType = useCallback(
    (type: CourseType) => {
      const allowed = COURSE_TYPE_TEMPLATE_FILTERS[type]
      return allowed.length === 0 ? savedTemplates.length : savedTemplates.filter((t) => allowed.includes(t.type)).length
    },
    [savedTemplates],
  )

  const { resolveTemplateTypeForLesson, lessonRowsForPreview, upsertSessionRow } = useCurriculumSessionRows({
    sessionRows, setSessionRows, effectiveLessonCount, scheduleEntries,
    topics, objectives, tasks, certificateLessonIndexes, templateDefaultType,
  })

  useCurriculumPersistence({
    courseId, moduleOrg, contentVolume, courseType, templateDefaultType, certificateMode,
    effectiveLessonCount, moduleCount, moduleNames, topics, objectives, tasks,
    sequencingMode, namingRules, sessionRows, scheduleEntries, resolveTemplateTypeForLesson,
    optCtx, previewMode, lastAction, generationSettingsRef,
  })

  const generation = useCurriculumGeneration({
    courseId, courseInfo, scheduleEntries, moduleOrg, moduleCount, effectiveLessonCount,
    topics, objectives, tasks, sessionRows, moduleNames, optCtx,
    isGenerationReady: readinessIssues.length === 0,
    classificationData, pedagogyData, courseGoalsList, keyTerms, mandatoryTopics,
    priorKnowledge, applicationContext, resourcePreferences, sequencingMode,
    namingRules, courseLanguage, studentsData, selectedLLMModel,
    setModuleNames, setSessionRows, setLastAction,
  })

  const goToSection = (sectionId: "essentials" | "schedule" | "curriculum") => {
    window.dispatchEvent(new CustomEvent("coursebuilder:navigate-section", { detail: { sectionId } }))
  }

  return (
    <SetupSection title="Curriculum" description="Structure, generation, and preview of your course curriculum.">
      <SetupPanelLayout>
        <CurriculumStructurePanel
          moduleOrg={moduleOrg} setModuleOrg={setModuleOrg}
          effectiveLessonCount={effectiveLessonCount} lessonCount={lessonCount} setLessonCount={setLessonCount}
          hasGeneratedSchedule={hasGeneratedSchedule} moduleCount={moduleCount} setModuleCount={setModuleCount}
          contentVolume={contentVolume} setContentVolume={setContentVolume}
          topics={topics} setTopics={setTopics} objectives={objectives} setObjectives={setObjectives}
          objectiveInputMax={objectiveInputMax} tasks={tasks} setTasks={setTasks}
          sequencingMode={sequencingMode} setSequencingMode={setSequencingMode}
          courseType={courseType} setCourseType={setCourseType}
          filteredTemplates={filteredTemplates} templateDefaultType={templateDefaultType}
          setTemplateDefaultType={setTemplateDefaultType} defaultTemplateOptions={defaultTemplateOptions}
          templateTypeLabel={templateTypeLabel} certificateMode={certificateMode} setCertificateMode={setCertificateMode}
          namingRules={namingRules} setNamingRules={setNamingRules}
          templateCountByCourseType={templateCountByCourseType}
          ollamaHealthy={generation.ollamaHealthy} runningModels={generation.runningModels}
          highLoadModelActive={generation.highLoadModelActive}
          isGenerationReady={readinessIssues.length === 0} readinessIssues={readinessIssues} missing={missing}
          goToSection={goToSection}
          isGenerating={generation.isGenerating} generationCooldownLeft={generation.generationCooldownLeft}
          estimateForAction={generation.estimateForAction} runGeneration={generation.runGeneration}
          cancelGeneration={generation.cancelGeneration} activeGenerationAction={generation.activeGenerationAction}
          clearAllGenerated={generation.clearAllGenerated}
          runStatus={generation.runStatus} runProgress={generation.runProgress}
        />
        <CurriculumPreviewPanel
          previewMode={previewMode} setPreviewMode={setPreviewMode}
          modulesForPreview={modulesForPreview} lessonRowsForPreview={lessonRowsForPreview}
          scheduleEntries={scheduleEntries} moduleNames={moduleNames} setModuleNames={setModuleNames}
          filteredTemplates={filteredTemplates} templateDefaultType={templateDefaultType}
          lessonTemplateOptions={lessonTemplateOptions} templateTypeLabel={templateTypeLabel}
          topics={topics} objectives={objectives} tasks={tasks}
          upsertSessionRow={upsertSessionRow} setSessionRows={setSessionRows} lastAction={lastAction}
        />
      </SetupPanelLayout>
    </SetupSection>
  )
}
