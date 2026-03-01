"use client"

import {
  DANGER_ACTION_BUTTON_CLASS,
  FieldLabel,
  PRIMARY_ACTION_BUTTON_CLASS,
  SECONDARY_ACTION_BUTTON_CLASS,
  SetupColumn,
} from "@/components/coursebuilder"
import { MIN_TASKS_PER_OBJECTIVE } from "@/lib/curriculum/content-load-service"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import type { GenerationAction, NamingRules } from "@/lib/curriculum/ai-generation-service"
import { type CourseType, type CertificateMode } from "./curriculum-derived"
import {
  GENERATION_ACTION_CONFIG,
  type SavedTemplateSummary,
} from "./curriculum-section-utils"
import { Divider, RadioCard } from "./curriculum-primitives"

export interface CurriculumStructurePanelProps {
  moduleOrg: string
  setModuleOrg: (v: string) => void
  effectiveLessonCount: number
  lessonCount: number
  setLessonCount: (v: number) => void
  hasGeneratedSchedule: boolean
  moduleCount: number
  setModuleCount: (v: number) => void
  contentVolume: string
  setContentVolume: (v: string) => void
  topics: number
  setTopics: (v: number) => void
  objectives: number
  setObjectives: (v: number) => void
  objectiveInputMax: number
  tasks: number
  setTasks: (v: number) => void
  sequencingMode: string
  setSequencingMode: (v: string) => void
  courseType: string
  setCourseType: (v: string) => void
  filteredTemplates: SavedTemplateSummary[]
  templateDefaultType: TemplateType
  setTemplateDefaultType: (v: TemplateType) => void
  defaultTemplateOptions: TemplateType[]
  templateTypeLabel: (type: TemplateType) => string
  certificateMode: CertificateMode
  setCertificateMode: (v: CertificateMode) => void
  namingRules: NamingRules
  setNamingRules: (v: NamingRules) => void
  templateCountByCourseType: (type: CourseType) => number
  ollamaHealthy: boolean | null
  runningModels: string[]
  highLoadModelActive: boolean
  isGenerationReady: boolean
  readinessIssues: string[]
  missing: { essentials: boolean; schedule: boolean; curriculum: boolean }
  goToSection: (id: "essentials" | "schedule" | "curriculum") => void
  isGenerating: boolean
  generationCooldownLeft: number
  estimateForAction: (action: GenerationAction) => string
  runGeneration: (action: GenerationAction) => void
  cancelGeneration: () => void
  activeGenerationAction: GenerationAction | null
  clearAllGenerated: () => void
  runStatus: string | null
  runProgress: number
}

export function CurriculumStructurePanel(props: CurriculumStructurePanelProps) {
  const { namingRules, setNamingRules } = props

  return (
    <SetupColumn className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {[
          { value: "linear", title: "No Modules", description: "Lessons in a single flat list." },
          { value: "equal", title: "Equal Modules", description: "Evenly distributed across modules." },
          { value: "custom", title: "Custom Modules", description: "Define your own module boundaries." },
        ].map((opt) => (
          <RadioCard key={opt.value} name="module-org" {...opt} checked={props.moduleOrg === opt.value} onChange={props.setModuleOrg} compact />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Number of Lessons</FieldLabel>
          <input
            type="number" min={1} max={60} value={props.effectiveLessonCount}
            onChange={(e) => props.setLessonCount(Math.min(60, Math.max(1, Number(e.target.value))))}
            disabled={props.hasGeneratedSchedule}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
          />
        </div>
        {props.moduleOrg !== "linear" && (
          <div>
            <FieldLabel>Number of Modules</FieldLabel>
            <input
              type="number" min={1} max={12} value={props.moduleCount}
              onChange={(e) => props.setModuleCount(Math.min(12, Math.max(1, Number(e.target.value))))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
            />
          </div>
        )}
      </div>

      <Divider label="Content Volume" />
      <p className="text-sm text-muted-foreground -mt-4 mb-3">Target session length per lesson.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {[
          { value: "mini", title: "Mini", meta: "≤ 30 min", description: "Short session, 1–2 topics." },
          { value: "single", title: "Standard", meta: "≤ 60 min", description: "Normal lesson, balanced." },
          { value: "double", title: "Extended", meta: "≤ 120 min", description: "Double-length with practice." },
          { value: "triple", title: "Intensive", meta: "≤ 180 min", description: "Long block, deeper coverage." },
          { value: "fullday", title: "Full Day", meta: "≤ 240 min", description: "Workshop-style." },
          { value: "marathon", title: "Marathon", meta: "> 240 min", description: "Full immersion sessions." },
        ].map((opt) => (
          <RadioCard key={opt.value} name="content-volume" {...opt} checked={props.contentVolume === opt.value} onChange={props.setContentVolume} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Topics / lesson", value: props.topics, set: props.setTopics, min: 1, max: 10 },
          { label: "Objectives / topic", value: props.objectives, set: props.setObjectives, min: 1, max: props.objectiveInputMax },
          { label: "Tasks / objective", value: props.tasks, set: props.setTasks, min: MIN_TASKS_PER_OBJECTIVE, max: 5 },
        ].map(({ label, value, set, min, max }) => (
          <div key={label}>
            <FieldLabel>{label}</FieldLabel>
            <input type="number" min={min} max={max} value={value}
              onChange={(e) => set(Math.min(max, Math.max(min, Number(e.target.value))))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
            />
          </div>
        ))}
      </div>

      <Divider label="Curriculum Sequencing" />
      <p className="text-sm text-muted-foreground -mt-4 mb-3">How topics progress through the course.</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {[
          { value: "linear", title: "Linear", description: "Topics progress sequentially, each building on the last." },
          { value: "spiral", title: "Spiral", description: "Topics revisited with increasing depth and complexity." },
          { value: "thematic", title: "Thematic", description: "Topics organized around themes or projects." },
        ].map((opt) => (
          <RadioCard key={opt.value} name="sequencing-mode" {...opt} checked={props.sequencingMode === opt.value} onChange={props.setSequencingMode} />
        ))}
      </div>

      <Divider label="Course Type" />
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: "minimalist", title: "Minimalist", description: "Core instructional templates only." },
          { value: "essential", title: "Essential", description: "Plus evaluation and certification." },
          { value: "complete", title: "Complete", description: "Every available template included." },
          { value: "custom", title: "Custom", description: "Manually select any combination." },
        ].map((opt) => (
          <RadioCard key={opt.value} name="course-type" value={opt.value} title={opt.title} description={opt.description}
            meta={`${props.templateCountByCourseType(opt.value as CourseType)} templates`}
            checked={props.courseType === opt.value} onChange={props.setCourseType} compact
          />
        ))}
      </div>
      <div className="rounded-md border border-border bg-background p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Templates in {props.courseType}
        </p>
        {props.filteredTemplates.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matching templates created yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {props.filteredTemplates.map((t) => (
              <span key={t.id} className="rounded border border-border bg-muted/30 px-2 py-0.5 text-xs text-foreground">{t.name}</span>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Select as default</FieldLabel>
          <select value={props.templateDefaultType} onChange={(e) => props.setTemplateDefaultType(e.target.value as TemplateType)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary">
            {props.defaultTemplateOptions.map((type) => (
              <option key={type} value={type}>{props.templateTypeLabel(type)}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Include certificate</FieldLabel>
          <select value={props.certificateMode} onChange={(e) => props.setCertificateMode(e.target.value as CertificateMode)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary">
            <option value="end-module">At the end of each module</option>
            <option value="end-course">At the end of the course</option>
            <option value="never">Never</option>
          </select>
        </div>
      </div>

      <Divider label="Naming Conventions" />
      <p className="text-sm text-muted-foreground -mt-4 mb-3">How generated content items should be named.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          { key: "lessonTitleRule" as const, label: "Lesson Titles" },
          { key: "topicRule" as const, label: "Topics" },
          { key: "objectiveRule" as const, label: "Objectives" },
          { key: "taskRule" as const, label: "Tasks" },
        ] as const).map(({ key, label }) => (
          <div key={key}>
            <FieldLabel>{label}</FieldLabel>
            <select value={namingRules[key]} onChange={(e) => setNamingRules({ ...namingRules, [key]: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary">
              <option value="">No specific rule</option>
              <option value="gerund">Start with a gerund (Exploring, Understanding…)</option>
              <option value="verb">Start with an action verb (Analyze, Compare…)</option>
              <option value="noun">Start with a noun phrase (Introduction to…)</option>
              <option value="blooms">Bloom&apos;s taxonomy verb (Identify, Apply, Evaluate…)</option>
              <option value="question">Question format (What is…? How does…?)</option>
            </select>
          </div>
        ))}
      </div>

      <Divider label="Generation" />
      <p className="-mt-2 text-sm text-muted-foreground">
        Generation uses your full setup data (essentials, classification, pedagogy, students,
        schedule, templates, and curriculum structure).
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
          props.ollamaHealthy === null ? "border-border bg-muted/40 text-muted-foreground"
          : props.ollamaHealthy ? "border-emerald-300/70 bg-emerald-100/60 text-emerald-800 dark:border-emerald-600/50 dark:bg-emerald-900/30 dark:text-emerald-200"
          : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
          {props.ollamaHealthy === null ? "Checking Ollama…" : props.ollamaHealthy ? "Ollama Connected" : "Ollama Disconnected"}
        </span>
        {props.ollamaHealthy !== null && (
          <span className="rounded-md border border-border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
            Running: {props.runningModels.length > 0 ? props.runningModels.join(", ") : "none"}
          </span>
        )}
        {props.highLoadModelActive && (
          <span className="rounded-md border border-amber-300/70 bg-amber-100/70 px-2 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-600/50 dark:bg-amber-900/30 dark:text-amber-200">
            High-load model active
          </span>
        )}
      </div>

      {!props.isGenerationReady && (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-3 dark:bg-amber-950/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Generation is locked until setup is complete.</p>
          <ul className="mt-1 space-y-1">
            {props.readinessIssues.map((issue) => (
              <li key={issue} className="text-xs text-amber-700/90 dark:text-amber-300/90">• {issue}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {props.missing.essentials && (
              <button type="button" onClick={() => props.goToSection("essentials")} className={PRIMARY_ACTION_BUTTON_CLASS}>Go to Essentials</button>
            )}
            {props.missing.schedule && (
              <button type="button" onClick={() => props.goToSection("schedule")} className={SECONDARY_ACTION_BUTTON_CLASS}>Go to Schedule</button>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {GENERATION_ACTION_CONFIG.map((action) => (
          <button key={action.key} type="button" onClick={() => props.runGeneration(action.key)}
            disabled={!props.isGenerationReady || props.isGenerating || props.ollamaHealthy === false || props.generationCooldownLeft > 0}
            className={`group flex h-full flex-col gap-1 rounded-md border px-3 py-2.5 text-left transition disabled:opacity-50 disabled:cursor-not-allowed ${
              action.primary
                ? "border-primary/40 bg-accent/70 text-foreground backdrop-blur-sm sm:col-span-2 hover:bg-accent/80"
                : "border-border/80 bg-background/60 text-foreground backdrop-blur-sm hover:border-primary/30 hover:bg-background/80"
            }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{action.label}</span>
              <span className="text-[11px] opacity-70">{props.estimateForAction(action.key)}</span>
            </div>
            <span className="text-xs opacity-70">{action.description}</span>
          </button>
        ))}
      </div>

      {props.generationCooldownLeft > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Cooldown active: {props.generationCooldownLeft}s remaining.</p>
      )}

      {props.isGenerating && (
        <button type="button" onClick={props.cancelGeneration} className={`mt-3 ${SECONDARY_ACTION_BUTTON_CLASS}`}>
          Cancel Running Generation{props.activeGenerationAction ? ` (${GENERATION_ACTION_CONFIG.find((a) => a.key === props.activeGenerationAction)?.label ?? "Current Action"})` : ""}
        </button>
      )}

      <button type="button" onClick={props.clearAllGenerated} disabled={props.isGenerating} className={`mt-3 ${DANGER_ACTION_BUTTON_CLASS}`}>
        Delete All Generated Content
      </button>

      {props.runStatus && (
        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">{props.runStatus}</p>
            <p className="text-[11px] font-semibold text-muted-foreground">{props.runProgress}%</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${props.runProgress}%` }} />
          </div>
        </div>
      )}
    </SetupColumn>
  )
}
