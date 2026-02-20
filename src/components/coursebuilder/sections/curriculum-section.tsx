"use client"

import { useCallback, useEffect, useState } from "react"
import { SaveStatusBar, SetupColumn, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"

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
}: {
  name: string
  value: string
  checked: boolean
  onChange: (v: string) => void
  title: string
  meta?: string
  description: string
}) {
  return (
    <label
      className={`relative flex cursor-pointer rounded-lg border p-4 transition ${
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
          <span className={`text-sm font-medium ${checked ? "text-primary" : "text-foreground"}`}>{title}</span>
          {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
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
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("curriculum_data")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.curriculum_data) {
          const c = data.curriculum_data as Record<string, unknown>
          setModuleOrg((c.module_org as string) ?? "linear")
          setContentVolume((c.content_volume as string) ?? "single")
          setCourseType((c.course_type as string) ?? "essential")
          setLessonCount((c.lesson_count as number) ?? 8)
          setModuleCount((c.module_count as number) ?? 3)
          setTopics((c.topics as number) ?? 2)
          setObjectives((c.objectives as number) ?? 2)
          setTasks((c.tasks as number) ?? 2)
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
        curriculum_data: {
          module_org: moduleOrg,
          content_volume: contentVolume,
          course_type: courseType,
          lesson_count: lessonCount,
          module_count: moduleCount,
          topics,
          objectives,
          tasks,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, moduleOrg, contentVolume, courseType, lessonCount, moduleCount, topics, objectives, tasks])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  const VOLUME_LABELS: Record<string, string> = {
    mini: "≤ 30 min",
    single: "≤ 60 min",
    double: "≤ 120 min",
    triple: "≤ 180 min",
    fullday: "> 180 min",
  }

  const outline: { mod: string | null; lessons: string[] }[] = (() => {
    if (moduleOrg === "linear") {
      return [{ mod: null, lessons: Array.from({ length: Math.min(lessonCount, 10) }, (_, i) => `Lesson ${i + 1}`) }]
    }
    if (moduleOrg === "equal") {
      const mods = Math.min(moduleCount, 6)
      const perMod = Math.ceil(lessonCount / mods)
      return Array.from({ length: mods }, (_, mi) => {
        const from = mi * perMod + 1
        const to = Math.min((mi + 1) * perMod, lessonCount)
        return {
          mod: `Module ${mi + 1}`,
          lessons: Array.from({ length: to - from + 1 }, (_, i) => `Lesson ${from + i}`),
        }
      })
    }

    return Array.from({ length: Math.min(moduleCount, 6) }, (_, i) => ({
      mod: `Module ${i + 1}`,
      lessons: ["Lesson…"],
    }))
  })()

  return (
    <SetupSection title="Curriculum" description="Structure and content density of your course.">
      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-2 items-stretch">
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
                value={lessonCount}
                onChange={(e) => setLessonCount(Math.min(60, Math.max(1, Number(e.target.value))))}
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

          <Divider label="Course Type" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: "minimalist", title: "Minimalist", description: "Core instructional templates only." },
              { value: "essential", title: "Essential", description: "Plus evaluation and certification." },
              { value: "complete", title: "Complete", description: "Every available template included." },
              { value: "custom", title: "Custom", description: "Manually select any combination." },
            ].map((opt) => (
              <RadioCard key={opt.value} name="course-type" {...opt} checked={courseType === opt.value} onChange={setCourseType} />
            ))}
          </div>
        </SetupColumn>

        <SetupColumn>
          <div className="mb-3 flex flex-wrap gap-3">
            {[
              { label: "Lessons", value: lessonCount },
              { label: "Session", value: VOLUME_LABELS[contentVolume] ?? "" },
              { label: "Topics/les", value: topics },
              { label: "Obj/topic", value: objectives },
              { label: "Tasks/obj", value: tasks },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-border bg-background px-2 py-1 text-center">
                <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
                <p className="text-xs font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-y-auto rounded-lg border border-border bg-background p-3 space-y-2" style={{ maxHeight: 340 }}>
            {outline.map((group, gi) => (
              <div key={gi}>
                {group.mod && (
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{group.mod}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="space-y-1">
                  {group.lessons.map((lesson, li) => (
                    <div key={li} className="rounded bg-muted/40 border border-border/0 px-3 py-1.5">
                      <p className="text-xs font-medium text-foreground">{lesson}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Array.from({ length: Math.min(topics, 3) }, (_, ti) => (
                          <span
                            key={ti}
                            className="rounded-full bg-background border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground"
                          >
                            Topic {ti + 1}
                          </span>
                        ))}
                        {topics > 3 && <span className="text-[9px] text-muted-foreground/50 self-center">+{topics - 3} more</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SetupColumn>
      </div>
      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}
