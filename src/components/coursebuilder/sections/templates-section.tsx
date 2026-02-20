"use client"

import { useCallback, useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { SaveStatusBar, SetupColumn, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"

const TEMPLATE_TYPES = ["lesson", "quiz", "assessment", "exam", "certificate"] as const
type TemplateType = (typeof TEMPLATE_TYPES)[number]

const TEMPLATE_TYPE_META: Record<TemplateType, { label: string; description: string; badge: string }> = {
  lesson: {
    label: "Lesson",
    description: "Standard instructional lesson page",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  quiz: {
    label: "Quiz",
    description: "Short formative assessment",
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  assessment: {
    label: "Assessment",
    description: "Formal summative evaluation",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  exam: {
    label: "Exam",
    description: "Comprehensive final examination",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  certificate: {
    label: "Certificate",
    description: "Course completion certificate",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
}

type BlockId = "header" | "program" | "resources" | "content" | "assignment" | "scoring" | "footer"

interface TemplateBlockConfig {
  id: BlockId
  label: string
  description: string
  mandatory: boolean
  previewH: number
  forTypes: TemplateType[]
}

interface TemplateFieldConfig {
  key: string
  label: string
  required: boolean
  forTypes: TemplateType[]
}

type TemplateFieldState = Record<BlockId, Record<string, boolean>>

type TemplateUiState = {
  activeId: string | null
  panelView: "config" | "preview"
  configView: "idle" | "create" | "edit"
}

type TemplateSettingsPayload = {
  templates: LocalTemplate[]
  ui?: TemplateUiState
}

const ALL_BLOCKS: TemplateBlockConfig[] = [
  { id: "header", label: "Header", description: "Title, date, student name", mandatory: true, previewH: 40, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
  { id: "program", label: "Program", description: "Objectives & lesson overview", mandatory: true, previewH: 52, forTypes: ["lesson", "quiz", "assessment", "exam"] },
  { id: "resources", label: "Resources", description: "Reference materials & links", mandatory: true, previewH: 44, forTypes: ["lesson", "quiz", "assessment", "exam"] },
  { id: "content", label: "Content", description: "Main body — topics, notes, media", mandatory: true, previewH: 80, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
  { id: "assignment", label: "Assignment", description: "Tasks & exercises for students", mandatory: true, previewH: 60, forTypes: ["lesson", "quiz"] },
  { id: "scoring", label: "Scoring", description: "Rubric & grading criteria", mandatory: true, previewH: 56, forTypes: ["assessment", "exam", "quiz"] },
  { id: "footer", label: "Footer", description: "Signatures, branding, page number", mandatory: true, previewH: 32, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
]

interface LocalTemplate {
  id: string
  name: string
  type: TemplateType
  enabled: Record<BlockId, boolean>
  fieldEnabled?: TemplateFieldState
  description: string
  createdAt?: string
}

function defaultEnabled(): Record<BlockId, boolean> {
  const enabled: Partial<Record<BlockId, boolean>> = {}
  for (const block of ALL_BLOCKS) {
    enabled[block.id] = block.mandatory
  }
  return enabled as Record<BlockId, boolean>
}

const BLOCK_FIELDS: Record<BlockId, TemplateFieldConfig[]> = {
  header: [
    { key: "lesson_number", label: "Lesson Number", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "lesson_title", label: "Lesson Title", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "module_title", label: "Module Title", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "course_title", label: "Course Title", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
    { key: "institution_name", label: "Institution Name", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
    { key: "teacher_name", label: "Teacher Name", required: false, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
    { key: "date", label: "Date", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
  ],
  program: [
    { key: "competence", label: "Competence", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "topic", label: "Topic", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "objective", label: "Objective", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "task", label: "Task", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "program_method", label: "Method", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "program_social_form", label: "Social Form", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "program_time", label: "Time", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
  ],
  resources: [
    { key: "task", label: "Task", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "type", label: "Type", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "origin", label: "Origin", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "state", label: "State", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "quality", label: "Quality", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "notes", label: "Notes", required: false, forTypes: ["lesson", "quiz", "assessment", "exam"] },
  ],
  content: [
    { key: "competence", label: "Competence", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
    { key: "competence_time", label: "Competence Time", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "topic", label: "Topic", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
    { key: "topic_time", label: "Topic Time", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "objective", label: "Objective", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "objective_time", label: "Objective Time", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "task", label: "Task", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "task_time", label: "Task Time", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "instruction_area", label: "Instruction Area", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "student_area", label: "Student Area", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
    { key: "teacher_area", label: "Teacher Area", required: true, forTypes: ["lesson", "quiz", "assessment", "exam"] },
  ],
  assignment: [
    { key: "competence", label: "Competence", required: true, forTypes: ["lesson", "quiz"] },
    { key: "topic", label: "Topic", required: true, forTypes: ["lesson", "quiz"] },
    { key: "objective", label: "Objective", required: true, forTypes: ["lesson", "quiz"] },
    { key: "task", label: "Task", required: true, forTypes: ["lesson", "quiz"] },
    { key: "submission_format", label: "Submission Format", required: false, forTypes: ["lesson", "quiz"] },
    { key: "due_date", label: "Due Date", required: false, forTypes: ["lesson", "quiz"] },
  ],
  scoring: [
    { key: "criterion", label: "Criterion", required: true, forTypes: ["quiz", "assessment", "exam"] },
    { key: "weight", label: "Weight", required: true, forTypes: ["quiz", "assessment", "exam"] },
    { key: "max_points", label: "Max Points", required: true, forTypes: ["quiz", "assessment", "exam"] },
    { key: "feedback", label: "Feedback", required: false, forTypes: ["quiz", "assessment", "exam"] },
  ],
  footer: [
    { key: "copyright", label: "Copyright", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
    { key: "page_number", label: "Page Number", required: true, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
    { key: "teacher_name", label: "Teacher Name", required: false, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
    { key: "institution_name", label: "Institution Name", required: false, forTypes: ["lesson", "quiz", "assessment", "exam", "certificate"] },
  ],
}

function defaultFieldEnabled(type: TemplateType, enabled: Record<BlockId, boolean>): TemplateFieldState {
  const state: Partial<TemplateFieldState> = {}
  for (const block of ALL_BLOCKS) {
    const fields = BLOCK_FIELDS[block.id].filter((f) => f.forTypes.includes(type))
    const fieldState: Record<string, boolean> = {}
    for (const field of fields) {
      fieldState[field.key] = enabled[block.id] ? field.required : false
    }
    state[block.id] = fieldState
  }
  return state as TemplateFieldState
}

function normalizeTemplate(template: LocalTemplate): LocalTemplate {
  const enabled = template.enabled ?? defaultEnabled()
  return {
    ...template,
    enabled,
    fieldEnabled: template.fieldEnabled ?? defaultFieldEnabled(template.type, enabled),
    createdAt: template.createdAt ?? new Date().toISOString(),
  }
}

function normalizeTemplateSettings(raw: unknown): TemplateSettingsPayload {
  if (Array.isArray(raw)) {
    return { templates: raw as LocalTemplate[] }
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const templates = Array.isArray(obj.templates) ? (obj.templates as LocalTemplate[]) : []
    const ui = obj.ui && typeof obj.ui === "object" ? (obj.ui as TemplateUiState) : undefined
    return { templates, ui }
  }
  return { templates: [] }
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

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <p className="mt-1 text-right text-xs text-muted-foreground">
      {value.length} / {max}
    </p>
  )
}

function TemplatePreview({
  type,
  enabled,
  fieldEnabled,
  name,
  isEmpty,
}: {
  type: TemplateType
  enabled: Record<BlockId, boolean>
  fieldEnabled: TemplateFieldState
  name: string
  isEmpty: boolean
}) {
  if (isEmpty) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-border bg-muted/10 px-6 py-8">
        <p className="text-center text-sm italic text-muted-foreground">
          Create a new template or load an existing one to see the preview here.
        </p>
      </div>
    )
  }

  const meta = TEMPLATE_TYPE_META[type]
  const visibleBlocks = ALL_BLOCKS.filter((b) => b.forTypes.includes(type) && (enabled[b.id] || b.mandatory))
  const visibleBlockIds = new Set(visibleBlocks.map((block) => block.id))

  const visibleFields = (blockId: BlockId) =>
    BLOCK_FIELDS[blockId]
      .filter((f) => f.forTypes.includes(type))
      .filter((f) => f.required || Boolean(fieldEnabled[blockId]?.[f.key]))

  const isFieldVisible = (blockId: BlockId, key: string) =>
    BLOCK_FIELDS[blockId].some(
      (field) =>
        field.key === key &&
        field.forTypes.includes(type) &&
        (field.required || Boolean(fieldEnabled[blockId]?.[field.key])),
    )

  const contentRows = [
    { label: "Competence", timeLabel: isFieldVisible("content", "competence_time") ? "Competence Time" : "", indent: 0, visible: isFieldVisible("content", "competence"), empty: false },
    { label: "Topic", timeLabel: isFieldVisible("content", "topic_time") ? "Topic Time" : "", indent: 0, visible: isFieldVisible("content", "topic"), empty: false },
    { label: "Objective", timeLabel: isFieldVisible("content", "objective_time") ? "Objective Time" : "", indent: 1, visible: isFieldVisible("content", "objective"), empty: false },
    { label: "Task", timeLabel: isFieldVisible("content", "task_time") ? "Task Time" : "", indent: 1, visible: isFieldVisible("content", "task"), empty: false },
    { label: "Instruction Area", timeLabel: "", indent: 1, visible: isFieldVisible("content", "instruction_area"), empty: false },
    { label: "", timeLabel: "", indent: 2, visible: isFieldVisible("content", "instruction_area"), empty: true },
    { label: "Student Area", timeLabel: "", indent: 1, visible: isFieldVisible("content", "student_area"), empty: false },
    { label: "", timeLabel: "", indent: 2, visible: isFieldVisible("content", "student_area"), empty: true },
    { label: "Teacher Area", timeLabel: "", indent: 1, visible: isFieldVisible("content", "teacher_area"), empty: false },
    { label: "", timeLabel: "", indent: 2, visible: isFieldVisible("content", "teacher_area"), empty: true },
  ].filter((row) => row.visible)

  return (
    <div>
      <div className="w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{name || "Untitled template"}</p>
            <p className="text-xs text-muted-foreground">Lesson document preview</p>
          </div>
          <span className={`rounded px-2 py-0.5 text-xs font-bold ${meta.badge}`}>{meta.label}</span>
        </div>

        <div className="bg-muted/20 p-4">
          <div className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-background p-4">
            <div className="mb-3 grid gap-2 rounded-md border border-border p-3 md:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Course</p>
                <p className="text-xs text-foreground">Course Title / Module Title</p>
              </div>
              <div className="md:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lesson</p>
                <p className="text-xs text-foreground">Lesson Number · Lesson Title · Date</p>
              </div>
            </div>

            {visibleBlockIds.has("program") && (
              <div className="mb-3 rounded-md border border-border p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Program</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {visibleFields("program").map((field) => (
                    <div key={field.key} className="rounded border border-border/70 bg-muted/10 px-2 py-1">
                      <p className="text-[10px] font-medium text-muted-foreground">{field.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visibleBlockIds.has("resources") && (
              <div className="mb-3 rounded-md border border-border p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resources</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {visibleFields("resources").map((field) => (
                    <div key={field.key} className="rounded border border-border/70 bg-muted/10 px-2 py-1">
                      <p className="text-[10px] font-medium text-muted-foreground">{field.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visibleBlockIds.has("content") && (
              <div className="mb-3 rounded-md border border-border p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Content</p>
                <div className="overflow-x-auto rounded border border-border/70">
                  <table className="w-full border-collapse text-left text-[10px]">
                    <thead className="bg-muted/20">
                      <tr>
                        <th className="border border-border/60 px-2 py-1 font-semibold uppercase tracking-wide text-muted-foreground">Content</th>
                        <th className="border border-border/60 px-2 py-1 font-semibold uppercase tracking-wide text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentRows.map((row, index) => (
                        <tr key={`${row.label || "empty"}-${index}`}>
                          <td
                            className={`border border-border/60 px-2 py-1 text-muted-foreground ${row.empty ? "h-7" : "h-6"}`}
                            style={{ paddingLeft: `${0.5 + row.indent * 0.75}rem` }}
                          >
                            {row.label}
                          </td>
                          <td className={`border border-border/60 px-2 py-1 text-muted-foreground ${row.empty ? "h-7" : "h-6"}`}>
                            {row.timeLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {visibleBlockIds.has("assignment") && (
              <div className="mb-3 rounded-md border border-border p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Assignment</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {visibleFields("assignment").map((field) => (
                    <div key={field.key} className="rounded border border-border/70 bg-muted/10 px-2 py-1">
                      <p className="text-[10px] font-medium text-muted-foreground">{field.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visibleBlockIds.has("scoring") && (
              <div className="mb-3 rounded-md border border-border p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Scoring</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {visibleFields("scoring").map((field) => (
                    <div key={field.key} className="rounded border border-border/70 bg-muted/10 px-2 py-1">
                      <p className="text-[10px] font-medium text-muted-foreground">{field.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visibleBlockIds.has("footer") && (
              <div className="rounded-md border border-border p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Footer</p>
                <div className="flex flex-wrap gap-2">
                  {visibleFields("footer").map((field) => (
                    <span key={field.key} className="rounded border border-border/70 bg-muted/10 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {field.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TemplatesSection({ courseId }: { courseId: string | null }) {
  const [templates, setTemplates] = useState<LocalTemplate[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [panelView, setPanelView] = useState<"config" | "preview">("config")
  const [configView, setConfigView] = useState<"idle" | "create" | "edit">("idle")
  const [showTypeOverlay, setShowTypeOverlay] = useState(false)
  const [showLoadOverlay, setShowLoadOverlay] = useState(false)
  const [pendingTypeSelection, setPendingTypeSelection] = useState<TemplateType | null>(null)
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uiStateLoaded, setUiStateLoaded] = useState(false)
  const [localUiState, setLocalUiState] = useState<TemplateUiState | null>(null)
  const [serverUiState, setServerUiState] = useState<TemplateUiState | null>(null)

  const uiStorageKey = courseId ? `coursebuilder:templates:ui:${courseId}` : null

  useEffect(() => {
    queueMicrotask(() => {
      setUiStateLoaded(false)
      setLocalUiState(null)
      setServerUiState(null)
    })
  }, [courseId])

  useEffect(() => {
    if (!courseId) return
    if (uiStorageKey) {
      const raw = localStorage.getItem(uiStorageKey)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as TemplateUiState
          queueMicrotask(() => setLocalUiState(parsed))
        } catch {
          queueMicrotask(() => setLocalUiState(null))
        }
      } else {
        queueMicrotask(() => setLocalUiState(null))
      }
    }
    const supabase = createClient()
    supabase
      .from("courses")
      .select("template_settings")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (error) return
        const settings = normalizeTemplateSettings(data?.template_settings)
        setTemplates(settings.templates.map(normalizeTemplate))
        setServerUiState(settings.ui ?? null)
      })
  }, [courseId, uiStorageKey])

  const persistTemplates = useCallback(async (list: LocalTemplate[]) => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const payload: TemplateSettingsPayload = {
      templates: list,
      ui: { activeId, panelView, configView },
    }
    const { error } = await supabase.from("courses").update({ template_settings: payload, updated_at: new Date().toISOString() }).eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, activeId, panelView, configView])

  const [configType, setConfigType] = useState<TemplateType>("lesson")
  const [configName, setConfigName] = useState("")
  const [configDesc, setConfigDesc] = useState("")
  const [configEnabled, setConfigEnabled] = useState<Record<BlockId, boolean>>(defaultEnabled())
  const [configFieldEnabled, setConfigFieldEnabled] = useState<TemplateFieldState>(defaultFieldEnabled("lesson", defaultEnabled()))

  const activeTemplate = templates.find((t) => t.id === activeId) ?? null
  const isCreating = configView === "create"
  const isEditing = configView === "edit"
  const isConfiguring = isCreating || isEditing
  const showConfigBlocks = isConfiguring || Boolean(activeTemplate)

  useEffect(() => {
    if (!uiStorageKey) return
    const nextState: TemplateUiState = { activeId, panelView, configView }
    localStorage.setItem(uiStorageKey, JSON.stringify(nextState))
  }, [uiStorageKey, activeId, panelView, configView])

  useEffect(() => {
    if (!showTypeOverlay && !showLoadOverlay) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [showTypeOverlay, showLoadOverlay])

  function beginCreate() {
    const nextType: TemplateType = "lesson"
    const nextEnabled = defaultEnabled()
    setConfigView("create")
    setConfigType(nextType)
    setConfigName("")
    setConfigDesc("")
    setConfigEnabled(nextEnabled)
    setConfigFieldEnabled(defaultFieldEnabled(nextType, nextEnabled))
    setPendingTypeSelection(null)
    setShowTypeOverlay(true)
  }

  function beginLoad() {
    if (templates.length === 0) return
    setPendingLoadId(activeId ?? templates[0]?.id ?? null)
    setConfirmDelete(false)
    setShowLoadOverlay(true)
  }

  function createFromOverlay() {
    if (!pendingTypeSelection || !configName.trim()) return
    const nextEnabled = defaultEnabled()
    const nextFieldEnabled = defaultFieldEnabled(pendingTypeSelection, nextEnabled)
    const tpl: LocalTemplate = {
      id: crypto.randomUUID(),
      name: configName.trim(),
      type: pendingTypeSelection,
      enabled: { ...nextEnabled },
      fieldEnabled: { ...nextFieldEnabled },
      description: configDesc,
      createdAt: new Date().toISOString(),
    }
    const updated = [...templates, tpl]
    setTemplates(updated)
    setActiveId(tpl.id)
    setConfigType(tpl.type)
    setConfigEnabled({ ...tpl.enabled })
    setConfigFieldEnabled(tpl.fieldEnabled ?? defaultFieldEnabled(tpl.type, tpl.enabled))
    setConfigView("edit")
    void persistTemplates(updated)
    setShowTypeOverlay(false)
  }

  function formatTemplateDate(ts?: string) {
    if (!ts) return "Date unavailable"
    const parsed = new Date(ts)
    if (Number.isNaN(parsed.getTime())) return "Date unavailable"
    return parsed.toLocaleString()
  }

  function toggleBlock(id: BlockId, force?: boolean) {
    const block = ALL_BLOCKS.find((b) => b.id === id)
    if (block?.mandatory) return
    setConfigEnabled((prev) => {
      const nextValue = force ?? !prev[id]
      setConfigFieldEnabled((fieldsPrev) => {
        const nextFields = { ...fieldsPrev, [id]: { ...(fieldsPrev[id] ?? {}) } }
        for (const field of BLOCK_FIELDS[id].filter((f) => f.forTypes.includes(configType))) {
          nextFields[id][field.key] = nextValue ? field.required : false
        }
        return nextFields
      })
      return { ...prev, [id]: nextValue }
    })
  }

  function toggleField(blockId: BlockId, fieldKey: string, value?: boolean) {
    setConfigFieldEnabled((prev) => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        [fieldKey]: value ?? !prev[blockId]?.[fieldKey],
      },
    }))
  }

  function loadTemplate(tplRaw: LocalTemplate) {
    const tpl = normalizeTemplate(tplRaw)
    setActiveId(tpl.id)
    setConfigType(tpl.type)
    setConfigName(tpl.name)
    setConfigDesc(tpl.description)
    setConfigEnabled({ ...tpl.enabled })
    setConfigFieldEnabled(tpl.fieldEnabled ?? defaultFieldEnabled(tpl.type, tpl.enabled))
    setConfigView("edit")
    setPanelView("config")
    setShowTypeOverlay(false)
    setShowLoadOverlay(false)
    setConfirmDelete(false)
    setPendingLoadId(null)
  }

  useEffect(() => {
    if (uiStateLoaded) return
    if (templates.length === 0) return

    const savedUi = localUiState ?? serverUiState
    const targetId = savedUi?.activeId ?? templates[0]?.id ?? null
    const targetTemplate = targetId ? templates.find((t) => t.id === targetId) ?? null : null
    const nextConfigView = savedUi?.configView ?? (targetTemplate ? "edit" : "idle")
    const nextPanelView = savedUi?.panelView

    queueMicrotask(() => {
      if (targetTemplate) {
        loadTemplate(targetTemplate)
      }

      if (nextPanelView) setPanelView(nextPanelView)
      if (nextConfigView) setConfigView(nextConfigView)

      setUiStateLoaded(true)
    })
  }, [templates, localUiState, serverUiState, uiStateLoaded])

  async function deletePendingTemplate() {
    if (!pendingLoadId) return
    const updated = templates.filter((tpl) => tpl.id !== pendingLoadId)
    setTemplates(updated)

    if (activeId === pendingLoadId) {
      setActiveId(null)
      setConfigView("idle")
    }

    setConfirmDelete(false)
    setPendingLoadId(updated[0]?.id ?? null)
    if (showLoadOverlay && updated.length === 0) {
      setShowLoadOverlay(false)
    }

    await persistTemplates(updated)
  }

  const persistTemplateDraft = useCallback(async () => {
    if (!courseId || !isEditing || !activeId) return
    const active = templates.find((item) => item.id === activeId)
    if (!active) return

    const normalizedActive = normalizeTemplate(active)
    const nextDraft = normalizeTemplate({
      ...normalizedActive,
      name: configName.trim(),
      type: configType,
      enabled: { ...configEnabled },
      fieldEnabled: { ...configFieldEnabled },
      description: configDesc,
    })

    const unchanged =
      normalizedActive.name === nextDraft.name &&
      normalizedActive.type === nextDraft.type &&
      normalizedActive.description === nextDraft.description &&
      JSON.stringify(normalizedActive.enabled) === JSON.stringify(nextDraft.enabled) &&
      JSON.stringify(normalizedActive.fieldEnabled) === JSON.stringify(nextDraft.fieldEnabled)

    if (unchanged) return

    const updated = templates.map((item) => (item.id === activeId ? nextDraft : item))
    setTemplates(updated)
    await persistTemplates(updated)
  }, [
    courseId,
    isEditing,
    activeId,
    templates,
    configName,
    configType,
    configEnabled,
    configFieldEnabled,
    configDesc,
    persistTemplates,
  ])

  useDebouncedChangeSave(persistTemplateDraft, 700, Boolean(courseId) && isEditing && Boolean(activeId))

  const previewType = isConfiguring ? configType : (activeTemplate?.type ?? "lesson")
  const previewEnabled = isConfiguring ? configEnabled : (activeTemplate?.enabled ?? defaultEnabled())
  const previewFieldEnabled = isConfiguring ? configFieldEnabled : (activeTemplate?.fieldEnabled ?? defaultFieldEnabled(previewType, previewEnabled))
  const previewName = isConfiguring ? configName : (activeTemplate?.name ?? "")
  const previewIsEmpty = isConfiguring ? !configName.trim() : !activeTemplate

  return (
    <SetupSection
      title="Templates"
      description="Design reusable page templates for your course lessons, quizzes, assessments, and more."
      headerActions={(
        <>
          <button
            type="button"
            onClick={beginCreate}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Create Template
          </button>
          <button
            type="button"
            onClick={beginLoad}
            disabled={templates.length === 0}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Load Template
          </button>
        </>
      )}
    >
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setPanelView("config")}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
            panelView === "config"
              ? "border-primary bg-accent text-primary"
              : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
          }`}
        >
          Config
        </button>
        <button
          type="button"
          onClick={() => setPanelView("preview")}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
            panelView === "preview"
              ? "border-primary bg-accent text-primary"
              : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
          }`}
        >
          Preview
        </button>
      </div>

      <div className="grid flex-1 min-h-0 items-stretch gap-4 lg:grid-cols-2">
        <div className={`${panelView === "preview" ? "hidden lg:block" : "block lg:block"} min-h-0`}>
          <SetupColumn className="flex h-full min-h-0 flex-col gap-4">
            <div className="relative min-h-0 flex-1 pt-1">
              {configView === "idle" && !activeTemplate && (
                <p className="text-sm italic text-muted-foreground">Select or create a template to configure its settings.</p>
              )}

              {showConfigBlocks && (
                <div className="space-y-5">
                  <div>
                    <div className="space-y-2">
                      {ALL_BLOCKS.filter((b) => b.forTypes.includes(configType)).map((block) => (
                        <div key={block.id} className="rounded-xl border border-border bg-background p-4 shadow-sm">
                          <div className="flex items-center gap-3">
                            {!block.mandatory && (
                              <input
                                type="checkbox"
                                checked={configEnabled[block.id]}
                                onChange={() => toggleBlock(block.id)}
                                className="h-3.5 w-3.5 accent-primary"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{block.label}</span>
                                {block.mandatory && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Required</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{block.description}</p>
                            </div>
                          </div>

                          {(configEnabled[block.id] || block.mandatory) && (
                            <div className="mt-3 rounded-lg border border-border/70 bg-muted/5 p-2.5">
                              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                                {BLOCK_FIELDS[block.id]
                                  .filter((f) => f.forTypes.includes(configType))
                                  .map((field) => (
                                    <label
                                      key={field.key}
                                      className={`flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-xs text-foreground/80 ${field.required ? "cursor-not-allowed" : "cursor-pointer"}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={field.required || Boolean(configFieldEnabled[block.id]?.[field.key])}
                                        disabled={field.required}
                                        onChange={() => toggleField(block.id, field.key)}
                                        className="h-3 w-3 accent-primary"
                                      />
                                      <span>{field.label}</span>
                                    </label>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SetupColumn>
        </div>

        <div className={`${panelView === "config" ? "hidden lg:block" : "block lg:block"} min-h-0`}>
          <SetupColumn className="h-full min-h-0">
            <TemplatePreview
              type={previewType}
              enabled={previewEnabled}
              fieldEnabled={previewFieldEnabled}
              name={previewName}
              isEmpty={previewIsEmpty}
            />
          </SetupColumn>
        </div>
      </div>

      {isConfiguring && showTypeOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] max-h-[860px] w-full max-w-xl flex-col rounded-xl border border-border bg-background p-5 shadow-lg">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pick Template Type</p>
            <div className="no-scrollbar mb-4 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-2 sm:grid-cols-2">
                {TEMPLATE_TYPES.map((t) => {
                  const meta = TEMPLATE_TYPE_META[t]
                  const selected = pendingTypeSelection === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPendingTypeSelection(t)}
                      className={`rounded-lg border bg-background px-3 py-3 text-left transition ${
                        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{meta.description}</p>
                    </button>
                  )
                })}
              </div>

              <div className={!pendingTypeSelection ? "opacity-60" : ""}>
                <FieldLabel>Template Name</FieldLabel>
                <TextInput
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value.slice(0, 60))}
                  placeholder="e.g., Standard Lesson"
                  disabled={!pendingTypeSelection}
                />
                <CharCount value={configName} max={60} />
              </div>
              <div className={!pendingTypeSelection ? "opacity-60" : ""}>
                <FieldLabel hint="optional">Description</FieldLabel>
                <TextInput
                  value={configDesc}
                  onChange={(e) => setConfigDesc(e.target.value.slice(0, 120))}
                  placeholder="Brief description of this template"
                  disabled={!pendingTypeSelection}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfigView("idle")
                  setPendingTypeSelection(null)
                  setShowTypeOverlay(false)
                }}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createFromOverlay}
                disabled={!pendingTypeSelection || !configName.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] max-h-[860px] w-full max-w-xl flex-col rounded-xl border border-border bg-background p-5 shadow-lg">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Load Template</p>
            <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
              {templates.map((tplRaw) => {
                const tpl = normalizeTemplate(tplRaw)
                const meta = TEMPLATE_TYPE_META[tpl.type]
                const selected = pendingLoadId === tpl.id
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setPendingLoadId(tpl.id)
                      setConfirmDelete(false)
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left text-sm transition ${
                      selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.badge}`}>{meta.label}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{tpl.name}</span>
                      <span className="block text-[11px] text-muted-foreground">Created: {formatTemplateDate(tpl.createdAt)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        loadTemplate(tpl)
                        setPendingTypeSelection(tpl.type)
                        setShowTypeOverlay(true)
                      }}
                      className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-primary/30"
                    >
                      Edit
                    </button>
                  </div>
                )
              })}
            </div>
            {confirmDelete && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Are you sure you want to delete this template?
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!pendingLoadId) return
                  if (!confirmDelete) {
                    setConfirmDelete(true)
                    return
                  }
                  void deletePendingTemplate()
                }}
                disabled={!pendingLoadId}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Delete selected template"
                title="Delete selected template"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoadOverlay(false)
                    setPendingLoadId(null)
                    setConfirmDelete(false)
                  }}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!pendingLoadId) return
                    const tpl = templates.find((item) => item.id === pendingLoadId)
                    if (tpl) loadTemplate(tpl)
                  }}
                  disabled={!pendingLoadId}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Load Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}
