import { NextResponse } from "next/server"
import { normalizeInferenceTranscript, serializeTranscriptSegments } from "@/lib/audio-transcript"

export const maxDuration = 120

const HF_TOKEN = process.env.HF_TOKEN ?? ""
const HF_AUDIO_TRANSCRIBE_MODEL = process.env.HF_AUDIO_TRANSCRIBE_MODEL ?? "openai/whisper-large-v3-turbo"
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

interface TranscriptionRequestBody {
  audioUrl?: unknown
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

async function readJsonBody(request: Request): Promise<TranscriptionRequestBody> {
  try {
    return (await request.json()) as TranscriptionRequestBody
  } catch {
    return {}
  }
}

function buildUpstreamError(prefix: string, detail: string): NextResponse {
  return NextResponse.json({ error: `${prefix}: ${detail}` }, { status: 502 })
}

export async function POST(request: Request) {
  if (!HF_TOKEN) {
    return NextResponse.json(
      { error: "HF_TOKEN is not configured. Set it to enable audio transcription." },
      { status: 503 },
    )
  }

  const body = await readJsonBody(request)
  const audioUrl = typeof body.audioUrl === "string" ? body.audioUrl.trim() : ""

  if (!audioUrl || !isHttpUrl(audioUrl)) {
    return NextResponse.json({ error: "A valid audioUrl is required." }, { status: 400 })
  }

  const audioResponse = await fetch(audioUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  }).catch((error: unknown) => error)

  if (audioResponse instanceof Error) {
    return buildUpstreamError("Unable to fetch audio source", audioResponse.message)
  }

  if (!audioResponse.ok) {
    return buildUpstreamError("Unable to fetch audio source", `${audioResponse.status} ${audioResponse.statusText}`)
  }

  const audioBytes = Buffer.from(await audioResponse.arrayBuffer())
  if (audioBytes.byteLength === 0) {
    return NextResponse.json({ error: "The audio source is empty." }, { status: 400 })
  }
  if (audioBytes.byteLength > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio file is too large to transcribe in-app." }, { status: 413 })
  }

  const inferenceResponse = await fetch(`https://api-inference.huggingface.co/models/${HF_AUDIO_TRANSCRIBE_MODEL}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: audioBytes.toString("base64"),
      parameters: {
        return_timestamps: true,
      },
    }),
    signal: AbortSignal.timeout(90_000),
  }).catch((error: unknown) => error)

  if (inferenceResponse instanceof Error) {
    return buildUpstreamError("Hugging Face transcription failed", inferenceResponse.message)
  }

  const rawBody = await inferenceResponse.text()
  let payload: Record<string, unknown> = {}

  try {
    payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {}
  } catch {
    payload = { error: rawBody }
  }

  if (!inferenceResponse.ok) {
    const detail = typeof payload.error === "string" ? payload.error : rawBody || inferenceResponse.statusText
    return buildUpstreamError("Hugging Face transcription failed", detail)
  }

  const segments = normalizeInferenceTranscript(payload.text, payload.chunks)
  const transcript = serializeTranscriptSegments(segments)

  return NextResponse.json(
    {
      model: HF_AUDIO_TRANSCRIBE_MODEL,
      transcript,
      segments,
    },
    { status: 200 },
  )
}