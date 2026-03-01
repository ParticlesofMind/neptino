"use client"

import { TEMPLATE_BLUEPRINTS } from "@/lib/curriculum/template-json-blueprints"
import type { BlockRenderProps } from "../types"

export function HeaderBlock({ fieldValues, templateType = "lesson", fieldEnabled }: BlockRenderProps) {
  const blueprint = TEMPLATE_BLUEPRINTS[templateType]

  if (!blueprint) {
    // No blueprint for this type — bare fallback
    return (
      <header className="flex h-full items-center border-b border-neutral-200 bg-white">
        <span className="px-3 py-2 text-xs italic text-neutral-400">Untitled Session</span>
      </header>
    )
  }

  const enabledMap = fieldEnabled?.header
  // Show a field if no fieldEnabled map exists or if it is explicitly enabled
  const visibleLeft  = blueprint.header.left.filter((f)  => !enabledMap || enabledMap[f.key] === true)
  const visibleRight = blueprint.header.right.filter((f) => !enabledMap || enabledMap[f.key] === true)

  return (
    <header className="flex h-full items-center justify-between border-b border-neutral-200 bg-white">
      <div className="flex items-center overflow-x-hidden divide-x divide-neutral-200">
        {visibleLeft.map((field, idx) => (
          <span
            key={field.key}
            className={`px-3 py-2 text-xs whitespace-nowrap ${
              idx === 0 ? "font-semibold text-neutral-800" : "text-neutral-500"
            }`}
          >
            {fieldValues[field.key] || field.label}
          </span>
        ))}
        {visibleLeft.length === 0 && (
          <span className="px-3 py-2 text-xs italic text-neutral-400">Untitled Session</span>
        )}
      </div>
      <div className="shrink-0 flex items-center divide-x divide-neutral-200">
        {visibleRight.map((field) => (
          <span key={field.key} className="px-3 py-2 text-[11px] text-neutral-400 whitespace-nowrap">
            {fieldValues[field.key] || field.label}
          </span>
        ))}
      </div>
    </header>
  )
}
