import Link from "next/link"
import { Eye, PenTool, Plus, Rocket, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { resolveServerInstitutionContext } from "@/lib/institutions/server"

interface Course {
  id: string
  course_name: string
  course_subtitle: string | null
  course_description: string | null
  course_type: string | null
  course_language: string | null
  course_image: string | null
  created_at: string
  institution_id: string | null
}

interface ProgramCourse {
  course_id: string
  sequence_index: number
  required: boolean
  courses: Pick<Course, "id" | "course_name" | "course_subtitle" | "course_image" | "course_type"> | Array<Pick<Course, "id" | "course_name" | "course_subtitle" | "course_image" | "course_type">> | null
}

interface Program {
  id: string
  name: string
  description: string | null
  duration_label: string | null
  created_at: string
  program_courses: ProgramCourse[] | null
}

function programCourse(course: ProgramCourse) {
  return Array.isArray(course.courses) ? course.courses[0] ?? null : course.courses
}

export default async function TeacherCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let courses: Course[] = []
  let programs: Program[] = []
  let fetchError: string | null = null
  let currentInstitutionId: string | null = null

  if (user) {
    const institutionContext = await resolveServerInstitutionContext(supabase, user.id)
    currentInstitutionId = institutionContext.current?.institutionId ?? null

    let courseQuery = supabase
      .from("courses")
      .select("id, course_name, course_subtitle, course_description, course_type, course_language, course_image, created_at, institution_id")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })

    if (currentInstitutionId) {
      courseQuery = courseQuery.eq("institution_id", currentInstitutionId)
    }

    const { data: courseData, error: courseError } = await courseQuery
    if (courseError) fetchError = courseError.message
    else courses = courseData ?? []

    if (currentInstitutionId) {
      const { data: programData, error: programError } = await supabase
        .from("programs")
        .select("id, name, description, duration_label, created_at, program_courses(course_id, sequence_index, required, courses(id, course_name, course_subtitle, course_image, course_type))")
        .eq("institution_id", currentInstitutionId)
        .order("created_at", { ascending: false })

      if (programError) fetchError = fetchError ?? programError.message
      else programs = (programData as Program[] | null) ?? []
    }
  }

  const programCourseIds = new Set(
    programs.flatMap((program) => (program.program_courses ?? []).map((course) => course.course_id)),
  )

  return (
    <div className="space-y-6">
      {fetchError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {fetchError}
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Programs</h2>
          <Link
            href="/teacher/programs/new"
            aria-disabled={!currentInstitutionId}
            className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-primary/30 bg-accent px-3 text-sm font-medium text-primary transition hover:border-primary ${
              currentInstitutionId ? "" : "pointer-events-none opacity-50"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Program
          </Link>
        </div>
        {programs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-5 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No programs yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Create one, then place courses into it from Classification setup.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {programs.map((program) => {
              const orderedCourses = (program.program_courses ?? []).slice().sort((a, b) => a.sequence_index - b.sequence_index)
              const firstCourse = orderedCourses[0] ? programCourse(orderedCourses[0]) : null
              return (
                <div key={program.id} className="rounded-lg border border-border bg-background p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground">{program.name}</h3>
                      {program.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{program.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {orderedCourses.length} courses
                    </span>
                  </div>
                  {orderedCourses.length > 0 ? (
                    <div className="mt-4 divide-y divide-border rounded-md border border-border">
                      {orderedCourses.slice(0, 5).map((programCourseRow) => {
                        const course = programCourse(programCourseRow)
                        return (
                          <Link
                            key={`${program.id}-${programCourseRow.course_id}`}
                            href={course ? `/teacher/coursebuilder?id=${course.id}` : "/teacher/courses"}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-muted/40"
                          >
                            <span className="truncate text-foreground">
                              {programCourseRow.sequence_index}. {course?.course_name ?? "Untitled course"}
                            </span>
                            {!programCourseRow.required && (
                              <span className="text-[11px] text-muted-foreground">Optional</span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      No courses placed yet.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {firstCourse && (
                      <Link
                        href={`/teacher/coursebuilder?id=${firstCourse.id}`}
                        className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                      >
                        Open first course
                      </Link>
                    )}
                    <Link
                      href="/teacher/coursebuilder"
                      className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      Create course for program
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Courses</h2>
          <Link
            href="/teacher/coursebuilder"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-primary/30 bg-accent px-3 text-sm font-medium text-primary transition hover:border-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Course
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background py-10 text-center">
            <p className="text-sm font-medium text-foreground">No courses yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first course to get started.
            </p>
            <Link
              href="/teacher/coursebuilder"
              className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-primary/30 bg-accent px-3 text-sm font-medium text-primary transition hover:border-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Course
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-background p-3">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(300px,360px))]">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background transition hover:border-primary/30"
                >
                  <Link href={`/teacher/coursebuilder?id=${course.id}`} className="block">
                    <div className={`relative aspect-[5/4] w-full ${course.course_image ? "overflow-hidden" : "flex items-center justify-center bg-muted/50"}`}>
                      {course.course_image ? (
                        <img
                          src={course.course_image}
                          alt={course.course_name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-xs italic text-muted-foreground/40">No image</span>
                      )}
                    </div>

                    <div className="space-y-2 p-3 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium leading-snug text-foreground line-clamp-2">
                          {course.course_name}
                        </h3>
                        {course.course_type && (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {course.course_type}
                          </span>
                        )}
                      </div>
                      {course.course_subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{course.course_subtitle}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {programCourseIds.has(course.id) ? (
                          <span className="rounded-full border border-primary/20 bg-accent px-2 py-0.5 text-[10px] text-primary">
                            In program
                          </span>
                        ) : (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                            Standalone
                          </span>
                        )}
                        {course.course_language && (
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                            {course.course_language}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(course.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="mt-auto grid grid-cols-4 divide-x divide-border border-t border-border">
                    {[
                      { view: "setup", label: "Setup", icon: Settings },
                      { view: "create", label: "Create", icon: PenTool },
                      { view: "preview", label: "Preview", icon: Eye },
                      { view: "launch", label: "Launch", icon: Rocket },
                    ].map(({ view, label, icon: Icon }) => (
                      <Link
                        key={view}
                        href={`/teacher/coursebuilder?id=${course.id}&view=${view}`}
                        className="flex flex-col items-center justify-center gap-1 py-2 text-muted-foreground transition hover:bg-accent hover:text-primary"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium">{label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
