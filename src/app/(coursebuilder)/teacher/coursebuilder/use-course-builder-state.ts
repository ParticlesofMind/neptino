"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { computePageConfig } from "@/lib/page-config"
import type { CanvasPageConfig } from "@/lib/page-config"
import { evaluateCourseSetupReadiness } from "@/lib/curriculum/setup-readiness"
import { getCurrentAuthUser, selectCourseById } from "@/components/coursebuilder"
import type { View, CourseCreatedData } from "@/components/coursebuilder/builder-types"
import {
  type SectionId,
  isView,
} from "./page-section-registry"

export function useCourseBuilderState() {
  const searchParams = useSearchParams()
  const urlCourseId = searchParams.get("id")
  const urlView     = searchParams.get("view") as View | null
  const resolvedUrlCourseId =
    urlCourseId ??
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null)

  const [view, setView] = useState<View>(() => {
    if (isView(urlView)) return urlView
    return "setup"
  })
  const [activeSection, setActiveSection] = useState<SectionId>("essentials")
  const [courseId, setCourseId] = useState<string | null>(resolvedUrlCourseId)
  const [courseCreatedData, setCourseCreatedData] = useState<CourseCreatedData | null>(null)
  const [initialEssentials, setInitialEssentials] = useState<CourseCreatedData | null>(null)
  const [pageConfig, setPageConfig] = useState<CanvasPageConfig | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(!!resolvedUrlCourseId)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [flashSectionId, setFlashSectionId] = useState<SectionId | null>(null)
  const [completedSetupSections, setCompletedSetupSections] = useState<Record<string, boolean>>({})
  const completionFetchRef = useRef<{ courseId: string | null; at: number }>({ courseId: null, at: 0 })

  const hydrateSectionCompletion = useCallback((raw: Record<string, unknown>) => {
    const report = evaluateCourseSetupReadiness(raw)
    setCompletedSetupSections(
      report.sections.reduce<Record<string, boolean>>((acc, section) => {
        acc[section.id] = section.complete
        return acc
      }, {}),
    )
  }, [])

  useEffect(() => {
    if (!urlCourseId) return
    void (async () => {
      setAccessError(null)
      const { data, error } = await selectCourseById<Record<string, unknown>>(
        urlCourseId,
        "id, course_name, course_subtitle, course_description, course_language, course_type, course_image, teacher_id, institution_id, institution, generation_settings, classification_data, students_overview, template_settings, schedule_settings, curriculum_data, course_layout, visibility_settings, pricing_settings, marketplace_settings, integration_settings, communication_settings",
      )
      if (!error && data) {
        const ownerId = typeof data.teacher_id === "string" ? data.teacher_id : null
        const user = await getCurrentAuthUser()

        if (!user || !ownerId || user.id !== ownerId) {
          setAccessError("This course can be viewed, but the current account cannot edit its setup.")
          setLoadingCourse(false)
          return
        }

        const gs = (data.generation_settings as Record<string, unknown> | null) ?? null
        const loaded: CourseCreatedData = {
          title: (data.course_name as string) ?? "",
          subtitle: (data.course_subtitle as string) ?? "",
          description: (data.course_description as string) ?? "",
          language: (data.course_language as string) ?? "",
          courseType: (data.course_type as string) ?? "",
          teacherId: (typeof data.teacher_id === "string" ? data.teacher_id : (typeof gs?.teacher_id === "string" ? gs.teacher_id : "")) ?? "",
          teacherName: (typeof gs?.teacher_name === "string" ? gs.teacher_name : "") ?? "",
          institutionId: (typeof data.institution_id === "string" ? data.institution_id : null),
          institution: (data.institution as string) ?? "Independent",
          imageName: null,
          imageUrl: (data.course_image as string | null) ?? null,
        }
        setInitialEssentials(loaded)
        setCourseCreatedData(loaded)
        setCourseId(urlCourseId)

        const gsForPage = data.generation_settings as Record<string, unknown> | null
        if (gsForPage?.page_size) {
          try {
            const cfg = computePageConfig(
              gsForPage.page_size as "a4" | "us-letter",
              (gsForPage.page_orientation as "portrait" | "landscape") ?? "portrait",
              (gsForPage.page_count as number) ?? 1,
              (gsForPage.margins_mm as { top: number; right: number; bottom: number; left: number }) ??
                { top: 25.4, right: 19.05, bottom: 25.4, left: 19.05 },
            )
            setPageConfig(cfg)
          } catch {
            // ignore malformed settings
          }
        }

        hydrateSectionCompletion(data)
      }
      setLoadingCourse(false)
    })()
  }, [urlCourseId, hydrateSectionCompletion])

  useEffect(() => {
    if (!courseId) return
    const now = Date.now()
    if (completionFetchRef.current.courseId === courseId && now - completionFetchRef.current.at < 4000) return
    completionFetchRef.current = { courseId, at: now }
    void selectCourseById<Record<string, unknown>>(
      courseId,
      "course_name, course_description, course_language, course_type, teacher_id, institution_id, institution, generation_settings, classification_data, students_overview, template_settings, schedule_settings, curriculum_data, course_layout, visibility_settings, pricing_settings, marketplace_settings, integration_settings, communication_settings",
    ).then(({ data, error }) => {
      if (error || !data) return
      hydrateSectionCompletion(data)
    })
  }, [courseId, hydrateSectionCompletion])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("view") === view) return
    params.set("view", view)
    const nextQuery = params.toString()
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`
    window.history.replaceState(window.history.state, "", nextUrl)
  }, [view])

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ sectionId?: SectionId }>
      const sectionId = custom.detail?.sectionId
      if (!sectionId) return
      setView("setup")
      setActiveSection(sectionId)
      setFlashSectionId(sectionId)
      window.setTimeout(() => setFlashSectionId((prev) => (prev === sectionId ? null : prev)), 1800)
    }
    window.addEventListener("coursebuilder:navigate-section", handler)
    return () => window.removeEventListener("coursebuilder:navigate-section", handler)
  }, [])

  const handleCourseCreated = useCallback((id: string, essentials: CourseCreatedData) => {
    setCourseId(id)
    setCourseCreatedData(essentials)
    setInitialEssentials(essentials)
  }, [])

  return {
    view, setView,
    activeSection, setActiveSection,
    courseId,
    courseCreatedData,
    initialEssentials,
    pageConfig, setPageConfig,
    loadingCourse,
    accessError,
    flashSectionId,
    completedSetupSections,
    handleCourseCreated,
  }
}
