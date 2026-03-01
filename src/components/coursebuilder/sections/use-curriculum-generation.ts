"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type React from "react"
import { selectCourseById, updateCourseById } from "@/components/coursebuilder"
import { getModelInfo } from "@/lib/ollama/models"
import type { ResourcePreference } from "@/lib/curriculum/resources"
import type {
  GenerationAction,
  ClassificationContext,
  PedagogyContext,
  NamingRules,
  StudentsContext,
} from "@/lib/curriculum/ai-generation-service"
import {
  formatEstimate,
  GENERATION_ACTION_CONFIG,
  type CurriculumSessionRow,
  type ScheduleGeneratedEntry,
} from "./curriculum-section-utils"
import { runGenerationAction, type GenerationRunnerParams } from "./curriculum-generation-runner"

const GENERATION_COOLDOWN_MS = 10_000
const ESTIMATE_STORAGE_KEY = "curriculum-generation-estimate-v1"

export interface CurriculumGenerationParams {
  courseId: string | null
  courseInfo: { name: string; description?: string; goals?: string } | null
  scheduleEntries: ScheduleGeneratedEntry[]
  moduleOrg: string
  moduleCount: number
  effectiveLessonCount: number
  topics: number
  objectives: number
  tasks: number
  sessionRows: CurriculumSessionRow[]
  moduleNames: string[]
  optCtx: { schedule: boolean; structure: boolean; existing: boolean }
  isGenerationReady: boolean
  classificationData: ClassificationContext | null
  pedagogyData: PedagogyContext | null
  courseGoalsList: string[]
  keyTerms: string[]
  mandatoryTopics: string[]
  priorKnowledge: string
  applicationContext: string
  resourcePreferences: ResourcePreference[]
  sequencingMode: string
  namingRules: NamingRules
  courseLanguage: string
  studentsData: StudentsContext | null
  selectedLLMModel: string | null
  setModuleNames: React.Dispatch<React.SetStateAction<string[]>>
  setSessionRows: React.Dispatch<React.SetStateAction<CurriculumSessionRow[]>>
  setLastAction: React.Dispatch<React.SetStateAction<GenerationAction | null>>
}

export function useCurriculumGeneration(params: CurriculumGenerationParams) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeGenerationAction, setActiveGenerationAction] = useState<GenerationAction | null>(null)
  const [generationCooldownUntil, setGenerationCooldownUntil] = useState<number | null>(null)
  const [generationCooldownLeft, setGenerationCooldownLeft] = useState(0)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runProgress, setRunProgress] = useState(0)
  const [ollamaHealthy, setOllamaHealthy] = useState<boolean | null>(null)
  const [runningModels, setRunningModels] = useState<string[]>([])
  const [highLoadModelActive, setHighLoadModelActive] = useState(false)
  const [avgMsPerUnitByAction, setAvgMsPerUnitByAction] = useState<Partial<Record<GenerationAction, number>>>({})
  const lockRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const res = await fetch("/api/ollama-health", { cache: "no-store" })
        const data = (await res.json()) as { healthy?: boolean; runningModels?: string[]; highLoad?: boolean }
        if (!active) return
        setOllamaHealthy(Boolean(data.healthy))
        setRunningModels(Array.isArray(data.runningModels) ? data.runningModels : [])
        setHighLoadModelActive(Boolean(data.highLoad))
      } catch {
        if (!active) return
        setOllamaHealthy(false)
        setRunningModels([])
        setHighLoadModelActive(false)
      }
    }
    void check()
    const interval = setInterval(() => { void check() }, 15000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  useEffect(() => {
    if (!generationCooldownUntil) { setGenerationCooldownLeft(0); return }
    const tick = () => {
      const remaining = generationCooldownUntil - Date.now()
      if (remaining <= 0) { setGenerationCooldownUntil(null); setGenerationCooldownLeft(0); return }
      setGenerationCooldownLeft(Math.ceil(remaining / 1000))
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [generationCooldownUntil])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(ESTIMATE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<Record<GenerationAction, number>>
      if (parsed && typeof parsed === "object") setAvgMsPerUnitByAction(parsed)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try { window.localStorage.setItem(ESTIMATE_STORAGE_KEY, JSON.stringify(avgMsPerUnitByAction)) } catch { /* ignore */ }
  }, [avgMsPerUnitByAction])

  const modelSpeed = params.selectedLLMModel ? (getModelInfo(params.selectedLLMModel)?.speed ?? "medium") : "medium"

  const actionUnits = useCallback((action: GenerationAction): number => {
    const p = paramsRef.current
    const lessons = Math.max(1, p.effectiveLessonCount)
    const modules = Math.max(1, p.moduleOrg === "linear" ? 1 : p.moduleCount)
    const map: Record<GenerationAction, number> = {
      all: lessons * 2.4, modules, lessons, topics: lessons, objectives: lessons * 1.2, tasks: lessons * 1.4,
    }
    return Math.max(1, map[action])
  }, [])

  const estimateForAction = useCallback((action: GenerationAction): string => {
    const units = actionUnits(action)
    const known = avgMsPerUnitByAction[action]
    if (typeof known === "number" && Number.isFinite(known) && known > 0) return formatEstimate((known * units) / 1000)
    const learned = Object.values(avgMsPerUnitByAction).filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0)
    if (learned.length > 0) {
      const avg = learned.reduce((s, v) => s + v, 0) / learned.length
      return `${formatEstimate((avg * units) / 1000)}*`
    }
    return modelSpeed === "slow" ? "Est. learning… (likely longer)" : "Est. learning…"
  }, [actionUnits, avgMsPerUnitByAction, modelSpeed])

  const clearAllGenerated = useCallback(async () => {
    const p = paramsRef.current
    if (!p.courseId) return
    if (isGenerating) {
      setRunStatus("Generation is running. Cancel or wait before deleting content.")
      setTimeout(() => setRunStatus(null), 3000)
      return
    }
    setRunStatus("Deleting all generated content…")
    setRunProgress(20)
    const blankRows = p.sessionRows.map((row, i) => ({
      ...row, session_number: i + 1, title: `Session ${i + 1}`, notes: "",
      topic_names: [] as string[], objective_names: [] as string[], task_names: [] as string[], competencies: undefined,
    }))
    const blankModuleNames = p.moduleNames.map((_, i) => `Module ${i + 1}`)
    setRunProgress(40)
    const { data: snap } = await selectCourseById<Record<string, unknown>>(p.courseId, "curriculum_data")
    const snapData = (snap?.curriculum_data as Record<string, unknown> | null) ?? {}
    const { error } = await updateCourseById(p.courseId, {
      curriculum_data: { ...snapData, module_names: blankModuleNames, session_rows: blankRows, generated_at: null, last_generation_action: null },
      updated_at: new Date().toISOString(),
    })
    setRunProgress(80)
    if (error) { setRunStatus(`Failed to delete: ${error.message}`); setTimeout(() => setRunStatus(null), 3000); return }
    p.setSessionRows(blankRows)
    p.setModuleNames(blankModuleNames)
    p.setLastAction(null)
    setRunProgress(100)
    setRunStatus("All generated content deleted.")
    setTimeout(() => setRunStatus(null), 2000)
  }, [isGenerating])

  const runGeneration = useCallback(async (action: GenerationAction) => {
    const p = paramsRef.current
    if (!p.courseId || !p.courseInfo) return
    if (generationCooldownLeft > 0) { setRunStatus(`Cooling down… wait ${generationCooldownLeft}s.`); setTimeout(() => setRunStatus(null), 2000); return }
    if (lockRef.current || isGenerating) { setRunStatus("Generation already in progress."); setTimeout(() => setRunStatus(null), 2500); return }
    if (!p.isGenerationReady) { setRunProgress(0); setRunStatus("Generation is locked until required setup data is complete."); setTimeout(() => setRunStatus(null), 3000); return }

    lockRef.current = true
    setIsGenerating(true)
    setActiveGenerationAction(action)
    const abortController = new AbortController()
    abortRef.current = abortController
    p.setLastAction(action)
    setRunStatus("Building curriculum context…")
    setRunProgress(10)
    let completedSuccessfully = false

    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      const runnerParams: GenerationRunnerParams = {
        courseId: p.courseId, courseInfo: p.courseInfo,
        actionLabel: GENERATION_ACTION_CONFIG.find((a) => a.key === action)?.label ?? "generation",
        scheduleEntries: p.scheduleEntries, moduleOrg: p.moduleOrg, moduleCount: p.moduleCount,
        effectiveLessonCount: p.effectiveLessonCount, topics: p.topics, objectives: p.objectives, tasks: p.tasks,
        sessionRows: p.sessionRows, moduleNames: p.moduleNames, optCtx: p.optCtx,
        classificationData: p.classificationData, pedagogyData: p.pedagogyData,
        courseGoalsList: p.courseGoalsList, keyTerms: p.keyTerms, mandatoryTopics: p.mandatoryTopics,
        priorKnowledge: p.priorKnowledge, applicationContext: p.applicationContext,
        resourcePreferences: p.resourcePreferences, sequencingMode: p.sequencingMode,
        namingRules: p.namingRules, courseLanguage: p.courseLanguage, studentsData: p.studentsData,
        selectedLLMModel: p.selectedLLMModel,
        setRunStatus, setRunProgress, setModuleNames: p.setModuleNames, setSessionRows: p.setSessionRows,
      }
      const result = await runGenerationAction(action, runnerParams, abortController.signal)
      if (result.success) {
        const units = actionUnits(action)
        if (result.elapsedMs > 0 && units > 0) {
          const msPerUnit = result.elapsedMs / units
          setAvgMsPerUnitByAction((prev) => {
            const prior = prev[action]
            const blended = typeof prior === "number" && Number.isFinite(prior) ? prior * 0.7 + msPerUnit * 0.3 : msPerUnit
            return { ...prev, [action]: blended }
          })
        }
        completedSuccessfully = true
      }
    } catch (err) {
      setRunStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`)
      setTimeout(() => setRunStatus(null), 3000)
    } finally {
      if (completedSuccessfully) setGenerationCooldownUntil(Date.now() + GENERATION_COOLDOWN_MS)
      lockRef.current = false
      setIsGenerating(false)
      setActiveGenerationAction(null)
      abortRef.current = null
    }
  }, [isGenerating, generationCooldownLeft, actionUnits])

  const cancelGeneration = useCallback(() => {
    if (!abortRef.current) return
    abortRef.current.abort()
    setRunStatus("Generation canceled.")
    setTimeout(() => setRunStatus(null), 2000)
  }, [])

  return {
    isGenerating, activeGenerationAction, generationCooldownLeft,
    runStatus, runProgress, ollamaHealthy, runningModels, highLoadModelActive,
    runGeneration, clearAllGenerated, cancelGeneration, estimateForAction,
  }
}
