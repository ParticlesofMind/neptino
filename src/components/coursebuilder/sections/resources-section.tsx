"use client"

import { useCallback, useRef, useState } from "react"
import { SetupSection, updateCourseById, useCourseRowLoader, useDebouncedChangeSave } from "@/components/coursebuilder"
import {
  RESOURCE_PRIORITY_OPTIONS,
  buildDefaultResourcePreferences,
  mergeResourcePreferences,
  type ResourcePreference,
  type ResourcePriority,
} from "@/lib/curriculum/resources"

export function ResourcesSection({ courseId }: { courseId: string | null }) {
  const [resources, setResources] = useState<ResourcePreference[]>(() => buildDefaultResourcePreferences())
  const [preferencesConfirmed, setPreferencesConfirmed] = useState(false)
  const generationSettingsRef = useRef<Record<string, unknown> | null>(null)

  type ResourcesSettingsRow = {
    generation_settings: Record<string, unknown> | null
  }

  useCourseRowLoader<ResourcesSettingsRow>({
    courseId,
    select: "generation_settings",
    onLoaded: (row) => {
      if (!row.generation_settings) return
      const settings = row.generation_settings
      generationSettingsRef.current = settings
      const saved = settings.resources_preferences as ResourcePreference[] | undefined
      setResources(mergeResourcePreferences(Array.isArray(saved) ? saved : null))
      setPreferencesConfirmed(settings.resources_preferences_confirmed === true)
    },
  })

  const handleSave = useCallback(async () => {
    if (!courseId) return
    const existingSettings = generationSettingsRef.current ?? {}
    const nextSettings = {
      ...existingSettings,
      resources_preferences: resources,
      resources_preferences_confirmed: preferencesConfirmed,
      resources_preferences_confirmed_at: preferencesConfirmed
        ? (existingSettings.resources_preferences_confirmed_at ?? new Date().toISOString())
        : null,
    }

    const { error } = await updateCourseById(courseId, {
      generation_settings: nextSettings,
      updated_at: new Date().toISOString(),
    })

    if (error) return
    generationSettingsRef.current = nextSettings
  }, [courseId, resources, preferencesConfirmed])

  useDebouncedChangeSave(handleSave, 700, Boolean(courseId))

  const updatePriority = (id: string, priority: ResourcePriority) => {
    setResources((prev) =>
      prev.map((resource) => {
        if (resource.id !== id) return resource
        if (resource.locked) return resource
        return { ...resource, priority }
      }),
    )
    setPreferencesConfirmed(false)
  }

  const highPriorityCount = resources.filter((resource) =>
    resource.id !== "neptino" && (resource.priority === "high" || resource.priority === "very_high")
  ).length

  return (
    <SetupSection
      title="Resources"
      description="Set the priority of open-source sources the model should rely on most."
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          These priorities steer the model toward specific open-licensed sources when it summarizes or
          draws supporting material for generation.
        </p>
        <label className="flex items-start gap-2.5 rounded-md border border-border bg-muted/20 p-3">
          <input
            type="checkbox"
            checked={preferencesConfirmed}
            onChange={(e) => setPreferencesConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Confirm these source priorities</span>
            <span className="block text-xs leading-relaxed text-muted-foreground">
              Required before generation so source preferences are an explicit course policy.
            </span>
          </span>
        </label>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className={`rounded-full border px-2.5 py-1 ${preferencesConfirmed ? "border-primary/30 bg-primary/10 text-primary" : "border-amber-600/30 bg-amber-500/10 text-amber-700"}`}>
            {preferencesConfirmed ? "Preferences confirmed" : "Confirmation needed"}
          </span>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
            {highPriorityCount} high-priority open source{highPriorityCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((resource) => (
            <div key={resource.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{resource.label}</p>
                  <p className="text-xs text-muted-foreground">{resource.description}</p>
                </div>
                <select
                  value={resource.priority}
                  onChange={(e) => updatePriority(resource.id, e.target.value as ResourcePriority)}
                  disabled={Boolean(resource.locked)}
                  className="min-w-[140px] rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {RESOURCE_PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SetupSection>
  )
}
