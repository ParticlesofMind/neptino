"use client"

import { Inbox, MailOpen, PenSquare, Star } from "lucide-react"

const conversations = [
  { name: "Alice M.",  course: "Advanced JavaScript",      preview: "Hi, I'm stuck on the async/await exercise in Module 4…",           time: "10 min ago", unread: true,  starred: false },
  { name: "Ben K.",    course: "Python for Data Analysis", preview: "Thanks for the feedback! Quick follow-up on the join…",            time: "2h ago",     unread: true,  starred: true  },
  { name: "Clara O.", course: "Introduction to SQL",      preview: "Can we schedule an office hour before Thursday's session?",        time: "6h ago",     unread: false, starred: false },
  { name: "David N.", course: "Advanced JavaScript",      preview: "The test suite is passing now but I still see a warning…",         time: "Yesterday",  unread: true,  starred: false },
  { name: "Emma S.",  course: "React & TypeScript",       preview: "Loved the walkthrough on custom hooks. One question though…",      time: "Yesterday",  unread: false, starred: true  },
  { name: "Felix B.", course: "Python for Data Analysis", preview: "Submitted my final project. Let me know if anything's missing.",  time: "2 days ago",  unread: false, starred: false },
]

export function MessagesView() {
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Messages</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Monitor learner conversations and pending replies across all courses.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-colors">
          <PenSquare className="h-4 w-4" />
          Compose
        </button>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: "Total Threads", value: "24", sub: "Across all courses",     icon: Inbox    },
          { label: "Unread",        value: "8",  sub: "3 require response",      icon: MailOpen },
          { label: "Starred",       value: "5",  sub: "Marked for follow-up",   icon: Star     },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="px-6 py-4">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold leading-none text-foreground">{value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border px-5 py-2.5">
        {["All", "Unread", "Starred"].map((tab, i) => (
          <button
            key={tab}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              i === 0 ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="divide-y divide-border">
        {conversations.map((c) => (
          <div key={c.name + c.course} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
              {c.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${c.unread ? "text-foreground" : "text-muted-foreground"}`}>{c.name}</span>
                <span className="text-xs text-muted-foreground">· {c.course}</span>
                {c.starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
              </div>
              <p className={`mt-0.5 truncate text-xs ${c.unread ? "text-foreground" : "text-muted-foreground"}`}>{c.preview}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{c.time}</span>
              {c.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

