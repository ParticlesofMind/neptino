import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { CourseBuilderTopBar } from "@/app/(coursebuilder)/teacher/coursebuilder/course-builder-top-bar"

// minimal mock for view navigation used inside the component
vi.mock("@/app/(coursebuilder)/teacher/coursebuilder/page-section-registry", () => {
  return {
    VIEW_SEQUENCE: ["setup", "create", "preview", "launch"],
    VIEW_LABELS: { setup: "Setup", create: "Create", preview: "Preview", launch: "Launch" },
    getPrevView: (view: string) => (view === "create" ? "setup" : null),
    getNextView: () => null,
  }
})

describe("CourseBuilderTopBar", () => {
  it("renders Setup back button when view is create", () => {
    render(<CourseBuilderTopBar view="create" setView={vi.fn()} />)
    expect(screen.getAllByRole("button", { name: /setup cmd\/ctrl \+ 1/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /curate/i })).toBeNull()
  })

  it("does not render Setup or ModeBar when view is setup", () => {
    render(<CourseBuilderTopBar view="setup" setView={vi.fn()} />)
    expect(screen.queryByRole("button", { name: /setup/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /curate/i })).toBeNull()
  })

  it("switches views with command number shortcuts", () => {
    const setView = vi.fn()
    render(<CourseBuilderTopBar view="create" setView={setView} />)

    fireEvent.keyDown(window, { key: "3", metaKey: true })

    expect(setView).toHaveBeenCalledWith("preview")
  })

  it("ignores plain number keys", () => {
    const setView = vi.fn()
    render(<CourseBuilderTopBar view="create" setView={setView} />)

    fireEvent.keyDown(window, { key: "3" })

    expect(setView).not.toHaveBeenCalled()
  })
})
