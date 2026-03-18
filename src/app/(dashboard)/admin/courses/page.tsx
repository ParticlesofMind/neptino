"use client"
import { useState } from "react"
import { Search, PlusCircle } from "lucide-react"
import Link from "next/link"

type CourseStatus = "live" | "draft" | "pending"

type AdminCourse = {
  id: string
  title: string
  teacher: string
  enrolled: number
  status: CourseStatus
  updated: string
}

const COURSES: AdminCourse[] = [
  { id: "1", title: "Advanced JavaScript", teacher: "James Park", enrolled: 42, status: "live", updated: "3 days ago" },
  { id: "2", title: "Python for Data Analysis", teacher: "Dr. Anna Mueller", enrolled: 85, status: "live", updated: "1 day ago" },
  { id: "3", title: "Data Visualization 101", teacher: "Dr. Anna Mueller", enrolled: 26, status: "draft", updated: "5 hours ago" },
  { id: "4", title: "Statistics for Beginners", teacher: "Prof. Sarah Lin", enrolled: 60, status: "live", updated: "1 week ago" },
  { id: "5", title: "Introduction to Machine Learning", teacher: "Thomas Weber", enrolled: 0, status: "pending", updated: "2 days ago" },
  { id: "6", title: "Calculus I", teacher: "Prof. Sarah Lin", enrolled: 0, status: "pending", updated: "Today" },
  { id: "7", title: "Web Development Basics", teacher: "James Park", enrolled: 38, status: "live", updated: "4 days ago" },
  { id: "8", title: "Database Design", teacher: "Thomas Weber", enrolled: 0, status: "draft", updated: "Yesterday" },
]

const STATUS_FILTERS: Array<{ value: CourseStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending review" },
]

const statusStyle: Record<CourseStatus, { bg: string; color: string; label: string }> = {
  live: { bg: "#5c9970", color: "#fff", label: "Live" },
  draft: { bg: "var(--muted-foreground)", color: "#fff", label: "Draft" },
  pending: { bg: "#a89450", color: "#fff", label: "Pending" },
}

export default function AdminCoursesPage() {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all")

  const filtered = COURSES.filter((c) => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter
    const matchesQuery =
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.teacher.toLowerCase().includes(query.toLowerCase())
    return matchesStatus && matchesQuery
  })

  const pendingCount = COURSES.filter((c) => c.status === "pending").length

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Courses", value: String(COURSES.length) },
          { label: "Published", value: String(COURSES.filter((c) => c.status === "live").length) },
          { label: "Pending Review", value: String(pendingCount) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-background px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters + add button */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-border bg-muted py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link
          href="/teacher/coursebuilder"
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          New Course
        </Link>
      </div>

      {/* Course list */}
      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-muted">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Course</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Teacher</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Enrolled</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Updated</p>
          </div>

          {filtered.length === 0 && (
            <p className="px-5 py-8 text-sm text-muted-foreground">No courses match your filters.</p>
          )}

          {filtered.map((course) => (
            <div key={course.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3.5">
              <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
              <p className="text-sm text-muted-foreground whitespace-nowrap">{course.teacher}</p>
              <p className="text-sm text-muted-foreground text-right">{course.enrolled}</p>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: statusStyle[course.status].bg, color: statusStyle[course.status].color }}
              >
                {statusStyle[course.status].label}
              </span>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{course.updated}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
