"use client"

import type { BlockRenderProps } from "../types"

export function HeaderBlock({ fieldValues }: BlockRenderProps) {
  const title       = fieldValues.course_name   || fieldValues.session_title || ""
  const institution = fieldValues.institution   || ""
  const date        = fieldValues.schedule_date || ""
  const teacher     = fieldValues.teacher_name  || ""

  return (
    <header className="flex h-full items-center justify-between border-b border-neutral-200 bg-white">
      <div className="flex items-center overflow-x-hidden divide-x divide-neutral-200">
        {title ? (
          <span className="px-3 py-2 text-xs font-semibold text-neutral-800 whitespace-nowrap">
            {title}
          </span>
        ) : null}
        {institution ? (
          <span className="px-3 py-2 text-xs text-neutral-500 whitespace-nowrap">
            {institution}
          </span>
        ) : null}
        {!title && !institution && (
          <span className="px-3 py-2 text-xs italic text-neutral-400">Untitled Session</span>
        )}
      </div>
      <div className="shrink-0 flex items-center divide-x divide-neutral-200">
        {teacher ? (
          <span className="px-3 py-2 text-[11px] text-neutral-400 whitespace-nowrap">{teacher}</span>
        ) : null}
        {date ? (
          <span className="px-3 py-2 text-[11px] text-neutral-400 whitespace-nowrap">{date}</span>
        ) : null}
      </div>
    </header>
  )
}
