"use client"

import { FieldLabel } from "@/components/coursebuilder"
import type { CourseCreatedData } from "@/components/coursebuilder/builder-types"

export function PreviewView({ courseData }: { courseData: CourseCreatedData | null }) {
  if (!courseData?.title) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <p className="text-sm font-medium text-foreground">Nothing to preview yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete the Setup section to see your course preview.
        </p>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm">
        {courseData.imageUrl ? (
          <div className="h-56 overflow-hidden">
            <img src={courseData.imageUrl} alt={courseData.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center bg-muted/50">
            <span className="text-xs italic text-muted-foreground/40">No cover image</span>
          </div>
        )}
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{courseData.title}</h1>
            {courseData.subtitle && (
              <p className="mt-1 text-base text-muted-foreground">{courseData.subtitle}</p>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{courseData.description}</p>
          <div className="flex flex-wrap gap-2">
            {courseData.language && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {courseData.language}
              </span>
            )}
            {courseData.courseType && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {courseData.courseType}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-5">
        <FieldLabel>Student Experience Preview</FieldLabel>
        <p className="text-sm text-muted-foreground">
          This is a simplified preview. The full student experience — including the lesson canvas, assignments,
          and assessments — will be available once the course is launched.
        </p>
      </div>
    </div>
  )
}
