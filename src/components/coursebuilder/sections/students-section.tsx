"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DANGER_ACTION_BUTTON_SM_CLASS,
  PRIMARY_ACTION_BUTTON_CLASS,
  SECONDARY_ACTION_BUTTON_CLASS,
  SetupColumn,
  SetupPanelLayout,
  SetupSection,
} from "@/components/coursebuilder/layout-primitives"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
    />
  )
}

export function StudentsSection({ courseId }: { courseId: string | null }) {
  type StudentRow = {
    first: string
    last: string
    email: string
    id: string
    learningStyle?: string
    learningDifferences?: string
    accommodations?: string
  }

  const [method, setMethod] = useState<"upload" | "manual">("upload")
  const [students, setStudents] = useState<StudentRow[]>([])
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [learningStyle, setLearningStyle] = useState("")
  const [learningDifferences, setLearningDifferences] = useState("unknown")
  const [accommodations, setAccommodations] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkEntry, setBulkEntry] = useState("")
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("students_overview")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (error || !data?.students_overview) return
        const overview = data.students_overview as Record<string, unknown>
        const loadedMethod = overview.method
        const loadedStudents = overview.students
        if (loadedMethod === "upload" || loadedMethod === "manual") {
          setMethod(loadedMethod)
        }
        if (Array.isArray(loadedStudents)) {
          setStudents(
            loadedStudents
              .map((s) => s as Record<string, unknown>)
              .map((s) => ({
                first: String(s.first ?? ""),
                last: String(s.last ?? ""),
                email: String(s.email ?? ""),
                id: String(s.id ?? ""),
              }))
              .filter((s) => s.first || s.last || s.email || s.id),
          )
        }
      })
  }, [courseId])

  const persistStudents = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const payload = {
      method,
      total: students.length,
      synced: students.length,
      students,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from("courses")
      .update({
        students_overview: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)

    if (error) {
      setSaveStatus("error")
    } else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, method, students])

  useDebouncedChangeSave(persistStudents, 800, Boolean(courseId))

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  function addManualStudent() {
    if (!firstName.trim() && !lastName.trim() && !email.trim()) return
    if (!isValidEmail(email.trim())) {
      setEmailError("Enter a valid email address.")
      return
    }
    setEmailError(null)
    const next: StudentRow = {
      first: firstName.trim(),
      last: lastName.trim(),
      email: email.trim(),
      id: `S-${crypto.randomUUID().slice(0, 8)}`,
      learningStyle: learningStyle || undefined,
      learningDifferences: learningDifferences !== "unknown" ? learningDifferences : undefined,
      accommodations: accommodations.trim() || undefined,
    }
    setStudents((prev) => [...prev, next])
    setFirstName("")
    setLastName("")
    setEmail("")
    setLearningStyle("")
    setLearningDifferences("unknown")
    setAccommodations("")
  }

  function addBulkStudents() {
    const rows = bulkEntry
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(",").map((part) => part.trim()))
      .map(([first = "", last = "", emailValue = "", id = ""]) => ({
        first,
        last,
        email: emailValue,
        id: id || `S-${crypto.randomUUID().slice(0, 8)}`,
      }))
      .filter((s) => s.first || s.last || s.email || s.id)

    const invalidCount = rows.filter((row) => row.email && !isValidEmail(row.email)).length
    if (invalidCount > 0) {
      setBulkError(`Remove or fix ${invalidCount} invalid email(s).`)
      return
    }
    setBulkError(null)

    if (rows.length === 0) return
    setStudents((prev) => [...prev, ...rows])
    setBulkEntry("")
  }

  function removeStudent(index: number) {
    setStudents((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <SetupSection
      title="Students"
      description="Build or import your student roster."
      headerActions={(
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMethod("manual")}
            className={PRIMARY_ACTION_BUTTON_CLASS}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("upload")
              fileRef.current?.click()
            }}
            className={SECONDARY_ACTION_BUTTON_CLASS}
          >
            Upload Roster
          </button>
        </div>
      )}
    >
      <SetupPanelLayout>
        <SetupColumn className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <input ref={fileRef} type="file" accept=".csv,.tsv,.xls,.xlsx,.pdf,.docx,.doc" className="sr-only" />
            <p className="text-center text-xs text-muted-foreground">Supported: XLSX, CSV, PDF, DOCX</p>
            <div>
              <p className="text-sm font-medium text-foreground">Manual Entry</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add students one by one or paste bulk CSV.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>First Name</FieldLabel>
                <TextInput
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  disabled={method !== "manual"}
                />
              </div>
              <div>
                <FieldLabel>Last Name</FieldLabel>
                <TextInput
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  disabled={method !== "manual"}
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@school.org"
                  disabled={method !== "manual"}
                />
                {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
              </div>
            </div>
            <div>
              <FieldLabel>Learning Style Preference</FieldLabel>
              <select
                value={learningStyle}
                onChange={(e) => setLearningStyle(e.target.value)}
                disabled={method !== "manual"}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary disabled:opacity-60"
              >
                <option value="">Select preference...</option>
                <option value="visual">Visual</option>
                <option value="auditory">Auditory</option>
                <option value="reading_writing">Reading/Writing</option>
                <option value="kinesthetic">Kinesthetic</option>
                <option value="mixed">Mixed/No strong preference</option>
              </select>
            </div>
            <div>
              <FieldLabel>Learning Differences</FieldLabel>
              <select
                value={learningDifferences}
                onChange={(e) => setLearningDifferences(e.target.value)}
                disabled={method !== "manual"}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary disabled:opacity-60"
              >
                <option value="unknown">Unknown/Not provided</option>
                <option value="none">None</option>
                <option value="identified">Identified learning differences</option>
                <option value="accommodations">IEP/504 accommodations</option>
              </select>
            </div>
            {(learningDifferences === "identified" || learningDifferences === "accommodations") && (
              <div>
                <FieldLabel hint="optional">Accommodations & Notes</FieldLabel>
                <textarea
                  rows={3}
                  value={accommodations}
                  onChange={(e) => setAccommodations(e.target.value)}
                  placeholder="e.g., extended time, reduced reading load, assistive tech"
                  disabled={method !== "manual"}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none disabled:opacity-60"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setMethod("manual")
                addManualStudent()
              }}
              disabled={method !== "manual"}
              className={PRIMARY_ACTION_BUTTON_CLASS}
            >
              Add Student
            </button>
            <div className="rounded-md border border-dashed border-border p-3">
              <FieldLabel>Bulk Entry</FieldLabel>
              <textarea
                rows={3}
                value={bulkEntry}
                onChange={(e) => setBulkEntry(e.target.value)}
                placeholder={"Jane,Doe,jane@school.org,12345\nJohn,Smith,john@school.org,12346"}
                disabled={method !== "manual"}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none disabled:opacity-60"
              />
              <p className="mt-1 text-xs text-muted-foreground">Format: First, Last, Email, optional ID</p>
              {bulkError && <p className="mt-1 text-xs text-destructive">{bulkError}</p>}
              <button
                type="button"
                onClick={() => {
                  setMethod("manual")
                  addBulkStudents()
                }}
                disabled={method !== "manual"}
                className={`${SECONDARY_ACTION_BUTTON_CLASS} mt-2`}
              >
                Add Bulk Students
              </button>
            </div>
          </div>
        </SetupColumn>

        <SetupColumn>
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="grid grid-cols-4 border-b border-border bg-muted/40 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">First Name</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Last Name</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Action</p>
            </div>
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {students.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No roster loaded yet. Upload or enter students to generate a preview.
                </div>
              ) : (
                students.map((student, index) => (
                  <div key={`${student.id}-${index}`} className="grid grid-cols-4 items-center gap-2 px-3 py-2">
                    <p className="truncate text-xs font-medium text-foreground">{student.first || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{student.last || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{student.email || "—"}</p>
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => removeStudent(index)}
                        className={`${DANGER_ACTION_BUTTON_SM_CLASS} !px-2 !py-1 text-[11px]`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}
