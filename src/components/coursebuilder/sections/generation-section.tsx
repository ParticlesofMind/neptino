"use client"

import { useCallback, useEffect, useState } from "react"
import { PRIMARY_ACTION_BUTTON_CLASS, SetupColumn, SetupPanelLayout, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"

export function GenerationSection({ courseId }: { courseId: string | null }) {
  type GenerationAction = "all" | "modules" | "lessons" | "topics" | "objectives" | "tasks"
  type PreviewMode = "modules" | "lessons" | "competencies" | "topics" | "objectives" | "tasks" | "all"

  const [optCtx, setOptCtx] = useState({ schedule: true, structure: true, existing: false })
  const [previewMode, setPreviewMode] = useState<PreviewMode>("modules")
  const [lastAction, setLastAction] = useState<GenerationAction | null>(null)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [runProgress, setRunProgress] = useState(0)
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const toggle = (key: keyof typeof optCtx) => setOptCtx((prev) => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("generation_settings")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (error || !data?.generation_settings) return
        const gs = data.generation_settings as Record<string, unknown>
        const aiSettings = (gs.ai_generation as Record<string, unknown> | undefined) ?? gs
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
      })
  }, [courseId])

  const persistGenerationSettings = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
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
        updated_at: new Date().toISOString(),
      },
    }

    const { error } = await supabase
      .from("courses")
      .update({ generation_settings: nextSettings, updated_at: new Date().toISOString() })
      .eq("id", courseId)

    if (error) {
      setSaveStatus("error")
    } else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, optCtx, previewMode, lastAction])

  useDebouncedChangeSave(persistGenerationSettings, 600, Boolean(courseId))

  function runGeneration(action: GenerationAction) {
    setLastAction(action)
    setRunStatus("Initializing AI model…")
    setRunProgress(10)

    setTimeout(() => {
      setRunStatus("Gathering context…")
      setRunProgress(35)
    }, 300)

    setTimeout(() => {
      setRunStatus("Generating content…")
      setRunProgress(70)
    }, 700)

    setTimeout(() => {
      setRunStatus("Complete")
      setRunProgress(100)
    }, 1200)
  }

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
    { key: "competencies", label: "Competencies" },
    { key: "topics", label: "Topics" },
    { key: "objectives", label: "Objectives" },
    { key: "tasks", label: "Tasks" },
    { key: "all", label: "All" },
  ]

  const previewByMode: Record<PreviewMode, string[]> = {
    modules: ["Module 1", "Module 2", "Module 3"],
    lessons: ["Lesson 1", "Lesson 2", "Lesson 3", "Lesson 4"],
    competencies: ["Critical Thinking", "Collaboration", "Communication"],
    topics: ["Topic A", "Topic B", "Topic C"],
    objectives: ["Objective 1", "Objective 2", "Objective 3"],
    tasks: ["Task 1", "Task 2", "Task 3"],
    all: ["Modules", "Lessons", "Competencies", "Topics", "Objectives", "Tasks"],
  }

  const previewItems = previewByMode[previewMode]

  return (
    <SetupSection title="Generation" description="Use AI to generate curriculum content from your course settings.">
      <SetupPanelLayout>
        <SetupColumn className="space-y-5">
          <div>
            <div className="space-y-2">
              {["Course Essentials", "Classification", "Pedagogy Approach"].map((label) => (
                <label key={label} className="flex items-center gap-2.5 opacity-60 cursor-not-allowed">
                  <input type="checkbox" checked readOnly className="h-4 w-4 accent-primary" />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="space-y-2">
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
          </div>

          <div>
            <div className="space-y-2">
              {actionButtons.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => runGeneration(action.key)}
                  className={`${PRIMARY_ACTION_BUTTON_CLASS} w-full py-2.5 text-left`}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {runStatus && (
              <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
                <p className="text-xs text-foreground">{runStatus}</p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${runProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </SetupColumn>

        <SetupColumn>
          <div className="mb-3 flex flex-wrap gap-1.5">
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

          <div className="space-y-1.5">
            {previewItems.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground"
              >
                {item}
              </div>
            ))}
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
