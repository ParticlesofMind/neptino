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
  Live:   "border-[#5c9970]/30 bg-[#5c9970]/10 text-[#5c9970]",
  Draft:  "border-[#a89450]/30 bg-[#a89450]/10 text-[#a89450]",
  Review: "border-primary/20 bg-primary/10 text-primary",
}

export function CoursesView() {
  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-background overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Courses</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your catalog, content lifecycle, and publishing pipeline.</p>
        </div>
        <Link
          href="/teacher/coursebuilder"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
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
          <div key={label} className="px-6 py-5">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold leading-none tabular-nums text-foreground">{value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border px-5 py-3.5">
        <span className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course</span>
        <span className="hidden font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:block">Enrolled</span>
        <span className="hidden font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:block">Sessions</span>
        <span className="hidden font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:block">Updated</span>
        <span className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</span>
      </div>

      {/* Course rows */}
      <div className="divide-y divide-border">
        {courses.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">No courses yet.</p>
            <a href="/teacher/coursebuilder" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Create your first course</a>
          </div>
        ) : courses.map((c) => (
          <div key={c.title} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{c.title}</span>
                <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${statusStyle[c.status]}`}>{c.status}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{c.subtitle}</p>
            </div>
            <span className="hidden text-xs text-muted-foreground sm:block">{c.enrolled}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">{c.sessions}</span>
            <span className="hidden text-xs text-muted-foreground sm:block whitespace-nowrap">{c.updated}</span>
            <div className="flex items-center gap-1">
              <Link href="/teacher/coursebuilder" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60" title="Edit">
                <PenLine className="h-3.5 w-3.5" />
              </Link>
              <button type="button" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60" title="Preview">
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60" title="Publish">
                <Rocket className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

