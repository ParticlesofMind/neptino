"use client"

// Template section — placeholder. Will be rebuilt from scratch.
export type { TemplateType } from "@/lib/curriculum/template-blocks"
export { TEMPLATE_TYPES } from "./template-section-data"
export type { BlockId, TemplateFieldState } from "./template-section-data"

export function TemplatesSection({ courseId: _courseId }: { courseId: string | null }) {
  return (
    <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
      Template system coming soon.
    </div>
  )
}
