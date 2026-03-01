"use client"

import type { BlockRenderProps } from "../types"

export function ProjectBlock({ data }: BlockRenderProps) {
  const description = typeof data?.["description"] === "string" ? data["description"] : ""
  const deliverables = Array.isArray(data?.["deliverables"]) ? (data["deliverables"] as string[]) : []

  return (
    <section className="px-4 py-3 space-y-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Project
      </h2>
      {description && (
        <p className="text-xs text-neutral-700 leading-relaxed">{description}</p>
      )}
      {deliverables.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-neutral-500 mb-1">Deliverables</p>
          <ul className="list-disc list-inside space-y-0.5">
            {deliverables.map((item, idx) => (
              <li key={idx} className="text-xs text-neutral-700">{item}</li>
            ))}
          </ul>
        </div>
      )}
      {!description && deliverables.length === 0 && (
        <p className="text-xs text-neutral-400 italic">No project details added.</p>
      )}
    </section>
  )
}
