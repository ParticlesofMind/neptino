"use client"

import { useCallback, useEffect, useState } from "react"
import { SetupPanels, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"

export function VisibilitySection({ courseId }: { courseId: string | null }) {
  const [state, setState] = useState({
    visible: false,
    enrollment: false,
    approval: false,
    notifications: false,
    publicDiscovery: false,
  })
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("visibility_settings")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.visibility_settings) {
          const v = data.visibility_settings as Record<string, boolean>
          setState({
            visible: v.visible ?? false,
            enrollment: v.enrollment ?? false,
            approval: v.approval ?? false,
            notifications: v.notifications ?? false,
            publicDiscovery: v.public_discovery ?? false,
          })
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const { error } = await supabase
      .from("courses")
      .update({
        visibility_settings: {
          visible: state.visible,
          enrollment: state.enrollment,
          approval: state.approval,
          notifications: state.notifications,
          public_discovery: state.publicDiscovery,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, state])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  const toggle = (key: keyof typeof state) =>
    setState((prev) => ({ ...prev, [key]: !prev[key] }))

  const items: { key: keyof typeof state; label: string }[] = [
    { key: "visible", label: "Course visible to students" },
    { key: "enrollment", label: "Allow new enrollments" },
    { key: "approval", label: "Require enrollment approval" },
    { key: "notifications", label: "Enable email notifications for new enrollments" },
    { key: "publicDiscovery", label: "Make course publicly discoverable" },
  ]

  return (
    <SetupSection title="Course Visibility" description="Control who can see and enroll in your course.">
      <SetupPanels
        config={(
          <div className="space-y-3">
            {items.map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={state[key]}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
                <span className="text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
        )}
        preview={(
          <div className="rounded-lg border border-border bg-background p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Visibility Summary</p>
            {items.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={state[key] ? "font-medium text-foreground" : "text-muted-foreground/60"}>
                  {state[key] ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        )}
      />
    </SetupSection>
  )
}
