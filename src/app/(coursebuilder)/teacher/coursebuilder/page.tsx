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
import { getSetupSectionIds, type SectionId } from "./page-section-registry"
import { CURRICULUM_LOADER_SELECT } from "@/components/coursebuilder/sections/use-curriculum-loader"

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
  resources: ["generation_settings"],
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

    const setupSections = getSetupSectionIds()
    const currentIdx = setupSections.indexOf(activeSection)
    const nextSectionId = currentIdx >= 0 ? setupSections[currentIdx + 1] : null
    const targets = [activeSection, nextSectionId].filter(Boolean) as string[]

    // Warm all setup-section row queries once per course to remove first-hop loading flashes.
    if (prefetchedCourseIdRef.current !== courseId) {
      prefetchedCourseIdRef.current = courseId
      for (const sectionId of setupSections) {
        const selects = SECTION_SELECTS[sectionId] ?? []
        for (const select of selects) {
          void prefetchCourseRow(queryClient, courseId, select)
        }
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
    <div className="flex h-full flex-col bg-background">
      <CourseBuilderTopBar view={view} setView={setView} />

      <div className="flex flex-1 overflow-x-visible overflow-y-hidden">
        {view === "setup" ? (
          <div className="flex flex-1 overflow-hidden bg-muted/10">
            <CourseBuilderSidebarNav
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              completedSetupSections={completedSetupSections}
              flashSectionId={flashSectionId}
              setupSectionsLocked={setupSectionsLocked}
            />

            <div className="flex flex-1 flex-col overflow-hidden border-x border-b border-border bg-background">
              <main className="flex-1 overflow-hidden p-4 md:p-5">
                <div className="mx-auto flex h-full min-h-0 flex-col bg-background">
                  {showLoadingCourse ? (
                    <div className="flex items-center justify-center h-48">
                      <span className="text-sm text-muted-foreground">Loading course…</span>
                    </div>
                  ) : (
                    <SectionContent
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
          <div className="flex flex-1 overflow-x-visible overflow-y-hidden bg-muted/10">
            <div className="flex flex-1 overflow-hidden border-x border-b border-border bg-background">
              <CreateEditorLayout courseId={courseId} />
            </div>
          </div>
        ) : view === "preview" ? (
          <div className="flex flex-1 overflow-hidden bg-muted/10">
            <div className="flex flex-1 overflow-hidden border-x border-b border-border bg-background">
              <PreviewView courseId={courseId} courseData={courseCreatedData} />
            </div>
          </div>
        ) : (
          <div className="no-scrollbar flex flex-1 overflow-y-auto bg-muted/10">
            <div className="no-scrollbar flex flex-1 overflow-y-auto border-x border-b border-border bg-background p-4 md:p-5">
              <div className="no-scrollbar flex flex-1 overflow-y-auto rounded-md border border-border bg-background">
                <LaunchView courseId={courseId} courseData={courseCreatedData} onSetView={setView} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
