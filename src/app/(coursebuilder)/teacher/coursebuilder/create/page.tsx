"use client"

/**
 * /teacher/coursebuilder/create?courseId=<uuid>
 *
 * Redirect shim — normalizes legacy create links to the canonical
 * /teacher/coursebuilder?id=<uuid>&view=create route.
 */

import { Suspense } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

function CreatePageInner() {
  const router = useRouter()
  const courseId = useSearchParams().get("courseId")

  useEffect(() => {
    const next = new URLSearchParams(window.location.search)
    next.delete("courseId")
    if (courseId) next.set("id", courseId)
    next.set("view", "create")

    const query = next.toString()
    router.replace(`/teacher/coursebuilder${query ? `?${query}` : ""}`)
  }, [courseId, router])

  return (
    <div className="flex flex-col h-screen overflow-x-visible overflow-y-hidden">
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-muted-foreground">Opening create editor…</span>
      </div>
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
