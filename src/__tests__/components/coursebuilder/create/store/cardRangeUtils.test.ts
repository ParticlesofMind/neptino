import { describe, expect, it } from "vitest"
import { normalizeCanvasCardRanges } from "@/components/coursebuilder/create/store/cardRangeUtils"
import type { CanvasId, CanvasPage, SessionId } from "@/components/coursebuilder/create/types"

const sessionId = "session-1" as SessionId

function page(id: string, range: { start: number; end?: number }, blockKeys: CanvasPage["blockKeys"]): CanvasPage {
  return {
    id: id as CanvasId,
    sessionId,
    pageNumber: 1,
    blockKeys,
    contentCardRange: range,
  }
}

describe("normalizeCanvasCardRanges", () => {
  it("preserves non-monotonic card ranges for block-scoped template pages", () => {
    const result = normalizeCanvasCardRanges(
      [
        page("content-page", { start: 3, end: 4 }, ["header", "content", "footer"]),
        page("assignment-page", { start: 0, end: 1 }, ["header", "assignment", "footer"]),
      ],
      4,
    )

    expect(result[0]?.contentCardRange).toEqual({ start: 3, end: 4 })
    expect(result[1]?.contentCardRange).toEqual({ start: 0, end: 1 })
  })

  it("still keeps template-free canvas ranges monotonic", () => {
    const result = normalizeCanvasCardRanges(
      [
        page("free-page-1", { start: 2, end: 3 }, []),
        page("free-page-2", { start: 0, end: 1 }, []),
      ],
      4,
    )

    expect(result[0]?.contentCardRange).toEqual({ start: 2, end: 3 })
    expect(result[1]?.contentCardRange).toEqual({ start: 3, end: 3 })
  })
})
