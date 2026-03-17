import { afterEach, describe, expect, it, vi } from "vitest"

describe("POST /api/transcribe-audio", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    delete process.env.HF_TOKEN
    delete process.env.HF_AUDIO_TRANSCRIBE_MODEL
  })

  it("returns a timestamped transcript payload from Hugging Face", async () => {
    process.env.HF_TOKEN = "hf_test"
    process.env.HF_AUDIO_TRANSCRIBE_MODEL = "openai/whisper-large-v3-turbo"

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "https://example.com/audio.mp3") {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        })
      }

      return new Response(JSON.stringify({
        text: "Intro Main idea",
        chunks: [
          { text: "Intro", timestamp: [0, 3] },
          { text: "Main idea", timestamp: [3, 8] },
        ],
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    })

    vi.stubGlobal("fetch", fetchMock)

    const { POST } = await import("@/app/api/transcribe-audio/route")
    const response = await POST(new Request("http://localhost/api/transcribe-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl: "https://example.com/audio.mp3" }),
    }))

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.transcript).toBe("[0:00] Intro\n[0:03] Main idea")
    expect(payload.segments).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("fails clearly when HF_TOKEN is missing", async () => {
    const { POST } = await import("@/app/api/transcribe-audio/route")
    const response = await POST(new Request("http://localhost/api/transcribe-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl: "https://example.com/audio.mp3" }),
    }))

    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.error).toContain("HF_TOKEN")
  })
})