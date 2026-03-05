import { render, screen } from "@testing-library/react"
import { CourseBuilderTopBar } from "@/app/(coursebuilder)/teacher/coursebuilder/course-builder-top-bar"

// minimal mock for VIEW_LABELS used inside the component
jest.mock("@/app/(coursebuilder)/teacher/coursebuilder/page-section-registry", () => {
  return {
    VIEW_LABELS: { setup: "Setup", create: "Create" },
    getPrevView: (view: string) => (view === "create" ? "setup" : null),
    getNextView: () => null,
  }
})

describe("CourseBuilderTopBar", () => {
  it("renders Setup back button when view is create", () => {
    render(<CourseBuilderTopBar view="create" setView={jest.fn()} />)
    const setup = screen.getByRole("button", { name: /setup/i })
    expect(setup).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /curate/i })).toBeNull()
  })

  it("does not render Setup or ModeBar when view is setup", () => {
    render(<CourseBuilderTopBar view="setup" setView={jest.fn()} />)
    expect(screen.queryByRole("button", { name: /setup/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /curate/i })).toBeNull()
  })
})