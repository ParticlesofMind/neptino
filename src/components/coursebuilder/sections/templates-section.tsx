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
  LESSON_TEMPLATE_BLOCKS,
  TEMPLATE_TYPES,
  createDefaultTemplateFieldState,
  type BlockId,
  type TemplateFieldState,
} from "./template-fields"
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

export type SetupTemplateType = "lesson"

const TEMPLATE_BLOCKS_BY_TYPE: Record<SetupTemplateType, BlockId[]> = {
  lesson: LESSON_TEMPLATE_BLOCKS,
}

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
    blocks: [...TEMPLATE_BLOCKS_BY_TYPE[type]],
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

  const selectedBlocks = TEMPLATE_BLOCKS_BY_TYPE[selectedTemplateType]

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
    setShowCreatePopup((prev) => !prev)
  }, [])

  const openLoadPopup = useCallback(() => {
    if (!savedTemplates.length) return
    setShowCreatePopup(false)
    setSelectedLoadTemplateId((current) => current || savedTemplates[0]?.id || "")
    setShowLoadPopup((prev) => !prev)
  }, [savedTemplates])

  return (
    <SetupSection
      title="Templates"
      description="Create and load a reusable lesson template for coursebuilder sessions."
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
        />
      )}
    >
      <SetupPanels
        config={(
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <div>
                <TemplateConfigPanel
                  blocks={selectedBlocks}
                  fieldDefs={BLOCK_FIELDS}
                  fieldState={fieldState}
                  onToggleOptional={handleToggleOptional}
                />
              </div>
              {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
              {!courseId && <p className="mt-2 text-xs text-muted-foreground">Create a course first to save templates.</p>}
            </div>
          </div>
        )}
        preview={(
          <TemplatePreviewPanel blocks={selectedBlocks} fieldState={fieldState} />
        )}
      />
    </SetupSection>
  )
}
