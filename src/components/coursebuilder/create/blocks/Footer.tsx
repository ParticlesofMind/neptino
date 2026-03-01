"use client"

import { TEMPLATE_BLUEPRINTS } from "@/lib/curriculum/template-json-blueprints"
import type { BlockRenderProps } from "../types"

export function FooterBlock({ fieldValues, templateType = "lesson", fieldEnabled }: BlockRenderProps) {
  const blueprint = TEMPLATE_BLUEPRINTS[templateType]

  if (!blueprint) return null

  const enabledMap = fieldEnabled?.footer
  const visibleLeft  = blueprint.footer.left.filter((f)  => !enabledMap || enabledMap[f.key] === true)
  const visibleRight = blueprint.footer.right.filter((f) => !enabledMap || enabledMap[f.key] === true)

  const leftText  = visibleLeft
    .map((f) => fieldValues[f.key] || f.label)
    .filter(Boolean)
    .join(" \u00b7 ")
  const rightText = visibleRight
    .map((f) => f.key === "page_number"
      ? (fieldValues[f.key] || "1")
      : (fieldValues[f.key] || f.label))
    .filter(Boolean)
    .join(" ")

  return (
    <footer className="flex h-full items-center justify-between px-4 border-t border-neutral-200 text-[10px] text-neutral-400">
      <span>{leftText}</span>
      <span>{rightText}</span>
    </footer>
  )
}
