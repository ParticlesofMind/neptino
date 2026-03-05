import { render, screen, fireEvent } from "@testing-library/react"
import { ModeBar } from "@/components/coursebuilder/create/ModeBar"
import { useCreateModeStore } from "@/components/coursebuilder/create/store/createModeStore"

describe("ModeBar", () => {
  beforeEach(() => {
    // reset store state before each test
    useCreateModeStore.setState({ mode: "curate" })
  })

  it("renders three buttons and highlights the active one", () => {
    render(<ModeBar />)
    const curate = screen.getByRole("button", { name: /curate/i })
    const make = screen.getByRole("button", { name: /make/i })
    const fix = screen.getByRole("button", { name: /fix/i })

    expect(curate).toHaveClass("bg-neutral-900")
    expect(make).not.toHaveClass("bg-neutral-900")
    expect(fix).not.toHaveClass("bg-neutral-900")
  })

  it("updates the store when a different mode is clicked", () => {
    render(<ModeBar />)
    const make = screen.getByRole("button", { name: /make/i })
    fireEvent.click(make)
    expect(useCreateModeStore.getState().mode).toBe("make")

    const fix = screen.getByRole("button", { name: /fix/i })
    fireEvent.click(fix)
    expect(useCreateModeStore.getState().mode).toBe("fix")
  })
})
