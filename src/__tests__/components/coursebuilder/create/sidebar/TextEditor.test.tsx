import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TextEditor } from "@/components/coursebuilder/create/sidebar/editors/TextEditor"

const mockSetContent = vi.fn()

vi.mock("@tiptap/react", () => ({
  useEditor: () => ({
    getHTML: () => "",
    commands: { setContent: mockSetContent },
    chain: () => ({
      focus: () => ({
        setLink: () => ({ run: () => undefined }),
        insertContent: () => ({ run: () => undefined }),
        setEntityRef: () => ({ run: () => undefined }),
      }),
    }),
    state: { selection: { from: 0, to: 0 } },
  }),
}))

vi.mock("@/components/coursebuilder/create/sidebar/editors/text-editor-preview", () => ({
  TextEditorPreview: () => <div>Preview</div>,
}))

vi.mock("@/lib/tiptap/EntityRefMark", () => ({
  EntityRefMark: {},
}))

describe("TextEditor AI generation", () => {
  beforeEach(() => {
    mockSetContent.mockReset()
    vi.restoreAllMocks()
  })

  it("keeps generate disabled until prompt is provided", () => {
    function Harness() {
      const [content, setContent] = useState<Record<string, unknown>>({ title: "Overview", text: "" })
      return (
        <TextEditor
          content={content}
          onChange={(key, value) => setContent((current) => ({ ...current, [key]: value }))}
        />
      )
    }

    render(<Harness />)

    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText("Describe what to write about…"), { target: { value: "Write an intro" } })

    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled()
  })

  it("writes generated html back into text content", async () => {
    const onChange = vi.fn()
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ message: "First paragraph.\n\nSecond paragraph." }),
    } as Response)

    render(
      <TextEditor
        content={{
          title: "Overview",
          text: "",
          generationPrompt: "Write an intro",
          writingTone: "academic",
          targetLength: "short",
        }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Generate" }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/ollama-chat",
        expect.objectContaining({ method: "POST" }),
      )
      expect(onChange).toHaveBeenCalledWith("text", "<p>First paragraph.</p><p>Second paragraph.</p>")
    })
  })
})
