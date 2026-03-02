"use client"

import Link from "next/link"
import { BookOpen, Eye, PenLine, Plus, Rocket, Users } from "lucide-react"

const courses = [
  { title: "Advanced JavaScript",       subtitle: "ES2024, async patterns, testing",        enrolled: 42, sessions: 8,  status: "Live",   updated: "3 days ago" },
  { title: "Python for Data Analysis",  subtitle: "Pandas, NumPy, Matplotlib",              enrolled: 85, sessions: 12, status: "Live",   updated: "1 day ago" },
  { title: "Data Visualization 101",    subtitle: "D3.js, chart design, dashboards",        enrolled: 26, sessions: 6,  status: "Draft",  updated: "5 hours ago" },
  { title: "Introduction to SQL",       subtitle: "Queries, joins, indexing, postgres",     enrolled: 61, sessions: 10, status: "Live",   updated: "2 days ago" },
  { title: "React & TypeScript",        subtitle: "Hooks, state, component patterns",       enrolled: 38, sessions: 9,  status: "Review", updated: "4 days ago" },
  { title: "Machine Learning Basics",   subtitle: "Regression, classification, sklearn",    enrolled: 0,  sessions: 0,  status: "Draft",  updated: "1 week ago" },
]

const statusStyle: Record<string, string> = {
  Live:   "border-emerald-200 bg-emerald-50 text-emerald-700",
  Draft:  "border-amber-200 bg-amber-50 text-amber-700",
  Review: "border-blue-200 bg-blue-50 text-blue-700",
}

export function CoursesView() {
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Courses</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your catalog, content lifecycle, and publishing pipeline.</p>
        </div>
        <Link
          href="/teacher/coursebuilder"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Course
        </Link>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: "Active Courses", value: "4", sub: "2 with pending updates", icon: BookOpen },
          { label: "Total Enrolled", value: "252", sub: "+34 this month",        icon: Users },
          { label: "In Draft",       value: "2",   sub: "Ready for review",      icon: PenLine },
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

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border px-5 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course</span>
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:block">Enrolled</span>
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:block">Sessions</span>
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:block">Updated</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>
      </div>

      {/* Course rows */}
      <div className="divide-y divide-border">
        {courses.map((c) => (
          <div key={c.title} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{c.title}</span>
                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusStyle[c.status]}`}>{c.status}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{c.subtitle}</p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">{c.enrolled}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">{c.sessions}</span>
            <span className="hidden text-xs text-muted-foreground sm:block whitespace-nowrap">{c.updated}</span>
            <div className="flex items-center gap-1">
              <Link href="/teacher/coursebuilder" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors" title="Edit">
                <PenLine className="h-3.5 w-3.5" />
              </Link>
              <button type="button" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors" title="Preview">
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors" title="Publish">
                <Rocket className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

