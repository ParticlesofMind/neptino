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

      <div className="flex flex-1 overflow-x-visible overflow-y-hidden">
        {view === "setup" ? (
          <div className="flex flex-1 overflow-hidden bg-muted/10">
            <CourseBuilderSidebarNav
              activeSection={activeSection}
              setActiveSection={setActiveSection}
              completedSetupSections={completedSetupSections}
              flashSectionId={flashSectionId}
            />

            <div className="flex flex-1 flex-col overflow-hidden border-x border-b border-border bg-background">
              <main className="flex-1 overflow-hidden p-4 md:p-5">
                <div className="mx-auto flex h-full min-h-0 flex-col bg-background">
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
          <div className="flex flex-1 overflow-x-visible overflow-y-hidden bg-muted/10">
            <div className="flex flex-1 overflow-hidden border-x border-b border-border bg-background">
              <div className="flex flex-1 overflow-hidden border-x border-b border-border bg-background">
                <CreateEditorLayout courseId={courseId} />
              </div>
            </div>
          </div>
        ) : view === "preview" ? (
          <div className="no-scrollbar flex flex-1 overflow-y-auto bg-muted/10">
            <div className="no-scrollbar flex flex-1 overflow-y-auto border-x border-b border-border bg-background p-4 md:p-5">
              <div className="no-scrollbar flex flex-1 overflow-y-auto rounded-md border-x border-b border-border bg-background">
                <PreviewView courseData={courseCreatedData} />
              </div>
            </div>
          </div>
        ) : (
          <div className="no-scrollbar flex flex-1 overflow-y-auto bg-muted/10">
            <div className="no-scrollbar flex flex-1 overflow-y-auto border-x border-b border-border bg-background p-4 md:p-5">
              <div className="no-scrollbar flex flex-1 overflow-y-auto rounded-md border-x border-b border-border bg-background">
                <LaunchView courseId={courseId} courseData={courseCreatedData} onSetView={setView} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
