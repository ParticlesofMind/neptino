export type JsonRecord = Record<string, unknown>

export type SetupReadinessSectionId =
  | "essentials"
  | "classification"
  | "curriculum"
  | "schedule"
  | "students"
  | "resources"
  | "data-management"
  | "pedagogy"
  | "templates"
  | "page-setup"
  | "ai-model"
  | "context"
  | "interface"
  | "visibility"
  | "communication"
  | "pricing"
  | "marketplace"
  | "integrations"

export type SetupCheckSeverity = "required" | "quality"

export type SetupQualityCheck = {
  label: string
  passed: boolean
  severity: SetupCheckSeverity
  path?: string
}

export type SetupSectionQuality = {
  id: SetupReadinessSectionId
  label: string
  requiredForGeneration: boolean
  recommendedBeforeGeneration: boolean
  complete: boolean
  score: number
  passedChecks: number
  totalChecks: number
  missing: string[]
  weak: string[]
  checks: SetupQualityCheck[]
}

export type SourceCoverageSummary = {
  sourcePreferencesConfirmed: boolean
  effectiveSourcePolicy: boolean
  rankedOpenSourceCount: number
  highPriorityOpenSourceCount: number
  licensePolicy: string | null
  citationStrictness: string | null
  attributionRetention: string | null
  provenanceTracking: boolean
  aiReuseConsent: string | null
  usingDefaultGovernance: boolean
}

export type SetupReadinessReport = {
  readyForGeneration: boolean
  generationScore: number
  qualityScore: number
  requiredSections: SetupSectionQuality[]
  recommendedSections: SetupSectionQuality[]
  sections: SetupSectionQuality[]
  missingCriticalFields: string[]
  weakFields: string[]
  strongestSignals: string[]
  recommendedNextAction: string
  sourceCoverage: SourceCoverageSummary
  missingBySection: Record<string, boolean>
}

export type CourseSetupReadinessInput = {
  course_name?: unknown
  course_description?: unknown
  course_language?: unknown
  course_type?: unknown
  teacher_id?: unknown
  institution_id?: unknown
  institution?: unknown
  generation_settings?: unknown
  classification_data?: unknown
  students_overview?: unknown
  schedule_settings?: unknown
  curriculum_data?: unknown
  course_layout?: unknown
  template_settings?: unknown
  visibility_settings?: unknown
  pricing_settings?: unknown
  marketplace_settings?: unknown
  integration_settings?: unknown
  communication_settings?: unknown
}

const REQUIRED_GENERATION_IDS: SetupReadinessSectionId[] = [
  "essentials",
  "classification",
  "schedule",
  "students",
  "pedagogy",
  "templates",
]

const RECOMMENDED_GENERATION_IDS: SetupReadinessSectionId[] = [
  "curriculum",
  "page-setup",
  "ai-model",
  "resources",
  "data-management",
]

const PLACEHOLDER_TEXT = new Set([
  "untitled",
  "untitled course",
  "new course",
  "test",
  "testing",
  "tbd",
  "todo",
  "placeholder",
  "description",
])

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function listLength(value: unknown): number {
  return Array.isArray(value) ? value.filter((item) => hasValue(item)).length : 0
}

function hasValue(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "boolean") return true
  if (Array.isArray(value)) return value.some((item) => hasValue(item))
  if (typeof value === "object") return Object.keys(value as JsonRecord).length > 0
  return false
}

function hasUsefulText(value: unknown, minChars = 1): boolean {
  const text = asString(value)
  if (text.length < minChars) return false
  return !PLACEHOLDER_TEXT.has(text.toLowerCase())
}

function hasReflectiveText(value: unknown, minWords = 8): boolean {
  const text = asString(value)
  if (!hasUsefulText(text, 24)) return false
  return text.split(/\s+/).filter(Boolean).length >= minWords
}

function hasPositiveNumber(value: unknown): boolean {
  const number = asNumber(value)
  return number !== null && number > 0
}

function hasClassificationValue(data: JsonRecord, key: "domain" | "subject" | "topic"): boolean {
  return hasUsefulText(data[key]) || hasUsefulText(data[`${key}_label`])
}

function check(
  label: string,
  passed: boolean,
  severity: SetupCheckSeverity = "required",
  path?: string,
): SetupQualityCheck {
  return { label, passed, severity, path }
}

function buildSection(
  id: SetupReadinessSectionId,
  label: string,
  checks: SetupQualityCheck[],
): SetupSectionQuality {
  const requiredForGeneration = REQUIRED_GENERATION_IDS.includes(id)
  const recommendedBeforeGeneration = RECOMMENDED_GENERATION_IDS.includes(id)
  const passedChecks = checks.filter((item) => item.passed).length
  const totalChecks = checks.length
  const score = totalChecks === 0 ? 0 : Math.round((passedChecks / totalChecks) * 100)
  const missing = checks
    .filter((item) => !item.passed && item.severity === "required")
    .map((item) => item.label)
  const weak = checks
    .filter((item) => !item.passed && item.severity === "quality")
    .map((item) => item.label)

  return {
    id,
    label,
    requiredForGeneration,
    recommendedBeforeGeneration,
    complete: missing.length === 0,
    score,
    passedChecks,
    totalChecks,
    missing,
    weak,
    checks,
  }
}

function hasPedagogyPosition(layout: JsonRecord): boolean {
  const pedagogy = asRecord(layout.pedagogy)
  return asNumber(pedagogy.x) !== null && asNumber(pedagogy.y) !== null
}

function getDataManagement(settings: JsonRecord): JsonRecord {
  return asRecord(settings.data_management)
}

function sourceCoverage(settings: JsonRecord): SourceCoverageSummary {
  const preferences = Array.isArray(settings.resources_preferences)
    ? settings.resources_preferences.map((item) => asRecord(item))
    : []
  const openSources = preferences.filter((item) => asString(item.id) !== "neptino")
  const rankedOpenSourceCount = openSources.filter((item) => hasValue(item.priority)).length
  const highPriorityOpenSourceCount = openSources.filter((item) => {
    const priority = asString(item.priority)
    return priority === "high" || priority === "very_high"
  }).length
  const dataManagement = getDataManagement(settings)

  return {
    sourcePreferencesConfirmed: settings.resources_preferences_confirmed === true,
    effectiveSourcePolicy: true,
    rankedOpenSourceCount,
    highPriorityOpenSourceCount,
    licensePolicy: asString(dataManagement.license_policy) || "open-first",
    citationStrictness: asString(dataManagement.citation_strictness) || "strict",
    attributionRetention: asString(dataManagement.attribution_retention) || "retain-with-course",
    provenanceTracking: dataManagement.provenance_tracking !== false,
    aiReuseConsent: asString(dataManagement.ai_reuse_consent) || "course-only",
    usingDefaultGovernance: Object.keys(dataManagement).length === 0 && settings.resources_preferences_confirmed !== true,
  }
}

function scheduleHasDates(entries: JsonRecord[]): boolean {
  return entries.some((entry) => hasUsefulText(entry.date))
}

function scheduleHasTimes(entries: JsonRecord[], schedule: JsonRecord): boolean {
  return entries.some((entry) =>
    (hasUsefulText(entry.start_time) || hasUsefulText(schedule.start_time)) &&
    (hasUsefulText(entry.end_time) || hasUsefulText(schedule.end_time)),
  )
}

function compactIssue(section: SetupSectionQuality): string {
  const labels = section.missing.slice(0, 3).join(", ")
  const suffix = section.missing.length > 3 ? `, and ${section.missing.length - 3} more` : ""
  return `Complete ${section.label}: ${labels}${suffix}.`
}

function buildStrongestSignals(row: CourseSetupReadinessInput, reportSections: SetupSectionQuality[]): string[] {
  const classification = asRecord(row.classification_data)
  const students = asRecord(row.students_overview)
  const schedule = asRecord(row.schedule_settings)
  const curriculum = asRecord(row.curriculum_data)
  const layout = asRecord(row.course_layout)
  const signals: string[] = []

  if (hasUsefulText(row.course_name)) signals.push(`Course identity: ${asString(row.course_name)}`)
  if (hasReflectiveText(row.course_description, 12)) signals.push("Course description contains usable teacher intent")
  if (hasUsefulText(classification.subject) && hasUsefulText(classification.topic)) {
    signals.push(`Subject focus: ${asString(classification.subject)} / ${asString(classification.topic)}`)
  }
  if (listLength(classification.key_terms) >= 3) signals.push(`${listLength(classification.key_terms)} key terms`)
  if (listLength(classification.mandatory_topics) >= 3) signals.push(`${listLength(classification.mandatory_topics)} mandatory topics`)
  if (hasPositiveNumber(students.total)) signals.push(`${asNumber(students.total)} planned student(s)`)
  if (listLength(schedule.generated_entries) > 0) signals.push(`${listLength(schedule.generated_entries)} scheduled session(s)`)
  if (listLength(curriculum.session_rows) > 0) signals.push(`${listLength(curriculum.session_rows)} curriculum row(s)`)
  if (hasPedagogyPosition(layout)) signals.push("Pedagogy position is explicit")

  const completedRequired = reportSections.filter((section) => section.requiredForGeneration && section.complete).length
  if (completedRequired > 0) signals.push(`${completedRequired} of ${REQUIRED_GENERATION_IDS.length} generation-critical sections complete`)

  return signals.slice(0, 8)
}

export function evaluateCourseSetupReadiness(row: CourseSetupReadinessInput | null): SetupReadinessReport {
  const source = row ?? {}
  const settings = asRecord(source.generation_settings)
  const classification = asRecord(source.classification_data)
  const students = asRecord(source.students_overview)
  const schedule = asRecord(source.schedule_settings)
  const curriculum = asRecord(source.curriculum_data)
  const layout = asRecord(source.course_layout)
  const visibility = asRecord(source.visibility_settings)
  const pricing = asRecord(source.pricing_settings)
  const marketplace = asRecord(source.marketplace_settings)
  const integrations = asRecord(source.integration_settings)
  const communication = asRecord(source.communication_settings)
  const dataManagement = getDataManagement(settings)
  const scheduleEntries = Array.isArray(schedule.generated_entries)
    ? schedule.generated_entries.map((item) => asRecord(item))
    : []
  const sourceSummary = sourceCoverage(settings)

  const sections = [
    buildSection("essentials", "Essentials", [
      check("Meaningful course title", hasUsefulText(source.course_name, 4), "required", "course_name"),
      check("Non-placeholder course description", hasReflectiveText(source.course_description, 12), "required", "course_description"),
      check("Course language", hasUsefulText(source.course_language), "required", "course_language"),
      check("Course type", hasUsefulText(source.course_type), "required", "course_type"),
      check("Teacher identity", hasUsefulText(source.teacher_id) || hasUsefulText(settings.teacher_id) || hasUsefulText(settings.teacher_name), "required", "teacher_id"),
      check("Institution context", hasUsefulText(source.institution) || hasUsefulText(source.institution_id), "required", "institution"),
    ]),
    buildSection("classification", "Classification", [
      check("Class year", hasUsefulText(classification.class_year), "required", "classification_data.class_year"),
      check("Domain", hasClassificationValue(classification, "domain"), "required", "classification_data.domain"),
      check("Subject", hasClassificationValue(classification, "subject"), "required", "classification_data.subject"),
      check("Topic", hasClassificationValue(classification, "topic"), "required", "classification_data.topic"),
      check("Prior knowledge is specific", hasReflectiveText(classification.prior_knowledge, 5), "required", "classification_data.prior_knowledge"),
      check("At least 3 key terms", listLength(classification.key_terms) >= 3, "required", "classification_data.key_terms"),
      check("At least 3 mandatory topics", listLength(classification.mandatory_topics) >= 3, "required", "classification_data.mandatory_topics"),
      check("Application context", hasReflectiveText(classification.application_context, 5), "quality", "classification_data.application_context"),
    ]),
    buildSection("students", "Students", [
      check("Student count or roster", hasPositiveNumber(students.total) || listLength(students.students) > 0, "required", "students_overview.total"),
      check("Roster method", hasUsefulText(students.method), "quality", "students_overview.method"),
    ]),
    buildSection("schedule", "Schedule", [
      check("Generated schedule entries", scheduleEntries.length > 0, "required", "schedule_settings.generated_entries"),
      check("Session dates present", scheduleHasDates(scheduleEntries), "required", "schedule_settings.generated_entries"),
      check("Session times present", scheduleHasTimes(scheduleEntries, schedule), "quality", "schedule_settings.generated_entries"),
      check("Course rhythm selected", listLength(schedule.active_days) > 0 || hasUsefulText(schedule.schedule_mode), "quality", "schedule_settings.active_days"),
    ]),
    buildSection("curriculum", "Curriculum", [
      check("Session count", hasPositiveNumber(curriculum.session_count) || scheduleEntries.length > 0, "required", "curriculum_data.session_count"),
      check("Module organization", hasUsefulText(curriculum.module_org), "required", "curriculum_data.module_org"),
      check("Content volume", hasUsefulText(curriculum.content_volume), "required", "curriculum_data.content_volume"),
      check("Topics per session", hasPositiveNumber(curriculum.topics), "required", "curriculum_data.topics"),
      check("Objectives per topic", hasPositiveNumber(curriculum.objectives), "required", "curriculum_data.objectives"),
      check("Tasks per objective", hasPositiveNumber(curriculum.tasks), "required", "curriculum_data.tasks"),
      check("Sequencing mode", hasUsefulText(curriculum.sequencing_mode), "required", "curriculum_data.sequencing_mode"),
      check("Session rows", listLength(curriculum.session_rows) > 0, "required", "curriculum_data.session_rows"),
      check("Naming rules", hasValue(curriculum.naming_rules), "quality", "curriculum_data.naming_rules"),
    ]),
    buildSection("resources", "Resources", [
      check("Effective source policy", sourceSummary.effectiveSourcePolicy, "required", "generation_settings.resources_preferences"),
      check("Explicit source priorities or Neptino defaults", sourceSummary.sourcePreferencesConfirmed || sourceSummary.rankedOpenSourceCount >= 3 || sourceSummary.usingDefaultGovernance, "quality", "generation_settings.resources_preferences_confirmed"),
      check("Open-source preferences available", sourceSummary.rankedOpenSourceCount >= 3 || sourceSummary.usingDefaultGovernance, "quality", "generation_settings.resources_preferences"),
      check("At least one high-priority open source", sourceSummary.highPriorityOpenSourceCount >= 1 || sourceSummary.usingDefaultGovernance, "quality", "generation_settings.resources_preferences"),
    ]),
    buildSection("pedagogy", "Pedagogy", [
      check("Pedagogy coordinate selected", hasPedagogyPosition(layout), "required", "course_layout.pedagogy"),
    ]),
    buildSection("data-management", "Data Management", [
      check("Effective license policy", true, "required", "generation_settings.data_management.license_policy"),
      check("Effective citation strictness", true, "required", "generation_settings.data_management.citation_strictness"),
      check("Effective attribution retention", true, "required", "generation_settings.data_management.attribution_retention"),
      check("Generated-content provenance", dataManagement.provenance_tracking !== false, "required", "generation_settings.data_management.provenance_tracking"),
      check("Effective student telemetry retention", true, "quality", "generation_settings.data_management.telemetry_retention"),
      check("Effective export policy", true, "quality", "generation_settings.data_management.export_policy"),
      check("Effective deletion policy", true, "quality", "generation_settings.data_management.deletion_policy"),
      check("Effective AI reuse consent", true, "quality", "generation_settings.data_management.ai_reuse_consent"),
    ]),
    buildSection("templates", "Templates", [
      check("Built-in template library available", true, "required", "template_settings.templates"),
      check("Default lesson template available", true, "required", "template_settings.active_template_type"),
      check("Custom template overrides optional", true, "quality", "template_settings.templates"),
    ]),
    buildSection("page-setup", "Page Setup", [
      check("Page size", hasUsefulText(settings.page_size), "required", "generation_settings.page_size"),
      check("Page orientation", hasUsefulText(settings.page_orientation), "required", "generation_settings.page_orientation"),
      check("Page count", hasPositiveNumber(settings.page_count), "required", "generation_settings.page_count"),
      check("Margins", hasValue(settings.margins_mm), "required", "generation_settings.margins_mm"),
      check("Print options", hasValue(settings.print_options), "quality", "generation_settings.print_options"),
    ]),
    buildSection("ai-model", "AI Model", [
      check("Selected model", hasUsefulText(settings.selected_llm_model), "required", "generation_settings.selected_llm_model"),
    ]),
    buildSection("context", "Context", [
      check("Diagnostic data available", true, "quality"),
    ]),
    buildSection("interface", "Interface", [
      check("Visual density", hasUsefulText(layout.visualDensity), "required", "course_layout.visualDensity"),
      check("Body block gap", hasValue(layout.bodyBlockGap), "quality", "course_layout.bodyBlockGap"),
    ]),
    buildSection("visibility", "Visibility", [
      check("Visibility setting", hasValue(visibility.visible), "required", "visibility_settings.visible"),
      check("Enrollment setting", hasUsefulText(visibility.enrollment), "quality", "visibility_settings.enrollment"),
    ]),
    buildSection("communication", "Communication", [
      check("Announcement channel", hasUsefulText(communication.announcement_channel), "required", "communication_settings.announcement_channel"),
      check("Welcome message", hasUsefulText(communication.welcome_message), "quality", "communication_settings.welcome_message"),
    ]),
    buildSection("pricing", "Pricing And Monetization", [
      check("Pricing model", hasUsefulText(pricing.pricing_model), "required", "pricing_settings.pricing_model"),
      check("Currency", hasUsefulText(pricing.currency), "quality", "pricing_settings.currency"),
    ]),
    buildSection("marketplace", "Marketplace", [
      check("Listing status", hasUsefulText(marketplace.listing_status), "required", "marketplace_settings.listing_status"),
      check("Target audience", hasUsefulText(marketplace.target_audience), "quality", "marketplace_settings.target_audience"),
    ]),
    buildSection("integrations", "External Integrations", [
      check("Provider or explicit none", hasUsefulText(integrations.lms_provider), "quality", "integration_settings.lms_provider"),
    ]),
  ]

  const requiredSections = sections.filter((section) => section.requiredForGeneration)
  const recommendedSections = sections.filter((section) => section.recommendedBeforeGeneration)
  const readyForGeneration = requiredSections.every((section) => section.complete)
  const generationScore = Math.round(requiredSections.reduce((sum, section) => sum + section.score, 0) / requiredSections.length)
  const qualityScore = Math.round(sections.reduce((sum, section) => sum + section.score, 0) / sections.length)
  const missingCriticalFields = requiredSections.flatMap((section) => section.missing.map((item) => `${section.label}: ${item}`))
  const weakFields = sections.flatMap((section) => section.weak.map((item) => `${section.label}: ${item}`))
  const firstMissingRequired = requiredSections.find((section) => !section.complete)
  const firstMissingRecommended = recommendedSections.find((section) => !section.complete)
  const recommendedNextAction = firstMissingRequired
    ? compactIssue(firstMissingRequired)
    : firstMissingRecommended
      ? `Strengthen ${firstMissingRecommended.label}: ${firstMissingRecommended.missing[0] ?? firstMissingRecommended.weak[0] ?? "review settings"}.`
      : "Generation-critical setup is complete. Review the generated curriculum before publishing."

  return {
    readyForGeneration,
    generationScore,
    qualityScore,
    requiredSections,
    recommendedSections,
    sections,
    missingCriticalFields,
    weakFields,
    strongestSignals: buildStrongestSignals(source, sections),
    recommendedNextAction,
    sourceCoverage: sourceSummary,
    missingBySection: sections.reduce<Record<string, boolean>>((acc, section) => {
      acc[section.id] = !section.complete
      return acc
    }, {}),
  }
}
