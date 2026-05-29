"use client"

import {
  Award,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  HelpCircle,
} from "lucide-react"
import {
  SECONDARY_ACTION_BUTTON_CLASS,
} from "@/components/coursebuilder"
import type { SetupTemplateType } from "./templates-section"

// ─── Per-type metadata ────────────────────────────────────────────────────────

const TEMPLATE_BLUE_ACTION_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-md border border-[#9eb9da] bg-[#dbe8f6] px-4 py-2 text-sm font-medium text-[#3a6ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-sm transition hover:bg-[#cedef0] focus:outline-none focus:ring-2 focus:ring-[#dbe8f6] disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-foreground/60"

const TEMPLATE_BLUE_ACTIVE_CARD_CLASS = "border-[#9eb9da] bg-[#dbe8f6] shadow-sm"
const TEMPLATE_BLUE_HOVER_CARD_CLASS = "border-border bg-background hover:border-[#9eb9da] hover:bg-[#dbe8f6]/45"
const TEMPLATE_BLUE_TEXT_CLASS = "text-[#3a6ea0]"

const TYPE_META: Record<
  SetupTemplateType,
  {
    Icon: React.ComponentType<{ className?: string }>
    label: string
    description: string
  }
> = {
  lesson: {
    Icon: BookOpen,
    label: "Lesson",
    description: "Teaching session with a program, resources, and configurable learning divisions such as instruction, practice, and feedback.",
  },
  certificate: {
    Icon: Award,
    label: "Certificate",
    description: "Completion certificate with header, branding, and footer.",
  },
  quiz: {
    Icon: HelpCircle,
    label: "Quiz",
    description: "Knowledge check with resources, scored criteria, pass mark, and feedback-oriented review.",
  },
  assessment: {
    Icon: ClipboardCheck,
    label: "Assessment",
    description: "Evaluation template for evidence of learning, criteria, weighting, and feedback.",
  },
  exam: {
    Icon: GraduationCap,
    label: "Exam",
    description: "High-stakes summative test with pass mark and weighted scoring.",
  },
}

interface SavedTemplate {
  id: string
  type: SetupTemplateType
  label: string
  description?: string
  builtIn?: boolean
}

export function TemplateHeaderActions({
  canCreate,
  canLoad,
  showCreatePopup,
  showLoadPopup,
  templateTypes,
  createType,
  createName,
  createDescription,
  selectedLoadTemplateId,
  savedTemplates,
  activeTemplateId,
  onOpenCreate,
  onOpenLoad,
  onCloseCreate,
  onCloseLoad,
  onChangeCreateType,
  onChangeCreateName,
  onChangeCreateDescription,
  onChangeSelectedLoadTemplate,
  onCreate,
  onLoad,
  onActivateTemplate,
  onDeleteTemplate,
}: {
  canCreate: boolean
  canLoad: boolean
  showCreatePopup: boolean
  showLoadPopup: boolean
  templateTypes: SetupTemplateType[]
  createType: SetupTemplateType
  createName: string
  createDescription: string
  selectedLoadTemplateId: string
  savedTemplates: SavedTemplate[]
  activeTemplateId: string | null
  onOpenCreate: () => void
  onOpenLoad: () => void
  onCloseCreate: () => void
  onCloseLoad: () => void
  onChangeCreateType: (value: SetupTemplateType) => void
  onChangeCreateName: (value: string) => void
  onChangeCreateDescription: (value: string) => void
  onChangeSelectedLoadTemplate: (id: string) => void
  onCreate: () => void
  onLoad: () => void
  onActivateTemplate: (id: string) => void
  onDeleteTemplate: (id: string) => void
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCreate}
          disabled={!canCreate}
          className={TEMPLATE_BLUE_ACTION_BUTTON_CLASS}
        >
          Create Template
        </button>
        <button
          type="button"
          onClick={onOpenLoad}
          disabled={!canLoad}
          className={SECONDARY_ACTION_BUTTON_CLASS}
        >
          Load Template
        </button>
      </div>

      {/* ── Create Template modal ─────────────────────────────────────── */}
      {showCreatePopup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseCreate} />
          <div className="relative z-50 w-full max-w-lg rounded-xl border border-border bg-background shadow-xl">
            {/* Header */}
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Create template</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Choose a type, then give your template a name.</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Type picker grid */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Template type</p>
                <div className="grid grid-cols-5 gap-2">
                  {templateTypes.map((type) => {
                    const meta = TYPE_META[type]
                    const isSelected = createType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          onChangeCreateType(type)
                          onChangeCreateName(meta.label)
                        }}
                        className={[
                          "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition focus:outline-none focus:ring-2 focus:ring-ring/50",
                          isSelected
                            ? TEMPLATE_BLUE_ACTIVE_CARD_CLASS
                            : TEMPLATE_BLUE_HOVER_CARD_CLASS,
                        ].join(" ")}
                      >
                        <meta.Icon
                          className={[
                            "h-5 w-5",
                            isSelected ? TEMPLATE_BLUE_TEXT_CLASS : "text-muted-foreground",
                          ].join(" ")}
                        />
                        <span
                          className={[
                            "text-[11px] font-medium leading-tight",
                            isSelected ? TEMPLATE_BLUE_TEXT_CLASS : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {meta.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {/* Selected type description */}
                <p className="mt-2 text-[11px] text-muted-foreground min-h-[1.5rem]">
                  {TYPE_META[createType].description}
                </p>
              </div>

              {/* Name & description */}
              <div className="space-y-3">
                <label className="block text-xs text-muted-foreground">
                  Template name
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => onChangeCreateName(e.target.value)}
                    placeholder="My template"
                    className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  Description
                  <span className="ml-1 text-[10px] text-muted-foreground/60">(optional)</span>
                  <textarea
                    rows={2}
                    value={createDescription}
                    onChange={(e) => onChangeCreateDescription(e.target.value)}
                    placeholder="Short description"
                    className="mt-1 w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                onClick={onCloseCreate}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md border border-foreground/20 bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                onClick={onCreate}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Load Template modal ───────────────────────────────────────── */}
      {showLoadPopup && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseLoad} />
          <div className="relative z-50 w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
            {/* Header */}
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Load template</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Select a built-in or saved template to apply to this course.</p>
            </div>

            <div className="max-h-72 overflow-y-auto p-3 space-y-1.5">
              {savedTemplates.map((template) => {
                const meta = TYPE_META[template.type]
                const isActive = template.id === activeTemplateId
                const isSelected = selectedLoadTemplateId === template.id
                return (
                  <div
                    key={template.id}
                    onClick={() => onChangeSelectedLoadTemplate(template.id)}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition",
                      isSelected
                        ? TEMPLATE_BLUE_ACTIVE_CARD_CLASS
                        : TEMPLATE_BLUE_HOVER_CARD_CLASS,
                    ].join(" ")}
                  >
                    {/* Type icon */}
                    <div
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        isSelected ? "border-[#9eb9da] bg-background" : "border-border bg-background",
                      ].join(" ")}
                    >
                      <meta.Icon className={["h-4 w-4", isSelected ? TEMPLATE_BLUE_TEXT_CLASS : "text-muted-foreground"].join(" ")} />
                    </div>

                    {/* Label + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">{template.label}</span>
                        <span className="shrink-0 rounded border border-border bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize">
                          {meta.label}
                        </span>
                        {isActive && (
                          <span className="shrink-0 rounded border border-[#9eb9da] bg-[#dbe8f6] px-1.5 py-0.5 text-[10px] font-medium text-[#3a6ea0]">
                            active
                          </span>
                        )}
                        {template.builtIn && (
                          <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            built-in
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{template.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onActivateTemplate(template.id) }}
                          className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground transition hover:border-[#9eb9da] hover:bg-[#dbe8f6]/45 hover:text-[#3a6ea0]"
                        >
                          Apply
                        </button>
                      )}
                      {!template.builtIn && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteTemplate(template.id) }}
                          className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                onClick={onCloseLoad}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md border border-foreground/20 bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                onClick={onLoad}
              >
                Load
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
