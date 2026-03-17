"use client"

import { useState } from "react"
import { Rocket } from "lucide-react"
import { updateCourseById } from "@/components/coursebuilder"
import type { View, CourseCreatedData } from "@/components/coursebuilder/builder-types"

export function LaunchView({
  courseId,
  courseData,
  onSetView,
}: {
  courseId:   string | null
  courseData: CourseCreatedData | null
  onSetView:  (v: View) => void
}) {
  const [launching, setLaunching] = useState(false)
  const [launched,  setLaunched]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const checks = [
    { label: "Course created",       ok: !!courseId },
    { label: "Title set",            ok: !!(courseData?.title  && courseData.title.length  >= 3) },
    { label: "Description added",    ok: !!(courseData?.description && courseData.description.length >= 10) },
    { label: "Language selected",    ok: !!courseData?.language },
    { label: "Course type selected", ok: !!courseData?.courseType },
  ]
  const allPassed = checks.every((c) => c.ok)

  async function handleLaunch() {
    if (!courseId) return
    setLaunching(true); setError(null)
    const { error: err } = await updateCourseById(courseId, {
      visibility_settings: {
        visible: true, enrollment: true, approval: false,
        notifications: true, public_discovery: true,
      },
      updated_at: new Date().toISOString(),
    })
    setLaunching(false)
    if (err) setError(err.message)
    else setLaunched(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Launch Course</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the checklist below, then publish your course to make it visible and open for enrollment.
        </p>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-border bg-background divide-y divide-border overflow-hidden">
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-3">
            <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
              ok ? "bg-[#5c9970]" : "bg-muted border border-border"
            }`}>
              {ok && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 8 8">
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${ok ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {!ok && (
              <button
                type="button"
                onClick={() => onSetView("setup")}
                className="ml-auto text-xs text-primary hover:underline"
              >
                Fix →
              </button>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {launched ? (
        <div className="rounded-md border border-[#5c9970]/30 bg-[#5c9970]/10 px-5 py-4 space-y-1">
          <p className="text-sm font-semibold text-[#5c9970]">
            Course launched successfully!
          </p>
          <p className="text-xs text-[#5c9970]/80">
            Your course is now visible and open for enrollment.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleLaunch}
          disabled={!allPassed || launching || !courseId}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Rocket className="h-4 w-4" />
          {launching ? "Launching…" : "Launch Course"}
        </button>
      )}
    </div>
  )
}
