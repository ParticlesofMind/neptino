"use client"

import { useState } from "react"
import { TeacherSection, TeacherSidebar, SECTION_LABELS } from "@/components/layout/teacher-sidebar"
import Link from "next/link"
import { BookOpen, CalendarClock, CircleCheckBig, GraduationCap, Menu, MessageSquareText, PlusCircle, Sparkles, Users, X } from "lucide-react"
import { CoursesView } from "./courses-view"
import { ClassesView } from "./classes-view"
import { MessagesView } from "./messages-view"
import { SettingsView } from "./settings-view"

export default function TeacherHomePage() {
  const [activeSection, setActiveSection] = useState<TeacherSection>("home")
  const [sidebarOpen, setSidebarOpen] = useState(false)


  const metrics = [
    {
      label: "Active Courses",
      value: "5",
      detail: "+1 this month",
      icon: BookOpen,
    },
    {
      label: "Total Students",
      value: "127",
      detail: "+12 this week",
      icon: Users,
    },
    {
      label: "Unread Messages",
      value: "8",
      detail: "3 require response",
      icon: MessageSquareText,
    },
    {
      label: "Pending Reviews",
      value: "12",
      detail: "4 due today",
      icon: CircleCheckBig,
    },
  ]

  const courses = [
    {
      title: "Advanced JavaScript",
      meta: "42 enrolled · 8 lessons",
      status: "Live",
      updated: "Updated 3 days ago",
    },
    {
      title: "Python for Data Analysis",
      meta: "85 enrolled · 12 lessons",
      status: "Live",
      updated: "Updated 1 day ago",
    },
    {
      title: "Data Visualization 101",
      meta: "26 enrolled · 6 lessons",
      status: "Draft",
      updated: "Updated 5 hours ago",
    },
  ]

  const activity = [
    { text: "3 assignments submitted", context: "Advanced JavaScript", time: "2h ago" },
    { text: "5 new enrollments", context: "Python for Data Analysis", time: "6h ago" },
    { text: "Course published", context: "Data Visualization 101", time: "Yesterday" },
    { text: "2 student questions", context: "Module: Data Models", time: "Yesterday" },
  ]

  const placeholder = (title: string, subtitle: string) => (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center justify-center px-6 py-20">
        <p className="text-sm text-muted-foreground">This section is under development.</p>
      </div>
    </div>
  )

  const HomeView = () => (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Home</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Overview of your teaching workspace, learner activity, and pending actions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/teacher/coursebuilder"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
          >
            <PlusCircle className="h-4 w-4" />
            New Course
          </Link>
          <Link
            href="/teacher/courses"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
          >
            <CalendarClock className="h-4 w-4" />
            View Schedule
          </Link>
        </div>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border lg:grid-cols-4">
        {metrics.map((metric) => {
          const MetricIcon = metric.icon
          return (
            <div key={metric.label} className="px-5 py-5">
              <div className="flex items-center gap-2">
                <MetricIcon className="h-3.5 w-3.5 text-primary" />
                <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
              </div>
              <p className="mt-2 font-sans text-2xl font-semibold leading-none tabular-nums text-foreground">{metric.value}</p>
              <p className="mt-1.5 font-sans text-xs text-muted-foreground">{metric.detail}</p>
            </div>
          )
        })}
      </div>

      {/* Courses + Quick Actions */}
      <div className="grid border-b border-border xl:grid-cols-[1.5fr_1fr] xl:divide-x xl:divide-border">
        <div>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">Courses</h2>
            <button type="button" onClick={() => setActiveSection("courses")} className="text-xs font-medium text-primary hover:underline transition-all rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/60">
              View all
            </button>
          </div>
          <div className="divide-y divide-border">
            {courses.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">No courses yet.</p>
                <a href="/teacher/coursebuilder" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Create your first course</a>
              </div>
            ) : courses.map((course) => (
              <Link
                key={course.title}
                href="/teacher/courses"
                className="group flex items-start justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary/60"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{course.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{course.meta}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{course.updated}</p>
                </div>
                <span className={course.status === "Live" ? "mt-0.5 shrink-0 rounded-md border border-[#5c9970]/30 bg-[#5c9970]/10 px-2 py-1 text-xs font-medium text-[#5c9970]" : "mt-0.5 shrink-0 rounded-md border border-[#a89450]/30 bg-[#a89450]/10 px-2 py-1 text-xs font-medium text-[#a89450]"}>
                  {course.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
          <div className="mt-3 space-y-3">
            <Link href="/teacher/coursebuilder" className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground hover:bg-muted/40 hover:border-primary/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
              <Sparkles className="h-4 w-4 text-primary" />
              Create new course content
            </Link>
            <button type="button" onClick={() => setActiveSection("messages")} className="flex w-full items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted/40 hover:border-primary/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
              <MessageSquareText className="h-4 w-4 text-primary" />
              Reply to learner messages
            </button>
            <button type="button" onClick={() => setActiveSection("classes")} className="flex w-full items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted/40 hover:border-primary/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
              <GraduationCap className="h-4 w-4 text-primary" />
              Review submissions
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
          <button type="button" onClick={() => setActiveSection("messages")} className="text-xs font-medium text-primary hover:underline transition-all rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/60">
            Open inbox
          </button>
        </div>
        <div className="divide-y divide-border">
          {activity.length === 0 ? (
            <p className="animate-fade-in px-5 py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
          ) : activity.map((item) => (
            <div key={`${item.text}-${item.time}`} className="flex items-center justify-between gap-4 px-5 py-4">
              <p className="min-w-0 truncate text-sm text-foreground">
                <span className="font-medium">{item.text}</span>
                <span className="text-muted-foreground"> — {item.context}</span>
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const sectionContent = (() => {
    switch (activeSection) {
      case "courses":       return <CoursesView />
      case "classes":       return <ClassesView />
      case "messages":      return <MessagesView />
      case "settings":      return <SettingsView />
      case "analytics":     return placeholder("Analytics",     "Insights into learner performance and course engagement.")
      case "calendar":      return placeholder("Calendar",      "Your upcoming sessions and scheduled events.")
      case "lessons":       return placeholder("Lessons",       "Browse and manage individual lesson content.")
      case "templates":     return placeholder("Templates",     "Reusable course blueprints and layout presets.")
      case "resources":     return placeholder("Resources",     "Supplementary materials, reading lists, and files.")
      case "students":      return placeholder("Students",      "Directory of enrolled learners across all courses.")
      case "submissions":   return placeholder("Submissions",   "Review and grade submitted work from learners.")
      case "announcements": return placeholder("Announcements", "Broadcast updates and notices to your classes.")
      case "earnings":      return placeholder("Earnings",      "Track revenue, payouts, and enrollment payments.")
      default:              return <HomeView />
    }
  })()

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="animate-slide-in-left absolute inset-y-0 left-0 flex w-72 flex-col overflow-hidden bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-sans text-sm font-semibold text-foreground">Navigation</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setSidebarOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto p-3">
              <TeacherSidebar
                activeSection={activeSection}
                onSectionChange={(s) => {
                  setActiveSection(s)
                  setSidebarOpen(false)
                }}
                className="w-full"
              />
            </div>
          </aside>
        </div>
      )}

      <div className="flex h-[calc(100vh-6rem)] gap-5 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <TeacherSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          {/* Mobile section breadcrumb bar */}
          <div className="mb-4 flex items-center gap-3 md:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-sans text-sm font-medium text-foreground hover:bg-muted/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
            >
              <Menu className="h-4 w-4" />
              {SECTION_LABELS[activeSection]}
            </button>
          </div>

          <div className="no-scrollbar h-full overflow-y-auto">{sectionContent}</div>
        </div>
      </div>
    </>
  )
}
