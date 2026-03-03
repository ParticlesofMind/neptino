import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MakePanel } from "@/components/coursebuilder/create/sidebar/MakePanel"

function clickCardType(label: string) {
  const option = screen.getAllByText(label)[0]?.closest("button")
  if (!option) throw new Error(`Card type button not found: ${label}`)
  fireEvent.click(option)
}

describe("MakePanel integration", () => {
  it("updates creator studio metadata when card type changes", () => {
    render(<MakePanel />)

    expect(screen.getByText("Text · Reading Block")).toBeInTheDocument()

    clickCardType("Video")

    expect(screen.getByText("Video · Explainer Clip")).toBeInTheDocument()
  })

  it("keeps creator-studio draft per selected card type", () => {
    render(<MakePanel />)

    const readingLevelInput = screen.getByPlaceholderText("e.g. B1") as HTMLInputElement
    fireEvent.change(readingLevelInput, { target: { value: "B2" } })

    clickCardType("Image")

    const altTextInput = screen.getByPlaceholderText("Describe the image") as HTMLInputElement
    expect(altTextInput.value).toBe("")
    fireEvent.change(altTextInput, { target: { value: "Detailed alt text" } })

    clickCardType("Text")
    expect((screen.getByPlaceholderText("e.g. B1") as HTMLInputElement).value).toBe("B2")

    clickCardType("Image")
    expect((screen.getByPlaceholderText("Describe the image") as HTMLInputElement).value).toBe("Detailed alt text")
  })

  it("exposes animation toolbar controls for motion cards", () => {
    render(<MakePanel />)

    clickCardType("Animation")

    fireEvent.click(screen.getByRole("button", { name: "Scrub" }))
    fireEvent.change(screen.getByRole("slider"), { target: { value: "320" } })

    expect(screen.getByRole("button", { name: "Play once" })).toBeInTheDocument()
    expect(screen.getByText("320ms")).toBeInTheDocument()
  })
})
