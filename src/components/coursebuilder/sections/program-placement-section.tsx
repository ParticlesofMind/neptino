"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { FieldLabel, SelectInput, TextInput } from "@/components/coursebuilder"
import { createClient } from "@/lib/supabase/client"
import { OverlineLabel } from "@/components/ui/overline-label"

type ProgramRow = {
  id: string
  name: string
  description: string | null
  duration_label: string | null
}

type CourseOption = {
  id: string
  course_name: string
}

type ProgramCourseRow = {
  id: string
  program_id: string
  course_id: string
  sequence_index: number
  required: boolean
  courses: CourseOption | CourseOption[] | null
}

function nestedCourse(row: ProgramCourseRow): CourseOption | null {
  return Array.isArray(row.courses) ? row.courses[0] ?? null : row.courses
}

function uniqueCourseIds(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    if (!value || seen.has(value)) return
    seen.add(value)
    result.push(value)
  })

  return result
}

export function buildProgramSequenceIds(input: {
  currentCourseId: string
  previousCourseId: string
  nextCourseId: string
  existingRows: ProgramCourseRow[]
}): string[] {
  const existingIds = input.existingRows
    .slice()
    .sort((a, b) => a.sequence_index - b.sequence_index)
    .map((row) => row.course_id)
    .filter((id) => id !== input.currentCourseId && id !== input.previousCourseId && id !== input.nextCourseId)

  if (input.previousCourseId) {
    return uniqueCourseIds([
      input.previousCourseId,
      input.currentCourseId,
      input.nextCourseId,
      ...existingIds,
    ])
  }

  if (input.nextCourseId) {
    return uniqueCourseIds([
      input.currentCourseId,
      input.nextCourseId,
      ...existingIds,
    ])
  }

  return uniqueCourseIds([...existingIds, input.currentCourseId])
}

export function ProgramPlacementSection({
  courseId,
  institutionId,
  teacherId,
  currentCourseTitle,
}: {
  courseId: string | null
  institutionId: string | null
  teacherId: string | null
  currentCourseTitle: string | null
}) {
  const [mode, setMode] = useState<"standalone" | "program">("standalone")
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState("")
  const [newProgramName, setNewProgramName] = useState("")
  const [previousCourseId, setPreviousCourseId] = useState("")
  const [nextCourseId, setNextCourseId] = useState("")
  const [programRows, setProgramRows] = useState<ProgramCourseRow[]>([])
  const [placementId, setPlacementId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? null
  const availableCourseOptions = useMemo(
    () => courseOptions.filter((course) => course.id !== courseId),
    [courseId, courseOptions],
  )

  const loadCatalog = useCallback(async () => {
    if (!courseId || !institutionId) return

    const supabase = createClient()
    const [programResult, courseResult, placementResult] = await Promise.all([
      supabase
        .from("programs")
        .select("id, name, description, duration_label")
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false }),
      supabase
        .from("courses")
        .select("id, course_name")
        .eq("institution_id", institutionId)
        .order("course_name", { ascending: true }),
      supabase
        .from("program_courses")
        .select("id, program_id, course_id, sequence_index, required, courses(id, course_name)")
        .eq("course_id", courseId)
        .order("sequence_index", { ascending: true }),
    ])

    if (programResult.error) setError(programResult.error.message)
    else setPrograms((programResult.data as ProgramRow[] | null) ?? [])

    if (courseResult.error) setError(courseResult.error.message)
    else setCourseOptions((courseResult.data as CourseOption[] | null) ?? [])

    if (placementResult.error) {
      setError(placementResult.error.message)
      return
    }

    const placement = ((placementResult.data as ProgramCourseRow[] | null) ?? [])[0]
    if (!placement) {
      setPlacementId(null)
      setSelectedProgramId("")
      setMode("standalone")
      return
    }

    setPlacementId(placement.id)
    setSelectedProgramId(placement.program_id)
    setMode("program")
  }, [courseId, institutionId])

  const loadProgramRows = useCallback(async (programId: string) => {
    if (!programId) {
      setProgramRows([])
      return
    }

    const supabase = createClient()
    const { data, error: rowsError } = await supabase
      .from("program_courses")
      .select("id, program_id, course_id, sequence_index, required, courses(id, course_name)")
      .eq("program_id", programId)
      .order("sequence_index", { ascending: true })

    if (rowsError) {
      setError(rowsError.message)
      return
    }

    const rows = (data as ProgramCourseRow[] | null) ?? []
    setProgramRows(rows)

    const currentIndex = rows.findIndex((row) => row.course_id === courseId)
    if (currentIndex >= 0) {
      setPreviousCourseId(rows[currentIndex - 1]?.course_id ?? "")
      setNextCourseId(rows[currentIndex + 1]?.course_id ?? "")
    } else {
      setPreviousCourseId("")
      setNextCourseId("")
    }
  }, [courseId])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  useEffect(() => {
    void loadProgramRows(selectedProgramId)
  }, [loadProgramRows, selectedProgramId])

  async function rewriteProgramSequence(programId: string, courseIds: string[]) {
    const supabase = createClient()
    const { error: deleteError } = await supabase
      .from("program_courses")
      .delete()
      .eq("program_id", programId)

    if (deleteError) throw new Error(deleteError.message)

    const inserts = courseIds.map((id, index) => ({
      program_id: programId,
      course_id: id,
      sequence_index: index + 1,
      required: true,
    }))

    if (inserts.length === 0) return

    const { error: insertError } = await supabase
      .from("program_courses")
      .insert(inserts)

    if (insertError) throw new Error(insertError.message)
  }

  async function handleSavePlacement() {
    if (!courseId || !institutionId) return

    setSaving(true)
    setStatus(null)
    setError(null)

    try {
      const supabase = createClient()
      let programId = selectedProgramId

      if (!programId) {
        const name = newProgramName.trim()
        if (!name) {
          setError("Select a program or enter a new program name.")
          return
        }

        const { data, error: createError } = await supabase
          .from("programs")
          .insert({
            institution_id: institutionId,
            name,
            description: `${name} is a program sequence. Students enroll in the program; teaching happens through its courses.`,
            created_by: teacherId,
          })
          .select("id")
          .single()

        if (createError) throw new Error(createError.message)
        programId = data.id as string
        setSelectedProgramId(programId)
        setNewProgramName("")
      }

      const freshRowsResult = await supabase
        .from("program_courses")
        .select("id, program_id, course_id, sequence_index, required, courses(id, course_name)")
        .eq("program_id", programId)
        .order("sequence_index", { ascending: true })

      if (freshRowsResult.error) throw new Error(freshRowsResult.error.message)

      const sequenceIds = buildProgramSequenceIds({
        currentCourseId: courseId,
        previousCourseId,
        nextCourseId,
        existingRows: (freshRowsResult.data as ProgramCourseRow[] | null) ?? [],
      })

      await rewriteProgramSequence(programId, sequenceIds)
      setMode("program")
      setStatus("Program placement saved.")
      await loadCatalog()
      await loadProgramRows(programId)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save program placement.")
    } finally {
      setSaving(false)
    }
  }

  async function handleStandalone() {
    if (!placementId || !selectedProgramId) {
      setMode("standalone")
      return
    }

    setSaving(true)
    setStatus(null)
    setError(null)

    try {
      const remainingIds = programRows
        .filter((row) => row.course_id !== courseId)
        .sort((a, b) => a.sequence_index - b.sequence_index)
        .map((row) => row.course_id)

      await rewriteProgramSequence(selectedProgramId, remainingIds)
      setPlacementId(null)
      setSelectedProgramId("")
      setPreviousCourseId("")
      setNextCourseId("")
      setProgramRows([])
      setMode("standalone")
      setStatus("Course is now standalone.")
      await loadCatalog()
    } catch (standaloneError) {
      setError(standaloneError instanceof Error ? standaloneError.message : "Failed to update program placement.")
    } finally {
      setSaving(false)
    }
  }

  if (!courseId) {
    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-sm text-muted-foreground">Save Essentials before adding program placement.</p>
      </div>
    )
  }

  if (!institutionId) {
    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Save Essentials with an institution before adding this course to a program.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background p-5 space-y-4">
      <div>
        <OverlineLabel className="mb-2">Program Placement</OverlineLabel>
        <p className="text-sm text-muted-foreground">
          Courses are taught. Programs are enrollment and progression containers for two or more courses.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleStandalone}
          disabled={saving}
          className={`rounded-md border px-3 py-2 text-left text-sm transition ${
            mode === "standalone"
              ? "border-primary/50 bg-accent text-primary"
              : "border-border bg-background text-foreground hover:border-primary/30"
          }`}
        >
          Standalone course
        </button>
        <button
          type="button"
          onClick={() => setMode("program")}
          disabled={saving}
          className={`rounded-md border px-3 py-2 text-left text-sm transition ${
            mode === "program"
              ? "border-primary/50 bg-accent text-primary"
              : "border-border bg-background text-foreground hover:border-primary/30"
          }`}
        >
          Part of a program
        </button>
      </div>

      {mode === "program" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Select Program</FieldLabel>
              <SelectInput value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)}>
                <option value="">Create or select...</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel hint="Used when no program is selected">New Program Name</FieldLabel>
              <TextInput
                value={newProgramName}
                onChange={(event) => setNewProgramName(event.target.value)}
                placeholder={currentCourseTitle ? `${currentCourseTitle} Program` : "Program name"}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel hint="Optional course reference">Preceding Course</FieldLabel>
              <SelectInput value={previousCourseId} onChange={(event) => setPreviousCourseId(event.target.value)}>
                <option value="">None selected</option>
                {availableCourseOptions
                  .filter((course) => course.id !== nextCourseId)
                  .map((course) => (
                    <option key={course.id} value={course.id}>{course.course_name}</option>
                  ))}
              </SelectInput>
            </div>
            <div>
              <FieldLabel hint="Optional course reference">Succeeding Course</FieldLabel>
              <SelectInput value={nextCourseId} onChange={(event) => setNextCourseId(event.target.value)}>
                <option value="">None selected</option>
                {availableCourseOptions
                  .filter((course) => course.id !== previousCourseId)
                  .map((course) => (
                    <option key={course.id} value={course.id}>{course.course_name}</option>
                  ))}
              </SelectInput>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSavePlacement}
              disabled={saving}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Program Placement"}
            </button>
            {selectedProgram && (
              <span className="text-xs text-muted-foreground">
                Current program: <span className="font-medium text-foreground">{selectedProgram.name}</span>
              </span>
            )}
          </div>

          {programRows.length > 0 && (
            <div className="rounded-md border border-border bg-muted/20">
              <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                Program Sequence
              </div>
              <div className="divide-y divide-border">
                {programRows.map((row) => {
                  const course = nestedCourse(row)
                  const isCurrent = row.course_id === courseId
                  return (
                    <div key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className={isCurrent ? "font-medium text-primary" : "text-foreground"}>
                        {row.sequence_index}. {course?.course_name ?? "Untitled course"}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full border border-primary/20 bg-accent px-2 py-0.5 text-[11px] text-primary">
                          This course
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {status && <p className="text-xs text-primary">{status}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
