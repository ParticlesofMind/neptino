"use client"

import { useState, type ComponentType, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  AlignJustify,
  ArrowLeft,
  BookOpen,
  Check,
  FileText,
  Globe2,
  Layers,
  ListChecks,
  Plus,
} from "lucide-react"
import {
  CoursePreviewCard,
  CoursePreviewChip,
  PRIMARY_ACTION_BUTTON_CLASS,
  SetupColumn,
  SetupPanelLayout,
  SetupSection,
} from "@/components/coursebuilder"
import { OverlineLabel } from "@/components/ui/overline-label"

type CourseOption = {
  id: string
  course_name: string
}

export type ProgramSetupInitial = {
  name: string
  subtitle: string
  description: string
  durationLabel: string
  imageUrl: string
  credentialLabel: string
  progressionPolicy: string
  educationCountry: string
  educationRegion: string
  schoolContext: string
  programType: string
  pathway: string
  instructionLanguage: string
  subjectArea: string
  subjectTrack: string
  levelBand: string
  learnerStage: string
  programIntent: string
  enrollmentModel: string
  inheritClassification: boolean
  inheritEducationContext: boolean
  inheritSyllabus: boolean
  inheritProgressionPolicy: boolean
  outcomes: string
  admissionExpectations: string
  assessmentNotes: string
  courseRelationship: string
  courseIds: string[]
}

type ProgramSectionId =
  | "essentials"
  | "classification"
  | "inheritance"
  | "education-context"
  | "syllabus"
  | "courses"

type ProgramSection = {
  id: ProgramSectionId
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

const INPUT_CLASS = "mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
const TEXTAREA_CLASS = "mt-1.5 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
const SELECT_CLASS = INPUT_CLASS

const PROGRAM_SECTIONS: ProgramSection[] = [
  { id: "essentials", label: "Essentials", description: "Core information about your program.", icon: FileText },
  { id: "classification", label: "Classification", description: "Subject hierarchy and program positioning.", icon: AlignJustify },
  { id: "inheritance", label: "Inheritance", description: "Choose which program defaults courses should inherit.", icon: Layers },
  { id: "education-context", label: "Education Context", description: "Country, school context, and pathway metadata.", icon: Globe2 },
  { id: "syllabus", label: "Syllabus", description: "Program outcomes, assessment, and progression.", icon: ListChecks },
  { id: "courses", label: "Courses", description: "Attach existing courses or leave the program empty for now.", icon: BookOpen },
]

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-foreground">{children}</span>
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function VisibilitySection({
  sectionId,
  activeSection,
  children,
}: {
  sectionId: ProgramSectionId
  activeSection: ProgramSectionId
  children: ReactNode
}) {
  return (
    <div className={activeSection === sectionId ? "space-y-5" : "hidden"}>
      {children}
    </div>
  )
}

export function ProgramSetupClient({
  action,
  programId,
  initialProgram,
  institutionName,
  courseOptions,
}: {
  action: (formData: FormData) => void | Promise<void>
  programId: string | null
  initialProgram: ProgramSetupInitial | null
  institutionName: string
  courseOptions: CourseOption[]
}) {
  const [activeSection, setActiveSection] = useState<ProgramSectionId>("essentials")
  const programCreated = Boolean(programId)
  const active = PROGRAM_SECTIONS.find((section) => section.id === activeSection) ?? PROGRAM_SECTIONS[0]
  const ActiveIcon = active.icon
  const submitLabel = programCreated ? "Save Changes" : "Create Program"

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-muted/20 text-foreground">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="hidden h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 sm:grid md:px-4">
          <Link
            href="/teacher/courses"
            className="inline-flex h-8 items-center justify-self-start gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Programs & Courses
          </Link>
          <Link
            href="/teacher"
            aria-label="Teacher dashboard"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
          >
            <Image src="/octopus-logo.png" alt="Neptino" width={24} height={24} className="h-6 w-6" />
          </Link>
          <span className="h-8 justify-self-end" aria-hidden />
        </div>

        <div className="flex h-10 items-center justify-between gap-2 px-2 sm:hidden">
          <Link
            href="/teacher/courses"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Programs
          </Link>
          <Image src="/octopus-logo.png" alt="Neptino" width={22} height={22} className="h-[22px] w-[22px]" />
          <span className="h-8 w-16" aria-hidden />
        </div>
      </div>

      <form action={action} className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <input type="hidden" name="program_id" value={programId ?? ""} />
        <aside className="no-scrollbar hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-background md:block">
          <div className="min-h-full p-3">
            <nav className="space-y-4">
              <div>
                <p className="mb-1 px-2 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Setup
                </p>
                <div className="space-y-1">
                  {PROGRAM_SECTIONS.map(({ id, label, icon: Icon }) => {
                    const isActive = activeSection === id
                    const isLocked = !programCreated && id !== "essentials"
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          if (!isLocked) setActiveSection(id)
                        }}
                        disabled={isLocked}
                        title={isLocked ? "Create the program in Essentials before editing this section." : undefined}
                        className={`flex min-h-9 w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left font-sans text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 ${
                          isLocked
                            ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground/70"
                            : isActive
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/30 hover:text-foreground"
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive && !isLocked ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        <span
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isLocked
                              ? "border-border bg-transparent"
                              : isActive
                                ? "border-primary/50 bg-primary/15 text-primary"
                                : "border-border"
                          }`}
                          aria-hidden
                        >
                          {isActive && !isLocked && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <main className="min-w-0 flex-1 overflow-hidden p-4 md:p-5">
            <SetupSection title={active.label} description={active.description}>
              <SetupPanelLayout>
                <SetupColumn className="space-y-5">
                  <VisibilitySection sectionId="essentials" activeSection={activeSection}>
                    <div>
                      <FieldLabel>Program Title</FieldLabel>
                      <input name="name" required minLength={3} defaultValue={initialProgram?.name ?? ""} className={INPUT_CLASS} placeholder="Upper Secondary History Sequence" />
                    </div>
                    <div>
                      <FieldLabel>Program Subtitle</FieldLabel>
                      <input name="program_subtitle" defaultValue={initialProgram?.subtitle ?? ""} className={INPUT_CLASS} placeholder="A three-course sequence in modern history" />
                    </div>
                    <div>
                      <FieldLabel>Program Description</FieldLabel>
                      <textarea name="description" rows={4} defaultValue={initialProgram?.description ?? ""} className={TEXTAREA_CLASS} placeholder="Describe what students will learn across the program." />
                    </div>
                    <div>
                      <FieldLabel>Program Image</FieldLabel>
                      <div className="mt-1.5 rounded-lg border-2 border-dashed border-border bg-background px-6 py-7 text-center transition hover:border-primary/40 hover:bg-muted/40">
                        <input
                          name="program_image"
                          type="file"
                          accept="image/*"
                          required={!programCreated && !initialProgram?.imageUrl}
                          className="mx-auto max-w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-primary/30 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">PNG, JPG, WEBP. Required before program creation.</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Program Language</FieldLabel>
                        <select name="instruction_language" defaultValue={initialProgram?.instructionLanguage ?? ""} className={SELECT_CLASS}>
                          <option value="">Select language...</option>
                          {["English", "French", "Spanish", "German", "Arabic", "Mandarin"].map((language) => (
                            <option key={language} value={language}>{language}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Program Type</FieldLabel>
                        <select name="program_type" defaultValue={initialProgram?.programType ?? ""} className={SELECT_CLASS}>
                          <option value="">Select type...</option>
                          <option value="in_person">In-person</option>
                          <option value="online">Online</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="exam_preparation">Exam preparation</option>
                          <option value="certification">Certification</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Duration</FieldLabel>
                        <input name="duration_label" defaultValue={initialProgram?.durationLabel ?? ""} className={INPUT_CLASS} placeholder="3 courses, 1 academic year" />
                      </div>
                      <div>
                        <FieldLabel>Institution</FieldLabel>
                        <div className="mt-1.5 flex h-9 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                          {institutionName}
                        </div>
                      </div>
                    </div>
                  </VisibilitySection>

                  <VisibilitySection sectionId="classification" activeSection={activeSection}>
                    <div className="rounded-lg border border-border bg-background p-5">
                      <OverlineLabel className="mb-3">Program Positioning</OverlineLabel>
                      <p className="mb-4 text-sm text-muted-foreground">
                        Program classification should describe the shared academic path across its courses. Courses can still override details later when needed.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Level Band</FieldLabel>
                          <select name="level_band" defaultValue={initialProgram?.levelBand ?? ""} className={SELECT_CLASS}>
                            <option value="">Unspecified</option>
                            <option value="primary">Primary</option>
                            <option value="lower_secondary">Lower secondary</option>
                            <option value="upper_secondary">Upper secondary</option>
                            <option value="vocational">Vocational</option>
                            <option value="undergraduate">Undergraduate</option>
                            <option value="postgraduate">Postgraduate</option>
                            <option value="adult_learning">Adult learning</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                        <div>
                          <FieldLabel>Learner Stage</FieldLabel>
                          <input name="learner_stage" defaultValue={initialProgram?.learnerStage ?? ""} className={INPUT_CLASS} placeholder="Year 11, Grade 10, mature learners" />
                        </div>
                      </div>
                    </div>

                    <Divider label="Assisted Subject Classification" />
                    <p className="-mt-2 text-sm text-muted-foreground">
                      Use a broad, stable subject path. Course setup can narrow topic and subtopic later.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Subject Area</FieldLabel>
                        <input name="subject_area" defaultValue={initialProgram?.subjectArea ?? ""} className={INPUT_CLASS} placeholder="History" />
                      </div>
                      <div>
                        <FieldLabel>Subject Track</FieldLabel>
                        <input name="subject_track" defaultValue={initialProgram?.subjectTrack ?? ""} className={INPUT_CLASS} placeholder="Modern world history" />
                      </div>
                    </div>

                    <Divider label="Program Intent" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Intent</FieldLabel>
                        <select name="program_intent" defaultValue={initialProgram?.programIntent ?? ""} className={SELECT_CLASS}>
                          <option value="">Unspecified</option>
                          <option value="general_sequence">General sequence</option>
                          <option value="exam_preparation">Exam preparation</option>
                          <option value="credit_pathway">Credit pathway</option>
                          <option value="certification">Certification</option>
                          <option value="enrichment">Enrichment</option>
                          <option value="remediation">Remediation</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Enrollment Model</FieldLabel>
                        <select name="enrollment_model" defaultValue={initialProgram?.enrollmentModel ?? ""} className={SELECT_CLASS}>
                          <option value="">Unspecified</option>
                          <option value="program_first">Program enrollment</option>
                          <option value="course_first">Course enrollment</option>
                          <option value="mixed">Mixed</option>
                        </select>
                      </div>
                    </div>
                  </VisibilitySection>

                  <VisibilitySection sectionId="inheritance" activeSection={activeSection}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          name: "inherit_classification",
                          title: "Classification",
                          description: "Courses inherit subject area, track, level band, learner stage, and intent.",
                          checked: initialProgram?.inheritClassification ?? true,
                        },
                        {
                          name: "inherit_education_context",
                          title: "Education Context",
                          description: "Courses inherit country, region, school context, language, and pathway.",
                          checked: initialProgram?.inheritEducationContext ?? true,
                        },
                        {
                          name: "inherit_syllabus",
                          title: "Syllabus",
                          description: "Courses inherit program outcomes, admission expectations, and assessment notes.",
                          checked: initialProgram?.inheritSyllabus ?? false,
                        },
                        {
                          name: "inherit_progression_policy",
                          title: "Progression Policy",
                          description: "Courses inherit sequence rules and prerequisite expectations.",
                          checked: initialProgram?.inheritProgressionPolicy ?? false,
                        },
                      ].map(({ name, title, description, checked }) => (
                        <label key={name} className="flex gap-3 rounded-md border border-border bg-background p-3 text-sm transition hover:border-primary/30">
                          <input
                            name={name}
                            type="checkbox"
                            defaultChecked={checked}
                            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                          />
                          <span>
                            <span className="font-medium text-foreground">{title}</span>
                            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </VisibilitySection>

                  <VisibilitySection sectionId="education-context" activeSection={activeSection}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Country</FieldLabel>
                        <input name="education_country" defaultValue={initialProgram?.educationCountry ?? ""} className={INPUT_CLASS} placeholder="Switzerland" />
                      </div>
                      <div>
                        <FieldLabel>Region</FieldLabel>
                        <input name="education_region" defaultValue={initialProgram?.educationRegion ?? ""} className={INPUT_CLASS} placeholder="Geneva" />
                      </div>
                      <div>
                        <FieldLabel>School Context</FieldLabel>
                        <select name="school_context" defaultValue={initialProgram?.schoolContext ?? ""} className={SELECT_CLASS}>
                          <option value="">Unspecified</option>
                          <option value="national_school">National school</option>
                          <option value="international_school">International school</option>
                          <option value="private_tutoring">Private tutoring</option>
                          <option value="homeschool">Homeschool</option>
                          <option value="higher_education">Higher education</option>
                          <option value="adult_learning">Adult learning</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Pathway</FieldLabel>
                        <input name="pathway" defaultValue={initialProgram?.pathway ?? ""} className={INPUT_CLASS} placeholder="Matura-oriented, IB-style" />
                      </div>
                    </div>
                  </VisibilitySection>

                  <VisibilitySection sectionId="syllabus" activeSection={activeSection}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Credential / Outcome</FieldLabel>
                        <input name="credential_label" defaultValue={initialProgram?.credentialLabel ?? ""} className={INPUT_CLASS} placeholder="Certificate, diploma path, exam readiness" />
                      </div>
                      <div>
                        <FieldLabel>Progression Policy</FieldLabel>
                        <select name="progression_policy" defaultValue={initialProgram?.progressionPolicy ?? ""} className={SELECT_CLASS}>
                          <option value="">Unspecified</option>
                          <option value="recommended_order">Recommended order</option>
                          <option value="required_order">Required order</option>
                          <option value="prerequisites_required">Prerequisites required</option>
                          <option value="flexible">Flexible</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Outcomes</FieldLabel>
                      <textarea name="outcomes" rows={3} defaultValue={initialProgram?.outcomes ?? ""} className={TEXTAREA_CLASS} placeholder="What students should be able to do by the end of the program." />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Admission Expectations</FieldLabel>
                        <textarea name="admission_expectations" rows={3} defaultValue={initialProgram?.admissionExpectations ?? ""} className={TEXTAREA_CLASS} placeholder="Expected background before entering the program." />
                      </div>
                      <div>
                        <FieldLabel>Assessment Notes</FieldLabel>
                        <textarea name="assessment_notes" rows={3} defaultValue={initialProgram?.assessmentNotes ?? ""} className={TEXTAREA_CLASS} placeholder="How the program should evaluate progress." />
                      </div>
                    </div>
                  </VisibilitySection>

                  <VisibilitySection sectionId="courses" activeSection={activeSection}>
                    <div>
                      <FieldLabel>Course Relationship</FieldLabel>
                      <textarea name="course_relationship" rows={3} defaultValue={initialProgram?.courseRelationship ?? ""} className={TEXTAREA_CLASS} placeholder="How courses should relate to the program sequence." />
                    </div>
                    <div>
                      <FieldLabel>Initial Courses</FieldLabel>
                      {courseOptions.length > 0 ? (
                        <div className="mt-1.5 divide-y divide-border rounded-md border border-border">
                          {courseOptions.map((course) => (
                            <label key={course.id} className="flex items-center gap-3 px-3 py-2 text-sm transition hover:bg-muted/30">
                              <input
                                name="course_ids"
                                type="checkbox"
                                value={course.id}
                                defaultChecked={initialProgram?.courseIds.includes(course.id) ?? false}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                              />
                              <span className="truncate text-foreground">{course.course_name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1.5 rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                          No existing courses in this institution. You can create the program now and add courses from Course Essentials later.
                        </p>
                      )}
                    </div>
                  </VisibilitySection>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-muted-foreground">
                      {programCreated ? "Changes are saved to this program." : "Create the program to unlock the remaining sections."}
                    </span>
                    <button type="submit" className={PRIMARY_ACTION_BUTTON_CLASS}>
                      <Plus className="h-3.5 w-3.5" />
                      {submitLabel}
                    </button>
                  </div>
                </SetupColumn>

                <SetupColumn className="space-y-4">
                  <CoursePreviewCard>
                    {initialProgram?.imageUrl && (
                      <div
                        role="img"
                        aria-label="Program cover"
                        className="aspect-[5/3] w-full border-b border-border bg-muted/30 bg-cover bg-center"
                        style={{ backgroundImage: `url(${initialProgram.imageUrl})` }}
                      />
                    )}
                    <div className="border-b border-border p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                        <ActiveIcon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold leading-snug text-foreground">{active.label}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{active.description}</p>
                    </div>
                    <div className="space-y-3 p-5 text-sm">
                      <div className="rounded-md border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Program adds</p>
                        <p className="mt-1 font-medium text-foreground">Classification across courses, inheritance, sequence logic, and enrollment scope.</p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Course keeps</p>
                        <p className="mt-1 font-medium text-foreground">Lessons, curriculum generation, schedule, launch, and teaching workflow.</p>
                      </div>
                      <div className="rounded-md border border-border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">Standalone option</p>
                        <p className="mt-1 font-medium text-foreground">A teacher can create and teach courses without a program.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <CoursePreviewChip variant="primary">Optional</CoursePreviewChip>
                        <CoursePreviewChip>Enrollment container</CoursePreviewChip>
                        <CoursePreviewChip>Shared defaults</CoursePreviewChip>
                      </div>
                    </div>
                  </CoursePreviewCard>
                </SetupColumn>
              </SetupPanelLayout>
            </SetupSection>
          </main>
        </div>
      </form>
    </div>
  )
}
