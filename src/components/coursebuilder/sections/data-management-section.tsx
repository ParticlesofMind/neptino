"use client"

import { useCallback, useRef, useState } from "react"
import {
  FieldLabel,
  PRIMARY_ACTION_BUTTON_CLASS,
  SaveStatusBar,
  SelectInput,
  SetupSection,
  SetupPanels,
  updateCourseById,
  useCourseRowLoader,
  useCourseSectionSave,
  useDebouncedChangeSave,
} from "@/components/coursebuilder"
import { OverlineLabel } from "@/components/ui/overline-label"

type DataManagementSettings = {
  license_policy: string
  citation_strictness: string
  attribution_retention: string
  provenance_tracking: boolean
  telemetry_categories: string
  telemetry_retention: string
  export_policy: string
  deletion_policy: string
  ai_reuse_consent: string
  notes: string | null
}

const DEFAULT_DATA_MANAGEMENT: DataManagementSettings = {
  license_policy: "open-first",
  citation_strictness: "strict",
  attribution_retention: "retain-with-course",
  provenance_tracking: true,
  telemetry_categories: "progress-and-feedback",
  telemetry_retention: "course-lifetime",
  export_policy: "teacher-and-institution",
  deletion_policy: "delete-on-request",
  ai_reuse_consent: "course-only",
  notes: null,
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback
}

function mergeDataManagement(value: unknown): DataManagementSettings {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

  return {
    license_policy: asString(source.license_policy, DEFAULT_DATA_MANAGEMENT.license_policy),
    citation_strictness: asString(source.citation_strictness, DEFAULT_DATA_MANAGEMENT.citation_strictness),
    attribution_retention: asString(source.attribution_retention, DEFAULT_DATA_MANAGEMENT.attribution_retention),
    provenance_tracking: typeof source.provenance_tracking === "boolean"
      ? source.provenance_tracking
      : DEFAULT_DATA_MANAGEMENT.provenance_tracking,
    telemetry_categories: asString(source.telemetry_categories, DEFAULT_DATA_MANAGEMENT.telemetry_categories),
    telemetry_retention: asString(source.telemetry_retention, DEFAULT_DATA_MANAGEMENT.telemetry_retention),
    export_policy: asString(source.export_policy, DEFAULT_DATA_MANAGEMENT.export_policy),
    deletion_policy: asString(source.deletion_policy, DEFAULT_DATA_MANAGEMENT.deletion_policy),
    ai_reuse_consent: asString(source.ai_reuse_consent, DEFAULT_DATA_MANAGEMENT.ai_reuse_consent),
    notes: typeof source.notes === "string" && source.notes.trim() ? source.notes : null,
  }
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-xs font-medium text-foreground">{value}</span>
    </div>
  )
}

export function DataManagementSection({ courseId }: { courseId: string | null }) {
  const [settings, setSettings] = useState<DataManagementSettings>(DEFAULT_DATA_MANAGEMENT)
  const generationSettingsRef = useRef<Record<string, unknown> | null>(null)
  const { saveStatus, lastSavedAt, runWithSaveState } = useCourseSectionSave()

  useCourseRowLoader<{ generation_settings: Record<string, unknown> | null }>({
    courseId,
    select: "generation_settings",
    onLoaded: (row) => {
      const generationSettings = row.generation_settings ?? {}
      generationSettingsRef.current = generationSettings
      setSettings(mergeDataManagement(generationSettings.data_management))
    },
  })

  const updateSetting = <K extends keyof DataManagementSettings>(key: K, value: DataManagementSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = useCallback(async () => {
    if (!courseId) return
    await runWithSaveState(async () => {
      const updatedAt = new Date().toISOString()
      const existing = generationSettingsRef.current ?? {}
      const nextSettings = {
        ...existing,
        data_management: {
          ...settings,
          updated_at: updatedAt,
        },
      }
      const { error } = await updateCourseById(courseId, {
        generation_settings: nextSettings,
        updated_at: updatedAt,
      })

      if (!error) {
        generationSettingsRef.current = nextSettings
      }

      return !error
    })
  }, [courseId, runWithSaveState, settings])

  useDebouncedChangeSave(handleSave, 900, Boolean(courseId))

  const configuredCount = [
    settings.license_policy,
    settings.citation_strictness,
    settings.attribution_retention,
    settings.telemetry_categories,
    settings.telemetry_retention,
    settings.export_policy,
    settings.deletion_policy,
    settings.ai_reuse_consent,
  ].filter(Boolean).length + (settings.provenance_tracking ? 1 : 0)

  return (
    <SetupSection
      title="Data Management"
      description="Define source, attribution, provenance, retention, export, deletion, and AI reuse policies."
      headerActions={(
        <button type="button" onClick={() => void handleSave()} disabled={!courseId} className={PRIMARY_ACTION_BUTTON_CLASS}>
          Save Policy
        </button>
      )}
    >
      <SetupPanels
        configClassName="space-y-5"
        previewClassName="space-y-4"
        config={(
          <>
            <div className="rounded-lg border border-border bg-background p-4">
              <OverlineLabel className="mb-4">Sources And Attribution</OverlineLabel>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Source And License Policy</FieldLabel>
                  <SelectInput value={settings.license_policy} onChange={(e) => updateSetting("license_policy", e.target.value)}>
                    <option value="open-first">Open and institution-approved sources first</option>
                    <option value="open-only">Open-licensed and public domain only</option>
                    <option value="institution-approved">Institution-approved sources only</option>
                    <option value="teacher-approved">Teacher-approved sources only</option>
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Citation Strictness</FieldLabel>
                  <SelectInput value={settings.citation_strictness} onChange={(e) => updateSetting("citation_strictness", e.target.value)}>
                    <option value="strict">Require citation for generated factual claims</option>
                    <option value="standard">Cite primary sources for important claims</option>
                    <option value="light">Cite only external readings and media</option>
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Attribution Retention</FieldLabel>
                  <SelectInput value={settings.attribution_retention} onChange={(e) => updateSetting("attribution_retention", e.target.value)}>
                    <option value="retain-with-course">Retain with course content</option>
                    <option value="retain-with-exports">Retain with course and exports</option>
                    <option value="retain-audit-only">Retain in audit history only</option>
                  </SelectInput>
                </div>
                <label className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={settings.provenance_tracking}
                    onChange={(e) => updateSetting("provenance_tracking", e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">Track generated-content provenance</span>
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <OverlineLabel className="mb-4">Student Data And Reuse</OverlineLabel>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Progress Telemetry</FieldLabel>
                  <SelectInput value={settings.telemetry_categories} onChange={(e) => updateSetting("telemetry_categories", e.target.value)}>
                    <option value="progress-and-feedback">Progress, submissions, feedback, and corrections</option>
                    <option value="progress-only">Progress and completion only</option>
                    <option value="minimal">Minimal operational data only</option>
                    <option value="none">No student progress telemetry</option>
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Telemetry Retention</FieldLabel>
                  <SelectInput value={settings.telemetry_retention} onChange={(e) => updateSetting("telemetry_retention", e.target.value)}>
                    <option value="course-lifetime">Retain for course lifetime</option>
                    <option value="academic-year">Retain for the academic year</option>
                    <option value="90-days">Retain for 90 days after course end</option>
                    <option value="manual-review">Manual review before deletion</option>
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Export Controls</FieldLabel>
                  <SelectInput value={settings.export_policy} onChange={(e) => updateSetting("export_policy", e.target.value)}>
                    <option value="teacher-and-institution">Teacher and institution export allowed</option>
                    <option value="teacher-only">Teacher export only</option>
                    <option value="institution-only">Institution export only</option>
                    <option value="disabled">Exports disabled</option>
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>Deletion Rules</FieldLabel>
                  <SelectInput value={settings.deletion_policy} onChange={(e) => updateSetting("deletion_policy", e.target.value)}>
                    <option value="delete-on-request">Delete student-linked records on request</option>
                    <option value="archive-then-delete">Archive, then delete after review</option>
                    <option value="retain-anonymized">Retain anonymized course analytics</option>
                  </SelectInput>
                </div>
                <div>
                  <FieldLabel>AI Training And Reuse Consent</FieldLabel>
                  <SelectInput value={settings.ai_reuse_consent} onChange={(e) => updateSetting("ai_reuse_consent", e.target.value)}>
                    <option value="course-only">Use only inside this course</option>
                    <option value="institution-only">Reuse within this institution</option>
                    <option value="anonymized-product-improvement">Allow anonymized product improvement</option>
                    <option value="none">Do not reuse for AI improvement</option>
                  </SelectInput>
                </div>
              </div>
              <div className="mt-4">
                <FieldLabel hint="optional">Policy Notes</FieldLabel>
                <textarea
                  rows={4}
                  value={settings.notes ?? ""}
                  onChange={(e) => updateSetting("notes", e.target.value.trim() ? e.target.value : null)}
                  placeholder="Institutional requirements, approved repositories, copyright exceptions, or local retention rules"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                />
              </div>
            </div>
            <SaveStatusBar status={saveStatus} lastSavedAt={lastSavedAt} />
          </>
        )}
        preview={(
          <>
            <div className="rounded-lg border border-border bg-background p-4">
              <OverlineLabel>Audit Readiness</OverlineLabel>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-foreground">{configuredCount}/9</span>
                <span className="text-xs text-muted-foreground">policy controls configured</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                These settings are stored with the course generation settings and become part of the course intelligence context.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <OverlineLabel>Current Policy</OverlineLabel>
              <div className="mt-3">
                <PolicyRow label="License" value={settings.license_policy} />
                <PolicyRow label="Citation" value={settings.citation_strictness} />
                <PolicyRow label="Attribution" value={settings.attribution_retention} />
                <PolicyRow label="Provenance" value={settings.provenance_tracking ? "tracked" : "not tracked"} />
                <PolicyRow label="Telemetry" value={settings.telemetry_categories} />
                <PolicyRow label="Retention" value={settings.telemetry_retention} />
                <PolicyRow label="Export" value={settings.export_policy} />
                <PolicyRow label="Deletion" value={settings.deletion_policy} />
                <PolicyRow label="AI reuse" value={settings.ai_reuse_consent} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Review loop</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Student progress, correction history, source provenance, and generated-content attribution can now be governed before content generation begins.
              </p>
            </div>
          </>
        )}
      />
    </SetupSection>
  )
}
