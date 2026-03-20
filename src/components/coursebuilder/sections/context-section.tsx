"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { SetupSection } from "@/components/coursebuilder/layout-primitives"

type JsonObject = Record<string, unknown>

type CourseContextRow = {
  id: string
  updated_at: string | null
  course_name: string | null
  course_subtitle: string | null
  course_description: string | null
  course_language: string | null
  course_type: string | null
  institution: string | null
  teacher_id: string | null
  generation_settings: JsonObject | null
  classification_data: JsonObject | null
  students_overview: JsonObject | null
  schedule_settings: JsonObject | null
  curriculum_data: JsonObject | null
  course_layout: JsonObject | null
  template_settings: JsonObject | null
  visibility_settings: JsonObject | null
  pricing_settings: JsonObject | null
  marketplace_settings: JsonObject | null
  integration_settings: JsonObject | null
  communication_settings: JsonObject | null
}

type ContextCheck = {
  path: string
  present: boolean
}

type SectionCoverage = {
  section: string
  present: number
  total: number
  percent: number
  missing_paths: string[]
  missing_fields: string[]
}

type JsonLikeValue = string | number | boolean | null | JsonLikeObject | JsonLikeValue[]
interface JsonLikeObject {
  [key: string]: JsonLikeValue
}

type CoverageSectionSpec = {
  id: string
  label: string
  prefixes: string[]
}

const COVERAGE_SECTIONS: CoverageSectionSpec[] = [
  {
    id: "essentials",
    label: "Course Basics",
    prefixes: ["course_name", "course_subtitle", "course_description", "course_language", "course_type", "institution", "teacher_id", "generation_settings.teacher_id", "generation_settings.teacher_name"],
  },
  { id: "classification", label: "Subject Classification", prefixes: ["classification_data"] },
  { id: "students", label: "Student Information", prefixes: ["students_overview"] },
  { id: "schedule", label: "Schedule", prefixes: ["schedule_settings"] },
  { id: "curriculum_structure", label: "Curriculum Structure", prefixes: ["curriculum_data"] },
  {
    id: "publishing_and_operations",
    label: "Publishing And Delivery",
    prefixes: ["visibility_settings", "pricing_settings", "marketplace_settings", "integration_settings", "communication_settings"],
  },
  {
    id: "engine",
    label: "Page And Teaching Settings",
    prefixes: ["course_layout", "generation_settings.page_size", "generation_settings.page_orientation", "generation_settings.page_count", "generation_settings.margins_mm", "generation_settings.print_options"],
  },
  { id: "templates", label: "Template Preferences", prefixes: ["template_settings"] },
]

const PRE_GENERATION_REQUIRED_PATHS = [
  "course_name",
  "course_description",
  "course_language",
  "generation_settings.teacher_name",
  "institution",
  "classification_data.class_year",
  "classification_data.domain",
  "classification_data.subject",
  "classification_data.topic",
  "students_overview.total",
  "schedule_settings.active_days",
  "curriculum_data.module_count",
  "curriculum_data.session_count",
  "curriculum_data.topics",
  "curriculum_data.objectives",
  "curriculum_data.tasks",
] as const

const USER_METADATA_PATHS = [
  "course_name",
  "course_subtitle",
  "course_description",
  "course_language",
  "course_type",
  "institution",
  "teacher_id",
  "generation_settings.teacher_id",
  "generation_settings.teacher_name",
  "generation_settings.selected_llm_model",
  "generation_settings.course_goals",
  "generation_settings.resources_preferences",
  "generation_settings.page_size",
  "generation_settings.page_orientation",
  "generation_settings.page_count",
  "generation_settings.margins_mm",
  "generation_settings.print_options",
  "classification_data.class_year",
  "classification_data.curricular_framework",
  "classification_data.domain",
  "classification_data.subject",
  "classification_data.topic",
  "classification_data.subtopic",
  "classification_data.previous_course",
  "classification_data.next_course",
  "classification_data.prior_knowledge",
  "classification_data.key_terms",
  "classification_data.mandatory_topics",
  "classification_data.application_context",
  "students_overview.method",
  "students_overview.total",
  "students_overview.students",
  "schedule_settings.schedule_mode",
  "schedule_settings.active_days",
  "schedule_settings.start_date",
  "schedule_settings.end_date",
  "schedule_settings.start_time",
  "schedule_settings.end_time",
  "schedule_settings.target_sessions",
  "schedule_settings.sessions_per_day",
  "schedule_settings.repeat_unit",
  "schedule_settings.repeat_every",
  "schedule_settings.repeat_cycles",
  "schedule_settings.breaks",
  "course_layout.pedagogy",
  "course_layout.visualDensity",
  "course_layout.bodyBlockGap",
  "curriculum_data.module_org",
  "curriculum_data.content_volume",
  "curriculum_data.course_type",
  "curriculum_data.certificate_mode",
  "curriculum_data.session_count",
  "curriculum_data.module_count",
  "curriculum_data.topics",
  "curriculum_data.objectives",
  "curriculum_data.tasks",
  "curriculum_data.sequencing_mode",
  "curriculum_data.naming_rules",
  "template_settings.active_template_type",
  "template_settings.templates",
  "visibility_settings.visible",
  "visibility_settings.enrollment",
  "visibility_settings.approval",
  "visibility_settings.notifications",
  "visibility_settings.public_discovery",
  "pricing_settings.pricing_model",
  "pricing_settings.base_price",
  "pricing_settings.currency",
  "pricing_settings.trial",
  "pricing_settings.discount_notes",
  "marketplace_settings.listing_status",
  "marketplace_settings.target_audience",
  "marketplace_settings.revenue_share",
  "marketplace_settings.distribution_channels",
  "integration_settings.lms_provider",
  "integration_settings.api_access",
  "integration_settings.webhook_url",
  "integration_settings.integration_notes",
  "communication_settings.welcome_message",
  "communication_settings.announcement_channel",
  "communication_settings.digest",
  "communication_settings.office_hours",
] as const

const EXCLUDED_GENERATED_PATHS = [
  "curriculum_data.module_names",
  "curriculum_data.session_rows",
  "curriculum_data.sessions",
  "curriculum_data.generated_at",
  "curriculum_data.last_generation_action",
  "curriculum_data.wiped_at",
  "generation_settings.ai_generation",
] as const

function hasValue(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "boolean") return true
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0
  return false
}

function getPathValue(source: JsonObject, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as JsonObject)[key] : undefined), source)
}

function buildChecks(paths: readonly string[], row: CourseContextRow | null): ContextCheck[] {
  if (!row) {
    return paths.map((path) => ({ path, present: false }))
  }

  const source = row as unknown as JsonObject
  return paths.map((path) => {
    const value = getPathValue(source, path)
    return { path, present: hasValue(value) }
  })
}

function toPlainFieldLabel(path: string): string {
  const compact = path
    .replace("generation_settings.", "")
    .replace("classification_data.", "")
    .replace("students_overview.", "")
    .replace("schedule_settings.", "")
    .replace("curriculum_data.", "")
    .replace("course_layout.", "")
    .replace("template_settings.", "")
    .replace("visibility_settings.", "")
    .replace("pricing_settings.", "")
    .replace("marketplace_settings.", "")
    .replace("integration_settings.", "")
    .replace("communication_settings.", "")

  return compact
    .split(".")
    .join(" ")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildCoverageForPrefix(checks: ContextCheck[], section: string, prefixes: string[]): SectionCoverage {
  const scoped = checks.filter((check) => prefixes.some((prefix) => check.path === prefix || check.path.startsWith(`${prefix}.`)))
  const present = scoped.filter((check) => check.present).length
  const total = scoped.length
  const percent = total === 0 ? 0 : Math.round((present / total) * 100)
  return {
    section,
    present,
    total,
    percent,
    missing_paths: scoped.filter((check) => !check.present).map((check) => check.path),
    missing_fields: scoped.filter((check) => !check.present).map((check) => toPlainFieldLabel(check.path)),
  }
}

function buildContextPayload(row: CourseContextRow | null) {
  const allChecks = buildChecks(USER_METADATA_PATHS, row)
  const requiredChecks = buildChecks(PRE_GENERATION_REQUIRED_PATHS, row)
  const allPresent = allChecks.filter((check) => check.present)
  const allMissing = allChecks.filter((check) => !check.present)
  const requiredPresent = requiredChecks.filter((check) => check.present)
  const requiredMissing = requiredChecks.filter((check) => !check.present)
  const metadataCoverage = allChecks.length === 0 ? 0 : Math.round((allPresent.length / allChecks.length) * 100)
  const generationReadiness = requiredChecks.length === 0 ? 0 : Math.round((requiredPresent.length / requiredChecks.length) * 100)

  const gs = (row?.generation_settings ?? {}) as JsonObject
  const cd = (row?.classification_data ?? {}) as JsonObject
  const so = (row?.students_overview ?? {}) as JsonObject
  const sch = (row?.schedule_settings ?? {}) as JsonObject
  const cur = (row?.curriculum_data ?? {}) as JsonObject
  const layout = (row?.course_layout ?? {}) as JsonObject
  const template = (row?.template_settings ?? {}) as JsonObject
  const visibility = (row?.visibility_settings ?? {}) as JsonObject
  const pricing = (row?.pricing_settings ?? {}) as JsonObject
  const marketplace = (row?.marketplace_settings ?? {}) as JsonObject
  const integrations = (row?.integration_settings ?? {}) as JsonObject
  const communication = (row?.communication_settings ?? {}) as JsonObject
  const sanitizedGenerationSettings = { ...gs }
  delete sanitizedGenerationSettings.ai_generation
  const sanitizedCurriculumInputs = {
    module_org: cur.module_org ?? null,
    content_volume: cur.content_volume ?? null,
    course_type: cur.course_type ?? null,
    certificate_mode: cur.certificate_mode ?? null,
    session_count: cur.session_count ?? null,
    module_count: cur.module_count ?? null,
    topics: cur.topics ?? null,
    objectives: cur.objectives ?? null,
    tasks: cur.tasks ?? null,
    sequencing_mode: cur.sequencing_mode ?? null,
    naming_rules: cur.naming_rules ?? null,
  }

  const coverageBySection = COVERAGE_SECTIONS.map((section) =>
    buildCoverageForPrefix(allChecks, section.label, section.prefixes),
  )

  const teacherFlow = coverageBySection

  const payload = {
    meta: {
      course_id: row?.id ?? null,
      updated_at: row?.updated_at ?? null,
      metadata_coverage_percent: metadataCoverage,
      metadata_present_count: allPresent.length,
      metadata_missing_count: allMissing.length,
      generation_readiness_percent: generationReadiness,
      generation_required_present_count: requiredPresent.length,
      generation_required_missing_count: requiredMissing.length,
      last_refreshed_at: new Date().toISOString(),
    },
    generation_required_present_paths: requiredPresent.map((check) => check.path),
    generation_required_missing_paths: requiredMissing.map((check) => check.path),
    generation_required_missing_fields: requiredMissing.map((check) => toPlainFieldLabel(check.path)),
    metadata_present_paths: allPresent.map((check) => check.path),
    metadata_missing_paths: allMissing.map((check) => check.path),
    metadata_missing_fields: allMissing.map((check) => toPlainFieldLabel(check.path)),
    excluded_generated_paths: EXCLUDED_GENERATED_PATHS,
    coverage_by_section: coverageBySection,
    teacher_setup_flow: {
      steps: teacherFlow,
      completed_steps: teacherFlow.filter((step) => step.percent === 100).length,
      total_steps: teacherFlow.length,
    },
    pre_generation_context: {
      essentials: {
        course_name: row?.course_name ?? null,
        course_subtitle: row?.course_subtitle ?? null,
        course_description: row?.course_description ?? null,
        course_language: row?.course_language ?? null,
        course_type: row?.course_type ?? null,
        institution: row?.institution ?? null,
        teacher_id: row?.teacher_id ?? null,
        teacher_name: gs.teacher_name ?? null,
        teacher_id_from_generation_settings: gs.teacher_id ?? null,
      },
      classification: {
        class_year: cd.class_year ?? null,
        curricular_framework: cd.curricular_framework ?? null,
        domain: cd.domain ?? null,
        subject: cd.subject ?? null,
        topic: cd.topic ?? null,
        subtopic: cd.subtopic ?? null,
        previous_course: cd.previous_course ?? null,
        next_course: cd.next_course ?? null,
        prior_knowledge: cd.prior_knowledge ?? null,
        key_terms: cd.key_terms ?? [],
        mandatory_topics: cd.mandatory_topics ?? [],
        application_context: cd.application_context ?? null,
      },
      students: {
        method: so.method ?? null,
        total: so.total ?? null,
        synced: so.synced ?? null,
        students_count: Array.isArray(so.students) ? so.students.length : 0,
      },
      schedule: {
        schedule_mode: sch.schedule_mode ?? null,
        active_days: sch.active_days ?? [],
        start_date: sch.start_date ?? null,
        end_date: sch.end_date ?? null,
        start_time: sch.start_time ?? null,
        end_time: sch.end_time ?? null,
        target_sessions: sch.target_sessions ?? null,
        sessions_per_day: sch.sessions_per_day ?? null,
        repeat_unit: sch.repeat_unit ?? null,
        repeat_every: sch.repeat_every ?? null,
        repeat_cycles: sch.repeat_cycles ?? null,
        breaks: sch.breaks ?? [],
        generated_entries_count: Array.isArray(sch.generated_entries)
          ? sch.generated_entries.length
          : 0,
      },
      curriculum_structure: {
        ...sanitizedCurriculumInputs,
      },
      publishing_and_operations: {
        visibility: {
          visible: visibility.visible ?? null,
          enrollment: visibility.enrollment ?? null,
          approval: visibility.approval ?? null,
          notifications: visibility.notifications ?? null,
          public_discovery: visibility.public_discovery ?? null,
        },
        pricing: {
          pricing_model: pricing.pricing_model ?? null,
          base_price: pricing.base_price ?? null,
          currency: pricing.currency ?? null,
          trial: pricing.trial ?? null,
          discount_notes_present: hasValue(pricing.discount_notes),
        },
        marketplace: {
          listing_status: marketplace.listing_status ?? null,
          target_audience: marketplace.target_audience ?? null,
          revenue_share: marketplace.revenue_share ?? null,
          distribution_channels_present: hasValue(marketplace.distribution_channels),
        },
        integrations: {
          lms_provider: integrations.lms_provider ?? null,
          api_access: integrations.api_access ?? null,
          webhook_url_present: hasValue(integrations.webhook_url),
          integration_notes_present: hasValue(integrations.integration_notes),
        },
        communication: {
          announcement_channel: communication.announcement_channel ?? null,
          digest: communication.digest ?? null,
          office_hours_present: hasValue(communication.office_hours),
          welcome_message_present: hasValue(communication.welcome_message),
        },
      },
      settings: {
        engine: {
          page_size: gs.page_size ?? null,
          page_orientation: gs.page_orientation ?? null,
          page_count: gs.page_count ?? null,
          margins_mm: gs.margins_mm ?? null,
          print_options: gs.print_options ?? null,
          pedagogy: layout.pedagogy ?? null,
          visual_density: layout.visualDensity ?? null,
          body_block_gap: layout.bodyBlockGap ?? null,
        },
        generation_preferences: {
          selected_llm_model: gs.selected_llm_model ?? null,
          course_goals: gs.course_goals ?? [],
          resources_preferences: gs.resources_preferences ?? [],
        },
        template_preferences: {
          active_template_type: template.active_template_type ?? null,
          template_count: Array.isArray(template.templates) ? template.templates.length : 0,
        },
      },
    },
  }

  return {
    payload,
    metadataCoverage,
    generationReadiness,
    metadataPresentCount: allPresent.length,
    metadataMissingCount: allMissing.length,
    requiredPresentCount: requiredPresent.length,
    requiredMissingCount: requiredMissing.length,
  }
}

function formatJsonLikePrimitive(value: string | number | boolean | null): string {
  if (value === null) return "missing"
  if (typeof value === "boolean") return value ? "yes" : "no"
  if (typeof value === "number") return String(value)
  return value
}

function isJsonLikeObject(value: JsonLikeValue): value is JsonLikeObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function JsonLikeTree({ value, depth = 0 }: { value: JsonLikeObject; depth?: number }) {
  const entries = Object.entries(value)
  const indent = depth > 0 ? { paddingLeft: `${depth * 16}px` } : undefined

  return (
    <div className={depth === 0 ? "space-y-2.5" : "space-y-2"}>
      {entries.map(([key, entry]) => {
        const isMissingKey = key === "missing_fields" || key === "still_missing_for_generation"

        if (Array.isArray(entry)) {
          return (
            <div
              key={`${depth}-${key}`}
              className="rounded-lg border border-border/60 bg-background/60 px-3 py-2"
              style={indent}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold tracking-wide ${isMissingKey ? "text-destructive/75" : "text-foreground"}`}>
                  {toPlainFieldLabel(key)}
                </span>
                <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {entry.length} item{entry.length === 1 ? "" : "s"}
                </span>
              </div>
              {entry.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {entry.slice(0, 8).map((item, index) => (
                    <span
                      key={`${depth}-${key}-${index}`}
                      className={`rounded-full border px-2 py-0.5 text-[11px] leading-5 ${
                        isMissingKey
                          ? "border-destructive/25 bg-destructive/5 text-destructive/75"
                          : "border-border/80 bg-muted/20 text-foreground/90"
                      }`}
                    >
                      {typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null
                        ? formatJsonLikePrimitive(item)
                        : `Entry ${index + 1}`}
                    </span>
                  ))}
                  {entry.length > 8 && (
                    <span className="rounded-full border border-border bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                      +{entry.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        }

        if (isJsonLikeObject(entry)) {
          return (
            <div
              key={`${depth}-${key}`}
              className="rounded-lg border border-border/60 bg-background/60 px-3 py-2"
              style={indent}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wide text-foreground">{toPlainFieldLabel(key)}</span>
                <span className="text-[10px] text-muted-foreground">object</span>
              </div>
              <div className="mt-2 border-l border-border/80 pl-3">
                <JsonLikeTree value={entry} depth={depth + 1} />
              </div>
            </div>
          )
        }

        const isMissing = entry === null
        return (
          <div
            key={`${depth}-${key}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background/50 px-3 py-1.5"
            style={indent}
          >
            <span className="text-[11px] font-medium tracking-wide text-foreground">{toPlainFieldLabel(key)}</span>
            <span className={`text-xs ${isMissing ? "font-semibold text-destructive/75" : "text-foreground/90"}`}>
              {formatJsonLikePrimitive(entry)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function ContextSection({ courseId }: { courseId: string | null }) {
  const [row, setRow] = useState<CourseContextRow | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!courseId) {
      setRow(null)
      return
    }

    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from("courses")
        .select(
          "id, updated_at, course_name, course_subtitle, course_description, course_language, course_type, institution, teacher_id, generation_settings, classification_data, students_overview, schedule_settings, curriculum_data, course_layout, template_settings, visibility_settings, pricing_settings, marketplace_settings, integration_settings, communication_settings",
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
      .channel(`course-context-${courseId}`)
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

  const snapshot = useMemo(() => buildContextPayload(row), [row])
  const report = snapshot.payload as {
    teacher_setup_flow: {
      steps: Array<{
        section: string
        present: number
        total: number
        percent: number
        missing_fields: string[]
      }>
      completed_steps: number
      total_steps: number
    }
    pre_generation_context: {
      essentials: {
        course_name: string | null
        course_language: string | null
        institution: string | null
        teacher_name: string | null
      }
      students: {
        total: number | null
      }
      schedule: {
        generated_entries_count: number
      }
    }
    generation_required_missing_fields: string[]
  }
  const jsonLikeDocument = useMemo<JsonLikeObject>(() => {
    const essentials = report.pre_generation_context.essentials
    const students = report.pre_generation_context.students
    const schedule = report.pre_generation_context.schedule

    return {
      context_summary: {
        setup_progress: `${report.teacher_setup_flow.completed_steps} of ${report.teacher_setup_flow.total_steps} sections complete`,
        generation_readiness: `${snapshot.generationReadiness}%`,
        metadata_coverage: `${snapshot.metadataCoverage}%`,
      },
      key_facts: {
        course: essentials.course_name,
        teacher: essentials.teacher_name,
        language: essentials.course_language,
        institution: essentials.institution,
        students_total: students.total,
        scheduled_sessions: schedule.generated_entries_count,
      },
      setup_sections: report.teacher_setup_flow.steps.reduce<JsonLikeObject>((acc, step) => {
        acc[step.section] = {
          completion: `${step.percent}%`,
          fields_present: `${step.present} of ${step.total}`,
          missing_fields: step.missing_fields,
        }
        return acc
      }, {}),
      still_missing_for_generation: report.generation_required_missing_fields,
    }
  }, [report, snapshot.generationReadiness, snapshot.metadataCoverage])

  return (
    <SetupSection
      title="Context"
      description="Live context snapshot of setup values used to personalize tools, resources, and Atlas suggestions."
      headerActions={(
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
            {snapshot.generationReadiness}% generation-ready
          </span>
          {snapshot.requiredMissingCount > 0 && (
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-destructive">
              {snapshot.requiredMissingCount} required missing
            </span>
          )}
        </div>
      )}
    >
      {!courseId ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          Create the course in Essentials to unlock contextual JSON.
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-border/80 bg-gradient-to-b from-background to-accent/20 p-4 font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] sm:p-5">
          <JsonLikeTree value={jsonLikeDocument} />
          <p className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
            {loading ? "Loading context..." : "Context updates automatically when setup data changes."}
          </p>
        </div>
      )}
    </SetupSection>
  )
}
