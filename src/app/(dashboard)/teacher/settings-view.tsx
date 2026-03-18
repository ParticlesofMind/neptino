"use client"

import { Bell, Briefcase, Globe, Settings, User } from "lucide-react"

const notificationRows = [
  { label: "New enrollment",       description: "When a learner enrolls in one of your courses",     enabled: true },
  { label: "Assignment submitted", description: "When a learner submits work for review",            enabled: true },
  { label: "Message received",     description: "New message from a learner or colleague",           enabled: true },
  { label: "Course published",     description: "Confirmation when a course goes live",             enabled: false },
  { label: "Weekly summary",       description: "Digest of learner activity and progress",           enabled: true },
]

function TogglePill({ enabled }: { enabled: boolean }) {
  return (
    <div className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${enabled ? "left-4" : "left-0.5"}`} />
    </div>
  )
}

export function SettingsView() {
  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-background overflow-hidden">

      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Update profile, preferences, and communication defaults.</p>
        </div>
      </div>

      {/* Profile */}
      <div className="border-b border-border px-6 py-5">
        <h2 className="mb-4 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <User className="h-3.5 w-3.5" /> Profile
        </h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-base font-semibold text-primary">N</div>
          <div>
            <p className="text-sm font-medium text-foreground">Profile photo</p>
            <p className="text-xs text-muted-foreground">Shown on your public courses and learner dashboards</p>
          </div>
          <button type="button" className="ml-auto rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors">Upload</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "First name",    value: "Alex" },
            { label: "Last name",     value: "Chen" },
            { label: "Display name", value: "Alex Chen" },
            { label: "Email",         value: "alex.chen@neptino.app" },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block font-sans text-xs font-medium text-muted-foreground mb-1">{label}</label>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className="block font-sans text-xs font-medium text-muted-foreground mb-1">Bio</label>
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground h-14 flex items-start">
            Educator and software engineer. Teaching data, JS, and Python fundamentals.
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <h2 className="flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </h2>
        </div>
        <div className="divide-y divide-border border-t border-border">
          {notificationRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.description}</p>
              </div>
              <TogglePill enabled={row.enabled} />
            </div>
          ))}
        </div>
      </div>

      {/* Class Defaults */}
      <div className="px-6 py-5">
        <h2 className="mb-4 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" /> Class Defaults
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Default session length", value: "90 minutes",  icon: Settings },
            { label: "Session capacity",        value: "30 learners", icon: Settings },
            { label: "Teaching language",       value: "English",     icon: Globe },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
