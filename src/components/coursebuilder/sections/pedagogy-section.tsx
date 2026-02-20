"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SetupColumn, SetupPanelLayout, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"

const PEDAGOGY_PRESETS = [
  { label: "Traditional", x: -75, y: -75 },
  { label: "Progressive", x: 75, y: 75 },
  { label: "Guided Discovery", x: -25, y: 75 },
  { label: "Balanced", x: 0, y: 0 },
]

function getPedagogyApproach(x: number, y: number) {
  type PedagogyProfile = {
    title: string
    subtitle: string
    mood: string
    coreFocus: string
    teacherRole: string
    studentRole: string
    interactions: string
    activitiesMethods: string
    assessment: string
    classroomEnvironment: string
  }

  const profiles: Record<"balanced" | "traditional" | "progressive" | "guided", PedagogyProfile> = {
    balanced: {
      title: "Balanced",
      subtitle: "Essentialist × Behaviorist ↔ Progressive × Constructivist",
      mood: "Steady, focused, and adaptive depending on lesson goals.",
      coreFocus: "Balances core knowledge transmission with inquiry and applied understanding.",
      teacherRole: "Alternates between direct instructor, coach, and facilitator as needed.",
      studentRole: "Moves between guided practice and active construction of ideas.",
      interactions: "Mix of structured guidance, feedback loops, and collaborative dialogue.",
      activitiesMethods: "Combines mini-lectures, targeted drills, problem-solving, and discussion.",
      assessment: "Uses both measurable checks (quizzes/tasks) and process-based evidence.",
      classroomEnvironment: "Organized but flexible; clear routines with space for student agency.",
    },
    traditional: {
      title: "Traditional",
      subtitle: "Essentialist × Behaviorist",
      mood: "Orderly, disciplined, and performance-oriented.",
      coreFocus: "Prioritizes foundational knowledge mastery and clear learning outcomes.",
      teacherRole: "Directive authority figure delivering structured instruction and reinforcement.",
      studentRole: "Primarily responsive learner practicing and demonstrating target behaviors.",
      interactions: "High teacher control with clear prompts, feedback, and reinforcement cycles.",
      activitiesMethods: "Lecture, modeled examples, drills, repetition, and guided recitation.",
      assessment: "Frequent exams, rubric checks, and behavior/performance tracking.",
      classroomEnvironment: "Highly structured, predictable, and rules-driven.",
    },
    progressive: {
      title: "Progressive",
      subtitle: "Progressive × Constructivist",
      mood: "Dynamic, exploratory, and collaborative.",
      coreFocus: "Prioritizes experiential discovery, meaning-making, and real-world transfer.",
      teacherRole: "Facilitator and collaborator who scaffolds inquiry rather than dictating each step.",
      studentRole: "Active constructor and independent explorer driving much of the learning process.",
      interactions: "Frequent dialogue, peer collaboration, and co-construction of understanding.",
      activitiesMethods: "Projects, investigations, discussion protocols, and authentic problem-solving.",
      assessment: "Portfolios, reflective artifacts, and process-focused performance evidence.",
      classroomEnvironment: "Flexible, student-centered, and collaboration-rich.",
    },
    guided: {
      title: "Guided Discovery",
      subtitle: "Essentialist × Constructivist",
      mood: "Focused but exploratory, with strong instructional scaffolding.",
      coreFocus: "Builds core concepts through guided inquiry and conceptual understanding.",
      teacherRole: "Hands-on guide who sequences tasks and prompts productive discovery.",
      studentRole: "Active participant exploring within structured boundaries.",
      interactions: "Intentional questioning, coached discussion, and collaborative clarification.",
      activitiesMethods: "Guided tasks, worked examples, structured investigations, and reflection.",
      assessment: "Combination of mastery checkpoints and process-oriented demonstrations.",
      classroomEnvironment: "Structured framework with space for exploration and student voice.",
    },
  }

  if (x === 0 && y === 0) return profiles.balanced
  if (x <= -50 && y <= -50) return profiles.traditional
  if (x >= 50 && y >= 50) return profiles.progressive
  if (x <= 0 && y >= 50) return profiles.guided

  const xTendency = x <= -25 ? "Essentialist" : x >= 25 ? "Progressive" : "Balanced"
  const yTendency = y >= 25 ? "Constructivist" : y <= -25 ? "Behaviorist" : "Balanced"

  return {
    title: "Custom Approach",
    subtitle: `${xTendency} × ${yTendency} (x: ${x}, y: ${y})`,
    mood: "Blended and adaptive based on your coordinate placement.",
    coreFocus: `Leans ${xTendency.toLowerCase()} for instructional focus with a ${yTendency.toLowerCase()} interaction model.`,
    teacherRole: "Shifts between direct instruction and facilitative coaching depending on the task.",
    studentRole: "Mixes guided response with active idea construction and experimentation.",
    interactions: "Combines structured feedback with collaborative meaning-making.",
    activitiesMethods: "Uses a blend of instruction, guided practice, inquiry, and applied tasks.",
    assessment: "Balances outcome measurement with process and reflection evidence.",
    classroomEnvironment: "Structured enough for clarity, flexible enough for exploration.",
  }
}

export function PedagogySection({ courseId }: { courseId: string | null }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
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
          const layout = data.course_layout as Record<string, unknown>
          if (layout.pedagogy) {
            const p = layout.pedagogy as { x: number; y: number }
            setPos({ x: p.x ?? 0, y: p.y ?? 0 })
          }
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const { data: existing } = await supabase.from("courses").select("course_layout").eq("id", courseId).single()
    const merged = { ...((existing?.course_layout as Record<string, unknown>) ?? {}), pedagogy: { x: pos.x, y: pos.y } }
    const { error } = await supabase
      .from("courses")
      .update({ course_layout: merged, updated_at: new Date().toISOString() })
      .eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, pos.x, pos.y])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  const clamp = (v: number) => Math.round(Math.max(-100, Math.min(100, v)))

  const updateFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({
      x: clamp(((e.clientX - rect.left) / rect.width) * 200 - 100),
      y: clamp(-((e.clientY - rect.top) / rect.height) * 200 + 100),
    })
  }

  const approach = getPedagogyApproach(pos.x, pos.y)

  return (
    <SetupSection title="Pedagogy" description="Position your teaching philosophy on the pedagogical coordinate plane.">
      <SetupPanelLayout>
        <SetupColumn>
          <div
            ref={gridRef}
            className="relative select-none cursor-crosshair overflow-hidden rounded-lg border border-border"
            style={{
              height: 360,
              background:
                "radial-gradient(circle at 18% 22%, rgba(59,130,246,0.14), transparent 38%), radial-gradient(circle at 82% 20%, rgba(16,185,129,0.14), transparent 40%), radial-gradient(circle at 80% 82%, rgba(239,68,68,0.12), transparent 42%), radial-gradient(circle at 20% 78%, rgba(245,158,11,0.12), transparent 42%), var(--color-muted)",
            }}
            onMouseDown={(e) => {
              dragging.current = true
              updateFromEvent(e)
            }}
            onMouseMove={(e) => {
              if (dragging.current) updateFromEvent(e)
            }}
            onMouseUp={() => {
              dragging.current = false
            }}
            onMouseLeave={() => {
              dragging.current = false
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.22) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="pointer-events-none absolute left-0 top-0 h-1/2 w-1/2 bg-blue-500/5" />
            <div className="pointer-events-none absolute right-0 top-0 h-1/2 w-1/2 bg-emerald-500/5" />
            <div className="pointer-events-none absolute left-0 bottom-0 h-1/2 w-1/2 bg-amber-500/5" />
            <div className="pointer-events-none absolute right-0 bottom-0 h-1/2 w-1/2 bg-rose-500/5" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/25" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-foreground/25" />
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-foreground/70">Essentialist</span>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-foreground/70">Progressive</span>
            <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-medium text-foreground/70">Constructivist</span>
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-medium text-foreground/70">Behaviorist</span>
            <div
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-[0_0_0_4px_rgba(74,148,255,0.22)]"
              style={{
                left: `${((pos.x + 100) / 200) * 100}%`,
                top: `${((-pos.y + 100) / 200) * 100}%`,
              }}
            />
          </div>
          <div className="mt-2 flex items-center gap-6">
            <span className="text-xs text-muted-foreground">
              X: <span className="font-mono text-foreground">{pos.x}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Y: <span className="font-mono text-foreground">{pos.y}</span>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {PEDAGOGY_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPos({ x: p.x, y: p.y })}
                className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </SetupColumn>

        <SetupColumn>
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-background p-4 space-y-1">
              <h3 className="text-base font-semibold text-foreground">{approach.title}</h3>
              <p className="text-xs italic text-muted-foreground">{approach.subtitle}</p>
              <p className="text-xs text-foreground">Lesson mood: {approach.mood}</p>
            </div>

            {(
              [
                ["Core Focus", approach.coreFocus],
                ["Teacher Role", approach.teacherRole],
                ["Student Role", approach.studentRole],
                ["Interactions", approach.interactions],
                ["Activities/Methods", approach.activitiesMethods],
                ["Assessment", approach.assessment],
                ["Classroom Environment", approach.classroomEnvironment],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-muted/20 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}
