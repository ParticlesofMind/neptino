"use client"

import type { BlockRenderProps } from "../types"

export function HeaderBlock({ fieldValues, fieldEnabled }: BlockRenderProps) {
  const fe = fieldEnabled?.header

  // Required fields are always shown; optional fields respect fieldEnabled.
  // Default to visible when no fieldEnabled config is present.
  const showCourseName  = fe ? (fe["course_name"]   ?? true)  : true
  const showTeacher     = fe ? (fe["teacher_name"]   ?? true)  : true
  const showInstitution = fe ? (fe["institution"]    ?? false) : true
  const showDate        = fe ? (fe["schedule_date"]  ?? false) : true

  const title       = showCourseName ? (fieldValues.course_name || fieldValues.session_title || "") : (fieldValues.session_title || "")
  const institution = showInstitution ? (fieldValues.institution || "") : ""
  const date        = showDate        ? (fieldValues.schedule_date || "") : ""
  const teacher     = showTeacher     ? (fieldValues.teacher_name || "") : ""

  return (
    <header className="flex h-full min-w-0 items-center justify-between border-b border-border bg-background">
      <div className="flex min-w-0 flex-1 items-center overflow-hidden divide-x divide-border">
        {title ? (
          <span className="min-w-0 truncate px-3 py-2 text-xs font-semibold text-foreground whitespace-nowrap">
            {title}
          </span>
        ) : null}
        {institution ? (
          <span className="min-w-0 truncate px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
            {institution}
          </span>
        ) : null}
        {!title && !institution && (
          <span className="px-3 py-2 text-xs italic text-muted-foreground">Untitled Session</span>
        )}
      </div>
      <div className="shrink-0 flex items-center divide-x divide-border">
        {teacher ? (
          <span className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{teacher}</span>
        ) : null}
        {date ? (
          <span className="px-3 py-2 text-[11px] text-muted-foreground whitespace-nowrap">{date}</span>
        ) : null}
      </div>
    </header>
  )
}
