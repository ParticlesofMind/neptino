import Link from "next/link"
import { PenTool, Settings, Eye, Rocket } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

interface Course {
  id: string
  course_name: string
  course_subtitle: string | null
  course_description: string | null
  course_type: string | null
  course_language: string | null
  course_image: string | null
  created_at: string
}

export default async function TeacherCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let courses: Course[] = []
  let fetchError: string | null = null

  if (user) {
    const { data, error } = await supabase
      .from("courses")
      .select("id, course_name, course_subtitle, course_description, course_type, course_language, course_image, created_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })

    if (error) fetchError = error.message
    else courses = data ?? []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your course library.</p>
        </div>
        <Link
          href="/teacher/coursebuilder"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
        >
          <PenTool className="h-3.5 w-3.5" />
          Create Course
        </Link>
      </div>

      {fetchError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {fetchError}
        </p>
      )}

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">No courses yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first course to get started.
          </p>
          <Link
            href="/teacher/coursebuilder"
            className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            <PenTool className="h-3.5 w-3.5" />
            Create Course
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group flex flex-col rounded-lg border border-border bg-background overflow-hidden hover:border-primary/30 transition"
            >
              {/* Clickable top area → goes to setup */}
              <Link
                href={`/teacher/coursebuilder?id=${course.id}`}
                className="block"
              >
                {/* Cover image */}
                <div className={`relative h-64 ${course.course_image ? "overflow-hidden" : "flex items-center justify-center bg-muted/50"}`}>
                  {course.course_image ? (
                    <img
                      src={course.course_image}
                      alt={course.course_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-xs italic text-muted-foreground/40">No image</span>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground leading-snug line-clamp-2">
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
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
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

              {/* Navigation buttons */}
              <div className="grid grid-cols-4 border-t border-border divide-x divide-border mt-auto">
                {[
                  { view: "setup",   label: "Setup",   icon: Settings },
                  { view: "create",  label: "Create",  icon: PenTool  },
                  { view: "preview", label: "Preview", icon: Eye      },
                  { view: "launch",  label: "Launch",  icon: Rocket   },
                ].map(({ view, label, icon: Icon }) => (
                  <Link
                    key={view}
                    href={`/teacher/coursebuilder?id=${course.id}&view=${view}`}
                    className="flex flex-col items-center justify-center gap-1 py-2 text-muted-foreground hover:bg-accent hover:text-primary transition"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

