#!/usr/bin/env python3
"""
Split template-blueprint.tsx into 4 focused modules:
  template-blueprint-types.tsx       — Types, context, utility fns
  template-blueprint-media.tsx       — resolveEmbedUrl, MediaPreview, TaskAreaDropZone
  template-blueprint-slot-views.tsx  — SlotSectionLabel + all static slot views
  template-blueprint-live.tsx        — LiveNestedSlot, BlueprintBodySlot, MarginBand
  template-blueprint.tsx             — JsonTemplatePreview + TemplateBlueprint (public API)
"""
import re

MAIN = "src/components/coursebuilder/template-blueprint.tsx"

with open(MAIN) as f:
    src = f.read()

lines = src.splitlines(keepends=True)
print(f"Original: {len(lines)} lines")

# ── Locate each section boundary using unique search strings ──
def find_line(pattern: str, src: str) -> int:
    """Return 0-based line number of first line containing pattern."""
    for i, line in enumerate(src.splitlines()):
        if pattern in line:
            return i
    raise ValueError(f"Pattern not found: {pattern!r}")

types_start      = find_line("export interface TemplateAreaMediaItem {", src)
media_start      = find_line("function resolveEmbedUrl(url: string): string | null {", src)
slot_views_start = find_line("function SlotSectionLabel({ children }: { children: React.ReactNode }) {", src)
live_start       = find_line("function LiveNestedSlot({", src)
main_start       = find_line("export function JsonTemplatePreview({", src)

print(f"types_start: {types_start}")
print(f"media_start: {media_start}")
print(f"slot_views_start: {slot_views_start}")
print(f"live_start: {live_start}")
print(f"main_start: {main_start}")

all_lines = src.splitlines(keepends=True)

def extract_lines(start: int, end: int) -> str:
    return "".join(all_lines[start:end])

# ── Keep the original imports block (lines 1–14 in original, indices 0–?)
# Original imports end before "interface TemplateBlueprintProps {"
props_start = find_line("interface TemplateBlueprintProps {", src)
# 'export interface TemplateAreaMediaItem' is the first line of the types block
types_block      = extract_lines(types_start,      media_start)
media_block      = extract_lines(media_start,      slot_views_start)
slot_views_block = extract_lines(slot_views_start, live_start)
live_block       = extract_lines(live_start,       main_start)
main_block       = extract_lines(main_start,       len(all_lines))

# Also keep TemplateBlueprintProps + useDroppable import in main
props_block = extract_lines(props_start, types_start)  # interleaved useDroppable import + props

# ── File 1: template-blueprint-types.tsx ──
TYPES_FILE = "src/components/coursebuilder/template-blueprint-types.tsx"
types_content = '''\
"use client"
// Types, context, and utility functions shared across template-blueprint modules.

import React from "react"
import type { BlockId } from "@/components/coursebuilder/sections/templates-section"

''' + types_block

# Export the context and SCALE_CONFIG in types file
types_content = types_content.replace(
    "const SCALE_CONFIG = {",
    "export const SCALE_CONFIG = {"
)
types_content = types_content.replace(
    "const TemplateBlueprintContext = ",
    "export const TemplateBlueprintContext = "
)
types_content = types_content.replace(
    "interface TemplateBlueprintContextValue {",
    "export interface TemplateBlueprintContextValue {"
)

types_content = types_content.replace(
    "function useTemplateBlueprintContext()",
    "export function useTemplateBlueprintContext()"
)

with open(TYPES_FILE, "w") as f:
    f.write(types_content)
print(f"Wrote {TYPES_FILE}: {len(types_content.splitlines())} lines")

# ── File 2: template-blueprint-media.tsx ──
MEDIA_FILE = "src/components/coursebuilder/template-blueprint-media.tsx"
# Remove the trailing comment that starts slot-views section
media_content_raw = media_block
# Strip the "JSON Blueprint Renderer" comment block that ends media section
renderer_comment_start = media_content_raw.find("// ─── JSON Blueprint Renderer")
if renderer_comment_start != -1:
    media_content_raw = media_content_raw[:renderer_comment_start]

media_content = '''\
"use client"
// Media preview and drop-zone components for template-blueprint.

import React from "react"
import { useDroppable } from "@dnd-kit/core"
import type { TemplateAreaMediaItem } from "./template-blueprint-types"

''' + media_content_raw

media_content = media_content.replace("\nfunction MediaPreview(", "\nexport function MediaPreview(")
media_content = media_content.replace("\nfunction TaskAreaDropZone(", "\nexport function TaskAreaDropZone(")

with open(MEDIA_FILE, "w") as f:
    f.write(media_content)
print(f"Wrote {MEDIA_FILE}: {len(media_content.splitlines())} lines")

# ── File 3: template-blueprint-slot-views.tsx ──
SLOT_FILE = "src/components/coursebuilder/template-blueprint-slot-views.tsx"
slot_content = '''\
"use client"
// Static slot view components used in the JSON-driven blueprint renderer.

import React from "react"

''' + slot_views_block

for fn_name in [
    "SlotSectionLabel", "TableSlotView", "NestedSlotView", "ScoringRubricView",
    "TocListView", "CertificateBodyView", "DiscussionPromptView",
    "ReflectionJournalView", "SurveyFormView",
]:
    slot_content = slot_content.replace(f"\nfunction {fn_name}(", f"\nexport function {fn_name}(")

with open(SLOT_FILE, "w") as f:
    f.write(slot_content)
print(f"Wrote {SLOT_FILE}: {len(slot_content.splitlines())} lines")

# ── File 4: template-blueprint-live.tsx ──
LIVE_FILE = "src/components/coursebuilder/template-blueprint-live.tsx"
live_content = '''\
"use client"
// Live (data-driven) canvas components: LiveNestedSlot, BlueprintBodySlot, MarginBand.

import React from "react"
import {
  useTemplateBlueprintContext,
  buildStableTaskKey,
  buildTaskAreaKey,
  type TemplateBlueprintData,
  type TaskAreaKind,
} from "./template-blueprint-types"
import { TaskAreaDropZone } from "./template-blueprint-media"
import {
  SlotSectionLabel,
  NestedSlotView,
  TableSlotView,
  ScoringRubricView,
  TocListView,
  CertificateBodyView,
  DiscussionPromptView,
  ReflectionJournalView,
  SurveyFormView,
} from "./template-blueprint-slot-views"
import { slotToBlockId, type BodySlot } from "@/lib/curriculum/template-json-blueprints"
import type { BlockId } from "@/components/coursebuilder/sections/templates-section"

''' + live_block

for fn_name in ["LiveNestedSlot", "BlueprintBodySlot", "MarginBand"]:
    live_content = live_content.replace(f"\nfunction {fn_name}(", f"\nexport function {fn_name}(")

with open(LIVE_FILE, "w") as f:
    f.write(live_content)
print(f"Wrote {LIVE_FILE}: {len(live_content.splitlines())} lines")

# ── Rewrite main template-blueprint.tsx ──
# Keep: original imports (lines 1 to props_start-1, minus useDroppable which moves to media)
# Keep: TemplateBlueprintProps (props_block)
# Add: imports from the 4 new files
# Keep: JsonTemplatePreview + TemplateBlueprint (main_block)

original_imports = extract_lines(0, props_start)
# Remove 'import { useDroppable } from "@dnd-kit/core"' from original imports (it moves to media)
original_imports_clean = original_imports.replace('\nimport { useDroppable } from "@dnd-kit/core"\n', '\n')

new_main_content = original_imports_clean + '''
import {
  TemplateBlueprintContext,
  SCALE_CONFIG,
  type TemplateAreaMediaItem,
  type TaskAreaKind,
  type TemplateBlueprintData,
} from "./template-blueprint-types"
import { BlueprintBodySlot, MarginBand } from "./template-blueprint-live"
'''
# props_block may still contain the stray useDroppable import — remove it
props_block_clean = props_block.replace('\nimport { useDroppable } from "@dnd-kit/core"\n', '\n')
new_main_content += props_block_clean + main_block

with open(MAIN, "w") as f:
    f.write(new_main_content)
main_lines = new_main_content.splitlines()
print(f"Rewrote {MAIN}: {len(main_lines)} lines")
print("Done")
