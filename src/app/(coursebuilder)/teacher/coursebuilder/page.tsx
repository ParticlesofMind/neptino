"use client"

import { Suspense } from "react"
import { CreateEditorLayout } from "@/components/coursebuilder/create/CreateEditorLayout"
import { useCourseBuilderState } from "./use-course-builder-state"
import { SectionContent, PreviewView, LaunchView } from "./page-section-content"
import { CourseBuilderTopBar } from "./course-builder-top-bar"
import { CourseBuilderSidebarNav } from "./course-builder-sidebar-nav"
import { CourseBuilderMobileNav } from "./course-builder-mobile-nav"

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
  const {
    view, setView,
    activeSection, setActiveSection,
    courseId,
    courseCreatedData,
    initialEssentials,
    pageConfig, setPageConfig,
    loadingCourse,
    flashSectionId,
    completedSetupSections,
    handleCourseCreated,
  } = useCourseBuilderState()

  return (
    <div className="flex h-full flex-col bg-background">
      <CourseBuilderTopBar view={view} setView={setView} />

      <div className="flex flex-1 overflow-hidden">
        {view === "setup" ? (
          <div className="flex flex-1 overflow-hidden p-2 bg-muted/10">
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border shadow-sm md:flex-row">
              <CourseBuilderSidebarNav
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                completedSetupSections={completedSetupSections}
                flashSectionId={flashSectionId}
              />

              <main className="flex-1 overflow-hidden bg-background px-6 pt-5 pb-5 md:px-10 md:pb-8">
                <div className="mx-auto flex h-full min-h-0 flex-col">
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

              <CourseBuilderMobileNav
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                completedSetupSections={completedSetupSections}
              />
            </div>
          </div>
        ) : view === "create" ? (
          <div className="flex flex-1 overflow-hidden p-2 bg-muted/10">
            <div className="flex flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
              <CreateEditorLayout courseId={courseId} />
            </div>
          </div>
        ) : view === "preview" ? (
          <div className="no-scrollbar flex flex-1 overflow-y-auto p-2 bg-muted/10">
            <div className="no-scrollbar flex flex-1 overflow-y-auto rounded-xl border border-border shadow-sm bg-background px-6">
              <PreviewView courseData={courseCreatedData} />
            </div>
          </div>
        ) : (
          <div className="no-scrollbar flex flex-1 overflow-y-auto p-2 bg-muted/10">
            <div className="no-scrollbar flex flex-1 overflow-y-auto rounded-xl border border-border shadow-sm bg-background px-6">
              <LaunchView courseId={courseId} courseData={courseCreatedData} onSetView={setView} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
