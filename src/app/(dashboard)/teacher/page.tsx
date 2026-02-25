"use client"

import { useMemo, useState } from "react"
import { TeacherSection, TeacherSidebar } from "@/components/layout/teacher-sidebar"
import Link from "next/link"
import { BookOpen, CalendarClock, CircleCheckBig, GraduationCap, MessageSquareText, PlusCircle, Sparkles, Users } from "lucide-react"

export default function TeacherHomePage() {
  const [activeSection, setActiveSection] = useState<TeacherSection>("home")

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

  const panelTitle = useMemo(() => {
    switch (activeSection) {
      case "courses":
        return { title: "Courses", subtitle: "Manage your catalog, content lifecycle, and publishing." }
      case "classes":
        return { title: "Classes", subtitle: "Track classroom operations, sessions, and attendance flow." }
      case "messages":
        return { title: "Messages", subtitle: "Monitor learner conversations and pending replies." }
      case "settings":
        return { title: "Settings", subtitle: "Update profile, preferences, and communication defaults." }
      default:
        return { title: "Home", subtitle: "Overview of your teaching workspace, learner activity, and pending actions." }
    }
  }, [activeSection])

  const HomeView = () => (
    <div className="space-y-7 pb-4">
      <section className="rounded-2xl border border-border bg-background p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Home</h1>
            <p className="mt-1 text-sm text-muted-foreground">Overview of your teaching workspace, learner activity, and pending actions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/teacher/coursebuilder"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              New Course
            </Link>
            <Link
              href="/teacher/courses"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <CalendarClock className="h-4 w-4" />
              View Schedule
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const MetricIcon = metric.icon
          return (
            <article key={metric.label} className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold leading-none text-foreground">{metric.value}</p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                  <MetricIcon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{metric.detail}</p>
            </article>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Courses</h2>
            <button type="button" onClick={() => setActiveSection("courses")} className="text-xs font-medium text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="p-4 space-y-3">
            {courses.map((course) => (
              <Link
                key={course.title}
                href="/teacher/courses"
                className="group block rounded-xl border border-border bg-background px-4 py-3.5 transition hover:border-primary/25 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{course.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{course.meta}</p>
                  </div>
                  <span className={course.status === "Live" ? "rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700" : "rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"}>
                    {course.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{course.updated}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Quick Actions</h2>
          <div className="mt-4 space-y-2.5">
            <Link href="/teacher/coursebuilder" className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors">
              <Sparkles className="h-4 w-4 text-primary" />
              Create new course content
            </Link>
            <button type="button" onClick={() => setActiveSection("messages")} className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted/50 transition-colors">
              <MessageSquareText className="h-4 w-4 text-primary" />
              Reply to learner messages
            </button>
            <button type="button" onClick={() => setActiveSection("classes")} className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted/50 transition-colors">
              <GraduationCap className="h-4 w-4 text-primary" />
              Review submissions
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Recent Activity</h2>
          <button type="button" onClick={() => setActiveSection("messages")} className="text-xs font-medium text-primary hover:underline">
            Open inbox
          </button>
        </div>
        <div className="divide-y divide-border">
          {activity.map((item) => (
            <div key={`${item.text}-${item.time}`} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <p className="text-sm text-foreground">
                <span className="font-medium">{item.text}</span>
                <span className="text-muted-foreground"> — {item.context}</span>
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const GenericView = ({
    title,
    subtitle,
    cards,
  }: {
    title: string
    subtitle: string
    cards: { title: string; body: string }[]
  }) => (
    <div className="space-y-7 pb-4">
      <section className="rounded-2xl border border-border bg-background p-6">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-xl border border-border bg-background p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  )

  const sectionContent = (() => {
    switch (activeSection) {
      case "courses":
        return GenericView({
          title: "Courses",
          subtitle: panelTitle.subtitle,
          cards: [
            { title: "Course Catalog", body: "Browse active and draft courses, and keep content updates centralized." },
            { title: "Publishing Pipeline", body: "Control draft, review, and publish states for each course." },
            { title: "Curriculum Health", body: "Identify missing modules and lesson gaps before publishing." },
          ],
        })
      case "classes":
        return GenericView({
          title: "Classes",
          subtitle: panelTitle.subtitle,
          cards: [
            { title: "Session Roster", body: "Track attendance and learner status across all scheduled sessions." },
            { title: "Upcoming Sessions", body: "Keep your weekly teaching cadence visible and easy to manage." },
            { title: "Submission Queue", body: "Review learner work and provide feedback from one place." },
          ],
        })
      case "messages":
        return GenericView({
          title: "Messages",
          subtitle: panelTitle.subtitle,
          cards: [
            { title: "Priority Inbox", body: "See unanswered learner messages and respond quickly." },
            { title: "Class Channels", body: "Keep class-level communication organized by topic and cohort." },
            { title: "Recent Threads", body: "Continue recent conversations without context switching." },
          ],
        })
      case "settings":
        return GenericView({
          title: "Settings",
          subtitle: panelTitle.subtitle,
          cards: [
            { title: "Profile", body: "Update your teaching profile details and public info." },
            { title: "Notifications", body: "Tune message, enrollment, and assignment alerts." },
            { title: "Class Defaults", body: "Set default preferences for sessions and course behavior." },
          ],
        })
      default:
        return HomeView()
    }
  })()

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-8 overflow-hidden">
      <TeacherSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="no-scrollbar h-full overflow-y-auto">{sectionContent}</div>
      </div>
    </div>
  )
}
