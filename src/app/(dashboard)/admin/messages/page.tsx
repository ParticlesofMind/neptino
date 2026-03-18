"use client"
import { useState } from "react"
import { Send, Users, GraduationCap, BookOpen } from "lucide-react"

type Audience = "all" | "teachers" | "students"

const broadcasts = [
  { id: "1", subject: "Platform maintenance window", audience: "all" as Audience, sent: "2 days ago", recipients: 1284 },
  { id: "2", subject: "New Course Builder features available", audience: "teachers" as Audience, sent: "1 week ago", recipients: 212 },
  { id: "3", subject: "Semester start reminder", audience: "students" as Audience, sent: "2 weeks ago", recipients: 1032 },
]

const audienceStyle: Record<Audience, { label: string; color: string; Icon: React.ElementType }> = {
  all: { label: "Everyone", color: "#6b8fc4", Icon: Users },
  teachers: { label: "Teachers", color: "#a89450", Icon: BookOpen },
  students: { label: "Students", color: "#5c9970", Icon: GraduationCap },
}

import React from "react"

export default function AdminMessagesPage() {
  const [audience, setAudience] = useState<Audience>("all")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  return (
    <div className="space-y-8">

      {/* Compose broadcast */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">New Broadcast</h2>
        <div className="rounded-lg border border-border bg-background">
          {/* Audience selector */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
            <span className="shrink-0 text-sm text-muted-foreground">To:</span>
            <div className="flex gap-1">
              {(Object.entries(audienceStyle) as [Audience, typeof audienceStyle[Audience]][]).map(([key, val]) => {
                const AudIcon = val.Icon
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAudience(key)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      audience === key
                        ? "border border-primary/30 bg-primary/10 text-primary"
                        : "border border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <AudIcon className="h-3 w-3" />
                    {val.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subject */}
          <div className="border-b border-border px-5 py-3">
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Body */}
          <div className="px-5 py-3">
            <textarea
              rows={5}
              placeholder="Write your announcement…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end border-t border-border px-5 py-3">
            <button
              type="button"
              disabled={!subject.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Send broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Sent broadcasts */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">Sent Broadcasts</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {broadcasts.map((b) => {
            const aud = audienceStyle[b.audience]
            const AudIcon = aud.Icon
            return (
              <div key={b.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{b.subject}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <AudIcon className="h-3 w-3" style={{ color: aud.color }} />
                    <span className="text-xs text-muted-foreground">{aud.label}</span>
                    <span className="text-xs text-muted-foreground">&middot; {b.recipients.toLocaleString()} recipients</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{b.sent}</span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
