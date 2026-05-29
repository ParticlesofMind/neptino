import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PretextText } from "@/components/coursebuilder/create/text/PretextText"

vi.mock("@chenglou/pretext", () => ({
  prepareWithSegments: vi.fn((text: string) => ({ text })),
  layoutWithLines: vi.fn((prepared: { text: string }) => ({
    height: 60,
    lineCount: 3,
    lines: prepared.text.split("|").map((text) => ({
      text,
      width: text.length * 6,
      start: { segmentIndex: 0, graphemeIndex: 0 },
      end: { segmentIndex: 0, graphemeIndex: text.length },
    })),
  })),
}))

describe("PretextText", () => {
  it("renders measured lines with clamping metadata", async () => {
    const { container } = render(
      <PretextText
        text="First line|Second line|Third line"
        measureWidthPx={120}
        maxLines={2}
      />,
    )

    const root = container.querySelector("[data-pretext-text]")
    await waitFor(() => expect(root).toHaveAttribute("data-pretext-state", "laid-out"))

    expect(root).toHaveAttribute("aria-label", "First line|Second line|Third line")
    expect(root).toHaveAttribute("data-pretext-line-count", "3")
    expect(root).toHaveAttribute("data-pretext-truncated", "true")
    expect(screen.getByText("First line")).toBeInTheDocument()
    expect(screen.getByText("Second line...")).toBeInTheDocument()
  })

  it("shows rich empty content without measuring", () => {
    render(<PretextText text="" emptyText={<span>Empty text card</span>} />)

    expect(screen.getByText("Empty text card")).toBeInTheDocument()
  })
})
