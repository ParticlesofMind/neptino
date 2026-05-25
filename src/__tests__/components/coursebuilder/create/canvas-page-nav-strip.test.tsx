import { fireEvent, render, screen } from "@testing-library/react"
import { PageNavStrip } from "@/components/coursebuilder/create/canvas/CanvasPageNavStrip"
import { useCanvasStore } from "@/components/coursebuilder/create/store/canvasStore"
import type { CanvasId, CourseSession } from "@/components/coursebuilder/create/types"

function makeSessions(): CourseSession[] {
  return [
    {
      id: "session-1",
      canvases: [
        { id: "canvas-1" },
        { id: "canvas-2" },
        { id: "canvas-3" },
        { id: "canvas-4" },
      ],
    },
  ] as unknown as CourseSession[]
}

describe("PageNavStrip", () => {
  beforeEach(() => {
    useCanvasStore.setState({
      activeCanvasId: null,
      viewportCanvasId: null,
    })
  })

  it("uses the viewport canvas for the page indicator and navigation target", () => {
    const scrollEvents: string[] = []
    const handleScrollRequest = (event: Event) => {
      const canvasId = (event as CustomEvent<{ canvasId?: string }>).detail?.canvasId
      if (canvasId) scrollEvents.push(canvasId)
    }

    window.addEventListener("coursebuilder:scroll-to-canvas", handleScrollRequest)

    try {
      useCanvasStore.setState({
        activeCanvasId: "canvas-1" as CanvasId,
        viewportCanvasId: "canvas-3" as CanvasId,
      })

      render(<PageNavStrip sessions={makeSessions()} />)

      expect(screen.getByText("3")).toBeInTheDocument()

      fireEvent.click(screen.getByTitle("Next page"))

      expect(useCanvasStore.getState().activeCanvasId).toBe("canvas-4")
      expect(useCanvasStore.getState().viewportCanvasId).toBe("canvas-4")
      expect(scrollEvents).toEqual(["canvas-4"])
    } finally {
      window.removeEventListener("coursebuilder:scroll-to-canvas", handleScrollRequest)
    }
  })
})
