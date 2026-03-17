import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { MakePanel } from "@/components/coursebuilder/create/sidebar/MakePanel"
import { useCourseStore } from "@/components/coursebuilder/create/store/courseStore"
import { useMakeLibraryStore } from "@/components/coursebuilder/create/store/makeLibraryStore"
import type { CourseSession, CourseId, SessionId } from "@/components/coursebuilder/create/types"

function clickCardType(label: string) {
  const option = screen.getAllByText(label)[0]?.closest("button")
  if (!option) throw new Error(`Card type button not found: ${label}`)
  fireEvent.click(option)
}

beforeEach(() => {
  localStorage.clear()
  useMakeLibraryStore.setState({ cards: [] })
  useCourseStore.setState({ sessions: [], activeSessionId: null })
})

describe("MakePanel integration", () => {
  it("switches editor controls when card type changes", () => {
    render(<MakePanel />)

    expect(screen.getByPlaceholderText("B1, Grade 8…")).toBeInTheDocument()

    clickCardType("Video")

    expect(screen.getByPlaceholderText("YouTube, Vimeo, or .mp4 / .m3u8 URL")).toBeInTheDocument()
  })

  it("keeps editor draft state per selected card type", () => {
    render(<MakePanel />)

    const readingLevelInput = screen.getByPlaceholderText("B1, Grade 8…") as HTMLInputElement
    fireEvent.change(readingLevelInput, { target: { value: "B2" } })

    clickCardType("Image")

    const altTextInput = screen.getByPlaceholderText("Describe this image for screen readers") as HTMLInputElement
    expect(altTextInput.value).toBe("")
    fireEvent.change(altTextInput, { target: { value: "Detailed alt text" } })

    clickCardType("Text")
    expect((screen.getByPlaceholderText("B1, Grade 8…") as HTMLInputElement).value).toBe("B2")

    clickCardType("Image")
    expect((screen.getByPlaceholderText("Describe this image for screen readers") as HTMLInputElement).value).toBe("Detailed alt text")
  })

  it("exposes animation toolbar controls for motion cards", () => {
    render(<MakePanel />)

    clickCardType("Animation")

    fireEvent.click(screen.getByRole("button", { name: "Scrub" }))
    fireEvent.change(screen.getByRole("slider", { name: "Animation scrub" }), { target: { value: "320" } })

    expect(screen.getByRole("button", { name: "Play once" })).toBeInTheDocument()
    expect(screen.getByText("320ms")).toBeInTheDocument()
  })

  it("only enables add block after title and content are provided", () => {
    render(<MakePanel />)

    clickCardType("Dataset")

    const addButton = screen.getByRole("button", { name: "Add block" })
    expect(addButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText("Block name"), { target: { value: "Population data" } })
    expect(addButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText("https://... or database.table_name"), {
      target: { value: "analytics.population_2026" },
    })

    expect(addButton).toBeEnabled()
  })

  it("shows saved blocks grouped by project with counts and collapsible sections", () => {
    const sessions: CourseSession[] = [
      {
        id: "session-1" as SessionId,
        courseId: "course-1" as CourseId,
        order: 0,
        title: "Lesson 1",
        canvases: [],
        topics: [],
        courseTitle: "Biology 101",
      },
    ]

    useCourseStore.setState({ sessions, activeSessionId: "session-1" as SessionId })
    useMakeLibraryStore.setState({
      cards: [
        {
          id: "card-1",
          cardType: "text",
          title: "Lab intro",
          content: { title: "Lab intro" },
          createdAt: 3,
          projectId: "course-1",
          projectTitle: "Biology 101",
        },
        {
          id: "card-2",
          cardType: "image",
          title: "Cell diagram",
          content: { title: "Cell diagram" },
          createdAt: 2,
          projectId: "course-1",
          projectTitle: "Biology 101",
        },
        {
          id: "card-3",
          cardType: "video",
          title: "Motion study",
          content: { title: "Motion study" },
          createdAt: 1,
          projectId: "course-2",
          projectTitle: "Physics Lab",
        },
      ],
    })

    render(<MakePanel />)

    fireEvent.click(screen.getByRole("button", { name: "Library" }))

    const biologyGroup = screen.getByRole("button", { name: /Biology 101/i })
    const physicsGroup = screen.getByRole("button", { name: /Physics Lab/i })

    expect(within(biologyGroup).getByText("2")).toBeInTheDocument()
    expect(within(physicsGroup).getByText("1")).toBeInTheDocument()
    expect(screen.getAllByText("Text").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Image").length).toBeGreaterThan(0)
    expect(screen.getByText("Lab intro")).toBeInTheDocument()
    expect(screen.queryByText("Motion study")).not.toBeInTheDocument()

    const textButtons = screen.getAllByRole("button", { name: /Text/i })

    fireEvent.click(textButtons[0])
    expect(screen.queryByText("Lab intro")).not.toBeInTheDocument()

    fireEvent.click(textButtons[0])
    expect(screen.getByText("Lab intro")).toBeInTheDocument()

    fireEvent.click(physicsGroup)

    expect(screen.getByText("Motion study")).toBeInTheDocument()
  })
})
