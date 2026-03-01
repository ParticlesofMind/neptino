"use client"

import type { BlockRenderProps } from "../types"

export function ProjectBlock({ data }: BlockRenderProps) {
  const description = typeof data?.["description"] === "string" ? data["description"] : ""
  const deliverables = Array.isArray(data?.["deliverables"]) ? (data["deliverables"] as string[]) : []

  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-2 py-1">
        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">Project</h2>
      </div>
      <div className="bg-white px-3 py-2 space-y-2">
        {description && (
          <p className="text-xs text-neutral-700 leading-relaxed">{description}</p>
        )}
        {deliverables.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-1">Deliverables</p>
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
      </div>
    </section>
  )
}
