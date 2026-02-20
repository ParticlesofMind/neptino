"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SaveStatusBar, SetupColumn, SetupSection } from "@/components/coursebuilder/layout-primitives"
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
  type StudentRow = { first: string; last: string; email: string; id: string }

  const [method, setMethod] = useState<"upload" | "manual">("upload")
  const [students, setStudents] = useState<StudentRow[]>([])
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [studentId, setStudentId] = useState("")
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

  function addManualStudent() {
    if (!firstName.trim() && !lastName.trim() && !email.trim() && !studentId.trim()) return
    const next: StudentRow = {
      first: firstName.trim(),
      last: lastName.trim(),
      email: email.trim(),
      id: studentId.trim() || `S-${Date.now().toString().slice(-6)}`,
    }
    setStudents((prev) => [...prev, next])
    setFirstName("")
    setLastName("")
    setEmail("")
    setStudentId("")
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

    if (rows.length === 0) return
    setStudents((prev) => [...prev, ...rows])
    setBulkEntry("")
  }

  return (
    <SetupSection title="Students" description="Build or import your student roster.">
      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-2 items-stretch">
        <SetupColumn className="space-y-4">
          <div className="flex flex-col gap-3">
            {(["upload", "manual"] as const).map((m) => (
              <label
                key={m}
                className={`flex items-start gap-3 cursor-pointer rounded-lg border p-4 transition ${
                  method === m ? "border-primary bg-accent" : "border-border hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="student-method"
                  value={m}
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{m === "upload" ? "Upload Roster" : "Manual Entry"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m === "upload" ? "Import from Excel, CSV, PDF, or Word" : "Add students one by one or paste bulk CSV"}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {method === "upload" ? (
            <div>
              <input ref={fileRef} type="file" accept=".csv,.tsv,.xls,.xlsx,.pdf,.docx,.doc" className="sr-only" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                Upload Roster File
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Supported: XLSX, CSV, PDF, DOCX</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>First Name</FieldLabel>
                  <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                </div>
                <div>
                  <FieldLabel>Last Name</FieldLabel>
                  <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@school.org" />
                </div>
                <div>
                  <FieldLabel>Student ID</FieldLabel>
                  <TextInput value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Auto-generated" />
                </div>
              </div>
              <div>
                <FieldLabel hint="optional">Learning Style</FieldLabel>
                <TextInput placeholder="e.g., Visual, Collaborative" />
              </div>
              <button
                type="button"
                onClick={addManualStudent}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
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
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">Format: First, Last, Email, ID, Grade, Learning style</p>
                <button
                  type="button"
                  onClick={addBulkStudents}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/30"
                >
                  Add Bulk Students
                </button>
              </div>
            </div>
          )}
        </SetupColumn>

        <SetupColumn>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-4 border-b border-border bg-muted/60">
              {["First name", "Last name", "Email", "Student ID"].map((h) => (
                <div key={h} className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {h}
                </div>
              ))}
            </div>
            {students.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                No roster loaded yet. Upload or enter students to generate a preview.
              </div>
            ) : (
              students.map((s, i) => (
                <div key={i} className="grid grid-cols-4 border-b border-border last:border-0">
                  {[s.first, s.last, s.email, s.id].map((v, j) => (
                    <div key={j} className="truncate px-3 py-2 text-xs text-foreground">
                      {v}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </SetupColumn>
      </div>
      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}
