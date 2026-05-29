"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { evaluateCourseSetupReadiness, type CourseSetupReadinessInput, type SetupSectionQuality } from "@/lib/curriculum/setup-readiness"
import { SetupColumn, SetupPanelLayout, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useSteadyLoading } from "@/components/coursebuilder"
import { OverlineLabel } from "@/components/ui/overline-label"

type CourseContextRow = CourseSetupReadinessInput & {
  id: string
  updated_at: string | null
}

function StatusBadge({ complete }: { complete: boolean }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
      complete
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-amber-600/30 bg-amber-500/10 text-amber-700"
    }`}>
      {complete ? "Complete" : "Needs input"}
    </span>
  )
}

function SectionReadinessRow({ section }: { section: SetupSectionQuality }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{section.label}</p>
          <p className="text-xs text-muted-foreground">{section.passedChecks} of {section.totalChecks} checks passed</p>
        </div>
        <StatusBadge complete={section.complete} />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${section.score}%` }} />
      </div>
      {section.missing.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {section.missing.slice(0, 4).map((item) => (
            <span key={item} className="rounded-full border border-amber-600/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700">
              {item}
            </span>
          ))}
          {section.missing.length > 4 && (
            <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
              +{section.missing.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SignalList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <OverlineLabel>{title}</OverlineLabel>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="text-sm text-foreground">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}

export function ContextSection({ courseId }: { courseId: string | null }) {
  const [row, setRow] = useState<CourseContextRow | null>(null)
  const [loading, setLoading] = useState(false)
  const showLoading = useSteadyLoading(loading)

  useEffect(() => {
    if (!courseId) {
      const frame = window.requestAnimationFrame(() => setRow(null))
      return () => window.cancelAnimationFrame(frame)
    }

    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from("courses")
        .select(
          "id, updated_at, course_name, course_description, course_language, course_type, teacher_id, institution_id, institution, generation_settings, classification_data, students_overview, schedule_settings, curriculum_data, course_layout, template_settings, visibility_settings, pricing_settings, marketplace_settings, integration_settings, communication_settings",
        )
        .eq("id", courseId)
        .single()

      if (!cancelled) {
        setRow((data as CourseContextRow | null) ?? null)
        setLoading(false)
      }
    }

    void load()

    const channel = supabase
      .channel(`course-intelligence-readiness-${courseId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "courses", filter: `id=eq.${courseId}` },
        (payload) => {
          setRow((payload.new as CourseContextRow | null) ?? null)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [courseId])

  const report = useMemo(() => evaluateCourseSetupReadiness(row), [row])
  const requiredMissing = report.requiredSections.filter((section) => !section.complete)
  const sourceCoverage = report.sourceCoverage

  return (
    <SetupSection
      title="Course Intelligence Readiness"
      description="Review missing critical fields, weak fields, strongest AI signals, source coverage, and the recommended next action."
      headerActions={(
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`rounded-full border px-2.5 py-1 ${
            report.readyForGeneration
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-amber-600/30 bg-amber-500/10 text-amber-700"
          }`}>
            {report.generationScore}% generation-ready
          </span>
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
            {report.qualityScore}% overall quality
          </span>
        </div>
      )}
    >
      {!courseId ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          Create the course in Essentials to unlock course intelligence readiness.
        </div>
      ) : (
        <SetupPanelLayout>
          <SetupColumn className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <OverlineLabel>Recommended Next Action</OverlineLabel>
              <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">{report.recommendedNextAction}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {showLoading ? "Loading latest setup data..." : "Updates automatically when setup data changes."}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <OverlineLabel>Generation-Critical Sections</OverlineLabel>
              <div className="mt-3 space-y-3">
                {report.requiredSections.map((section) => (
                  <SectionReadinessRow key={section.id} section={section} />
                ))}
              </div>
            </div>
          </SetupColumn>

          <SetupColumn className="space-y-4">
            <SignalList
              title="Missing Critical Fields"
              items={report.missingCriticalFields.slice(0, 10)}
              empty="No generation-critical fields are missing."
            />
            <SignalList
              title="Weak Fields"
              items={report.weakFields.slice(0, 10)}
              empty="No quality warnings found."
            />
            <SignalList
              title="Strongest AI Signals"
              items={report.strongestSignals}
              empty="No strong generation signals yet."
            />

            <div className="rounded-lg border border-border bg-background p-4">
              <OverlineLabel>Copyright And Source Coverage</OverlineLabel>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Source preferences</span>
                  <span className="font-medium text-foreground">{sourceCoverage.sourcePreferencesConfirmed ? "confirmed" : "not confirmed"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Ranked open sources</span>
                  <span className="font-medium text-foreground">{sourceCoverage.rankedOpenSourceCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">High-priority open sources</span>
                  <span className="font-medium text-foreground">{sourceCoverage.highPriorityOpenSourceCount}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">License policy</span>
                  <span className="text-right font-medium text-foreground">{sourceCoverage.licensePolicy ?? "missing"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Citation strictness</span>
                  <span className="text-right font-medium text-foreground">{sourceCoverage.citationStrictness ?? "missing"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Provenance tracking</span>
                  <span className="font-medium text-foreground">{sourceCoverage.provenanceTracking ? "enabled" : "disabled"}</span>
                </div>
              </div>
            </div>

            {requiredMissing.length === 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <p className="text-sm font-medium text-primary">Generation gate satisfied</p>
                <p className="mt-1 text-xs leading-relaxed text-primary/80">
                  Essentials, classification, schedule, students, pedagogy, and effective templates meet the current readiness standard.
                </p>
              </div>
            )}
          </SetupColumn>
        </SetupPanelLayout>
      )}
    </SetupSection>
  )
}
