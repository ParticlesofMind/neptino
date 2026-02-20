"use client"

import { useCallback, useEffect, useState } from "react"
import { SetupColumn, SetupPanelLayout, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import iscedData from "@/data/isced2011.json"
import { createClient } from "@/lib/supabase/client"

type CourseCreatedData = {
  title: string
  subtitle: string
  description: string
  language: string
  courseType: string
  imageName: string | null
  imageUrl: string | null
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
    />
  )
}

function SelectInput({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </select>
  )
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
  const [loading, setLoading] = useState(!!courseId)
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("classification_data")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.classification_data) {
          const c = data.classification_data as Record<string, string>
          setClassYear(c.class_year ?? "")
          setFramework(c.curricular_framework ?? "")
          setDomain(c.domain ?? "")
          setSubject(c.subject ?? "")
          setTopic(c.topic ?? "")
          setSubtopic(c.subtopic ?? "")
          setPrevCourse(c.previous_course ?? "")
          setNextCourse(c.next_course ?? "")
        }
        setLoading(false)
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const { error } = await supabase
      .from("courses")
      .update({
        classification_data: {
          class_year: classYear,
          curricular_framework: framework,
          domain,
          subject,
          topic,
          subtopic: subtopic || null,
          previous_course: prevCourse || null,
          current_course: courseCreatedData?.title ?? null,
          next_course: nextCourse || null,
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) {
      setSaveStatus("error")
    } else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, classYear, framework, domain, subject, topic, subtopic, prevCourse, nextCourse, courseCreatedData?.title])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId) && !loading)

  type IscedSubtopic = { value: string; label: string; code: string }
  type IscedTopic = { value: string; label: string; code: string; subtopics: IscedSubtopic[] }
  type IscedSubject = { value: string; label: string; code: string; topics: IscedTopic[] }
  type IscedDomain = { value: string; label: string; code: string; subjects: IscedSubject[] }
  const domains = (iscedData as { domains: IscedDomain[] }).domains

  const selectedDomain = domains.find((d) => d.value === domain)
  const subjects = selectedDomain?.subjects ?? []
  const selectedSubject = subjects.find((s) => s.value === subject)
  const topics = selectedSubject?.topics ?? []
  const selectedTopic = topics.find((t) => t.value === topic)
  const subtopics = selectedTopic?.subtopics ?? []

  const crumbs = [
    selectedDomain?.label,
    selectedSubject?.label,
    selectedTopic?.label,
    subtopics.find((s) => s.value === subtopic)?.label,
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
                <SelectInput value={classYear} onChange={(e) => setClassYear(e.target.value)}>
                  <option value="">Select year...</option>
                  {Array.from({ length: 12 }, (_, i) => `Year ${i + 1}`).map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <FieldLabel>Curricular Framework</FieldLabel>
                <SelectInput value={framework} onChange={(e) => setFramework(e.target.value)}>
                  <option value="">Select framework...</option>
                  {[
                    "IB (International Baccalaureate)",
                    "Cambridge (IGCSE / A-Level)",
                    "French Baccalaureate",
                    "Common Core (US)",
                    "National Curriculum (UK)",
                    "Custom",
                  ].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </SelectInput>
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
              <SelectInput
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value)
                  setSubject("")
                  setTopic("")
                  setSubtopic("")
                }}
              >
                <option value="">Select domain...</option>
                {domains.map((d) => (
                  <option key={d.value} value={d.value}>{d.code} — {d.label}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel hint="Narrow field of education">Subject</FieldLabel>
              <SelectInput
                value={subject}
                disabled={!domain}
                onChange={(e) => {
                  setSubject(e.target.value)
                  setTopic("")
                  setSubtopic("")
                }}
              >
                <option value="">{domain ? "Select subject..." : "Select domain first..."}</option>
                {subjects.map((s) => (
                  <option key={s.value} value={s.value}>{s.code} — {s.label}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel hint="Detailed field">Topic</FieldLabel>
              <SelectInput
                value={topic}
                disabled={!subject}
                onChange={(e) => {
                  setTopic(e.target.value)
                  setSubtopic("")
                }}
              >
                <option value="">{subject ? "Select topic..." : "Select subject first..."}</option>
                {topics.map((t) => (
                  <option key={t.value} value={t.value}>{t.code} — {t.label}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel hint="Specific focus">Subtopic</FieldLabel>
              <SelectInput value={subtopic} disabled={!topic} onChange={(e) => setSubtopic(e.target.value)}>
                <option value="">{topic ? "Select subtopic..." : "Select topic first..."}</option>
                {subtopics.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </SelectInput>
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
        </SetupColumn>

        <SetupColumn className="space-y-4">
          {courseCreatedData && (
            <div>
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                <div className={`relative h-52 ${courseCreatedData.imageUrl ? "overflow-hidden" : "flex items-center justify-center bg-muted/50"}`}>
                  {courseCreatedData.imageUrl ? (
                    <img src={courseCreatedData.imageUrl} alt="Course" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs italic text-muted-foreground/40">No image</span>
                  )}
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground leading-snug">{courseCreatedData.title}</h3>
                  {courseCreatedData.subtitle && (
                    <p className="text-sm text-muted-foreground">{courseCreatedData.subtitle}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {courseCreatedData.language && (
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {courseCreatedData.language}
                      </span>
                    )}
                    {courseCreatedData.courseType && (
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {courseCreatedData.courseType}
                      </span>
                    )}
                    {crumbs[0] && (
                      <span className="rounded-full border border-primary/30 bg-accent px-2.5 py-0.5 text-xs text-primary">
                        {crumbs[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
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
