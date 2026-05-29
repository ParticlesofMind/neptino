"use client"

import { useCallback, useMemo, useState } from "react"
import {
  buildClassificationUpdatePayload,
  CourseImagePreview,
  CoursePreviewCard,
  CoursePreviewChip,
  FieldLabel,
  mapClassificationDataToState,
  SearchableSelect,
  SetupColumn,
  SetupPanelLayout,
  SetupSection,
  updateCourseById,
  useCourseRowLoader,
  useCourseSectionSave,
  useSteadyLoading,
  useDebouncedChangeSave,
  useStringListInput,
  type IscedDomain,
} from "@/components/coursebuilder"
import iscedData from "@/data/isced2011.json"
import { OverlineLabel } from "@/components/ui/overline-label"
import { buildClassificationGuidance, formatSuggestedPathLabel } from "@/lib/curriculum/classification-guidance"
import { CLASS_YEARS } from "./classification-section-data"
import { ClassificationContextFields } from "./classification-context-fields"
import { ProgramPlacementSection } from "./program-placement-section"
import type { CourseCreatedData } from "@/components/coursebuilder/builder-types"

type ClassificationRow = {
  classification_data: Record<string, string> | null
  institution_id: string | null
  teacher_id: string | null
}

function Divider({ label }: { label: string }) {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <OverlineLabel className="mb-4">{label}</OverlineLabel>
    </div>
  )
}

function mergeUniqueItems(current: string[], additions: string[], maxItems: number): string[] {
  const seen = new Set(current.map((item) => item.trim().toLowerCase()).filter(Boolean))
  const merged = [...current]

  additions.forEach((item) => {
    const clean = item.trim()
    const key = clean.toLowerCase()
    if (!clean || seen.has(key) || merged.length >= maxItems) return
    seen.add(key)
    merged.push(clean)
  })

  return merged
}

export function ClassificationSection({
  courseCreatedData,
  courseId,
}: {
  courseCreatedData: CourseCreatedData | null
  courseId: string | null
}) {
  const [classYear, setClassYear] = useState("")
  const [domain, setDomain] = useState("")
  const [subject, setSubject] = useState("")
  const [topic, setTopic] = useState("")
  const [subtopic, setSubtopic] = useState("")
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [priorKnowledge, setPriorKnowledge] = useState("")
  const keyTerms = useStringListInput({ maxItems: 30, maxDraftLength: 60 })
  const mandatoryTopics = useStringListInput({ maxItems: 20, maxDraftLength: 100 })
  const [applicationContext, setApplicationContext] = useState("")
  const { runWithSaveState } = useCourseSectionSave()

  // ISCED data types and loading
  const domains = (iscedData as { domains: IscedDomain[] }).domains

  const { loading } = useCourseRowLoader<ClassificationRow>({
    courseId,
    select: "classification_data, institution_id, teacher_id",
    onLoaded: (row) => {
      setInstitutionId(row.institution_id)
      setTeacherId(row.teacher_id)
      const hydrated = mapClassificationDataToState(row.classification_data, domains)
      if (!hydrated) return

      setClassYear(hydrated.classYear)
      setDomain(hydrated.domain)
      setSubject(hydrated.subject)
      setTopic(hydrated.topic)
      setSubtopic(hydrated.subtopic)
      setPriorKnowledge(hydrated.priorKnowledge)
      if (hydrated.keyTerms) keyTerms.setItems(hydrated.keyTerms)
      if (hydrated.mandatoryTopics) mandatoryTopics.setItems(hydrated.mandatoryTopics)
      setApplicationContext(hydrated.applicationContext)
    },
  })
  const showLoading = useSteadyLoading(loading)

  const handleSave = useCallback(async () => {
    if (!courseId) return
    await runWithSaveState(async () => {
      const updatedAt = new Date().toISOString()
      const payload = buildClassificationUpdatePayload({
        classYear,
        domain,
        subject,
        topic,
        subtopic,
        priorKnowledge,
        keyTerms: keyTerms.items,
        mandatoryTopics: mandatoryTopics.items,
        applicationContext,
        currentCourseTitle: courseCreatedData?.title ?? null,
        domains,
        updatedAt,
      })

      const { error } = await updateCourseById(courseId, payload)

      return !error
    })
  }, [runWithSaveState, courseId, classYear, domain, subject, topic, subtopic, courseCreatedData?.title, domains, priorKnowledge, keyTerms.items, mandatoryTopics.items, applicationContext])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId) && !loading)

  const classYears = CLASS_YEARS

    // Helper to match display string "01 — Education" or legacy value "education"
  const selectedDomain = domains.find((d) => `${d.code} — ${d.label}` === domain || d.value === domain)
  const subjects = selectedDomain?.subjects ?? []
  const selectedSubject = subjects.find((s) => `${s.code} — ${s.label}` === subject || s.value === subject)
  const topics = selectedSubject?.topics ?? []
  const selectedTopic = topics.find((t) => `${t.code} — ${t.label}` === topic || t.value === topic)
  const subtopics = selectedTopic?.subtopics ?? []

  const crumbs = [
    selectedDomain?.label,
    selectedSubject?.label,
    selectedTopic?.label,
    subtopics.find((s) => s.label === subtopic || s.value === subtopic)?.label,
  ].filter(Boolean) as string[]

  const guidance = useMemo(() => buildClassificationGuidance({
    courseTitle: courseCreatedData?.title ?? null,
    courseSubtitle: courseCreatedData?.subtitle ?? null,
    courseDescription: courseCreatedData?.description ?? null,
    classYear,
    currentDomain: domain,
    currentSubject: subject,
    currentTopic: topic,
    currentSubtopic: subtopic,
    domains,
  }), [classYear, courseCreatedData?.description, courseCreatedData?.subtitle, courseCreatedData?.title, domain, domains, subject, subtopic, topic])

  const applySuggestedPath = useCallback(() => {
    if (!guidance.suggestedPath) return

    setDomain(`${guidance.suggestedPath.domain.code} — ${guidance.suggestedPath.domain.label}`)
    setSubject(`${guidance.suggestedPath.subject.code} — ${guidance.suggestedPath.subject.label}`)
    setTopic(`${guidance.suggestedPath.topic.code} — ${guidance.suggestedPath.topic.label}`)
    setSubtopic(guidance.suggestedPath.subtopic?.label ?? "")
  }, [guidance.suggestedPath])

  const addSuggestedKeyTerms = useCallback(() => {
    keyTerms.setItems(mergeUniqueItems(keyTerms.items, guidance.keyTerms, 30))
  }, [guidance.keyTerms, keyTerms])

  const addSuggestedMandatoryTopics = useCallback(() => {
    mandatoryTopics.setItems(mergeUniqueItems(mandatoryTopics.items, guidance.mandatoryTopics, 20))
  }, [guidance.mandatoryTopics, mandatoryTopics])

  const suggestedPathApplied = Boolean(
    guidance.suggestedPath
      && selectedDomain?.value === guidance.suggestedPath.domain.value
      && selectedSubject?.value === guidance.suggestedPath.subject.value
      && selectedTopic?.value === guidance.suggestedPath.topic.value
      && (!guidance.suggestedPath.subtopic || subtopic === guidance.suggestedPath.subtopic.label),
  )

  if (showLoading) {
    return (
      <SetupSection title="Classification" description="Subject matter hierarchy and course positioning.">
        <SetupPanelLayout>
          <SetupColumn className="space-y-4">
            <div className="h-5 w-40 rounded bg-muted/70" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-10 rounded bg-muted/60" />
              <div className="h-10 rounded bg-muted/60" />
            </div>
            <div className="h-px w-full bg-border" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-10 rounded bg-muted/60" />
              <div className="h-10 rounded bg-muted/60" />
              <div className="h-10 rounded bg-muted/60" />
              <div className="h-10 rounded bg-muted/60" />
            </div>
          </SetupColumn>
          <SetupColumn>
            <div className="h-64 rounded bg-muted/50" />
          </SetupColumn>
        </SetupPanelLayout>
      </SetupSection>
    )
  }

  return (
    <SetupSection title="Classification" description="Subject matter hierarchy and course positioning.">
      <SetupPanelLayout>
        <SetupColumn className="space-y-5">
          <div className="rounded-lg border border-border bg-background p-5">
            <OverlineLabel className="mb-3">Course Positioning</OverlineLabel>
            <p className="mb-4 text-sm text-muted-foreground">
              Start with the information teachers usually know immediately. Program alignment can be handled by the institution later through concrete requirements.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Class Year</FieldLabel>
                <SearchableSelect
                  value={classYear}
                  onChange={setClassYear}
                  options={classYears}
                  placeholder="Select year..."
                  searchThreshold={15}
                />
              </div>
            </div>
          </div>

          <Divider label="Assisted Subject Classification" />
          {guidance.suggestedPath && (
            <div className="rounded-lg border border-primary/20 bg-accent/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <OverlineLabel className="mb-1">Suggested ISCED Path</OverlineLabel>
                  <p className="text-sm font-medium text-foreground">{formatSuggestedPathLabel(guidance.suggestedPath)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Confidence: {guidance.suggestedPath.confidence}. Review and adjust the fields below if the path is too broad.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applySuggestedPath}
                  disabled={suggestedPathApplied}
                  className="shrink-0 rounded-md border border-primary/30 bg-background px-3 py-2 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestedPathApplied ? "Applied" : "Apply"}
                </button>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-3">
            Based on <span className="font-medium text-foreground">ISCED 2011</span> — International Standard Classification of Education. Use the suggestion as a starting point, then refine only when needed.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel hint="Broad field of education">Domain</FieldLabel>
              <SearchableSelect
                value={domain}
                onChange={(val) => {
                  setDomain(val)
                  setSubject("")
                  setTopic("")
                  setSubtopic("")
                }}
                options={domains.map((d) => `${d.code} — ${d.label}`)}
                placeholder="Select domain..."
                searchThreshold={8}
              />
            </div>
            <div>
              <FieldLabel hint="Narrow field of education">Subject</FieldLabel>
              <SearchableSelect
                value={subject}
                disabled={!domain}
                onChange={(val) => {
                  setSubject(val)
                  setTopic("")
                  setSubtopic("")
                }}
                options={subjects.map((s) => `${s.code} — ${s.label}`)}
                placeholder={domain ? "Select subject..." : "Select domain first..."}
                searchThreshold={8}
              />
            </div>
            <div>
              <FieldLabel hint="Detailed field">Topic</FieldLabel>
              <SearchableSelect
                value={topic}
                disabled={!subject}
                onChange={(val) => {
                  setTopic(val)
                  setSubtopic("")
                }}
                options={topics.map((t) => `${t.code} — ${t.label}`)}
                placeholder={subject ? "Select topic..." : "Select subject first..."}
                searchThreshold={8}
              />
            </div>
            <div>
              <FieldLabel hint="Specific focus">Subtopic</FieldLabel>
              <SearchableSelect
                value={subtopic}
                disabled={!topic}
                onChange={setSubtopic}
                options={subtopics.map((s) => s.label)}
                placeholder={topic ? "Select subtopic..." : "Select topic first..."}
                searchThreshold={8}
              />
            </div>
          </div>

          <Divider label="Generation Context" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">
            Curriculum generation uses these fields to decide vocabulary, prerequisites, required coverage, and examples. Suggested defaults are available for first-time setup.
          </p>
          <ClassificationContextFields
            priorKnowledge={priorKnowledge}
            setPriorKnowledge={setPriorKnowledge}
            keyTerms={keyTerms}
            mandatoryTopics={mandatoryTopics}
            applicationContext={applicationContext}
            setApplicationContext={setApplicationContext}
            suggestedPriorKnowledge={guidance.priorKnowledge}
            suggestedApplicationContext={guidance.applicationContext}
            suggestedKeyTerms={guidance.keyTerms.filter((term) => !keyTerms.items.some((item) => item.toLowerCase() === term.toLowerCase()))}
            suggestedMandatoryTopics={guidance.mandatoryTopics.filter((item) => !mandatoryTopics.items.some((topic) => topic.toLowerCase() === item.toLowerCase()))}
            onUseSuggestedPriorKnowledge={() => setPriorKnowledge(guidance.priorKnowledge)}
            onUseSuggestedApplicationContext={() => setApplicationContext(guidance.applicationContext)}
            onAddSuggestedKeyTerms={addSuggestedKeyTerms}
            onAddSuggestedMandatoryTopics={addSuggestedMandatoryTopics}
          />

          <Divider label="Program Placement" />
          <ProgramPlacementSection
            courseId={courseId}
            institutionId={institutionId}
            teacherId={teacherId}
            currentCourseTitle={courseCreatedData?.title ?? null}
          />
        </SetupColumn>

        <SetupColumn className="space-y-4">
          {courseCreatedData && (
            <div>
              <CoursePreviewCard>
                <CourseImagePreview
                  imageUrl={courseCreatedData.imageUrl}
                  alt="Course"
                  emptyText="No image"
                  emptyTextClassName="text-xs italic text-muted-foreground/40"
                />
                <div className="p-5 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground leading-snug">{courseCreatedData.title}</h3>
                  {courseCreatedData.subtitle && (
                    <p className="text-sm text-muted-foreground">{courseCreatedData.subtitle}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {courseCreatedData.language && <CoursePreviewChip>{courseCreatedData.language}</CoursePreviewChip>}
                    {courseCreatedData.courseType && <CoursePreviewChip>{courseCreatedData.courseType}</CoursePreviewChip>}
                    {crumbs[0] && <CoursePreviewChip variant="primary">{crumbs[0]}</CoursePreviewChip>}
                  </div>
                </div>
              </CoursePreviewCard>
            </div>
          )}

          <div>
            <div className="rounded-lg border border-border bg-background p-5 space-y-2">
              {crumbs.length === 0 ? (
                <p className="text-sm italic text-muted-foreground/50">
                  Select a domain to build the ISCED taxonomy path.
                </p>
              ) : (
                <div className="flex items-center flex-wrap gap-1.5 text-base">
                  {crumbs.map((c, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground/40 text-sm">›</span>}
                      <span className={`font-medium ${i === crumbs.length - 1 ? "text-primary" : "text-foreground"}`}>
                        {c}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {classYear && (
            <div className="rounded-lg border border-border bg-background p-5 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Year</span>
                <span className="font-medium text-foreground">{classYear}</span>
              </div>
            </div>
          )}

        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}
