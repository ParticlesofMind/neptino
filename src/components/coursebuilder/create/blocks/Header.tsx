"use client"

import type { BlockRenderProps } from "../types"

export function HeaderBlock({ fieldValues }: BlockRenderProps) {
  const date = fieldValues["schedule_date"] ?? fieldValues["date"] ?? ""

  // Build the ordered list of header field values to display as pipe-separated items
  const fields: { key: string; value: string }[] = [
    { key: "lesson",       value: fieldValues["lesson_label"]   ?? fieldValues["lesson_title"] ?? fieldValues["title"] ?? "" },
    { key: "session",      value: fieldValues["session_label"]  ?? (fieldValues["session_number"] ? `Session ${fieldValues["session_number"]}` : "") },
    { key: "module",       value: fieldValues["module"]         ?? "" },
    { key: "course_title", value: fieldValues["course_title"]   ?? "" },
    { key: "level",        value: fieldValues["level"]          ?? fieldValues["pedagogy"] ?? "" },
  ].filter((f) => f.value !== "")

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white" style={{ minHeight: 36 }}>
      {/* Field values — pipe-separated */}
      <div className="flex items-center overflow-x-hidden divide-x divide-neutral-200">
        {fields.map((f, i) => (
          <span
            key={f.key}
            className={[
              "px-3 py-2 text-xs whitespace-nowrap",
              i === 0 ? "font-semibold text-neutral-800" : "text-neutral-500",
            ].join(" ")}
          >
            {f.value}
          </span>
        ))}
        {fields.length === 0 && (
          <span className="px-3 py-2 text-xs text-neutral-400 italic">Untitled Session</span>
        )}
      </div>

      {/* Date — right-aligned */}
      {date && (
        <span className="shrink-0 px-4 text-[11px] text-neutral-400">{date}</span>
      )}
    </header>
  )
}
