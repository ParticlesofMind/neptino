import { render, screen, fireEvent } from "@testing-library/react"
import { ModeBar } from "@/components/coursebuilder/create/ModeBar"
import { useCreateModeStore } from "@/components/coursebuilder/create/store/createModeStore"

describe("ModeBar", () => {
  beforeEach(() => {
    // reset store state before each test
    useCreateModeStore.setState({ mode: "curate" })
  })

  it("renders the available create modes and highlights the active one", () => {
    render(<ModeBar />)
    const canvas = screen.getByRole("button", { name: /canvas/i })
    const addCard = screen.getByRole("button", { name: /add card/i })

    expect(canvas).toHaveClass("rounded-md")
    expect(canvas).toHaveClass("bg-muted")
    expect(canvas).toHaveClass("text-foreground")
    expect(addCard).toHaveClass("text-muted-foreground")
    expect(screen.queryByRole("button", { name: /fix/i })).toBeNull()
  })

  it("updates the store when a different mode is clicked", () => {
    render(<ModeBar />)
    const make = screen.getByRole("button", { name: /add card/i })
    fireEvent.click(make)
    expect(useCreateModeStore.getState().mode).toBe("make")
  })
})
