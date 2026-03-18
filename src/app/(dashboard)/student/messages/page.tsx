"use client"
import { useState } from "react"
import { Search, Pencil } from "lucide-react"

type Conversation = {
  id: string
  name: string
  role: "teacher" | "student"
  lastMessage: string
  time: string
  unread: number
}

const CONVERSATIONS: Conversation[] = [
  { id: "1", name: "Dr. Anna Mueller", role: "teacher", lastMessage: "Please submit Part 2 by Thursday evening.", time: "2h ago", unread: 2 },
  { id: "2", name: "James Park", role: "teacher", lastMessage: "Great work on the flexbox exercise — keep going.", time: "Yesterday", unread: 0 },
  { id: "3", name: "Prof. Sarah Lin", role: "teacher", lastMessage: "The midterm grades are now posted.", time: "2 days ago", unread: 1 },
  { id: "4", name: "Lena Kovacs", role: "student", lastMessage: "Did you finish Problem Set 4 yet?", time: "3 days ago", unread: 0 },
]

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

const roleColor: Record<Conversation["role"], string> = {
  teacher: "#6b8fc4",
  student: "#5c9970",
}

export default function StudentMessagesPage() {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(CONVERSATIONS[0].id)

  const filtered = CONVERSATIONS.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(query.toLowerCase())
  )

  const activeConversation = CONVERSATIONS.find((c) => c.id === selected) ?? null

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-96 gap-0 rounded-lg border border-border bg-background overflow-hidden">

      {/* Sidebar */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border">
        {/* Search + compose */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-muted py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label="New message"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No conversations found.</p>
          )}
          {filtered.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => setSelected(conv.id)}
              className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted ${
                selected === conv.id ? "bg-muted" : ""
              }`}
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: roleColor[conv.role] }}
              >
                {initials(conv.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{conv.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{conv.time}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
              </div>
              {conv.unread > 0 && (
                <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Message pane */}
      <div className="flex flex-1 flex-col">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: roleColor[activeConversation.role] }}
              >
                {initials(activeConversation.name)}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{activeConversation.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{activeConversation.role}</p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="flex flex-col gap-4">
                {/* Incoming message */}
                <div className="flex items-end gap-2">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: roleColor[activeConversation.role] }}
                  >
                    {initials(activeConversation.name)}
                  </span>
                  <div className="max-w-sm rounded-lg rounded-bl-none bg-muted px-4 py-2.5">
                    <p className="text-sm text-foreground">{activeConversation.lastMessage}</p>
                    <p className="mt-1 text-right text-[10px] text-muted-foreground">{activeConversation.time}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Compose */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
                <input
                  type="text"
                  placeholder={`Message ${activeConversation.name.split(" ")[0]}…`}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a conversation to get started.</p>
          </div>
        )}
      </div>

    </div>
  )
}
