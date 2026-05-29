import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  CanvasId,
  CourseId,
  CourseSession,
  SessionId,
} from "@/components/coursebuilder/create/types"

const { useLayoutEngineMock } = vi.hoisted(() => ({
  useLayoutEngineMock: vi.fn(),
}))

vi.mock("@/components/coursebuilder/create/hooks/useLayoutEngine", () => ({
  useLayoutEngine: useLayoutEngineMock,
}))

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
    measure: vi.fn(),
    scrollToIndex: vi.fn(),
  }),
}))

vi.mock("@/components/coursebuilder/create/canvas/CanvasPage", () => ({
  CanvasPage: () => <div data-testid="canvas-page" />,
}))

vi.mock("@/components/coursebuilder/create/canvas/CanvasControlsStrip", () => ({
  CanvasControlsStrip: () => <div data-testid="canvas-controls" />,
}))

import { CanvasVirtualizer } from "@/components/coursebuilder/create/canvas/CanvasVirtualizer"

function buildSession(): CourseSession {
  const sessionId = "session-1" as SessionId
  return {
    id: sessionId,
    courseId: "course-1" as CourseId,
    order: 1,
    title: "Session 1",
    templateType: "lesson",
    canvases: [
      {
        id: "session-1-canvas-1" as CanvasId,
        sessionId,
        pageNumber: 1,
        blockKeys: ["header", "program", "resources", "footer"],
      },
    ],
    topics: [],
  }
}

describe("CanvasVirtualizer layout sync", () => {
  beforeEach(() => {
    useLayoutEngineMock.mockClear()

    class ResizeObserverMock {
      observe(): void { return undefined }
      unobserve(): void { return undefined }
      disconnect(): void { return undefined }
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  it("keeps deterministic layout sync enabled when DOM overflow splitting is disabled", () => {
    const session = buildSession()

    render(<CanvasVirtualizer sessions={[session]} disableOverflow />)

    expect(useLayoutEngineMock).toHaveBeenCalledWith(
      expect.objectContaining({
        session,
        disabled: false,
      }),
    )
  })
})
