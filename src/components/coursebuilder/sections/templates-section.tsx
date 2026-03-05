"use client"

import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import {
  SetupSection,
  SetupPanels,
  updateCourseById,
  upsertTemplateRecord,
  updateTemplateData,
  useCourseRowLoader,
} from "@/components/coursebuilder"
import {
  BLOCK_FIELDS,
  TEMPLATE_TYPES,
  createDefaultTemplateFieldState,
  type BlockId,
  type TemplateFieldState,
} from "./template-fields"
import { getDefaultBlocksForType } from "@/lib/curriculum/template-blocks"
import { TemplateConfigPanel } from "./template-config-panel"
import { TemplateHeaderActions } from "./template-header-actions"
import { TemplatePreviewPanel } from "./template-preview-panel"

export type { TemplateType } from "@/lib/curriculum/template-blocks"
export { TEMPLATE_TYPES } from "./template-fields"
export type { BlockId, TemplateFieldState } from "./template-fields"

interface TemplateSettingsShape {
  active_template_type?: SetupTemplateType
  templates?: Array<{
    id: string
    type: SetupTemplateType
    label: string
    description?: string
    blocks: BlockId[]
    fieldState?: TemplateFieldState
  }>
}

interface CurriculumShape {
  session_rows?: Array<Record<string, unknown>>
}

export type SetupTemplateType = "lesson" | "certificate" | "quiz" | "assessment" | "exam"

function createTemplateDefinition(
  type: SetupTemplateType,
  label: string,
  description?: string,
  fieldState?: TemplateFieldState,
): NonNullable<TemplateSettingsShape["templates"]>[number] {
  return {
    id: crypto.randomUUID(),
    type,
    label,
    description,
    blocks: [...getDefaultBlocksForType(type)],
    fieldState,
  }
}

function applyTemplateToSessionRows(curriculum: CurriculumShape, templateType: SetupTemplateType): CurriculumShape {
  const sessionRows = Array.isArray(curriculum.session_rows) ? curriculum.session_rows : []
  return {
    ...curriculum,
    session_rows: sessionRows.map((row) => ({
      ...row,
      template_type: templateType,
    })),
  }
}

export function TemplatesSection({ courseId }: { courseId: string | null }) {
  const [templateSettings, setTemplateSettings] = useState<TemplateSettingsShape>({})
  const [curriculum, setCurriculum] = useState<CurriculumShape>({})
  const [selectedTemplateType, setSelectedTemplateType] = useState<SetupTemplateType>("lesson")
  const [showCreatePopup, setShowCreatePopup] = useState(false)
  const [showLoadPopup, setShowLoadPopup] = useState(false)
  const [createType, setCreateType] = useState<SetupTemplateType>("lesson")
  const [createName, setCreateName] = useState("Lesson")
  const [createDescription, setCreateDescription] = useState("")
  const [selectedLoadTemplateId, setSelectedLoadTemplateId] = useState<string>("")
  const [fieldState, setFieldState] = useState<TemplateFieldState>(() => createDefaultTemplateFieldState("lesson"))
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>("")
  // When activating a saved template we set fieldState and selectedTemplateType
  // together.  The selectedTemplateType effect would normally reset fieldState to
  // defaults (to keep the config panel in sync when the user switches types via
  // the dropdown).  This flag tells the effect to skip that reset for the current
  // render cycle so the saved fieldState is preserved.
  const skipFieldStateResetRef = useRef(false)

  // Refs used for debounced fieldState auto-save —
  // using refs avoids the effect re-running when templateSettings changes
  // due to the save itself.
  const templateSettingsRef = useRef<TemplateSettingsShape>({})
  const activeTemplateIdRef = useRef<string | null>(null)
  const courseIdRef = useRef<string | null>(courseId)
  const fieldStateInteractedRef = useRef(false)
  const fieldStateSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep refs in sync with latest values
  useEffect(() => { activeTemplateIdRef.current = activeTemplateId }, [activeTemplateId])
  useEffect(() => { courseIdRef.current = courseId }, [courseId])

  useCourseRowLoader<{ template_settings: Record<string, unknown> | null; curriculum_data: Record<string, unknown> | null }>({
    courseId,
    select: "template_settings,curriculum_data",
    onLoaded: (row) => {
      const loadedSettings = (row.template_settings as TemplateSettingsShape | null) ?? {}
      const loadedCurriculum = (row.curriculum_data as CurriculumShape | null) ?? {}
      setTemplateSettings(loadedSettings)
      setCurriculum(loadedCurriculum)
      // Restore fieldState and activeTemplateId from the active (or first)
      // saved template so config panel and preview are in sync.
      if (Array.isArray(loadedSettings.templates) && loadedSettings.templates.length > 0) {
        const activeType = loadedSettings.active_template_type ?? "lesson"
        const activeTemplate =
          loadedSettings.templates.find((t) => t.type === activeType) ??
          loadedSettings.templates[0]
        if (activeTemplate) {
          if (activeTemplate.fieldState) setFieldState(activeTemplate.fieldState)
          setActiveTemplateId(activeTemplate.id)
        }
      }
      templateSettingsRef.current = loadedSettings
    },
  })

  const hasLessonTemplate = useMemo(
    () => Array.isArray(templateSettings.templates) && templateSettings.templates.some((t) => t.type === "lesson"),
    [templateSettings.templates],
  )
  const savedTemplates = Array.isArray(templateSettings.templates) ? templateSettings.templates : []

  const selectedBlocks = getDefaultBlocksForType(selectedTemplateType)


  const handleToggleOptional = useCallback((block: BlockId, key: string, checked: boolean) => {
    const def = (BLOCK_FIELDS[block] ?? []).find((field) => field.key === key)
    if (def?.required) return
    fieldStateInteractedRef.current = true
    setFieldState((prev) => ({
      ...prev,
      [block]: {
        ...(prev[block] ?? {}),
        [key]: checked,
      },
    }))
  }, [])

  const saveTemplateSettings = useCallback(async (nextSettings: TemplateSettingsShape, nextCurriculum?: CurriculumShape) => {
    if (!courseId) return
    setSaving(true)
    setMessage("")
    const { error } = await updateCourseById(courseId, {
      template_settings: nextSettings,
      ...(nextCurriculum ? { curriculum_data: nextCurriculum } : {}),
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) {
      setMessage("Failed to save template changes.")
      return
    }
    setTemplateSettings(nextSettings)
    templateSettingsRef.current = nextSettings
    if (nextCurriculum) setCurriculum(nextCurriculum)
    setMessage("Template updated.")
  }, [courseId])

  useEffect(() => {
    // Skip reset when activating a saved template — fieldState was already set
    // to the saved template's state in the event handler.
    if (skipFieldStateResetRef.current) {
      skipFieldStateResetRef.current = false
      return
    }
    setFieldState(createDefaultTemplateFieldState(selectedTemplateType))
    // Selecting a different template type resets the editing context
    fieldStateInteractedRef.current = false
  }, [selectedTemplateType])

  // Debounced auto-save: whenever the user toggles a field checkbox and there
  // is already a saved template (activeTemplateId), push the update to both
  // courses.template_settings and the templates table without requiring a
  // separate "Save" action.
  useEffect(() => {
    if (!fieldStateInteractedRef.current) return
    const aid = activeTemplateIdRef.current
    const cid = courseIdRef.current
    if (!aid || !cid) return

    if (fieldStateSaveTimerRef.current) clearTimeout(fieldStateSaveTimerRef.current)

    fieldStateSaveTimerRef.current = setTimeout(async () => {
      const currentSettings = templateSettingsRef.current
      const updatedTemplates = (currentSettings.templates ?? []).map((t) =>
        t.id === aid ? { ...t, fieldState } : t,
      )
      const nextSettings: TemplateSettingsShape = { ...currentSettings, templates: updatedTemplates }

      // courses.template_settings
      const { error: courseError } = await updateCourseById(cid, {
        template_settings: nextSettings,
        updated_at: new Date().toISOString(),
      })
      if (!courseError) {
        setTemplateSettings(nextSettings)
        templateSettingsRef.current = nextSettings
      }

      // templates table
      const templateRecord = updatedTemplates.find((t) => t.id === aid)
      if (templateRecord) {
        await updateTemplateData(aid, {
          fieldState,
          blocks: templateRecord.blocks,
        })
      }
    }, 800)

    return () => {
      if (fieldStateSaveTimerRef.current) clearTimeout(fieldStateSaveTimerRef.current)
    }
  }, [fieldState])

  const handleCreateTemplate = useCallback(async () => {
    if (!createName.trim()) {
      setMessage("Template name is required.")
      return
    }
    if (!courseId) return
    const existingTemplates = Array.isArray(templateSettings.templates) ? templateSettings.templates : []
    const newTemplate = createTemplateDefinition(
      createType,
      createName.trim(),
      createDescription.trim() || undefined,
      fieldState,
    )
    const nextSettings: TemplateSettingsShape = {
      ...templateSettings,
      templates: [...existingTemplates, newTemplate],
    }
    // 1. Save to courses.template_settings
    await saveTemplateSettings(nextSettings)
    // 2. Save to templates table
    const { error: templateError } = await upsertTemplateRecord({
      templateId:   newTemplate.id,
      courseId,
      name:         newTemplate.label,
      description:  newTemplate.description,
      type:         newTemplate.type,
      templateData: { fieldState, blocks: newTemplate.blocks },
    })
    if (templateError) {
      setMessage("Template saved locally but failed to write to template library.")
    }
    setActiveTemplateId(newTemplate.id)
    fieldStateInteractedRef.current = false
    setSelectedTemplateType(createType)
    setSelectedLoadTemplateId(newTemplate.id)
    setShowCreatePopup(false)
  }, [courseId, createDescription, createName, createType, fieldState, saveTemplateSettings, templateSettings])

  const handleLoadTemplate = useCallback(async () => {
    const targetTemplate = savedTemplates.find((template) => template.id === selectedLoadTemplateId)
    if (!targetTemplate) {
      setMessage("Select a template to load.")
      return
    }
    // Restore the saved template's field configuration into the config panel
    if (targetTemplate.fieldState) {
      setFieldState(targetTemplate.fieldState)
    }
    setActiveTemplateId(targetTemplate.id)
    fieldStateInteractedRef.current = false
    const nextSettings: TemplateSettingsShape = {
      ...templateSettings,
      active_template_type: targetTemplate.type,
      templates: savedTemplates,
    }
    const nextCurriculum = applyTemplateToSessionRows(curriculum, targetTemplate.type)
    await saveTemplateSettings(nextSettings, nextCurriculum)
    setShowLoadPopup(false)
  }, [curriculum, saveTemplateSettings, savedTemplates, selectedLoadTemplateId, templateSettings])

  const openCreatePopup = useCallback(() => {
    setShowLoadPopup(false)
    // Reset name to match the currently selected type
    setCreateName((prev) => {
      const defaultName = createType.charAt(0).toUpperCase() + createType.slice(1)
      // Only reset if it looks like an auto-generated / default name
      const knownDefaults = ["Lesson", "Certificate", "Quiz", "Assessment", "Exam"]
      return knownDefaults.includes(prev) ? defaultName : prev
    })
    setShowCreatePopup((prev) => !prev)
  }, [createType])

  const openLoadPopup = useCallback(() => {
    if (!savedTemplates.length) return
    setShowCreatePopup(false)
    setSelectedLoadTemplateId((current) => current || savedTemplates[0]?.id || "")
    setShowLoadPopup((prev) => !prev)
  }, [savedTemplates])

  const handleActivateTemplate = useCallback((templateId: string) => {
    const targetTemplate = savedTemplates.find((t) => t.id === templateId)
    if (!targetTemplate) return
    // Guard must be set BEFORE setSelectedTemplateType so the effect that
    // resets fieldState to type defaults sees the flag and skips the reset.
    if (targetTemplate.fieldState) {
      skipFieldStateResetRef.current = true
      setFieldState(targetTemplate.fieldState)
    }
    setActiveTemplateId(templateId)
    setSelectedTemplateType(targetTemplate.type)
    fieldStateInteractedRef.current = false
    setMessage("Template loaded.")
  }, [savedTemplates])

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    const nextSettings: TemplateSettingsShape = {
      ...templateSettings,
      templates: savedTemplates.filter((t) => t.id !== templateId),
    }
    if (activeTemplateId === templateId) {
      setActiveTemplateId(null)
    }
    await saveTemplateSettings(nextSettings)
  }, [activeTemplateId, saveTemplateSettings, savedTemplates, templateSettings])

  return (
    <SetupSection
      title="Templates"
      description="Create and configure reusable templates applied to course sessions."
      headerActions={(
        <TemplateHeaderActions
          canCreate={Boolean(courseId) && !saving}
          canLoad={Boolean(courseId) && !saving && hasLessonTemplate && savedTemplates.length > 0}
          showCreatePopup={showCreatePopup}
          showLoadPopup={showLoadPopup}
          templateTypes={TEMPLATE_TYPES as SetupTemplateType[]}
          createType={createType}
          createName={createName}
          createDescription={createDescription}
          selectedLoadTemplateId={selectedLoadTemplateId}
          savedTemplates={savedTemplates}
          activeTemplateId={activeTemplateId}
          onOpenCreate={openCreatePopup}
          onOpenLoad={openLoadPopup}
          onCloseCreate={() => setShowCreatePopup(false)}
          onCloseLoad={() => setShowLoadPopup(false)}
          onChangeCreateType={setCreateType}
          onChangeCreateName={setCreateName}
          onChangeCreateDescription={setCreateDescription}
          onChangeSelectedLoadTemplate={setSelectedLoadTemplateId}
          onCreate={handleCreateTemplate}
          onLoad={handleLoadTemplate}
          onActivateTemplate={handleActivateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}
    >
      <SetupPanels
        config={(
          <div className="space-y-4">
            {/* Active template indicator */}
            {activeTemplateId && (() => {
              const activeTpl = savedTemplates.find((t) => t.id === activeTemplateId)
              return activeTpl ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Active template</span>
                  <span className="text-xs font-medium text-foreground">{activeTpl.label}</span>
                  <span className="rounded border border-border bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize">{activeTpl.type}</span>
                </div>
              ) : null
            })()}

            {/* Field toggle panel */}
            <div className="rounded-lg border border-border bg-background p-4">
              <TemplateConfigPanel
                blocks={selectedBlocks}
                fieldDefs={BLOCK_FIELDS}
                fieldState={fieldState}
                onToggleOptional={handleToggleOptional}
              />
              {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
              {!courseId && <p className="mt-2 text-xs text-muted-foreground">Create a course first to save templates.</p>}
            </div>
          </div>
        )}
        preview={(
          <TemplatePreviewPanel
            blocks={selectedBlocks}
            fieldState={fieldState}
          />
        )}
      />
    </SetupSection>
  )
}
