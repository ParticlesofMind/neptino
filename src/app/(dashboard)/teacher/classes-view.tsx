"use client"

import { CalendarClock, CheckCircle2, Clock, FileText, Users } from "lucide-react"

const sessions = [
  { course: "Advanced JavaScript",      date: "Today",      time: "14:00 – 15:30", enrolled: 42, status: "Starting soon" },
  { course: "Python for Data Analysis", date: "Tomorrow",   time: "10:00 – 11:30", enrolled: 85, status: "Scheduled" },
  { course: "Introduction to SQL",      date: "Wed, 4 Mar", time: "09:00 – 10:00", enrolled: 61, status: "Scheduled" },
  { course: "Data Visualization 101",   date: "Thu, 5 Mar", time: "15:00 – 16:30", enrolled: 26, status: "Draft" },
  { course: "React & TypeScript",       date: "Fri, 6 Mar", time: "11:00 – 12:30", enrolled: 38, status: "Scheduled" },
]

const submissions = [
  { student: "Alice M.",  course: "Advanced JavaScript",      type: "Assignment", submitted: "1h ago",   status: "Pending" },
  { student: "Ben K.",    course: "Python for Data Analysis", type: "Quiz",       submitted: "3h ago",   status: "Pending" },
  { student: "Clara O.",  course: "Introduction to SQL",      type: "Project",    submitted: "6h ago",   status: "Reviewed" },
  { student: "David N.",  course: "Advanced JavaScript",      type: "Assignment", submitted: "Yesterday", status: "Pending" },
  { student: "Emma S.",   course: "React & TypeScript",       type: "Lab",        submitted: "Yesterday", status: "Reviewed" },
]

const sessionStatusStyle: Record<string, string> = {
  "Starting soon": "border-emerald-200 bg-emerald-50 text-emerald-700",
  Scheduled:       "border-blue-200 bg-blue-50 text-blue-700",
  Draft:           "border-amber-200 bg-amber-50 text-amber-700",
}

export function ClassesView() {
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">

      {/* Header */}
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold text-foreground">Classes</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Track classroom operations, sessions, attendance, and learner submissions.</p>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: "Sessions This Week", value: "5",   sub: "1 starting today",    icon: CalendarClock },
          { label: "Total Learners",     value: "252", sub: "Across all classes",  icon: Users },
          { label: "Pending Reviews",    value: "3",   sub: "4 due today",          icon: FileText },
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

      {/* Upcoming sessions */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Sessions</h2>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="divide-y divide-border">
          {sessions.map((s) => (
            <div key={`${s.course}-${s.date}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{s.course}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.date} · {s.time}</p>
              </div>
              <span className="text-xs text-muted-foreground">{s.enrolled} enrolled</span>
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${sessionStatusStyle[s.status]}`}>{s.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Submission queue */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submission Queue</h2>
          <span className="text-xs text-muted-foreground">3 pending</span>
        </div>
        <div className="divide-y divide-border">
          {submissions.map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-foreground">
                {s.student.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{s.student} <span className="font-normal text-muted-foreground">— {s.type}</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.course} · {s.submitted}</p>
              </div>
              {s.status === "Pending" ? (
                <button type="button" className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors">
                  Review
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Done
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress bars */}
      <div className="px-6 py-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Learner Progress</h2>
        <div className="space-y-3">
          {[
            { course: "Advanced JavaScript",      pct: 64 },
            { course: "Python for Data Analysis", pct: 81 },
            { course: "Introduction to SQL",      pct: 47 },
          ].map(({ course, pct }) => (
            <div key={course}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{course}</span>
                <span className="text-muted-foreground">{pct}% avg completion</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

