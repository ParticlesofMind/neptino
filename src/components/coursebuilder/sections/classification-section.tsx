"use client"

import { useCallback, useState } from "react"
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
  TextInput,
  updateCourseById,
  useCourseRowLoader,
  useCourseSectionSave,
  useDebouncedChangeSave,
  useStringListInput,
  type IscedDomain,
} from "@/components/coursebuilder"
import iscedData from "@/data/isced2011.json"

type CourseCreatedData = {
  title: string
  subtitle: string
  description: string
  language: string
  courseType: string
  imageName: string | null
  imageUrl: string | null
}

type ClassificationRow = {
  classification_data: Record<string, string> | null
}

function Divider({ label }: { label: string }) {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{label}</p>
    </div>
  )
}

export function ClassificationSection({
  courseCreatedData,
  courseId,
}: {
  courseCreatedData: CourseCreatedData | null
  courseId: string | null
}) {
  const [classYear, setClassYear] = useState("")
  const [framework, setFramework] = useState("")
  const [domain, setDomain] = useState("")
  const [subject, setSubject] = useState("")
  const [topic, setTopic] = useState("")
  const [subtopic, setSubtopic] = useState("")
  const [prevCourse, setPrevCourse] = useState("")
  const [nextCourse, setNextCourse] = useState("")
  const [priorKnowledge, setPriorKnowledge] = useState("")
  const keyTerms = useStringListInput({ maxItems: 30, maxDraftLength: 60 })
  const mandatoryTopics = useStringListInput({ maxItems: 20, maxDraftLength: 100 })
  const [applicationContext, setApplicationContext] = useState("")
  const { runWithSaveState } = useCourseSectionSave()

  // ISCED data types and loading
  const domains = (iscedData as { domains: IscedDomain[] }).domains

  const { loading } = useCourseRowLoader<ClassificationRow>({
    courseId,
    select: "classification_data",
    onLoaded: (row) => {
      const hydrated = mapClassificationDataToState(row.classification_data, domains)
      if (!hydrated) return

      setClassYear(hydrated.classYear)
      setFramework(hydrated.framework)
      setDomain(hydrated.domain)
      setSubject(hydrated.subject)
      setTopic(hydrated.topic)
      setSubtopic(hydrated.subtopic)
      setPrevCourse(hydrated.prevCourse)
      setNextCourse(hydrated.nextCourse)
      setPriorKnowledge(hydrated.priorKnowledge)
      if (hydrated.keyTerms) keyTerms.setItems(hydrated.keyTerms)
      if (hydrated.mandatoryTopics) mandatoryTopics.setItems(hydrated.mandatoryTopics)
      setApplicationContext(hydrated.applicationContext)
    },
  })

  const handleSave = useCallback(async () => {
    if (!courseId) return
    await runWithSaveState(async () => {
      const updatedAt = new Date().toISOString()
      const payload = buildClassificationUpdatePayload({
        classYear,
        framework,
        domain,
        subject,
        topic,
        subtopic,
        prevCourse,
        nextCourse,
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
  }, [runWithSaveState, courseId, classYear, framework, domain, subject, topic, subtopic, prevCourse, nextCourse, courseCreatedData?.title, domains, priorKnowledge, keyTerms.items, mandatoryTopics.items, applicationContext])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId) && !loading)

  // Expanded class years (Year 1 through Year 20)
  const classYears = Array.from({ length: 20 }, (_, i) => `Year ${i + 1}`)

  // Comprehensive list of curricular frameworks
  const curricularFrameworks = [
    "IB (International Baccalaureate)",
    "Cambridge (IGCSE / A-Level)",
    "AP (Advanced Placement)",
    "French Baccalaureate",
    "German Abitur",
    "Swiss Maturité",
    "Italian Maturità",
    "Spanish Bachillerato",
    "Common Core (US)",
    "National Curriculum (UK)",
    "Australian Curriculum",
    "Canadian Provincial Curriculum",
    "New Zealand Curriculum",
    "Singapore Curriculum",
    "Indian CBSE",
    "Indian ICSE",
    "Indian State Boards",
    "Chinese National Curriculum",
    "Japanese Course of Study",
    "Korean National Curriculum",
    "Finnish National Core Curriculum",
    "Swedish Curriculum",
    "Norwegian Curriculum",
    "Danish Curriculum",
    "Dutch Curriculum",
    "Belgian Curriculum (French)",
    "Belgian Curriculum (Flemish)",
    "Austrian Curriculum",
    "Polish National Curriculum",
    "Russian Federal Curriculum",
    "Brazilian National Curriculum (BNCC)",
    "Mexican National Curriculum",
    "Argentinian Curriculum",
    "Chilean Curriculum",
    "South African CAPS",
    "UAE Ministry of Education",
    "Saudi Arabian Curriculum",
    "Turkish National Curriculum",
    "Israeli Curriculum",
    "Egyptian National Curriculum",
    "Kenyan 8-4-4 System",
    "Nigerian National Curriculum",
    "Hong Kong Curriculum",
    "Taiwanese Curriculum",
    "Thai National Curriculum",
    "Vietnamese National Curriculum",
    "Indonesian Curriculum",
    "Malaysian Curriculum (KSSM)",
    "Philippine K-12 Curriculum",
    "Montessori",
    "Waldorf/Steiner",
    "Reggio Emilia",
    "Project-Based Learning",
    "Inquiry-Based Learning",
    "STEAM Curriculum",
    "Classical Education",
    "Charlotte Mason",
    "Unschooling",
    "Homeschool - Eclectic",
    "Homeschool - Traditional",
    "College Preparatory",
    "Vocational/Technical",
    "Special Education (Individualized)",
    "Gifted and Talented",
    "Custom/Proprietary",
    "Other",
  ]

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

  if (loading) {
    return (
      <SetupSection title="Classification" description="Subject matter hierarchy and course positioning.">
        <p className="text-sm text-muted-foreground">Loading classification…</p>
      </SetupSection>
    )
  }

  return (
    <SetupSection title="Classification" description="Subject matter hierarchy and course positioning.">
      <SetupPanelLayout>
        <SetupColumn className="space-y-5">
          <div>
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
              <div>
                <FieldLabel>Curricular Framework</FieldLabel>
                <SearchableSelect
                  value={framework}
                  onChange={setFramework}
                  options={curricularFrameworks}
                  placeholder="Select framework..."
                  searchThreshold={8}
                />
              </div>
            </div>
          </div>

          <Divider label="ISCED Classification" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">
            Based on <span className="font-medium text-foreground">ISCED 2011</span> — International Standard Classification of Education
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

          <Divider label="Course Sequence" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">Position within the learning pathway</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel hint="Comes before">Previous Course</FieldLabel>
              <TextInput value={prevCourse} placeholder="e.g., Algebra I" onChange={(e) => setPrevCourse(e.target.value)} />
            </div>
            <div>
              <FieldLabel hint="Comes after">Next Course</FieldLabel>
              <TextInput value={nextCourse} placeholder="e.g., Calculus" onChange={(e) => setNextCourse(e.target.value)} />
            </div>
          </div>

          <Divider label="Generation Context" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">Metadata that enriches AI curriculum generation</p>

          <div>
            <FieldLabel hint="What students should already know">Prior Knowledge Baseline</FieldLabel>
            <textarea
              value={priorKnowledge}
              onChange={(e) => setPriorKnowledge(e.target.value.slice(0, 500))}
              placeholder="e.g., Students have completed Algebra I and basic geometry. They can solve linear equations and understand coordinate planes."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{priorKnowledge.length}/500</p>
          </div>

          <div>
            <FieldLabel hint="Domain-specific terminology students will encounter">Key Terms / Seed Vocabulary</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {keyTerms.items.map((term, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-xs text-foreground">
                  {term}
                  <button type="button" onClick={() => keyTerms.removeAt(i)} className="text-muted-foreground hover:text-destructive transition">×</button>
                </span>
              ))}
            </div>
            {keyTerms.items.length < 30 && (
              <div className="flex gap-2">
                <input
                  value={keyTerms.draft}
                  onChange={(e) => keyTerms.updateDraft(e.target.value)}
                  onKeyDown={keyTerms.onDraftKeyDown}
                  placeholder="e.g., photosynthesis"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                />
                <button
                  type="button"
                  disabled={!keyTerms.canAdd}
                  onClick={keyTerms.addDraft}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            )}
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{keyTerms.items.length}/30 terms</p>
          </div>

          <div>
            <FieldLabel hint="Topics required by curriculum standards">Mandatory Topics</FieldLabel>
            <div className="space-y-1.5 mb-2">
              {mandatoryTopics.items.map((t, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                  <span className="flex-1 text-sm text-foreground">{t}</span>
                  <button type="button" onClick={() => mandatoryTopics.removeAt(i)} className="text-xs text-muted-foreground hover:text-destructive transition">×</button>
                </div>
              ))}
            </div>
            {mandatoryTopics.items.length < 20 && (
              <div className="flex gap-2">
                <input
                  value={mandatoryTopics.draft}
                  onChange={(e) => mandatoryTopics.updateDraft(e.target.value)}
                  onKeyDown={mandatoryTopics.onDraftKeyDown}
                  placeholder="e.g., Cell Division and Mitosis"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
                />
                <button
                  type="button"
                  disabled={!mandatoryTopics.canAdd}
                  onClick={mandatoryTopics.addDraft}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            )}
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{mandatoryTopics.items.length}/20 topics</p>
          </div>

          <div>
            <FieldLabel hint="How the subject applies in context">Application Context / Domain Lens</FieldLabel>
            <textarea
              value={applicationContext}
              onChange={(e) => setApplicationContext(e.target.value.slice(0, 500))}
              placeholder="e.g., This biology course is taught through a medical sciences lens. Examples should use clinical scenarios, patient cases, and healthcare applications."
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{applicationContext.length}/500</p>
          </div>
        </SetupColumn>

        <SetupColumn className="space-y-4">
          {courseCreatedData && (
            <div>
              <CoursePreviewCard>
                <CourseImagePreview
                  imageUrl={courseCreatedData.imageUrl}
                  alt="Course"
                  heightClassName="h-52"
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

          {(classYear || framework) && (
            <div className="rounded-lg border border-border bg-background p-5 space-y-2.5">
              {classYear && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Year</span>
                  <span className="font-medium text-foreground">{classYear}</span>
                </div>
              )}
              {framework && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Framework</span>
                  <span className="font-medium text-foreground text-right max-w-[60%]">{framework}</span>
                </div>
              )}
            </div>
          )}

          {(prevCourse || nextCourse) && (
            <div className="rounded-lg border border-border bg-background p-5">
              <div className="flex items-center gap-2 text-sm">
                {prevCourse ? (
                  <span className="rounded border border-border px-2 py-1 text-muted-foreground">
                    {prevCourse}
                  </span>
                ) : (
                  <span className="text-muted-foreground/30 italic">Start</span>
                )}
                <span className="text-muted-foreground/40">→</span>
                <span className="rounded border border-primary/50 bg-accent px-2 py-1 font-semibold text-primary">
                  This course
                </span>
                <span className="text-muted-foreground/40">→</span>
                {nextCourse ? (
                  <span className="rounded border border-border px-2 py-1 text-muted-foreground">
                    {nextCourse}
                  </span>
                ) : (
                  <span className="text-muted-foreground/30 italic">End</span>
                )}
              </div>
            </div>
          )}
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}
