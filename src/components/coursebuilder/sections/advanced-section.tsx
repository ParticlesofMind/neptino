"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SetupSection, deleteCourseById } from "@/components/coursebuilder"

export function AdvancedSection({ courseId }: { courseId: string | null }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!courseId) return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteCourseById(courseId)
    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      return
    }
    router.push("/teacher/courses")
  }

  return (
    <SetupSection title="Advanced Settings" description="Destructive actions and advanced configuration.">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">
          Once you delete a course, there is no going back. Please be certain.
        </p>
        {!confirm ? (
          <button
            type="button"
            disabled={!courseId}
            onClick={() => setConfirm(true)}
            className="rounded-md border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete Course
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-destructive">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-destructive bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete Course"}
              </button>
              <button
                type="button"
                onClick={() => { setConfirm(false); setDeleteError(null) }}
                disabled={deleting}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/30"
              >
                Cancel
              </button>
            </div>
            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
          </div>
        )}
      </div>
    </SetupSection>
  )
}
