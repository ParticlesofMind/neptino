import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MakeMotionToolbar } from "@/components/coursebuilder/create/sidebar/make-motion-toolbar"

describe("MakeMotionToolbar", () => {
  it("shows animation controls", () => {
    render(
      <MakeMotionToolbar
        content={{}}
        onChange={() => undefined}
      />,
    )

    expect(screen.getByRole("button", { name: "Play once" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Live" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Scrub" })).toBeInTheDocument()
  })

  it("emits scrub updates from slider and keyframes", () => {
    const onChange = vi.fn()

    render(
      <MakeMotionToolbar
        content={{ animationDurationMs: 1000, animationScrubEnabled: false, animationScrubMs: 0 }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Scrub" }))
    fireEvent.change(screen.getByRole("slider"), { target: { value: "430" } })
    fireEvent.click(screen.getByRole("button", { name: "Peak" }))

    expect(onChange).toHaveBeenCalledWith("animationScrubEnabled", true)
    expect(onChange).toHaveBeenCalledWith("animationScrubMs", 430)
    expect(onChange).toHaveBeenCalledWith("animationScrubMs", 500)
  })

  it("restarts preview when Play once is clicked", () => {
    const onChange = vi.fn()

    render(
      <MakeMotionToolbar
        content={{ animationScrubEnabled: true, animationScrubMs: 500 }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Play once" }))

    expect(onChange).toHaveBeenCalledWith("animationScrubEnabled", false)
    expect(onChange).toHaveBeenCalledWith("animationNonce", expect.any(Number))
  })
})
