"use client"
import { useState } from "react"
import { User, Bell, Globe, Lock } from "lucide-react"

const LANGUAGES = [
  "English", "German", "French", "Spanish", "Italian",
  "Portuguese", "Dutch", "Polish", "Swedish", "Norwegian",
]

export default function StudentSettingsPage() {
  const [notifications, setNotifications] = useState({
    newMessage: true,
    assignmentFeedback: true,
    courseUpdates: false,
    weeklyDigest: false,
  })

  function toggle(key: keyof typeof notifications) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="max-w-2xl space-y-10">

      {/* Profile */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
        </div>

        {/* Avatar row */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            JS
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Jane Student</p>
            <button type="button" className="mt-0.5 text-xs text-primary hover:underline">
              Change photo
            </button>
          </div>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {[
            { label: "Display name", type: "text", defaultValue: "Jane Student" },
            { label: "Email address", type: "email", defaultValue: "jane@example.com" },
          ].map((field) => (
            <div key={field.label} className="flex items-center justify-between gap-6 px-5 py-3.5">
              <label className="shrink-0 text-sm font-medium text-foreground w-32">{field.label}</label>
              <input
                type={field.type}
                defaultValue={field.defaultValue}
                className="flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </section>

      {/* Language */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Language</h2>
        </div>
        <div className="rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between gap-6 px-5 py-3.5">
            <label className="shrink-0 text-sm font-medium text-foreground w-32">Interface language</label>
            <select className="flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-primary/50 focus:outline-none">
              {LANGUAGES.map((lang) => (
                <option key={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {(
            [
              { key: "newMessage", label: "New messages", description: "When a teacher or classmate sends you a message" },
              { key: "assignmentFeedback", label: "Assignment feedback", description: "When an instructor grades or comments on your work" },
              { key: "courseUpdates", label: "Course updates", description: "When new lessons or materials are added to enrolled courses" },
              { key: "weeklyDigest", label: "Weekly digest", description: "A summary of your activity and upcoming deadlines" },
            ] as { key: keyof typeof notifications; label: string; description: string }[]
          ).map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-6 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications[key]}
                onClick={() => toggle(key)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                  notifications[key] ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    notifications[key] ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Account */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Account</h2>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Update your account password</p>
            </div>
            <button type="button" className="text-xs font-medium text-primary hover:underline">
              Change password
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">Delete account</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Permanently remove your account and all data</p>
            </div>
            <button type="button" className="text-xs font-medium text-[#b87070] hover:underline">
              Delete
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
