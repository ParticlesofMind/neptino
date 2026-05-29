"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, LogIn, UserPlus } from "lucide-react"
import { PublicShell } from "@/components/layout/public-shell"
import { buttonVariants } from "@/components/ui/button"
import { createClient, getSupabaseClientConfigError } from "@/lib/supabase/client"

type JoinStatus = "checking" | "joining" | "joined" | "teacher" | "unavailable" | "signed-out" | "error"

type CourseJoinRow = {
  id: string
  course_name: string
  course_description: string | null
  teacher_id: string | null
  institution_id: string | null
  visibility_settings: Record<string, unknown> | null
}

type UserProfileRow = {
  email: string | null
  first_name: string | null
  last_name: string | null
}

function isEnrollmentOpen(course: CourseJoinRow | null) {
  const settings = course?.visibility_settings ?? {}
  return settings.visible === true && settings.enrollment === true
}

function safeNextPath(courseId: string) {
  return `/join/${encodeURIComponent(courseId)}?source=launch`
}

export default function JoinCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  const [course, setCourse] = useState<CourseJoinRow | null>(null)
  const [status, setStatus] = useState<JoinStatus>("checking")
  const [message, setMessage] = useState<string | null>(null)
  const configError = getSupabaseClientConfigError()

  const loginHref = useMemo(() => {
    if (!courseId) return "/login"
    return `/login?next=${encodeURIComponent(safeNextPath(courseId))}`
  }, [courseId])

  const signupHref = useMemo(() => {
    if (!courseId) return "/signup"
    return `/signup?intent=join_course&next=${encodeURIComponent(safeNextPath(courseId))}`
  }, [courseId])

  useEffect(() => {
    if (!courseId) return

    let cancelled = false

    async function loadAndJoin() {
      if (configError) {
        setStatus("error")
        setMessage(configError)
        return
      }

      setStatus("checking")
      setMessage(null)

      const supabase = createClient()
      const { data: courseRow, error: courseError } = await supabase
        .from("courses")
        .select("id, course_name, course_description, teacher_id, institution_id, visibility_settings")
        .eq("id", courseId)
        .maybeSingle()

      if (cancelled) return

      if (courseError) {
        setStatus("error")
        setMessage(courseError.message)
        return
      }

      const loadedCourse = (courseRow as CourseJoinRow | null) ?? null
      setCourse(loadedCourse)

      if (!loadedCourse || !isEnrollmentOpen(loadedCourse)) {
        setStatus("unavailable")
        return
      }

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (cancelled) return

      if (authError || !authData.user) {
        setStatus("signed-out")
        return
      }

      if (loadedCourse.teacher_id === authData.user.id) {
        setStatus("teacher")
        return
      }

      setStatus("joining")

      const { data: profileRow } = await supabase
        .from("users")
        .select("email, first_name, last_name")
        .eq("id", authData.user.id)
        .maybeSingle()

      if (cancelled) return

      const profile = (profileRow as UserProfileRow | null) ?? null
      const firstName = profile?.first_name?.trim() ?? ""
      const lastName = profile?.last_name?.trim() ?? ""
      const email = profile?.email?.trim() || authData.user.email || ""
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || email || "Student"
      const joinedAt = new Date().toISOString()
      const joinedVia = new URLSearchParams(window.location.search).get("source") || "link"

      if (loadedCourse.institution_id) {
        const { error: membershipError } = await supabase
          .from("institution_memberships")
          .upsert(
            {
              institution_id: loadedCourse.institution_id,
              user_id: authData.user.id,
              role: "student",
              status: "active",
              joined_at: joinedAt,
            },
            { onConflict: "institution_id,user_id,role" },
          )

        if (cancelled) return

        if (membershipError) {
          setStatus("error")
          setMessage(membershipError.message)
          return
        }
      }

      const { error: enrollmentError } = await supabase
        .from("enrollments")
        .upsert(
          {
            course_id: loadedCourse.id,
            student_id: authData.user.id,
            status: "active",
            enrolled_at: joinedAt,
            metadata: {
              display_name: displayName,
              email,
              first_name: firstName,
              last_name: lastName,
              joined_via: joinedVia,
              last_joined_at: joinedAt,
            },
          },
          { onConflict: "student_id,course_id" },
        )

      if (cancelled) return

      if (enrollmentError) {
        setStatus("error")
        setMessage(enrollmentError.message)
        return
      }

      setStatus("joined")
    }

    void loadAndJoin()

    return () => {
      cancelled = true
    }
  }, [configError, courseId])

  const title = course?.course_name ?? "Course launch"
  const description = course?.course_description ?? "Open the course invitation to join this session."

  return (
    <PublicShell hideNavActions>
      <div className="flex min-h-[calc(100vh-3.75rem-56px)] items-center justify-center bg-muted/30 px-4 py-14">
        <div className="w-full max-w-xl rounded-xl border border-border bg-background p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Join course</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          {status === "checking" || status === "joining" ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-foreground">{status === "joining" ? "Adding you to the course..." : "Checking course access..."}</p>
            </div>
          ) : status === "joined" ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-[#5c9970]/30 bg-[#5c9970]/10 px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5c9970]" />
                <div>
                  <p className="text-sm font-semibold text-[#447856]">You are in.</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#447856]/80">
                    Your teacher can now see you in the launch roster.
                  </p>
                </div>
              </div>
              <Link href="/student/courses" className={buttonVariants({ variant: "primary", size: "md", className: "w-full" })}>
                Go to my courses
              </Link>
            </div>
          ) : status === "teacher" ? (
            <div className="space-y-5">
              <p className="rounded-lg border border-border bg-muted/20 px-4 py-4 text-sm text-foreground">
                You are signed in as this course teacher.
              </p>
              <Link href={`/teacher/coursebuilder?id=${courseId}&view=launch`} className={buttonVariants({ variant: "primary", size: "md", className: "w-full" })}>
                Return to launch
              </Link>
            </div>
          ) : status === "signed-out" ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-border bg-muted/20 px-4 py-4 text-sm leading-relaxed text-foreground">
                Sign in or create an account to join this course.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href={loginHref} className={buttonVariants({ variant: "primary", size: "md" })}>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
                <Link href={signupHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                  <UserPlus className="h-4 w-4" />
                  Sign up
                </Link>
              </div>
            </div>
          ) : status === "unavailable" ? (
            <p className="rounded-lg border border-border bg-muted/20 px-4 py-4 text-sm leading-relaxed text-foreground">
              This course is not open for enrollment yet. Ask your teacher to launch it again.
            </p>
          ) : (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-4 text-sm text-destructive">
              {message ?? "Unable to join this course."}
            </p>
          )}
        </div>
      </div>
    </PublicShell>
  )
}
