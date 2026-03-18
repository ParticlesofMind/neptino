"use client"

import { useMemo, useState } from "react"
import { Bot, Loader2, RefreshCw, Send } from "lucide-react"
import type { CardRenderProps } from "../CardRegistry"
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/ollama/models"

interface ChatMessage {
  role: "assistant" | "user"
  content: string
}

function buildSystemPrompt(card: CardRenderProps["card"]): string {
  const persona = typeof card.content["aiPersona"] === "string" ? card.content["aiPersona"] : "AI Tutor"
  const topic = typeof card.content["topic"] === "string" ? card.content["topic"] : ""
  const objectives = typeof card.content["learningObjectives"] === "string" ? card.content["learningObjectives"] : ""
  const difficulty = typeof card.content["difficulty"] === "string" ? card.content["difficulty"] : "intermediate"

  return [
    `You are ${persona}.`,
    `Teach through conversation at a ${difficulty} level.`,
    topic ? `Stay grounded in this topic context: ${topic}` : "",
    objectives ? `Prioritize these learning objectives: ${objectives}` : "",
    "Keep responses concise, clear, and pedagogically useful.",
  ].filter(Boolean).join("\n")
}

export function ChatCard({ card, onRemove }: CardRenderProps) {
  const title = typeof card.content["title"] === "string" ? card.content["title"] : "Chat with character"
  const persona = typeof card.content["aiPersona"] === "string" ? card.content["aiPersona"] : "AI Tutor"
  const openingMessage = typeof card.content["openingMessage"] === "string"
    ? card.content["openingMessage"]
    : "Hello. What would you like to explore?"
  const starters = Array.isArray(card.content["conversationStarters"])
    ? (card.content["conversationStarters"] as string[]).filter(Boolean)
    : []
  const configuredModel = typeof card.content["model"] === "string" ? card.content["model"] : DEFAULT_MODEL
  const maxTurns = typeof card.content["maxTurns"] === "number" ? card.content["maxTurns"] : 20

  const initialMessages = useMemo<ChatMessage[]>(() => [{ role: "assistant", content: openingMessage }], [openingMessage])

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [selectedModel, setSelectedModel] = useState(configuredModel)
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userTurns = messages.filter((message) => message.role === "user").length
  const limitReached = maxTurns > 0 && userTurns >= maxTurns

  async function sendMessage(nextInput?: string) {
    const content = (nextInput ?? input).trim()
    if (!content || pending || limitReached) return

    const nextMessages = [...messages, { role: "user" as const, content }]
    setMessages(nextMessages)
    setInput("")
    setPending(true)
    setError(null)

    try {
      const response = await fetch("/api/ollama-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          systemPrompt: buildSystemPrompt(card),
          messages: nextMessages,
        }),
      })

      const data = await response.json() as { message?: string; error?: string }
      if (!response.ok || !data.message) {
        throw new Error(data.error || "Ollama request failed")
      }

      setMessages((current) => [...current, { role: "assistant", content: data.message ?? "" }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reach Ollama.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
      style={{ width: "100%", height: card.dimensions.height || 320 }}
    >
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 shadow-sm hover:text-neutral-700 group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}

      <div className="border-b border-neutral-200 bg-neutral-50/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Product</p>
            <h3 className="mt-1 text-sm font-semibold text-neutral-800">{title}</h3>
            <p className="text-[11px] text-neutral-500">Chatting as {persona}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700 outline-none"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.name} value={model.name}>{model.displayName}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setMessages(initialMessages)
                setError(null)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50"
              aria-label="Reset conversation"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-4 py-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === "assistant" ? "flex items-start gap-2.5" : "flex justify-end"}
          >
            {message.role === "assistant" && (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ccb3] to-[#4a94ff] text-white">
                <Bot size={14} />
              </div>
            )}
            <div
              className={message.role === "assistant"
                ? "max-w-[85%] rounded-2xl rounded-tl-sm border border-neutral-200 bg-white px-3 py-2 text-[12px] leading-5 text-neutral-700 shadow-sm"
                : "max-w-[85%] rounded-2xl rounded-tr-sm bg-neutral-900 px-3 py-2 text-[12px] leading-5 text-white"
              }
            >
              {message.content}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <Loader2 size={14} className="animate-spin" />
            Thinking with {selectedModel}…
          </div>
        )}

        {!pending && starters.length > 0 && messages.length === initialMessages.length && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Conversation starters</p>
            {starters.slice(0, 3).map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => void sendMessage(starter)}
                className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-[11px] text-neutral-600 shadow-sm hover:border-neutral-300 hover:bg-neutral-50"
              >
                {starter}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 bg-white px-4 py-3">
        {error && <p className="mb-2 text-[11px] text-destructive">{error}</p>}
        {limitReached && <p className="mb-2 text-[11px] text-[#7a6010]">Turn limit reached for this product.</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void sendMessage()
              }
            }}
            rows={2}
            placeholder="Type your message…"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-700 outline-none focus:border-neutral-300"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={pending || !input.trim() || limitReached}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}