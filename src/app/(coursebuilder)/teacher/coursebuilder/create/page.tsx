"use client"

/**
 * /teacher/coursebuilder/create?courseId=<uuid>
 *
 * Thin route wrapper — reads courseId from the URL and delegates to
 * CreateEditorLayout, which is also embedded inside the main wizard.
 */

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { CreateEditorLayout } from "@/components/coursebuilder/create/CreateEditorLayout"

function CreatePageInner() {
  const courseId = useSearchParams().get("courseId")

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <CreateEditorLayout courseId={courseId} />
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  )
}
