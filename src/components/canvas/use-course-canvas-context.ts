"use client"

import { useCallback, useEffect, useState } from "react"
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"
import {
  createTemplateLookups,
  normalizeTemplateUiSettings,
  normalizeTemplateSettings,
  DEFAULT_TEMPLATE_VISUAL_DENSITY,
  type TemplateVisualDensity,
} from "@/lib/curriculum/template-source-of-truth"
import {
  projectLessonPages,
  type LessonCanvasPageProjection,
  type RawCurriculumSessionRow,
  type RawScheduleGeneratedEntry,
} from "@/lib/curriculum/canvas-projection"

type CurriculumSessionRow = RawCurriculumSessionRow
type ScheduleGeneratedEntry = RawScheduleGeneratedEntry
type LessonCanvasPage = LessonCanvasPageProjection

export function useCourseCanvasContext({
  courseId,
  supabase,
}: {
  courseId?: string | null
  supabase: SupabaseClient
}) {
  const [courseTitle, setCourseTitle] = useState("Untitled Course")
  const [courseType, setCourseType] = useState("")
  const [courseLanguage, setCourseLanguage] = useState("")
  const [teacherName, setTeacherName] = useState("Teacher")
  const [institutionName, setInstitutionName] = useState("Independent")
  const [lessonPages, setLessonPages] = useState<LessonCanvasPage[]>([])
  const [templateVisualDensity, setTemplateVisualDensity] = useState<TemplateVisualDensity>(DEFAULT_TEMPLATE_VISUAL_DENSITY)

  const loadCourseContext = useCallback(async () => {
    if (!courseId) {
      setLessonPages([])
      return
    }

    const { data, error } = await supabase
      .from("courses")
      .select("course_name,course_type,course_language,institution,generation_settings,curriculum_data,schedule_settings,template_settings")
      .eq("id", courseId)
      .maybeSingle()

    if (error || !data) {
      return
    }

    setCourseTitle(String(data.course_name ?? "Untitled Course"))
    setCourseType(String(data.course_type ?? ""))
    setCourseLanguage(String(data.course_language ?? ""))
    setInstitutionName(String(data.institution ?? "Independent"))
    const generationSettings = (data.generation_settings as Record<string, unknown> | null) ?? {}
    const resolvedTeacherName =
      (typeof generationSettings.teacher_name === "string" && generationSettings.teacher_name.trim())
        ? String(generationSettings.teacher_name)
        : "Teacher"
    setTeacherName(resolvedTeacherName)
    const templates = normalizeTemplateSettings(data.template_settings)
    const templateUiSettings = normalizeTemplateUiSettings(data.template_settings)
    const { templateById, templateByType } = createTemplateLookups(templates)
    setTemplateVisualDensity(templateUiSettings.visualDensity)
    const curriculum = (data.curriculum_data as Record<string, unknown> | null) ?? {}
    const scheduleSettings = (data.schedule_settings as Record<string, unknown> | null) ?? {}
    const scheduleRows = Array.isArray(scheduleSettings.generated_entries)
      ? (scheduleSettings.generated_entries as ScheduleGeneratedEntry[])
      : []
    const sessionRows = Array.isArray(curriculum.session_rows)
      ? (curriculum.session_rows as CurriculumSessionRow[])
      : []
    const pages = projectLessonPages({
      curriculum,
      scheduleRows,
      sessionRows,
      templateById,
      templateByType,
    })

    setLessonPages(pages)
  }, [courseId, supabase])

  useEffect(() => {
    let active = true
    const initialLoadHandle = window.setTimeout(() => {
      if (!active) return
      void loadCourseContext()
    }, 0)

    let channel: RealtimeChannel | null = null
    if (courseId) {
      channel = supabase
        .channel(`create-view-course-${courseId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "courses",
            filter: `id=eq.${courseId}`,
          },
          () => {
            if (!active) return
            void loadCourseContext()
          },
        )
        .subscribe()
    }

    return () => {
      active = false
      window.clearTimeout(initialLoadHandle)
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [courseId, loadCourseContext, supabase])

  return {
    courseTitle,
    courseType,
    courseLanguage,
    teacherName,
    institutionName,
    lessonPages,
    templateVisualDensity,
  }
}
