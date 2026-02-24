"use client"

import { useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  DEFAULT_TEMPLATE_VISUAL_DENSITY,
  DEFAULT_TEMPLATE_BODY_BLOCK_GAP,
  type TemplateVisualDensity,
  normalizeTemplateUiSettings,
} from "@/lib/curriculum/template-source-of-truth"
import { TemplateBlueprint } from "@/components/coursebuilder/template-blueprint"
import { SetupColumn, SetupSection, SaveStatusBar } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"

export function InterfaceSection({ courseId }: { courseId: string | null }) {
  const [visualDensity, setVisualDensity] = useState<TemplateVisualDensity>(DEFAULT_TEMPLATE_VISUAL_DENSITY)
  const [bodyBlockGap, setBodyBlockGap] = useState(DEFAULT_TEMPLATE_BODY_BLOCK_GAP)
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("template_settings")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.template_settings) {
          const settings = normalizeTemplateUiSettings(data.template_settings)
          setVisualDensity(settings.visualDensity)
          setBodyBlockGap(settings.bodyBlockGap)
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) {
      setSaveStatus("empty")
      return
    }

    setSaveStatus("saving")
    const supabase = createClient()
    const { error } = await supabase
      .from("courses")
      .select("template_settings")
      .eq("id", courseId)
      .single()
      .then(async ({ data: currentData, error: fetchError }) => {
        if (fetchError || !currentData?.template_settings) {
          return { error: true }
        }

        const currentSettings =
          typeof currentData.template_settings === "object"
            ? (currentData.template_settings as Record<string, unknown>)
            : {}

        const templates = Array.isArray(currentSettings.templates)
          ? currentSettings.templates
          : Array.isArray(currentSettings)
            ? currentSettings
            : []

        const nextPayload = {
          templates,
          ui: {
            visualDensity,
            bodyBlockGap,
          },
        }

        return await supabase
          .from("courses")
          .update({
            template_settings: nextPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", courseId)
      })

    if (error) {
      setSaveStatus("error")
    } else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, visualDensity, bodyBlockGap])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  return (
    <SetupSection title="Interface" description="Configure visual density and spacing for lesson templates.">
      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row lg:gap-2">
        {/* Config */}
        <div className="flex-1 min-h-0">
          <SetupColumn className="space-y-6">
            {/* Visual Density */}
            <div>
              <div className="mb-2">
                <p className="text-sm font-medium text-foreground">Visual Density</p>
                <p className="text-xs text-muted-foreground">Controls spacing and content compactness in templates.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(
                  [
                    { value: "compact", label: "Compact", description: "Maximum content per page" },
                    { value: "balanced", label: "Balanced", description: "Default readability" },
                    { value: "comfortable", label: "Comfortable", description: "More whitespace" },
                  ] as const
                ).map((option) => {
                  const selected = visualDensity === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisualDensity(option.value)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                        selected
                          ? "border-primary bg-accent text-primary shadow-sm"
                          : "border-border bg-background text-foreground hover:border-primary/30"
                      }`}
                    >
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-[10px] text-muted-foreground">{option.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Body Block Gap */}
            <div>
              <div className="mb-2">
                <label htmlFor="body-gap" className="text-sm font-medium text-foreground">
                  Body Block Gap (px)
                </label>
                <p className="text-xs text-muted-foreground">Vertical space between lesson content blocks.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="body-gap"
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  value={bodyBlockGap}
                  onChange={(e) => setBodyBlockGap(Number(e.target.value))}
                  className="flex-1"
                  aria-label="Body block gap"
                />
                <span className="w-12 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-center text-xs font-semibold text-foreground tabular-nums">
                  {Math.max(0, bodyBlockGap)}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-auto">
              <SaveStatusBar status={saveStatus} lastSavedAt={lastSavedAt} sticky={false} />
            </div>
          </SetupColumn>
        </div>

        {/* Preview */}
        <div className="flex-1 min-h-0">
          <SetupColumn className="!p-0">
            <TemplateBlueprint
              type="lesson"
              enabled={{
                header: true,
                program: true,
                resources: true,
                content: true,
                assignment: true,
                scoring: false,
                footer: true,
              }}
              fieldEnabled={{
                header: {},
                program: {},
                resources: {},
                content: {},
                assignment: {},
                scoring: {},
                footer: {},
              }}
              name="Interface Preview"
              scale="md"
              scrollable={true}
              density={visualDensity}
              bodyBlockGap={bodyBlockGap}
              data={{
                programRows: [{ competence: "Competence 1", topic: "Sample Topic" }],
                resourceRows: [{ task: "Resource 1", type: "Document", origin: "Curriculum", state: "Ready", quality: "Aligned" }],
                contentItems: {
                  topics: ["Sample Topic"],
                  objectives: ["Sample Objective"],
                  tasks: ["Sample Task"],
                },
                assignmentItems: {
                  tasks: ["Sample Assignment"],
                },
                scoringItems: [],
              }}
            />
          </SetupColumn>
        </div>
      </div>
    </SetupSection>
  )
}
