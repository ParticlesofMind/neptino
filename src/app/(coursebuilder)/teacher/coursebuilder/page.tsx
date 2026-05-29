"use client"

import { Suspense, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CreateEditorLayout } from "@/components/coursebuilder/create/CreateEditorLayout"
import { prefetchCourseRow, useSteadyLoading } from "@/components/coursebuilder"
import { useCourseBuilderState } from "./use-course-builder-state"
import { SectionContent, PreviewView, LaunchView } from "./page-section-content"
import { CourseBuilderTopBar } from "./course-builder-top-bar"
import { CourseBuilderSidebarNav } from "./course-builder-sidebar-nav"
import { CourseBuilderMobileNav } from "./course-builder-mobile-nav"
import { ALL_SECTION_IDS, type SectionId } from "./page-section-registry"
import { CURRICULUM_LOADER_SELECT } from "@/components/coursebuilder/sections/use-curriculum-loader"

const VIEW_SURFACE_CLASS = "flex flex-1 min-h-0 overflow-hidden bg-background"
const VIEW_FRAME_CLASS = "flex flex-1 min-w-0 overflow-hidden bg-background"
const SETUP_FRAME_CLASS = "flex min-w-0 flex-1 flex-col overflow-hidden bg-background"

const SECTION_SELECTS: Record<string, string[]> = {
  essentials: ["generation_settings"],
  students: ["students_overview"],
  schedule: ["schedule_settings"],
  curriculum: ["curriculum_data", CURRICULUM_LOADER_SELECT],
  classification: ["classification_data"],
  pedagogy: ["course_layout"],
  templates: ["template_settings,curriculum_data"],
  visibility: ["visibility_settings"],
  marketplace: ["marketplace_settings"],
  pricing: ["pricing_settings"],
  integrations: ["integration_settings"],
  communication: ["communication_settings"],
  "page-setup": ["generation_settings"],
  interface: ["course_layout"],
  llm: ["generation_settings"],
  context: [
    "id, updated_at, course_name, course_description, course_language, course_type, institution_id, institution, teacher_id, generation_settings, classification_data, students_overview, schedule_settings, curriculum_data, course_layout, template_settings, visibility_settings, pricing_settings, marketplace_settings, integration_settings, communication_settings",
  ],
  resources: ["generation_settings"],
  "data-management": ["generation_settings,curriculum_data,template_settings"],
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
  const queryClient = useQueryClient()
  const prefetchedCourseIdRef = useRef<string | null>(null)
  const {
    view, setView,
    activeSection, setActiveSection: setRawActiveSection,
    courseId,
    courseCreatedData,
    initialEssentials,
    pageConfig, setPageConfig,
    loadingCourse,
    accessError,
    flashSectionId,
    completedSetupSections,
    handleCourseCreated,
  } = useCourseBuilderState()

  const setupSectionsLocked = !courseId
  const showLoadingCourse = useSteadyLoading(loadingCourse)

  useEffect(() => {
    if (!setupSectionsLocked) return
    if (activeSection !== "essentials") {
      setRawActiveSection("essentials")
    }
  }, [activeSection, setupSectionsLocked, setRawActiveSection])

  const setActiveSection = (id: SectionId) => {
    if (setupSectionsLocked && id !== "essentials") return
    setRawActiveSection(id)
  }

  useEffect(() => {
    if (!courseId || view !== "setup") return

    const setupSections = ALL_SECTION_IDS
    const currentIdx = setupSections.indexOf(activeSection)
    const nextSectionId = currentIdx >= 0 ? setupSections[currentIdx + 1] : null
    const targets = [activeSection, nextSectionId].filter(Boolean) as string[]

    // Warm the immediately useful setup rows with the narrow select each section needs.
    if (prefetchedCourseIdRef.current !== courseId) {
      prefetchedCourseIdRef.current = courseId
      const selects = SECTION_SELECTS[activeSection] ?? []
      for (const select of selects) {
        void prefetchCourseRow(queryClient, courseId, select)
      }
    }

    // Keep next likely section warm as the user navigates setup.
    for (const sectionId of targets) {
      const selects = SECTION_SELECTS[sectionId] ?? []
      for (const select of selects) {
        void prefetchCourseRow(queryClient, courseId, select)
      }
    }
  }, [activeSection, courseId, queryClient, view])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted/20">
      <CourseBuilderTopBar view={view} setView={setView} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {accessError ? (
          <div className={VIEW_SURFACE_CLASS}>
            <CourseAccessError message={accessError} />
          </div>
        ) : view === "setup" ? (
          <div className={VIEW_SURFACE_CLASS}>
            <CourseBuilderSidebarNav
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              completedSetupSections={completedSetupSections}
              flashSectionId={flashSectionId}
              setupSectionsLocked={setupSectionsLocked}
            />

            <div className={SETUP_FRAME_CLASS}>
              <main className="min-w-0 flex-1 overflow-hidden p-4 md:p-5">
                <div className="mx-auto flex h-full min-h-0 flex-col bg-background">
                  {showLoadingCourse ? (
                    <div className="flex items-center justify-center h-48">
                      <span className="text-sm text-muted-foreground">Loading course…</span>
                    </div>
                  ) : (
                    <SectionContent
                      key={courseId ? `${courseId}-${initialEssentials ? "loaded" : "loading"}` : "new"}
                      id={activeSection}
                      onCourseCreated={handleCourseCreated}
                      courseCreatedData={courseCreatedData}
                      initialEssentials={initialEssentials}
                      courseId={courseId}
                      pageConfig={pageConfig}
                      onPageConfigChange={setPageConfig}
                    />
                  )}
                </div>
              </main>

              <CourseBuilderMobileNav
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                completedSetupSections={completedSetupSections}
                setupSectionsLocked={setupSectionsLocked}
              />
            </div>
          </div>
        ) : view === "create" ? (
          <div className={VIEW_SURFACE_CLASS}>
            <div className={VIEW_FRAME_CLASS}>
              <CreateEditorLayout courseId={courseId} />
            </div>
          </div>
        ) : view === "preview" ? (
          <div className={VIEW_SURFACE_CLASS}>
            <div className={VIEW_FRAME_CLASS}>
              <PreviewView courseId={courseId} courseData={courseCreatedData} />
            </div>
          </div>
        ) : (
          <div className={VIEW_SURFACE_CLASS}>
            <div className="no-scrollbar flex min-w-0 flex-1 overflow-y-auto bg-muted/20 p-4 md:p-5">
              <div className="no-scrollbar flex min-h-full flex-1 overflow-y-auto rounded-xl border border-border bg-background shadow-sm">
                <LaunchView courseId={courseId} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CourseAccessError({ message }: { message: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center bg-background p-6 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-medium text-foreground">Cannot edit this course</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
