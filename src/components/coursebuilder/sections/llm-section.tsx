"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"
import { AVAILABLE_MODELS, DEFAULT_MODEL, checkOllamaHealth, getModelInfo } from "@/lib/ollama/models"
import { AlertCircle } from "lucide-react"

export function LLMSection({ courseId }: { courseId: string | null }) {
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL)
  const [ollamaHealthy, setOllamaHealthy] = useState<boolean>(true)
  const [checking, setChecking] = useState(true)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const generationSettingsRef = useRef<Record<string, unknown> | null>(null)

  // Check Ollama health and load saved model preference
  useEffect(() => {
    const init = async () => {
      setChecking(true)
      const healthy = await checkOllamaHealth()
      setOllamaHealthy(healthy)

      // Load saved model preference
      if (courseId) {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("courses")
          .select("generation_settings")
          .eq("id", courseId)
          .single()

        if (!error && data?.generation_settings) {
          const settings = data.generation_settings as Record<string, unknown>
          generationSettingsRef.current = settings
          const savedModel = (settings.selected_llm_model as string) ?? DEFAULT_MODEL
          setSelectedModel(savedModel)
        }
      }

      setChecking(false)
    }

    init()
  }, [courseId])

  const handleSaveModel = useCallback(async () => {
    if (!courseId) {
      return
    }

    try {
      const supabase = createClient()
      const existingSettings = generationSettingsRef.current ?? {}
      const nextSettings = {
        ...existingSettings,
        selected_llm_model: selectedModel,
      }

      const { error } = await supabase
        .from("courses")
        .update({ generation_settings: nextSettings, updated_at: new Date().toISOString() })
        .eq("id", courseId)

      if (error) {
        console.error("Failed to save LLM selection:", error)
      } else {
        generationSettingsRef.current = nextSettings
        setLastSavedAt(new Date().toISOString())
      }
    } catch (error) {
      console.error("Error saving LLM selection:", error)
    }
  }, [courseId, selectedModel])

  useDebouncedChangeSave(handleSaveModel, 800, Boolean(courseId))

  const selectedModelInfo = getModelInfo(selectedModel)

  return (
    <SetupSection
      title="AI Model"
      description="Select the language model Ollama uses for curriculum generation."
    >
      <div className="space-y-4">
        {!checking && !ollamaHealthy && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Ollama is not running</p>
              <p className="mt-1 text-xs text-muted-foreground">Start Ollama to enable model-backed generation.</p>
              <code className="mt-2 inline-block rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">ollama serve</code>
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {AVAILABLE_MODELS.map((model) => (
            <div key={model.name} className="relative">
              <input
                type="radio"
                name="llm-model"
                value={model.name}
                checked={selectedModel === model.name}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="sr-only"
                id={`model-${model.name}`}
              />
              <label
                htmlFor={`model-${model.name}`}
                className={`block h-full cursor-pointer rounded-md border p-3 transition ${
                  selectedModel === model.name
                    ? "border-primary bg-accent"
                    : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{model.displayName}</p>
                    <p className="text-xs text-muted-foreground">{model.parameterSize}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5 uppercase">{model.speed}</span>
                    {model.reasoning && <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5">Reasoning</span>}
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">{model.description}</p>
                <div className="mt-2 text-xs text-muted-foreground">Cost: {model.estimatedCostPerUse}</div>
              </label>
            </div>
          ))}
        </div>

        {selectedModelInfo && (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Selected model</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{selectedModelInfo.displayName}</p>
            {selectedModelInfo.speed === "slow" && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                High compute usage: this model can heavily load CPU/GPU on laptops. Prefer Gemma 3, Phi 3, or Mistral for cooler, faster runs.
              </p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {checking && <span>Checking Ollama status…</span>}
          {!checking && ollamaHealthy && <span>Ollama is running</span>}
          {!checking && !ollamaHealthy && <span>Ollama is not accessible</span>}
          {lastSavedAt && (
            <span className="mt-1 block">
              Last saved: {new Date(lastSavedAt).toLocaleTimeString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </SetupSection>
  )
}
