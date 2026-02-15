"use client";

import * as React from "react";
import Link from "next/link";

import { TeacherShell } from "@/components/layouts/teacher-shell";
import { cn } from "@/lib/utils";

const sections = [
  { key: "home", label: "Home" },
  { key: "classes", label: "Classes" },
  { key: "students", label: "Students" },
  { key: "messages", label: "Messages" },
  { key: "calendar", label: "Calendar" },
] as const;

type SectionKey = (typeof sections)[number]["key"];

export default function TeacherHomePage() {
  const [activeSection, setActiveSection] = React.useState<SectionKey>("home");

  return (
    <TeacherShell activePath="/teacher/home">
      <main className="flex w-full flex-1">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 flex-col overflow-y-auto border-r border-border bg-background md:flex">
          <nav className="flex-1 px-3 py-6">
            <h3 className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Menu
            </h3>
            <ul className="flex flex-col gap-2">
              {sections.map((section) => (
                <li key={section.key}>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-sm px-4 py-3 text-sm font-medium transition-colors",
                      activeSection === section.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                  >
                    <span className="truncate">{section.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {activeSection === "home" && (
            <section className="space-y-6">
              <header>
                <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
              </header>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                  { label: "Active Courses", value: "5" },
                  { label: "Total Students", value: "127" },
                  { label: "Pending Reviews", value: "12" },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-lg border border-border bg-card p-6 shadow-sm"
                  >
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-3 text-3xl font-bold text-foreground">{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
                  <Link
                    className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    href="/teacher/coursebuilder"
                  >
                    Create new course content
                  </Link>
                </div>
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Activity</h3>
                  <a className="text-sm font-medium text-primary hover:text-primary/80" href="#submissions">
                    View latest student submissions
                  </a>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Messages</h3>
                <a className="text-sm font-medium text-primary hover:text-primary/80" href="#messages">
                  8 unread messages
                </a>
              </div>
            </section>
          )}

          {activeSection === "classes" && (
            <section className="space-y-6">
              <header>
                <h2 className="text-3xl font-bold text-foreground">Classes</h2>
              </header>
              <div className="space-y-6">
                {[
                  {
                    title: "Manage your courses",
                    body: "View and edit all your courses",
                  },
                  { title: "Course Analytics", body: "View performance metrics" },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
                    <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Create Course</h3>
                  <button className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                    Start a new course
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeSection === "messages" && (
            <section className="space-y-6">
              <header>
                <h2 className="text-3xl font-bold text-foreground">Messages</h2>
              </header>
              <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">Loading messaging interface...</p>
              </div>
            </section>
          )}

          {activeSection === "students" && (
            <section className="space-y-6">
              <header>
                <h2 className="text-3xl font-bold text-foreground">Students</h2>
              </header>
              <div className="space-y-6">
                {[
                  {
                    title: "Student Management",
                    body: "View and manage your enrolled students",
                  },
                  {
                    title: "Student Progress",
                    body: "Track individual student progress and performance",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
                    <h3 className="mb-2 text-lg font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === "calendar" && (
            <section className="space-y-6">
              <header>
                <h2 className="text-3xl font-bold text-foreground">Calendar</h2>
              </header>
              <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  View your teaching schedule and important dates
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
    </TeacherShell>
  );
}
