import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

const { lottiePlayerSpy } = vi.hoisted(() => ({
  lottiePlayerSpy: vi.fn((props: { speed?: number }) => (
    <div data-testid="lottie-player" data-speed={props.speed ?? 0} />
  )),
}))

vi.mock("next/dynamic", () => ({
  default: () => lottiePlayerSpy,
}))

import { AnimationEditor } from "@/components/coursebuilder/create/sidebar/editors/AnimationEditor"

describe("AnimationEditor", () => {
  beforeEach(() => {
    lottiePlayerSpy.mockClear()
    vi.restoreAllMocks()
  })

  it("loads persisted lottie assets on initial render", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ v: "5.7.0" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    render(
      <AnimationEditor
        content={{ url: "https://example.com/animation.json", format: "lottie", speed: 1.5 }}
        onChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("https://example.com/animation.json")
    })
    await waitFor(() => {
      expect(screen.getByTestId("lottie-player")).toBeInTheDocument()
    })
    expect(lottiePlayerSpy).toHaveBeenCalled()
    expect(lottiePlayerSpy.mock.calls.at(-1)?.[0]).toMatchObject({ speed: 1.5 })
  })

  it("does not fetch lottie JSON for non-lottie formats", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    render(
      <AnimationEditor
        content={{ url: "https://example.com/animation.gif", format: "gif" }}
        onChange={vi.fn()}
      />,
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByAltText("Animation preview")).toBeInTheDocument()
  })
})