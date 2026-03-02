"use client"

import { useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { SetupColumn, SetupSection, SaveStatusBar } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"

// ─── Local types / defaults (formerly in template-source-of-truth) ────────────

type VisualDensity = "compact" | "balanced" | "comfortable"

const DEFAULT_VISUAL_DENSITY: VisualDensity = "balanced"
const DEFAULT_BODY_BLOCK_GAP = 8

function normalizeUiSettings(layout: Record<string, unknown>): { visualDensity: VisualDensity; bodyBlockGap: number } {
  const density = (layout.visualDensity as VisualDensity) ?? DEFAULT_VISUAL_DENSITY
  const gap     = typeof layout.bodyBlockGap === "number" ? layout.bodyBlockGap : DEFAULT_BODY_BLOCK_GAP
  return { visualDensity: density, bodyBlockGap: gap }
}

export function InterfaceSection({ courseId }: { courseId: string | null }) {
  const [visualDensity, setVisualDensity] = useState<VisualDensity>(DEFAULT_VISUAL_DENSITY)
  const [bodyBlockGap, setBodyBlockGap] = useState(DEFAULT_BODY_BLOCK_GAP)
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("course_layout")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.course_layout) {
          const settings = normalizeUiSettings(data.course_layout)
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
      .select("course_layout")
      .eq("id", courseId)
      .single()
      .then(async ({ data: currentData, error: fetchError }) => {
        if (fetchError || !currentData?.course_layout) {
          return { error: true }
        }

        const currentLayout =
          typeof currentData.course_layout === "object" && currentData.course_layout !== null
            ? (currentData.course_layout as Record<string, unknown>)
            : {}

        return await supabase
          .from("courses")
          .update({
            course_layout: {
              ...currentLayout,
              visualDensity,
              bodyBlockGap,
            },
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
    <SetupSection title="Interface" description="Configure visual density and spacing for course canvas pages.">
      <div className="flex-1 min-h-0">
        <SetupColumn className="space-y-6">
            {/* Visual Density */}
            <div>
              <div className="mb-2">
                <p className="text-sm font-medium text-foreground">Visual Density</p>
                <p className="text-xs text-muted-foreground">Controls spacing and content compactness in the canvas editor.</p>
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
    </SetupSection>
  )
}
