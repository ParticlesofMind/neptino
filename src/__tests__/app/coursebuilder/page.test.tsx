import React from "react"
import { render, screen } from "@testing-library/react"

// we need to mock the hook used inside CourseBuilderPageInner
jest.mock("@/app/(coursebuilder)/teacher/coursebuilder/use-course-builder-state", () => {
  return {
    useCourseBuilderState: () => ({
      view: "create",
      setView: jest.fn(),
      activeSection: "essentials",
      setActiveSection: jest.fn(),
      courseId: null,
      courseCreatedData: null,
      initialEssentials: null,
      pageConfig: null,
      setPageConfig: jest.fn(),
      loadingCourse: false,
      flashSectionId: null,
      completedSetupSections: {},
      handleCourseCreated: jest.fn(),
    }),
  }
})

import CourseBuilderPage from "@/app/(coursebuilder)/teacher/coursebuilder/page"
import { useCreateModeStore } from "@/components/coursebuilder/create/store/createModeStore"

// stub out CreateEditorLayout to avoid heavy rendering
jest.mock("@/components/coursebuilder/create/CreateEditorLayout", () => {
  return {
    CreateEditorLayout: ({ showModeBar }: any) => (
      <div data-testid="create-layout">layout (showModeBar={String(showModeBar)})</div>
    ),
  }
})

// because ModeBar uses the store, ensure it is reset
beforeEach(() => {
  useCreateModeStore.setState({ mode: "curate" })
})

describe("CourseBuilderPage", () => {
  it("renders a ModeBar above the editor when view=create", () => {
    render(<CourseBuilderPage />)
    const setup = screen.getByRole("button", { name: /setup/i })
    expect(setup).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /curate/i })).toBeNull()
    // layout should receive showModeBar=true (default)
    expect(screen.getByTestId("create-layout")).toHaveTextContent("showModeBar=true")
  })
})
