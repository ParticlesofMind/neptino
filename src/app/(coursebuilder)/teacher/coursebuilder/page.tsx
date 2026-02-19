"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CreateView } from "@/components/canvas/CreateView"
import { computePageConfig, type CanvasPageConfig } from "@/components/canvas/PixiCanvas"
import { createClient } from "@/lib/supabase/client"
import iscedData from "@/data/isced2011.json"
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  AlignJustify,
  Users,
  BookOpen,
  LayoutTemplate,
  Calendar,
  BookMarked,
  Zap,
  Eye,
  Store,
  DollarSign,
  Plug,
  MessageSquare,
  Layers,
  Monitor,
  Palette,
  Smile,
  Bell,
  Database,
  Settings,
  Rocket,
  Save,
  PenTool,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "setup" | "create" | "preview" | "launch"
type SectionId = string

// ─── View navigation helpers ──────────────────────────────────────────────────

const VIEW_SEQUENCE: View[] = ["setup", "create", "preview", "launch"]
const VIEW_LABELS: Record<View, string> = {
  setup:   "Setup",
  create:  "Create",
  preview: "Preview",
  launch:  "Launch",
}
function getPrevView(v: View): View | null {
  const idx = VIEW_SEQUENCE.indexOf(v)
  return idx > 0 ? VIEW_SEQUENCE[idx - 1] : null
}
function getNextView(v: View): View | null {
  const idx = VIEW_SEQUENCE.indexOf(v)
  return idx < VIEW_SEQUENCE.length - 1 ? VIEW_SEQUENCE[idx + 1] : null
}

interface SectionItem {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface SectionGroup {
  heading: string
  items: SectionItem[]
}

// ─── Template types ───────────────────────────────────────────────────────────

const TEMPLATE_TYPES = ["lesson", "quiz", "assessment", "exam", "certificate"] as const
type TemplateType = (typeof TEMPLATE_TYPES)[number]

const TEMPLATE_TYPE_META: Record<TemplateType, { label: string; description: string; badge: string }> = {
  lesson:      { label: "Lesson",      description: "Standard instructional lesson page",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  quiz:        { label: "Quiz",        description: "Short formative assessment",             badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  assessment:  { label: "Assessment",  description: "Formal summative evaluation",            badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  exam:        { label: "Exam",        description: "Comprehensive final examination",        badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  certificate: { label: "Certificate", description: "Course completion certificate",         badge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
}

type BlockId = "header" | "program" | "resources" | "content" | "assignment" | "scoring" | "footer"

interface TemplateBlockConfig {
  id: BlockId
  label: string
  description: string
  mandatory: boolean
  /** Block height for visual preview (px) */
  previewH: number
  forTypes: TemplateType[]
}

const ALL_BLOCKS: TemplateBlockConfig[] = [
  { id: "header",     label: "Header",     description: "Title, date, student name",         mandatory: true,  previewH: 40, forTypes: ["lesson","quiz","assessment","exam","certificate"] },
  { id: "program",    label: "Program",    description: "Objectives & lesson overview",      mandatory: false, previewH: 52, forTypes: ["lesson","quiz","assessment","exam"] },
  { id: "resources",  label: "Resources",  description: "Reference materials & links",       mandatory: false, previewH: 44, forTypes: ["lesson","quiz","assessment","exam"] },
  { id: "content",    label: "Content",    description: "Main body — topics, notes, media",  mandatory: false, previewH: 80, forTypes: ["lesson","quiz","assessment","exam","certificate"] },
  { id: "assignment", label: "Assignment", description: "Tasks & exercises for students",    mandatory: false, previewH: 60, forTypes: ["lesson","quiz"] },
  { id: "scoring",    label: "Scoring",    description: "Rubric & grading criteria",         mandatory: false, previewH: 56, forTypes: ["assessment","exam","quiz"] },
  { id: "footer",     label: "Footer",     description: "Signatures, branding, page number",  mandatory: true,  previewH: 32, forTypes: ["lesson","quiz","assessment","exam","certificate"] },
]

interface LocalTemplate {
  id: string
  name: string
  type: TemplateType
  enabled: Record<BlockId, boolean>
  description: string
}

function defaultEnabled(type: TemplateType): Record<BlockId, boolean> {
  const enabled: Partial<Record<BlockId, boolean>> = {}
  for (const block of ALL_BLOCKS) {
    enabled[block.id] = block.mandatory || block.forTypes.includes(type)
  }
  return enabled as Record<BlockId, boolean>
}

// ─── Course preview type ─────────────────────────────────────────────────────

interface CourseEssentials {
  title: string
  subtitle: string
  description: string
  language: string
  courseType: string
  imageName: string | null
}

interface CourseCreatedData extends CourseEssentials {
  imageUrl: string | null
}

// ─── Section registry ─────────────────────────────────────────────────────────

const SECTIONS: SectionGroup[] = [
  {
    heading: "SETUP",
    items: [
      { id: "essentials", label: "Essentials", icon: FileText },
      { id: "classification", label: "Classification", icon: AlignJustify },
      { id: "students", label: "Students", icon: Users },
      { id: "pedagogy", label: "Pedagogy", icon: BookOpen },
      { id: "templates", label: "Templates", icon: LayoutTemplate },
      { id: "schedule", label: "Schedule", icon: Calendar },
      { id: "curriculum", label: "Curriculum", icon: BookMarked },
      { id: "generation", label: "Generation", icon: Zap },
    ],
  },
  {
    heading: "PUBLISHING",
    items: [
      { id: "visibility", label: "Course Visibility", icon: Eye },
      { id: "marketplace", label: "Marketplace", icon: Store },
      { id: "pricing", label: "Pricing & Monetization", icon: DollarSign },
      { id: "integrations", label: "External Integrations", icon: Plug },
      { id: "communication", label: "Communication", icon: MessageSquare },
    ],
  },
  {
    heading: "ENGINE",
    items: [
      { id: "page-setup", label: "Page Setup", icon: Layers },
      { id: "interface", label: "Interface", icon: Monitor },
      { id: "themes", label: "Themes", icon: Palette },
      { id: "accessibility", label: "Accessibility", icon: Smile },
    ],
  },
  {
    heading: "SETTINGS",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "data-management", label: "Data Management", icon: Database },
      { id: "advanced", label: "Advanced Settings", icon: Settings },
    ],
  },
]

// ─── Shared primitives ────────────────────────────────────────────────────────

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

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <p className="mt-1 text-right text-xs text-muted-foreground">
      {value.length} / {max}
    </p>
  )
}

function SectionContainer({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
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

function Placeholder() {
  return (
    <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed border-border text-center">
      <p className="text-sm text-muted-foreground">This section is under construction.</p>
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
          <span className={`text-sm font-medium ${checked ? "text-primary" : "text-foreground"}`}>
            {title}
          </span>
          {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </label>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function EssentialsSection({
  onCourseCreated,
  initialData,
  existingCourseId,
}: {
  onCourseCreated: (id: string, data: CourseCreatedData) => void
  initialData?: CourseCreatedData | null
  existingCourseId?: string | null
}) {
  const [data, setData] = useState<CourseEssentials>({
    title: initialData?.title ?? "",
    subtitle: initialData?.subtitle ?? "",
    description: initialData?.description ?? "",
    language: initialData?.language ?? "",
    courseType: initialData?.courseType ?? "",
    imageName: initialData?.imageName ?? null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<File | null>(null)

  const set = <K extends keyof CourseEssentials>(k: K, v: CourseEssentials[K]) =>
    setData((prev) => ({ ...prev, [k]: v }))

  // Effective preview URL: prefer freshly-selected local file, then fall back to saved remote URL
  const previewImageUrl = imageObjectUrl ?? initialData?.imageUrl ?? null

  async function handleCreate() {
    setError(null)
    setSaved(false)
    if (!data.title.trim() || data.title.trim().length < 3) {
      setError("Course title must be at least 3 characters.")
      return
    }
    if (!data.description.trim() || data.description.trim().length < 10) {
      setError("Description must be at least 10 characters.")
      return
    }
    if (!data.language) { setError("Please select a language."); return }
    if (!data.courseType) { setError("Please select a course type."); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("You must be signed in."); return }

      // Upload new image if one was selected
      let imageUrl: string | null = initialData?.imageUrl ?? null
      if (imageFileRef.current) {
        const file = imageFileRef.current
        const ext = file.name.split(".").pop()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("courses")
          .upload(path, file, { upsert: false })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("courses").getPublicUrl(path)
          imageUrl = urlData.publicUrl
        }
      }

      const payload = {
        course_name: data.title.trim(),
        course_subtitle: data.subtitle.trim() || null,
        course_description: data.description.trim(),
        course_language: data.language,
        course_type: data.courseType,
        course_image: imageUrl,
      }

      if (existingCourseId) {
        // UPDATE existing course
        const { error: updateError } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", existingCourseId)
        if (updateError) { setError(updateError.message); return }
        setSaved(true)
        onCourseCreated(existingCourseId, { ...data, title: data.title.trim(), imageUrl })
      } else {
        // INSERT new course
        const { data: course, error: insertError } = await supabase
          .from("courses")
          .insert({
            ...payload,
            teacher_id: user.id,
            institution: user.user_metadata?.institution ?? "Independent",
            generation_settings: {},
            students_overview: { total: 0, synced: 0 },
          })
          .select("id")
          .single()
        if (insertError) { setError(insertError.message); return }
        onCourseCreated(course.id, { ...data, title: data.title.trim(), imageUrl })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionContainer title="Essentials" description="Core information about your course.">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Config ── */}
        <div className="space-y-4">
          <div>
            <FieldLabel>Course Title</FieldLabel>
            <TextInput
              value={data.title}
              onChange={(e) => set("title", e.target.value.slice(0, 50))}
              placeholder="Enter course title"
            />
            <CharCount value={data.title} max={50} />
          </div>
          <div>
            <FieldLabel hint="optional">Course Subtitle</FieldLabel>
            <TextInput
              value={data.subtitle}
              onChange={(e) => set("subtitle", e.target.value.slice(0, 75))}
              placeholder="Enter course subtitle"
            />
            <CharCount value={data.subtitle} max={75} />
          </div>
          <div>
            <FieldLabel>Course Description</FieldLabel>
            <textarea
              value={data.description}
              onChange={(e) => set("description", e.target.value.slice(0, 999))}
              placeholder="Describe what students will learn"
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary resize-none"
            />
            <CharCount value={data.description} max={999} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Course Language</FieldLabel>
              <SelectInput
                value={data.language}
                onChange={(e) => set("language", e.target.value)}
              >
                <option value="">Select language...</option>
                {["English", "French", "Spanish", "German", "Arabic", "Mandarin"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Course Type</FieldLabel>
              <SelectInput
                value={data.courseType}
                onChange={(e) => set("courseType", e.target.value)}
              >
                <option value="">Select type...</option>
                {["In-person", "Online", "Hybrid"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectInput>
            </div>
          </div>
          <div>
            <FieldLabel>Course Image</FieldLabel>
            <div
              onClick={() => imageRef.current?.click()}
              className="flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-border bg-background px-6 py-8 text-center transition hover:border-primary/40 hover:bg-muted/40"
            >
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  imageFileRef.current = file
                  if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl)
                  const url = file ? URL.createObjectURL(file) : null
                  setImageObjectUrl(url)
                  set("imageName", file?.name ?? null)
                }}
              />
              {data.imageName ? (
                <p className="text-sm text-foreground">{data.imageName}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">Upload course image</p>
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP — up to 5 MB</p>
                </>
              )}
            </div>
          </div>
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {saved && (
            <p className="rounded-md border border-green-500/30 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-xs text-green-700 dark:text-green-400">
              Changes saved.
            </p>
          )}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (existingCourseId ? "Saving…" : "Creating…") : (existingCourseId ? "Save Changes" : "Create Course")}
          </button>
        </div>

        {/* ── Preview ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Course Card Preview
          </p>
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            {/* Cover */}
            <div className={`relative h-36 ${previewImageUrl ? "overflow-hidden" : "flex items-center justify-center bg-muted/50"}`}>
              {previewImageUrl ? (
                <img src={previewImageUrl} alt="Course cover" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs italic text-muted-foreground/50">No image uploaded</span>
              )}
            </div>
            {/* Body */}
            <div className="p-4 space-y-2">
              <h3
                className={`text-base font-semibold leading-snug ${
                  data.title ? "text-foreground" : "italic text-muted-foreground/50"
                }`}
              >
                {data.title || "Course title…"}
              </h3>
              {data.subtitle && (
                <p className="text-xs text-muted-foreground leading-relaxed">{data.subtitle}</p>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {data.description || <span className="italic">No description yet.</span>}
              </p>
              {(data.language || data.courseType) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.language && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {data.language}
                    </span>
                  )}
                  {data.courseType && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {data.courseType}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

function ClassificationSection({
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
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // ── Load saved classification on mount ──────────────────────────────────
  useEffect(() => {
    if (!courseId) { setLoading(false); return }
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

  // ── Save ────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!courseId) return
    setSaving(true)
    setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase
      .from("courses")
      .update({
        classification_data: {
          class_year:          classYear,
          curricular_framework: framework,
          domain,
          subject,
          topic,
          subtopic:        subtopic     || null,
          previous_course: prevCourse   || null,
          current_course:  courseCreatedData?.title ?? null,
          next_course:     nextCourse   || null,
          updated_at:      new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setSaving(false)
    if (error) {
      setSaveMsg(`Error: ${error.message}`)
    } else {
      setSaveMsg("Classification saved.")
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  // ISCED 2011 taxonomy
  type IscedSubtopic = { value: string; label: string; code: string }
  type IscedTopic    = { value: string; label: string; code: string; subtopics: IscedSubtopic[] }
  type IscedSubject  = { value: string; label: string; code: string; topics: IscedTopic[] }
  type IscedDomain   = { value: string; label: string; code: string; subjects: IscedSubject[] }
  const domains = (iscedData as { domains: IscedDomain[] }).domains

  const selectedDomain  = domains.find((d) => d.value === domain)
  const subjects        = selectedDomain?.subjects ?? []
  const selectedSubject = subjects.find((s) => s.value === subject)
  const topics          = selectedSubject?.topics ?? []
  const selectedTopic   = topics.find((t) => t.value === topic)
  const subtopics       = selectedTopic?.subtopics ?? []

  const crumbs = [
    selectedDomain?.label,
    selectedSubject?.label,
    selectedTopic?.label,
    subtopics.find((s) => s.value === subtopic)?.label,
  ].filter(Boolean) as string[]

  if (loading) {
    return (
      <SectionContainer title="Classification" description="Subject matter hierarchy and course positioning.">
        <p className="text-sm text-muted-foreground">Loading classification…</p>
      </SectionContainer>
    )
  }

  return (
    <SectionContainer title="Classification" description="Subject matter hierarchy and course positioning.">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Config ── */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Preliminary</p>
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
                onChange={(e) => { setTopic(e.target.value); setSubtopic("") }}
              >
                <option value="">{subject ? "Select topic..." : "Select subject first..."}</option>
                {topics.map((t) => (
                  <option key={t.value} value={t.value}>{t.code} — {t.label}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel hint="Specific focus">Subtopic</FieldLabel>
              <SelectInput
                value={subtopic}
                disabled={!topic}
                onChange={(e) => setSubtopic(e.target.value)}
              >
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
              <TextInput
                value={prevCourse}
                placeholder="e.g., Algebra I"
                onChange={(e) => setPrevCourse(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel hint="Comes after">Next Course</FieldLabel>
              <TextInput
                value={nextCourse}
                placeholder="e.g., Calculus"
                onChange={(e) => setNextCourse(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="space-y-4">
          {/* Course card preview from Essentials */}
          {courseCreatedData && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Course Card
              </p>
              <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <div className={`relative h-28 ${courseCreatedData.imageUrl ? "overflow-hidden" : "flex items-center justify-center bg-muted/50"}`}>
                  {courseCreatedData.imageUrl ? (
                    <img src={courseCreatedData.imageUrl} alt="Course" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs italic text-muted-foreground/40">No image</span>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{courseCreatedData.title}</h3>
                  {courseCreatedData.subtitle && (
                    <p className="text-xs text-muted-foreground">{courseCreatedData.subtitle}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {courseCreatedData.language && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {courseCreatedData.language}
                      </span>
                    )}
                    {courseCreatedData.courseType && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {courseCreatedData.courseType}
                      </span>
                    )}
                    {crumbs[0] && (
                      <span className="rounded-full border border-primary/30 bg-accent px-2 py-0.5 text-[10px] text-primary">
                        {crumbs[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Breadcrumb trail */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Taxonomy Path
            </p>
            <div className="rounded-lg border border-border bg-background p-4 space-y-1.5">
              {crumbs.length === 0 ? (
                <p className="text-xs italic text-muted-foreground/50">
                  Select a domain to build the ISCED taxonomy path.
                </p>
              ) : (
                <div className="flex items-center flex-wrap gap-1 text-sm">
                  {crumbs.map((c, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && (
                        <span className="text-muted-foreground/40 text-xs">›</span>
                      )}
                      <span className={`font-medium ${i === crumbs.length - 1 ? "text-primary" : "text-foreground"}`}>
                        {c}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metadata preview */}
          {(classYear || framework) && (
            <div className="rounded-lg border border-border bg-background p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Course Context
              </p>
              {classYear && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Year</span>
                  <span className="font-medium text-foreground">{classYear}</span>
                </div>
              )}
              {framework && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Framework</span>
                  <span className="font-medium text-foreground text-right max-w-[60%]">{framework}</span>
                </div>
              )}
            </div>
          )}

          {/* Sequence preview */}
          {(prevCourse || nextCourse) && (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Learning Pathway
              </p>
              <div className="flex items-center gap-2 text-xs">
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

          {/* Save */}
          {courseId && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Classification"}
              </button>
              {saveMsg && (
                <span className={`text-xs ${
                  saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {saveMsg}
                </span>
              )}
            </div>
          )}
          {!courseId && (
            <p className="text-xs text-muted-foreground/60 italic pt-2">
              Create the course in Essentials first to enable saving.
            </p>
          )}
        </div>
      </div>
    </SectionContainer>
  )
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function ScheduleSection({ courseId }: { courseId: string | null }) {
  const [activeDays, setActiveDays] = useState<string[]>([])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [breaks, setBreaks] = useState<{ start: string; end: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("schedule_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.schedule_settings) {
          const s = data.schedule_settings as Record<string, unknown>
          setActiveDays((s.active_days as string[]) ?? [])
          setStartDate((s.start_date as string) ?? "")
          setEndDate((s.end_date as string) ?? "")
          setStartTime((s.start_time as string) ?? "")
          setEndTime((s.end_time as string) ?? "")
          setBreaks((s.breaks as { start: string; end: string }[]) ?? [])
        }
      })
  }, [courseId])

  async function handleSave() {
    if (!courseId) return
    setSaving(true); setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        schedule_settings: { active_days: activeDays, start_date: startDate, end_date: endDate, start_time: startTime, end_time: endTime, breaks },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg("Schedule saved."); setTimeout(() => setSaveMsg(null), 2500) }
  }

  const toggle = (day: string) =>
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )

  return (
    <SectionContainer title="Schedule" description="Define when the course takes place.">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Config ── */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <TextInput
                type="text"
                placeholder="DD.MM.YYYY"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>End Date</FieldLabel>
              <TextInput
                type="text"
                placeholder="DD.MM.YYYY"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Days of the Week</FieldLabel>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggle(day)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                    activeDays.includes(day)
                      ? "border-primary bg-accent text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Start Time</FieldLabel>
              <TextInput
                type="text"
                placeholder="HH:MM"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>End Time</FieldLabel>
              <TextInput
                type="text"
                placeholder="HH:MM"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Breaks</FieldLabel>
            <div className="rounded-lg border border-dashed border-border bg-background p-4 space-y-2">
              {breaks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No breaks added.</p>
              ) : (
                breaks.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="font-mono">{b.start || "??:??"}</span>
                    <span className="text-muted-foreground">–</span>
                    <span className="font-mono">{b.end || "??:??"}</span>
                    <button
                      type="button"
                      onClick={() => setBreaks((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-auto text-muted-foreground hover:text-destructive transition text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => setBreaks((prev) => [...prev, { start: "", end: "" }])}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:border-primary/30 transition"
              >
                + Add Break
              </button>
            </div>
          </div>
          {courseId && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Schedule"}
              </button>
              {saveMsg && (
                <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{saveMsg}</span>
              )}
            </div>
          )}
          <button
            type="button"
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:border-primary/30 transition"
          >
            Generate Schedule
          </button>
        </div>

        {/* ── Week preview ── */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Weekly View
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            {/* Header row */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={`py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide transition ${
                    activeDays.includes(day)
                      ? "text-primary"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            {/* Session slots */}
            <div className="grid grid-cols-7 divide-x divide-border">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={`flex flex-col gap-1 p-1.5 min-h-[80px] transition ${
                    activeDays.includes(day) ? "bg-accent/30" : ""
                  }`}
                >
                  {activeDays.includes(day) && (
                    <>
                      <div className="rounded bg-primary/15 border border-primary/30 px-1.5 py-1 text-center">
                        <p className="text-[9px] font-semibold text-primary">
                          {startTime || "—"}
                        </p>
                        <p className="text-[8px] text-primary/60">
                          {endTime ? `→ ${endTime}` : ""}
                        </p>
                      </div>
                      {breaks.map((b, i) => (
                        <div
                          key={i}
                          className="rounded bg-muted border border-border px-1.5 py-0.5 text-center"
                        >
                          <p className="text-[8px] text-muted-foreground">
                            Break {b.start && b.end ? `${b.start}–${b.end}` : ""}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Date range badge */}
          {(startDate || endDate) && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {startDate || "—"} → {endDate || "—"}
            </p>
          )}
          {activeDays.length === 0 && (
            <p className="mt-2 text-center text-xs italic text-muted-foreground/50">
              Select days to see the schedule.
            </p>
          )}
        </div>
      </div>
    </SectionContainer>
  )
}

function CurriculumSection({ courseId }: { courseId: string | null }) {
  const [moduleOrg, setModuleOrg] = useState("linear")
  const [contentVolume, setContentVolume] = useState("single")
  const [courseType, setCourseType] = useState("essential")
  const [lessonCount, setLessonCount] = useState(8)
  const [moduleCount, setModuleCount] = useState(3)
  const [topics, setTopics] = useState(2)
  const [objectives, setObjectives] = useState(2)
  const [tasks, setTasks] = useState(2)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("curriculum_data").eq("id", courseId).single()
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

  async function handleSave() {
    if (!courseId) return
    setSaving(true); setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        curriculum_data: { module_org: moduleOrg, content_volume: contentVolume, course_type: courseType, lesson_count: lessonCount, module_count: moduleCount, topics, objectives, tasks },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg("Curriculum saved."); setTimeout(() => setSaveMsg(null), 2500) }
  }

  const VOLUME_LABELS: Record<string, string> = {
    mini: "≤ 30 min", single: "≤ 60 min",
    double: "≤ 120 min", triple: "≤ 180 min", fullday: "> 180 min",
  }

  // Build outline preview
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
    // custom — show placeholder
    return Array.from({ length: Math.min(moduleCount, 6) }, (_, i) => ({
      mod: `Module ${i + 1}`,
      lessons: ["Lesson…"],
    }))
  })()

  return (
    <SectionContainer title="Curriculum" description="Structure and content density of your course.">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* ── Config ── */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Module Organization</p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { value: "linear", title: "No Modules",     description: "Lessons in a single flat list." },
                { value: "equal",  title: "Equal Modules",  description: "Evenly distributed across modules." },
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
                type="number" min={1} max={60} value={lessonCount}
                onChange={(e) => setLessonCount(Math.min(60, Math.max(1, Number(e.target.value))))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
              />
            </div>
            {moduleOrg !== "linear" && (
              <div>
                <FieldLabel>Number of Modules</FieldLabel>
                <input
                  type="number" min={1} max={12} value={moduleCount}
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
              { value: "mini",    title: "Mini",      meta: "≤ 30 min",  description: "Short session, 1–2 topics." },
              { value: "single",  title: "Standard",  meta: "≤ 60 min",  description: "Normal lesson, balanced." },
              { value: "double",  title: "Extended",  meta: "≤ 120 min", description: "Double-length with practice." },
              { value: "triple",  title: "Intensive", meta: "≤ 180 min", description: "Long block, deeper coverage." },
              { value: "fullday", title: "Full Day",  meta: "> 180 min", description: "Workshop-style." },
            ].map((opt) => (
              <RadioCard key={opt.value} name="content-volume" {...opt} checked={contentVolume === opt.value} onChange={setContentVolume} />
            ))}
          </div>

          <Divider label="Content Density" />
          <p className="text-sm text-muted-foreground -mt-4 mb-3">Per-lesson detail level.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Topics / lesson",     value: topics,     set: setTopics,     min: 1, max: 10 },
              { label: "Objectives / topic",  value: objectives, set: setObjectives, min: 1, max: 5 },
              { label: "Tasks / objective",   value: tasks,      set: setTasks,      min: 1, max: 5 },
            ].map(({ label, value, set, min, max }) => (
              <div key={label}>
                <FieldLabel>{label}</FieldLabel>
                <input
                  type="number" min={min} max={max} value={value}
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
              { value: "essential",  title: "Essential",  description: "Plus evaluation and certification." },
              { value: "complete",   title: "Complete",   description: "Every available template included." },
              { value: "custom",     title: "Custom",     description: "Manually select any combination." },
            ].map((opt) => (
              <RadioCard key={opt.value} name="course-type" {...opt} checked={courseType === opt.value} onChange={setCourseType} />
            ))}
          </div>

          {courseId && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Curriculum"}
              </button>
              {saveMsg && (
                <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{saveMsg}</span>
              )}
            </div>
          )}
        </div>

        {/* ── Curriculum outline preview ── */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Curriculum Outline
          </p>
          {/* Stats bar */}
          <div className="mb-3 flex flex-wrap gap-3">
            {[
              { label: "Lessons",    value: lessonCount },
              { label: "Session",    value: VOLUME_LABELS[contentVolume] ?? "" },
              { label: "Topics/les", value: topics },
              { label: "Obj/topic",  value: objectives },
              { label: "Tasks/obj",  value: tasks },
            ].map(({ label, value }) => (
              <div key={label} className="rounded border border-border bg-background px-2 py-1 text-center">
                <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
                <p className="text-xs font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
          {/* Outline tree */}
          <div className="overflow-y-auto rounded-lg border border-border bg-background p-3 space-y-2" style={{ maxHeight: 340 }}>
            {outline.map((group, gi) => (
              <div key={gi}>
                {group.mod && (
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {group.mod}
                    </span>
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
                        {topics > 3 && (
                          <span className="text-[9px] text-muted-foreground/50 self-center">
                            +{topics - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

function GenerationSection() {
  const [optCtx, setOptCtx] = useState({ schedule: true, structure: true, existing: false })
  const toggle = (key: keyof typeof optCtx) =>
    setOptCtx((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <SectionContainer title="Generation" description="Use AI to generate curriculum content from your course settings.">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Required Context</p>
            <div className="space-y-2">
              {["Course Essentials", "Classification", "Pedagogy Approach"].map((label) => (
                <label key={label} className="flex items-center gap-2.5 opacity-60 cursor-not-allowed">
                  <input type="checkbox" checked readOnly className="h-4 w-4 accent-primary" />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Optional Context</p>
            <div className="space-y-2">
              {(
                [
                  { key: "schedule" as const, label: "Schedule Settings" },
                  { key: "structure" as const, label: "Content Structure" },
                  { key: "existing" as const, label: "Existing Curriculum" },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optCtx[key]}
                    onChange={() => toggle(key)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Generation Actions</p>
          <div className="space-y-2">
            {[
              "Generate All",
              "Generate Module Names",
              "Generate Lesson Names",
              "Generate Topic Titles",
              "Generate Objectives",
              "Generate Tasks",
            ].map((action, i) => (
              <button
                key={action}
                type="button"
                className={`w-full rounded-md border px-4 py-2.5 text-left text-sm font-medium transition ${
                  i === 0
                    ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
                    : "border-border bg-background text-foreground hover:border-primary/30 hover:bg-accent"
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

// ─── Students ─────────────────────────────────────────────────────────────────

function StudentsSection() {
  const [method, setMethod] = useState<"upload" | "manual">("upload")
  const [students] = useState<{ first: string; last: string; email: string; id: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <SectionContainer title="Students" description="Build or import your student roster.">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Config */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Import Method</p>
          <div className="flex flex-col gap-3">
            {(["upload", "manual"] as const).map((m) => (
              <label
                key={m}
                className={`flex items-start gap-3 cursor-pointer rounded-lg border p-4 transition ${
                  method === m ? "border-primary bg-accent" : "border-border hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="student-method"
                  value={m}
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {m === "upload" ? "Upload Roster" : "Manual Entry"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m === "upload"
                      ? "Import from Excel, CSV, PDF, or Word"
                      : "Add students one by one or paste bulk CSV"}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {method === "upload" ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.xls,.xlsx,.pdf,.docx,.doc"
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                Upload Roster File
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Supported: XLSX, CSV, PDF, DOCX
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><FieldLabel>First Name</FieldLabel><TextInput placeholder="Jane" /></div>
                <div><FieldLabel>Last Name</FieldLabel><TextInput placeholder="Doe" /></div>
                <div><FieldLabel>Email</FieldLabel><TextInput type="email" placeholder="jane@school.org" /></div>
                <div><FieldLabel>Student ID</FieldLabel><TextInput placeholder="Auto-generated" /></div>
              </div>
              <div>
                <FieldLabel hint="optional">Learning Style</FieldLabel>
                <TextInput placeholder="e.g., Visual, Collaborative" />
              </div>
              <button
                type="button"
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                Add Student
              </button>
              <div className="rounded-md border border-dashed border-border p-3">
                <FieldLabel>Bulk Entry</FieldLabel>
                <textarea
                  rows={3}
                  placeholder={"Jane,Doe,jane@school.org,12345\nJohn,Smith,john@school.org,12346"}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Format: First, Last, Email, ID, Grade, Learning style
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Roster preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Roster Preview
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-4 border-b border-border bg-muted/60">
              {["First name", "Last name", "Email", "Student ID"].map((h) => (
                <div key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {h}
                </div>
              ))}
            </div>
            {students.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                No roster loaded yet. Upload or enter students to generate a preview.
              </div>
            ) : (
              students.map((s, i) => (
                <div key={i} className="grid grid-cols-4 border-b border-border last:border-0">
                  {[s.first, s.last, s.email, s.id].map((v, j) => (
                    <div key={j} className="truncate px-3 py-2 text-xs text-foreground">{v}</div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

// ─── Pedagogy ─────────────────────────────────────────────────────────────────

const PEDAGOGY_PRESETS = [
  { label: "Traditional",       x: -75, y: -75 },
  { label: "Progressive",       x: 75,  y: 75  },
  { label: "Guided Discovery",  x: -25, y: 75  },
  { label: "Balanced",          x: 0,   y: 0   },
]

function getPedagogyApproach(x: number, y: number) {
  if (x === 0 && y === 0)
    return { title: "Balanced", subtitle: "Essentialist × Behaviorist ↔ Progressive × Constructivist", desc: "A balanced blend of teacher guidance, student agency, and mixed knowledge construction." }
  if (x <= -50 && y <= -50)
    return { title: "Traditional", subtitle: "Essentialist × Behaviorist", desc: "Teacher-centred instruction with structured delivery and behaviorist reinforcement." }
  if (x >= 50 && y >= 50)
    return { title: "Progressive", subtitle: "Progressive × Constructivist", desc: "Student-led exploration with emphasis on meaning-making and real-world application." }
  if (x <= 0 && y >= 50)
    return { title: "Guided Discovery", subtitle: "Essentialist × Constructivist", desc: "Structured guidance within student-driven inquiry and hands-on discovery." }
  return { title: "Custom Approach", subtitle: `x: ${x}, y: ${y}`, desc: "A custom pedagogical blend based on your coordinate placement." }
}

function PedagogySection({ courseId }: { courseId: string | null }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("course_layout").eq("id", courseId).single()
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

  async function handleSave() {
    if (!courseId) return
    setSaving(true); setSaveMsg(null)
    const supabase = createClient()
    // Merge into course_layout to preserve other keys
    const { data: existing } = await supabase.from("courses").select("course_layout").eq("id", courseId).single()
    const merged = { ...((existing?.course_layout as Record<string, unknown>) ?? {}), pedagogy: { x: pos.x, y: pos.y } }
    const { error } = await supabase.from("courses")
      .update({ course_layout: merged, updated_at: new Date().toISOString() })
      .eq("id", courseId)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg("Pedagogy saved."); setTimeout(() => setSaveMsg(null), 2500) }
  }

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
    <SectionContainer title="Pedagogy" description="Position your teaching philosophy on the pedagogical coordinate plane.">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Plane */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Coordinate Plane
          </p>
          <div
            ref={gridRef}
            className="relative select-none cursor-crosshair rounded-lg border border-border bg-muted/20"
            style={{ height: 272 }}
            onMouseDown={(e) => { dragging.current = true; updateFromEvent(e) }}
            onMouseMove={(e) => { if (dragging.current) updateFromEvent(e) }}
            onMouseUp={() => { dragging.current = false }}
            onMouseLeave={() => { dragging.current = false }}
          >
            {/* Axis lines */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
            {/* Labels */}
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Essentialist</span>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">Progressive</span>
            <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[10px] text-muted-foreground">Constructivist</span>
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">Behaviorist</span>
            {/* Marker */}
            <div
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow"
              style={{
                left: `${((pos.x + 100) / 200) * 100}%`,
                top:  `${((-pos.y + 100) / 200) * 100}%`,
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
        </div>

        {/* Summary */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Approach Summary
          </p>
          <div className="rounded-lg border border-border bg-background p-5 space-y-2">
            <h3 className="text-base font-semibold text-foreground">{approach.title}</h3>
            <p className="text-xs italic text-muted-foreground">{approach.subtitle}</p>
            <p className="text-sm leading-relaxed text-foreground">{approach.desc}</p>
          </div>
          {courseId && (
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Pedagogy"}
              </button>
              {saveMsg && (
                <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{saveMsg}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionContainer>
  )
}

// ─── Templates ────────────────────────────────────────────────────────────────

const BLOCK_COLORS: Record<BlockId, string> = {
  header:     "bg-blue-100   border-blue-300   dark:bg-blue-950   dark:border-blue-700",
  program:    "bg-teal-100   border-teal-300   dark:bg-teal-950   dark:border-teal-700",
  resources:  "bg-cyan-100   border-cyan-300   dark:bg-cyan-950   dark:border-cyan-700",
  content:    "bg-muted      border-border",
  assignment: "bg-amber-100  border-amber-300  dark:bg-amber-950  dark:border-amber-700",
  scoring:    "bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-700",
  footer:     "bg-zinc-100   border-zinc-300   dark:bg-zinc-800   dark:border-zinc-600",
}

function TemplatePreview({
  type,
  enabled,
  name,
}: {
  type: TemplateType
  enabled: Record<BlockId, boolean>
  name: string
}) {
  const meta = TEMPLATE_TYPE_META[type]
  const visibleBlocks = ALL_BLOCKS.filter(
    (b) => b.forTypes.includes(type) && (enabled[b.id] || b.mandatory)
  )

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Template Preview
      </p>
      {/* Mini page */}
      <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-lg border border-border bg-white shadow-md dark:bg-zinc-900" style={{ minHeight: 300 }}>
        {/* Page header strip */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-muted/40">
          <span className="text-[10px] font-semibold text-muted-foreground truncate">
            {name || "Untitled template"}
          </span>
          <span className={`rounded text-[9px] font-bold px-1.5 py-0.5 ${meta.badge}`}>
            {meta.label}
          </span>
        </div>
        {/* Blocks */}
        <div className="space-y-1.5 p-2">
          {visibleBlocks.map((block) => (
            <div
              key={block.id}
              className={`flex items-center gap-2 rounded border px-2.5 ${BLOCK_COLORS[block.id]}`}
              style={{ height: block.previewH }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wide">
                  {block.label}
                </p>
                <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                  {block.description}
                </p>
              </div>
              {block.mandatory && (
                <span className="shrink-0 text-[8px] font-bold uppercase text-muted-foreground/50">
                  required
                </span>
              )}
            </div>
          ))}
          {visibleBlocks.length === 0 && (
            <p className="py-8 text-center text-[10px] italic text-muted-foreground">
              Enable blocks to see the template structure.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function TemplatesSection({ courseId }: { courseId: string | null }) {
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [saveAllMsg, setSaveAllMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("template_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && Array.isArray(data?.template_settings)) {
          setTemplates(data.template_settings as LocalTemplate[])
        }
      })
  }, [courseId])

  async function persistTemplates(list: LocalTemplate[]) {
    if (!courseId) return
    setSavingAll(true)
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({ template_settings: list, updated_at: new Date().toISOString() })
      .eq("id", courseId)
    setSavingAll(false)
    if (error) setSaveAllMsg(`Error: ${error.message}`)
    else { setSaveAllMsg("Saved."); setTimeout(() => setSaveAllMsg(null), 2000) }
  }
  const [configType, setConfigType] = useState<TemplateType>("lesson")
  const [configName, setConfigName] = useState("")
  const [configDesc, setConfigDesc] = useState("")
  const [configEnabled, setConfigEnabled] = useState<Record<BlockId, boolean>>(
    defaultEnabled("lesson")
  )
  const [isCreating, setIsCreating] = useState(false)

  const activeTemplate = templates.find((t) => t.id === activeId) ?? null

  function handleTypeChange(t: TemplateType) {
    setConfigType(t)
    setConfigEnabled(defaultEnabled(t))
  }

  function toggleBlock(id: BlockId, force?: boolean) {
    const block = ALL_BLOCKS.find((b) => b.id === id)
    if (block?.mandatory) return
    setConfigEnabled((prev) => ({ ...prev, [id]: force ?? !prev[id] }))
  }

  function saveTemplate() {
    if (!configName.trim()) return
    const tpl: LocalTemplate = {
      id: crypto.randomUUID(),
      name: configName.trim(),
      type: configType,
      enabled: { ...configEnabled },
      description: configDesc,
    }
    const updated = [...templates, tpl]
    setTemplates(updated)
    setActiveId(tpl.id)
    setIsCreating(false)
    persistTemplates(updated)
  }

  function loadTemplate(tpl: LocalTemplate) {
    setActiveId(tpl.id)
    setConfigType(tpl.type)
    setConfigName(tpl.name)
    setConfigDesc(tpl.description)
    setConfigEnabled({ ...tpl.enabled })
    setIsCreating(false)
  }

  // Preview data — live while in "create" mode, else active template
  const previewType    = isCreating              ? configType    : (activeTemplate?.type    ?? configType)
  const previewEnabled = isCreating              ? configEnabled : (activeTemplate?.enabled ?? configEnabled)
  const previewName    = isCreating || !activeId ? configName    : (activeTemplate?.name    ?? "")

  return (
    <SectionContainer
      title="Templates"
      description="Design reusable page templates for your course lessons, quizzes, assessments, and more."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Config panel ── */}
        <div className="space-y-5">
          {/* Saved templates list */}
          {templates.length > 0 && !isCreating && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Saved Templates
              </p>
              <div className="space-y-1.5">
                {templates.map((tpl) => {
                  const meta = TEMPLATE_TYPE_META[tpl.type]
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => loadTemplate(tpl)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        activeId === tpl.id
                          ? "border-primary bg-accent"
                          : "border-border bg-background hover:border-primary/30 hover:bg-muted/40"
                      }`}
                    >
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {tpl.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isCreating && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true)
                  setActiveId(null)
                  setConfigName("")
                  setConfigDesc("")
                  setConfigType("lesson")
                  setConfigEnabled(defaultEnabled("lesson"))
                }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                New Template
              </button>
            </div>
          )}

          {/* Config form */}
          {(isCreating || templates.length === 0) && (
            <div className="space-y-5">
              <div>
                <FieldLabel>Template Name</FieldLabel>
                <TextInput
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value.slice(0, 60))}
                  placeholder="e.g., Standard Lesson"
                />
                <CharCount value={configName} max={60} />
              </div>
              <div>
                <FieldLabel hint="optional">Description</FieldLabel>
                <TextInput
                  value={configDesc}
                  onChange={(e) => setConfigDesc(e.target.value.slice(0, 120))}
                  placeholder="Brief description of this template"
                />
              </div>

              {/* Template type */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Template Type
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {TEMPLATE_TYPES.map((t) => {
                    const meta = TEMPLATE_TYPE_META[t]
                    return (
                      <label
                        key={t}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 transition ${
                          configType === t
                            ? "border-primary bg-accent"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="template-type"
                          value={t}
                          checked={configType === t}
                          onChange={() => handleTypeChange(t)}
                          className="accent-primary"
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold ${configType === t ? "text-primary" : "text-foreground"}`}>
                            {meta.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            {meta.description}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Block configuration */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Block Configuration
                </p>
                <div className="space-y-2">
                  {ALL_BLOCKS.filter((b) => b.forTypes.includes(configType)).map((block) => (
                    <label
                      key={block.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                        block.mandatory
                          ? "cursor-not-allowed border-border/50 bg-muted/30 opacity-60"
                          : "cursor-pointer border-border hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={configEnabled[block.id] || block.mandatory}
                        disabled={block.mandatory}
                        onChange={() => toggleBlock(block.id)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{block.label}</span>
                          {block.mandatory && (
                            <span className="text-[9px] font-bold uppercase text-muted-foreground/60">
                              required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{block.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Save + Cancel */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={!configName.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save Template
                </button>
                {templates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:border-primary/30 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* View/edit loaded template config (not creating) */}
          {!isCreating && activeTemplate && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TEMPLATE_TYPE_META[activeTemplate.type].badge}`}>
                    {TEMPLATE_TYPE_META[activeTemplate.type].label}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{activeTemplate.name}</span>
                </div>
                {activeTemplate.description && (
                  <p className="text-xs text-muted-foreground">{activeTemplate.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { loadTemplate(activeTemplate); setIsCreating(true) }}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:border-primary/30 transition"
              >
                Edit Template
              </button>
            </div>
          )}
        </div>

        {/* ── Preview panel ── */}
        <TemplatePreview
          type={previewType}
          enabled={previewEnabled}
          name={previewName}
        />
      </div>
    </SectionContainer>
  )
}

// ─── Course Visibility ────────────────────────────────────────────────────────

function VisibilitySection({ courseId }: { courseId: string | null }) {
  const [state, setState] = useState({
    visible: false,
    enrollment: false,
    approval: false,
    notifications: false,
    publicDiscovery: false,
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("visibility_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.visibility_settings) {
          const v = data.visibility_settings as Record<string, boolean>
          setState({
            visible:         v.visible         ?? false,
            enrollment:      v.enrollment      ?? false,
            approval:        v.approval        ?? false,
            notifications:   v.notifications   ?? false,
            publicDiscovery: v.public_discovery ?? false,
          })
        }
      })
  }, [courseId])

  async function handleSave() {
    if (!courseId) return
    setSaving(true); setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        visibility_settings: {
          visible:          state.visible,
          enrollment:       state.enrollment,
          approval:         state.approval,
          notifications:    state.notifications,
          public_discovery: state.publicDiscovery,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg("Visibility saved."); setTimeout(() => setSaveMsg(null), 2500) }
  }

  const toggle = (key: keyof typeof state) =>
    setState((prev) => ({ ...prev, [key]: !prev[key] }))

  const items: { key: keyof typeof state; label: string }[] = [
    { key: "visible",        label: "Course visible to students" },
    { key: "enrollment",     label: "Allow new enrollments" },
    { key: "approval",       label: "Require enrollment approval" },
    { key: "notifications",  label: "Enable email notifications for new enrollments" },
    { key: "publicDiscovery",label: "Make course publicly discoverable" },
  ]

  return (
    <SectionContainer title="Course Visibility" description="Control who can see and enroll in your course.">
      <div className="space-y-3">
        {items.map(({ key, label }) => (
          <label key={key} className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={state[key]}
              onChange={() => toggle(key)}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            <span className="text-sm text-foreground">{label}</span>
          </label>
        ))}
      </div>
      {courseId && (
        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Visibility"}
          </button>
          {saveMsg && (
            <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{saveMsg}</span>
          )}
        </div>
      )}
    </SectionContainer>
  )
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

function MarketplaceSection({ courseId }: { courseId: string | null }) {
  const [listingStatus, setListingStatus] = useState("draft")
  const [targetAudience, setTargetAudience] = useState("")
  const [revenueShare, setRevenueShare] = useState(30)
  const [distribution, setDistribution] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("marketplace_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.marketplace_settings) {
          const m = data.marketplace_settings as Record<string, unknown>
          setListingStatus((m.listing_status as string) ?? "draft")
          setTargetAudience((m.target_audience as string) ?? "")
          setRevenueShare((m.revenue_share as number) ?? 30)
          setDistribution((m.distribution_channels as string) ?? "")
        }
      })
  }, [courseId])

  async function handleSave() {
    if (!courseId) return
    setSaving(true); setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        marketplace_settings: {
          listing_status:       listingStatus,
          target_audience:      targetAudience,
          revenue_share:        revenueShare,
          distribution_channels: distribution,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg("Marketplace saved."); setTimeout(() => setSaveMsg(null), 2500) }
  }

  return (
    <SectionContainer title="Marketplace" description="Configure how your course appears in the Neptino marketplace.">
      <div>
        <FieldLabel>Listing Status</FieldLabel>
        <SelectInput value={listingStatus} onChange={(e) => setListingStatus(e.target.value)}>
          <option value="draft">Draft</option>
          <option value="pending">Pending Review</option>
          <option value="published">Published</option>
        </SelectInput>
      </div>
      <div>
        <FieldLabel>Target Audience</FieldLabel>
        <TextInput
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="e.g., Grade 11 Humanities"
        />
      </div>
      <div>
        <FieldLabel hint="0–100">Revenue Share (%)</FieldLabel>
        <TextInput
          type="number"
          min={0}
          max={100}
          value={revenueShare}
          onChange={(e) => setRevenueShare(Math.min(100, Math.max(0, Number(e.target.value))))}
          placeholder="30"
        />
      </div>
      <div>
        <FieldLabel hint="optional">Distribution Channels</FieldLabel>
        <textarea
          rows={3}
          value={distribution}
          onChange={(e) => setDistribution(e.target.value)}
          placeholder="List marketplaces or partner channels"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
      {courseId ? (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Marketplace"}
          </button>
          {saveMsg && (
            <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {saveMsg}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic">Create the course in Essentials first to enable saving.</p>
      )}
    </SectionContainer>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection({ courseId }: { courseId: string | null }) {
  const [pricingModel, setPricingModel] = useState("free")
  const [basePrice, setBasePrice] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [trial, setTrial] = useState(false)
  const [discountNotes, setDiscountNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("pricing_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.pricing_settings) {
          const p = data.pricing_settings as Record<string, unknown>
          setPricingModel((p.pricing_model as string) ?? "free")
          setBasePrice(p.base_price != null ? String(p.base_price) : "")
          setCurrency((p.currency as string) ?? "USD")
          setTrial((p.trial as boolean) ?? false)
          setDiscountNotes((p.discount_notes as string) ?? "")
        }
      })
  }, [courseId])

  async function handleSave() {
    if (!courseId) return
    setSaving(true); setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        pricing_settings: {
          pricing_model:  pricingModel,
          base_price:     basePrice !== "" ? Number(basePrice) : null,
          currency,
          trial,
          discount_notes: discountNotes || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg("Pricing saved."); setTimeout(() => setSaveMsg(null), 2500) }
  }

  return (
    <SectionContainer title="Pricing & Monetization" description="Set the pricing model and revenue settings for your course.">
      <div>
        <FieldLabel>Pricing Model</FieldLabel>
        <SelectInput value={pricingModel} onChange={(e) => setPricingModel(e.target.value)}>
          <option value="free">Free</option>
          <option value="subscription">Subscription</option>
          <option value="one-time">One-time purchase</option>
          <option value="license">Site license</option>
        </SelectInput>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Base Price</FieldLabel>
          <TextInput
            type="number"
            min={0}
            step={1}
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="99"
          />
        </div>
        <div>
          <FieldLabel>Currency</FieldLabel>
          <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </SelectInput>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={trial}
          onChange={() => setTrial(!trial)}
          className="h-4 w-4 cursor-pointer accent-primary"
        />
        <span className="text-sm text-foreground">Offer free trial</span>
      </label>
      <div>
        <FieldLabel hint="optional">Discount Notes</FieldLabel>
        <textarea
          rows={3}
          value={discountNotes}
          onChange={(e) => setDiscountNotes(e.target.value)}
          placeholder="Describe educator or early-bird discounts"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
      {courseId ? (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Pricing"}
          </button>
          {saveMsg && (
            <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {saveMsg}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic">Create the course in Essentials first to enable saving.</p>
      )}
    </SectionContainer>
  )
}

// ─── External Integrations ────────────────────────────────────────────────────

function IntegrationsSection({ courseId }: { courseId: string | null }) {
  const [lmsProvider, setLmsProvider] = useState("")
  const [apiAccess, setApiAccess] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [integrationNotes, setIntegrationNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("integration_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.integration_settings) {
          const i = data.integration_settings as Record<string, unknown>
          setLmsProvider((i.lms_provider as string) ?? "")
          setApiAccess((i.api_access as boolean) ?? false)
          setWebhookUrl((i.webhook_url as string) ?? "")
          setIntegrationNotes((i.integration_notes as string) ?? "")
        }
      })
  }, [courseId])

  async function handleSave() {
    if (!courseId) return
    setSaving(true); setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        integration_settings: {
          lms_provider:      lmsProvider || null,
          api_access:        apiAccess,
          webhook_url:       webhookUrl || null,
          integration_notes: integrationNotes || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg("Integrations saved."); setTimeout(() => setSaveMsg(null), 2500) }
  }

  return (
    <SectionContainer title="External Integrations" description="Connect your course to external platforms and APIs.">
      <div>
        <FieldLabel>LMS Provider</FieldLabel>
        <SelectInput value={lmsProvider} onChange={(e) => setLmsProvider(e.target.value)}>
          <option value="">None</option>
          <option value="Canvas">Canvas</option>
          <option value="Moodle">Moodle</option>
          <option value="Schoology">Schoology</option>
        </SelectInput>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={apiAccess}
          onChange={() => setApiAccess(!apiAccess)}
          className="h-4 w-4 cursor-pointer accent-primary"
        />
        <span className="text-sm text-foreground">Enable API access for this course</span>
      </label>
      <div>
        <FieldLabel hint="optional">Webhook URL</FieldLabel>
        <TextInput
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://example.com/webhook"
        />
      </div>
      <div>
        <FieldLabel hint="optional">Integration Notes</FieldLabel>
        <textarea
          rows={3}
          value={integrationNotes}
          onChange={(e) => setIntegrationNotes(e.target.value)}
          placeholder="Describe external automation related to this course"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
      {courseId ? (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Integrations"}
          </button>
          {saveMsg && (
            <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {saveMsg}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic">Create the course in Essentials first to enable saving.</p>
      )}
    </SectionContainer>
  )
}

// ─── Communication ────────────────────────────────────────────────────────────

function CommunicationSection({ courseId }: { courseId: string | null }) {
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [announcementChannel, setAnnouncementChannel] = useState("email")
  const [digest, setDigest] = useState(false)
  const [officeHours, setOfficeHours] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("communication_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.communication_settings) {
          const c = data.communication_settings as Record<string, unknown>
          setWelcomeMessage((c.welcome_message as string) ?? "")
          setAnnouncementChannel((c.announcement_channel as string) ?? "email")
          setDigest((c.digest as boolean) ?? false)
          setOfficeHours((c.office_hours as string) ?? "")
        }
      })
  }, [courseId])

  async function handleSave() {
    if (!courseId) return
    setSaving(true); setSaveMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        communication_settings: {
          welcome_message:      welcomeMessage || null,
          announcement_channel: announcementChannel,
          digest,
          office_hours:         officeHours || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setSaving(false)
    if (error) setSaveMsg(`Error: ${error.message}`)
    else { setSaveMsg("Communication saved."); setTimeout(() => setSaveMsg(null), 2500) }
  }

  return (
    <SectionContainer title="Communication" description="Configure how you communicate with enrolled students.">
      <div>
        <FieldLabel>Welcome Message</FieldLabel>
        <textarea
          rows={4}
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          placeholder="Send a short welcome note to enrolled students"
          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
      <div>
        <FieldLabel>Announcement Channel</FieldLabel>
        <SelectInput value={announcementChannel} onChange={(e) => setAnnouncementChannel(e.target.value)}>
          <option value="email">Email</option>
          <option value="in-app">In-app</option>
          <option value="sms">SMS</option>
        </SelectInput>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={digest}
          onChange={() => setDigest(!digest)}
          className="h-4 w-4 cursor-pointer accent-primary"
        />
        <span className="text-sm text-foreground">Enable weekly update digest</span>
      </label>
      <div>
        <FieldLabel hint="optional">Office Hours</FieldLabel>
        <TextInput
          value={officeHours}
          onChange={(e) => setOfficeHours(e.target.value)}
          placeholder="Thursdays 3–5pm CET"
        />
      </div>
      {courseId ? (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Communication"}
          </button>
          {saveMsg && (
            <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {saveMsg}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic">Create the course in Essentials first to enable saving.</p>
      )}
    </SectionContainer>
  )
}

// ─── Page Setup ───────────────────────────────────────────────────────────────

const PAGE_DIMS = {
  a4:          { w: 21,    h: 29.7  },
  "us-letter": { w: 21.59, h: 27.94 },
}

const PAGE_LABELS = {
  a4:          { cm: "A4 (21.0 × 29.7 cm)",         inches: 'A4 (8.27″ × 11.69″)'         },
  "us-letter": { cm: "US Letter (21.6 × 27.9 cm)",  inches: 'US Letter (8.5″ × 11″)'       },
}

function PageSetupSection({
  courseId,
  initialConfig,
  onSaved,
}: {
  courseId?:      string | null
  initialConfig?: CanvasPageConfig | null
  onSaved?:       (cfg: CanvasPageConfig) => void
}) {
  const [units, setUnits]             = useState<"cm" | "inches">("cm")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [size, setSize]               = useState<"a4" | "us-letter">("a4")
  const [pageCount, setPageCount]     = useState(initialConfig?.pageCount ?? 1)
  const [margins, setMargins]         = useState({ top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 })
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState<string | null>(null)

  /** Sync fields when a saved config is loaded from outside */
  useEffect(() => {
    if (!initialConfig) return
    setPageCount(initialConfig.pageCount)
    // We don't reverse-engineer mm → display units from pixel margins here;
    // the user can adjust and save again.  Just note the page count was applied.
  }, [initialConfig])

  const updateMargin = (side: keyof typeof margins, val: string) =>
    setMargins((prev) => ({ ...prev, [side]: parseFloat(val) || 0 }))

  /** Convert margins from display units to mm */
  const marginsToMm = () => {
    const factor = units === "cm" ? 10 : 25.4
    return {
      top:    margins.top    * factor,
      right:  margins.right  * factor,
      bottom: margins.bottom * factor,
      left:   margins.left   * factor,
    }
  }

  const handleSave = async () => {
    if (!courseId) {
      setSaveMsg("Save the course essentials first before configuring the page.")
      return
    }
    setSaving(true)
    setSaveMsg(null)

    const marginsMm = marginsToMm()
    const cfg       = computePageConfig(size, orientation, pageCount, marginsMm)

    const supabase = createClient()
    const storedSettings = {
      page_size:        size,
      page_orientation: orientation,
      page_count:       pageCount,
      margins_mm:       marginsMm,
    }

    const { error } = await supabase
      .from("courses")
      .update({ generation_settings: storedSettings })
      .eq("id", courseId)

    setSaving(false)
    if (error) {
      setSaveMsg(`Error: ${error.message}`)
    } else {
      setSaveMsg("Saved!")
      onSaved?.(cfg)
      setTimeout(() => setSaveMsg(null), 2500)
    }
  }

  const isLandscape = orientation === "landscape"
  const { w, h } = PAGE_DIMS[size]
  const physW = isLandscape ? h : w
  const physH = isLandscape ? w : h
  const previewW = 160
  const previewH = Math.round(previewW * (physH / physW))

  return (
    <SectionContainer title="Page Setup" description="Configure the canvas dimensions and margins for lesson pages.">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Config */}
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Units</p>
            <div className="flex gap-5">
              {(["cm", "inches"] as const).map((u) => (
                <label key={u} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="units"
                    value={u}
                    checked={units === u}
                    onChange={() => setUnits(u)}
                    className="accent-primary"
                  />
                  <span className="text-foreground">{u === "cm" ? "Metric (cm)" : "Imperial (inches)"}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Orientation</p>
            <div className="flex gap-5">
              {(["portrait", "landscape"] as const).map((o) => (
                <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="orientation"
                    value={o}
                    checked={orientation === o}
                    onChange={() => setOrientation(o)}
                    className="accent-primary"
                  />
                  <span className="text-foreground capitalize">{o}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Canvas Size</p>
            <div className="flex flex-col gap-2">
              {(["a4", "us-letter"] as const).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="canvas-size"
                    value={s}
                    checked={size === s}
                    onChange={() => setSize(s)}
                    className="accent-primary"
                  />
                  <span className="text-foreground">{PAGE_LABELS[s][units]}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Number of Pages
            </p>
            <TextInput
              type="number"
              min={1}
              max={500}
              step={1}
              value={pageCount}
              onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Margins ({units})
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["top", "bottom", "left", "right"] as const).map((side) => (
                <div key={side}>
                  <FieldLabel>{side.charAt(0).toUpperCase() + side.slice(1)}</FieldLabel>
                  <TextInput
                    type="number"
                    step={0.01}
                    min={0}
                    max={10}
                    value={margins[side]}
                    onChange={(e) => updateMargin(side, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save row */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Page Setup"}
            </button>
            {saveMsg && (
              <span className={`text-xs ${saveMsg.startsWith("Error") ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>

        {/* Visual preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Page Preview</p>
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative border border-border bg-white shadow-sm"
              style={{ width: previewW, height: previewH }}
            >
              <div
                className="absolute border border-dashed border-primary/40"
                style={{
                  top:    `${(margins.top    / physH) * 100}%`,
                  bottom: `${(margins.bottom / physH) * 100}%`,
                  left:   `${(margins.left   / physW) * 100}%`,
                  right:  `${(margins.right  / physW) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {PAGE_LABELS[size][units]} · {orientation}
            </p>
            <p className="text-xs text-muted-foreground">
              {pageCount} page{pageCount !== 1 ? "s" : ""} · Margins: {margins.top} / {margins.right} / {margins.bottom} / {margins.left} {units}
            </p>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

// ─── Advanced ─────────────────────────────────────────────────────────────────

function AdvancedSection() {
  return (
    <SectionContainer title="Advanced Settings" description="Destructive actions and advanced configuration.">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">
          Once you delete a course, there is no going back. Please be certain.
        </p>
        <button
          type="button"
          className="rounded-md border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
        >
          Delete Course
        </button>
      </div>
    </SectionContainer>
  )
}

// ─── Preview View ─────────────────────────────────────────────────────────────

function PreviewView({ courseData }: { courseData: CourseCreatedData | null }) {
  if (!courseData?.title) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <p className="text-sm font-medium text-foreground">Nothing to preview yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete the Setup section to see your course preview.
        </p>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm">
        {courseData.imageUrl ? (
          <div className="h-56 overflow-hidden">
            <img src={courseData.imageUrl} alt={courseData.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center bg-muted/50">
            <span className="text-xs italic text-muted-foreground/40">No cover image</span>
          </div>
        )}
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{courseData.title}</h1>
            {courseData.subtitle && (
              <p className="mt-1 text-base text-muted-foreground">{courseData.subtitle}</p>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{courseData.description}</p>
          <div className="flex flex-wrap gap-2">
            {courseData.language && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {courseData.language}
              </span>
            )}
            {courseData.courseType && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {courseData.courseType}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Student Experience Preview
        </p>
        <p className="text-sm text-muted-foreground">
          This is a simplified preview. The full student experience — including the lesson canvas, assignments,
          and assessments — will be available once the course is launched.
        </p>
      </div>
    </div>
  )
}

// ─── Launch View ──────────────────────────────────────────────────────────────

function LaunchView({
  courseId,
  courseData,
  onSetView,
}: {
  courseId:   string | null
  courseData: CourseCreatedData | null
  onSetView:  (v: View) => void
}) {
  const [launching, setLaunching] = useState(false)
  const [launched,  setLaunched]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const checks = [
    { label: "Course created",      ok: !!courseId },
    { label: "Title set",           ok: !!(courseData?.title  && courseData.title.length  >= 3) },
    { label: "Description added",   ok: !!(courseData?.description && courseData.description.length >= 10) },
    { label: "Language selected",   ok: !!courseData?.language },
    { label: "Course type selected", ok: !!courseData?.courseType },
  ]
  const allPassed = checks.every((c) => c.ok)

  async function handleLaunch() {
    if (!courseId) return
    setLaunching(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("courses")
      .update({
        visibility_settings: {
          visible: true, enrollment: true, approval: false,
          notifications: true, public_discovery: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setLaunching(false)
    if (err) setError(err.message)
    else setLaunched(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Launch Course</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the checklist below, then publish your course to make it visible and open for enrollment.
        </p>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-border bg-background divide-y divide-border overflow-hidden">
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-3">
            <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
              ok ? "bg-emerald-500" : "bg-muted border border-border"
            }`}>
              {ok && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 8 8">
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${ok ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {!ok && (
              <button
                type="button"
                onClick={() => onSetView("setup")}
                className="ml-auto text-xs text-primary hover:underline"
              >
                Fix →
              </button>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {launched ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4 space-y-1">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Course launched successfully!
          </p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">
            Your course is now visible and open for enrollment.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleLaunch}
          disabled={!allPassed || launching || !courseId}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Rocket className="h-4 w-4" />
          {launching ? "Launching…" : "Launch Course"}
        </button>
      )}
    </div>
  )
}

// ─── Section router ───────────────────────────────────────────────────────────

function SectionContent({
  id,
  onCourseCreated,
  courseCreatedData,
  initialEssentials,
  existingCourseId,
  pageConfig,
  onPageConfigChange,
}: {
  id: SectionId
  onCourseCreated: (courseId: string, data: CourseCreatedData) => void
  courseCreatedData: CourseCreatedData | null
  initialEssentials: CourseCreatedData | null
  existingCourseId: string | null
  pageConfig?: CanvasPageConfig | null
  onPageConfigChange?: (cfg: CanvasPageConfig) => void
}) {
  switch (id) {
    case "essentials":     return <EssentialsSection key={existingCourseId ?? "new"} onCourseCreated={onCourseCreated} initialData={initialEssentials} existingCourseId={existingCourseId} />
    case "classification": return <ClassificationSection courseCreatedData={courseCreatedData} courseId={existingCourseId} />
    case "students":       return <StudentsSection />
    case "pedagogy":       return <PedagogySection       courseId={existingCourseId} />
    case "templates":      return <TemplatesSection     courseId={existingCourseId} />
    case "schedule":       return <ScheduleSection      courseId={existingCourseId} />
    case "curriculum":     return <CurriculumSection    courseId={existingCourseId} />
    case "generation":     return <GenerationSection />
    case "visibility":     return <VisibilitySection    courseId={existingCourseId} />
    case "marketplace":    return <MarketplaceSection   courseId={existingCourseId} />
    case "pricing":        return <PricingSection        courseId={existingCourseId} />
    case "integrations":   return <IntegrationsSection   courseId={existingCourseId} />
    case "communication":  return <CommunicationSection  courseId={existingCourseId} />
    case "page-setup":     return <PageSetupSection courseId={existingCourseId} initialConfig={pageConfig} onSaved={onPageConfigChange} />
    case "advanced":       return <AdvancedSection />
    default:               return <Placeholder />
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    }>
      <CourseBuilderPageInner />
    </Suspense>
  )
}

function CourseBuilderPageInner() {
  const searchParams = useSearchParams()
  const urlCourseId = searchParams.get("id")
  const urlView     = searchParams.get("view") as View | null
  const [view, setView] = useState<View>(
    urlView && (["setup", "create", "preview", "launch"] as string[]).includes(urlView)
      ? urlView
      : "setup"
  )
  const [activeSection, setActiveSection] = useState<SectionId>("essentials")
  const [courseTitle, setCourseTitle] = useState("Untitled Course")
  const [courseId, setCourseId] = useState<string | null>(urlCourseId)
  const [courseCreatedData, setCourseCreatedData] = useState<CourseCreatedData | null>(null)
  const [initialEssentials, setInitialEssentials] = useState<CourseCreatedData | null>(null)
  const [pageConfig, setPageConfig] = useState<CanvasPageConfig | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(!!urlCourseId)
  const [editingTitle, setEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!urlCourseId) return
    setLoadingCourse(true)
    const supabase = createClient()
    supabase
      .from("courses")
      .select("id, course_name, course_subtitle, course_description, course_language, course_type, course_image, generation_settings")
      .eq("id", urlCourseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const loaded: CourseCreatedData = {
            title: data.course_name ?? "",
            subtitle: data.course_subtitle ?? "",
            description: data.course_description ?? "",
            language: data.course_language ?? "",
            courseType: data.course_type ?? "",
            imageName: null,
            imageUrl: data.course_image ?? null,
          }
          setInitialEssentials(loaded)
          setCourseCreatedData(loaded)
          setCourseTitle(data.course_name ?? "Untitled Course")
          setCourseId(urlCourseId)

          // Restore page setup from generation_settings
          const gs = data.generation_settings as Record<string, unknown> | null
          if (gs?.page_size) {
            try {
              const cfg = computePageConfig(
                gs.page_size as "a4" | "us-letter",
                (gs.page_orientation as "portrait" | "landscape") ?? "portrait",
                (gs.page_count as number) ?? 1,
                (gs.margins_mm as { top: number; right: number; bottom: number; left: number }) ??
                  { top: 25.4, right: 19.05, bottom: 25.4, left: 19.05 },
              )
              setPageConfig(cfg)
            } catch {
              // ignore malformed settings
            }
          }
        }
        setLoadingCourse(false)
      })
  }, [urlCourseId])

  function handleCourseCreated(id: string, essentials: CourseCreatedData) {
    setCourseId(id)
    setCourseTitle(essentials.title)
    setCourseCreatedData(essentials)
    // Only auto-advance to classification when creating a new course
    if (!urlCourseId && !courseId) {
      setActiveSection("classification")
    }
  }

  const startEditTitle = () => {
    setEditingTitle(true)
    setTimeout(() => titleRef.current?.select(), 10)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top chrome */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4 shrink-0 gap-4">
        {/* Left: back / previous step */}
        <div className="flex items-center min-w-[110px]">
          {getPrevView(view) === null ? (
            <Link
              href="/teacher/courses"
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Courses
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setView(getPrevView(view)!)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {VIEW_LABELS[getPrevView(view)!]}
            </button>
          )}
        </div>

        {/* Center: editable title + current step badge */}
        <div className="flex flex-1 items-center justify-center gap-2 min-w-0 overflow-hidden">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="max-w-xs rounded border-0 bg-transparent text-sm font-medium text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring px-1"
            />
          ) : (
            <button
              onClick={startEditTitle}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate max-w-xs"
            >
              {courseTitle}
            </button>
          )}
          <span className="shrink-0 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {VIEW_LABELS[view]}
          </span>
        </div>

        {/* Right: next step */}
        <div className="flex items-center justify-end min-w-[110px]">
          {getNextView(view) !== null ? (
            <button
              type="button"
              onClick={() => setView(getNextView(view)!)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                getNextView(view) === "launch"
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border border-border bg-background text-foreground hover:border-primary/30 hover:text-primary"
              }`}
            >
              {VIEW_LABELS[getNextView(view)!]}
              {getNextView(view) === "launch"
                ? <Rocket className="h-3.5 w-3.5" />
                : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            /* At launch view — "Done" returns to courses list */
            <Link
              href="/teacher/courses"
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
            >
              Done
            </Link>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {view === "setup" ? (
          <div className="flex flex-1 overflow-hidden p-2 bg-muted/10">
            <div className="flex flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
              <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-border bg-background md:block">
                <nav className="px-3 py-4 space-y-5">
                  {SECTIONS.map((group) => (
                    <div key={group.heading}>
                      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {group.heading}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            onClick={() => setActiveSection(id)}
                            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition ${
                              activeSection === id
                                ? "bg-accent text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </aside>

              <main className="flex-1 overflow-y-auto bg-muted/20 px-6 py-8">
                <div className="mx-auto max-w-5xl">
                  {loadingCourse ? (
                    <div className="flex items-center justify-center h-48">
                      <span className="text-sm text-muted-foreground">Loading course…</span>
                    </div>
                  ) : (
                    <SectionContent
                      id={activeSection}
                      onCourseCreated={handleCourseCreated}
                      courseCreatedData={courseCreatedData}
                      initialEssentials={initialEssentials}
                      existingCourseId={courseId}
                      pageConfig={pageConfig}
                      onPageConfigChange={setPageConfig}
                    />
                  )}
                </div>
              </main>
            </div>
          </div>
        ) : view === "create" ? (
          <div className="flex flex-1 overflow-hidden p-2 bg-muted/10">
            <div className="flex flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
              <CreateView canvasConfig={pageConfig} courseId={courseId} />
            </div>
          </div>
        ) : view === "preview" ? (
          <div className="flex flex-1 overflow-y-auto p-2 bg-muted/10">
            <div className="flex flex-1 overflow-y-auto rounded-xl border border-border shadow-sm bg-background px-6">
              <PreviewView courseData={courseCreatedData} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-y-auto p-2 bg-muted/10">
            <div className="flex flex-1 overflow-y-auto rounded-xl border border-border shadow-sm bg-background px-6">
              <LaunchView courseId={courseId} courseData={courseCreatedData} onSetView={setView} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
