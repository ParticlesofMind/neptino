"use client"
import { useState } from "react"
import { Globe, Lock, Bell, Settings } from "lucide-react"

export default function AdminSettingsPage() {
  const [security, setSecurity] = useState({
    requireMfa: false,
    enforcePasswordExpiry: true,
    allowSocialLogin: true,
  })

  const [registration, setRegistration] = useState({
    openRegistration: true,
    requireEmailVerification: true,
    allowInstitutionDomains: false,
  })

  const [notifications, setNotifications] = useState({
    newUserAlert: true,
    courseSubmissionAlert: true,
    weeklyReport: false,
  })

  function toggleSec(key: keyof typeof security) {
    setSecurity((p) => ({ ...p, [key]: !p[key] }))
  }
  function toggleReg(key: keyof typeof registration) {
    setRegistration((p) => ({ ...p, [key]: !p[key] }))
  }
  function toggleNotif(key: keyof typeof notifications) {
    setNotifications((p) => ({ ...p, [key]: !p[key] }))
  }

  function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    )
  }

  return (
    <div className="animate-fade-up max-w-2xl space-y-10">

      {/* General */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">General</h2>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {[
            { label: "Platform name", defaultValue: "Neptino" },
            { label: "Support email", defaultValue: "support@neptino.io" },
            { label: "Default language", defaultValue: "English" },
          ].map((field) => (
            <div key={field.label} className="flex items-center justify-between gap-6 px-5 py-4">
              <label className="shrink-0 w-36 text-sm font-medium text-foreground">{field.label}</label>
              <input
                type="text"
                defaultValue={field.defaultValue}
                className="flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
            Save changes
          </button>
        </div>
      </section>

      {/* Security */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Security</h2>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {(
            [
              { key: "requireMfa", label: "Require MFA", description: "Enforce multi-factor authentication for all admin accounts" },
              { key: "enforcePasswordExpiry", label: "Password expiry", description: "Require password rotation every 90 days" },
              { key: "allowSocialLogin", label: "Social login", description: "Allow users to sign in with Google" },
            ] as { key: keyof typeof security; label: string; description: string }[]
          ).map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-6 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              </div>
              <Toggle checked={security[key]} onToggle={() => toggleSec(key)} />
            </div>
          ))}
        </div>
      </section>

      {/* Registration */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Registration</h2>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {(
            [
              { key: "openRegistration", label: "Open registration", description: "Allow anyone to create a student account" },
              { key: "requireEmailVerification", label: "Email verification", description: "Require email confirmation before access" },
              { key: "allowInstitutionDomains", label: "Institution domains only", description: "Restrict registration to approved email domains" },
            ] as { key: keyof typeof registration; label: string; description: string }[]
          ).map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-6 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              </div>
              <Toggle checked={registration[key]} onToggle={() => toggleReg(key)} />
            </div>
          ))}
        </div>
      </section>

      {/* Notifications */}
      <section>
        <div className="mb-5 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Admin Notifications</h2>
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {(
            [
              { key: "newUserAlert", label: "New user registration", description: "Get notified when a new user signs up" },
              { key: "courseSubmissionAlert", label: "Course submission", description: "Get notified when a teacher submits a course for review" },
              { key: "weeklyReport", label: "Weekly platform report", description: "Summary of activity, enrollments, and system health" },
            ] as { key: keyof typeof notifications; label: string; description: string }[]
          ).map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-6 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              </div>
              <Toggle checked={notifications[key]} onToggle={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
