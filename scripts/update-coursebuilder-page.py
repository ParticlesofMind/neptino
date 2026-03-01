#!/usr/bin/env python3
"""
Update coursebuilder/page.tsx to import from page-section-registry.tsx
and remove the now-extracted declarations.
"""

PATH = "src/app/(coursebuilder)/teacher/coursebuilder/page.tsx"

with open(PATH) as f:
    src = f.read()

lines = src.splitlines()
print(f"Before: {len(lines)} lines")

# ─── 1: Add import from page-section-registry after the existing imports ───
# The block to delete starts just before "type SectionId = string" and ends
# at the closing "}" of Placeholder function.

REGISTRY_IMPORT = '''import {
  SectionId, SectionGroup, SectionItem,
  VIEW_SEQUENCE, VIEW_LABELS,
  isView, getPrevView, getNextView,
  hasText,
  SECTIONS, SETUP_SECTION_IDS, ALL_SECTION_IDS, isSectionId,
  Placeholder,
} from "./page-section-registry"
'''

# Add this import after the last existing import line
last_import_line = -1
for i, line in enumerate(lines):
    if line.startswith("import "):
        last_import_line = i

lines.insert(last_import_line + 1, REGISTRY_IMPORT)
src = "\n".join(lines)

# ─── 2: Remove extracted declarations ───

# Remove the view navigation helpers comment + extracted block
# From "// ─── View navigation helpers" to end of Placeholder function
start_marker = "\n\n// ─── View navigation helpers ──────────────────────────────────────────────────"
end_marker   = "\n// ─── Section router ───────────────────────────────────────────────────────────"

start_idx = src.find(start_marker)
end_idx   = src.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"ERROR: block not found. start={start_idx}, end={end_idx}")
    # Try alternate markers
    start_marker2 = "\n\n\n// ─── View navigation helpers"
    start_idx = src.find(start_marker2)
    print(f"Retried start: {start_idx}")
    if start_idx == -1:
        # find "type SectionId = string" directly
        start_idx = src.find("\ntype SectionId = string")
        print(f"Found SectionId at: {start_idx}")
    if end_idx == -1:
        end_marker = "\n// ─── Section router"
        end_idx = src.find(end_marker)
        print(f"Retried end: {end_idx}")

if start_idx != -1 and end_idx != -1:
    src = src[:start_idx] + "\n" + src[end_idx:]
    print("Removed extracted block")
else:
    print("WARNING: Could not remove block automatically")

# ─── 3: Remove the duplicate lucide-react icon imports that are now in registry ───
ICONS_TO_REMOVE = [
    "  Brain,", "  FileText,", "  AlignJustify,", "  Users,",
    "  BookOpen,", "  LayoutTemplate,", "  Calendar,", "  BookMarked,",
    "  Eye,", "  Store,", "  DollarSign,", "  Plug,",
    "  MessageSquare,", "  Layers,", "  Monitor,", "  Palette,",
    "  Smile,", "  Bell,", "  Database,", "  Settings,",
]
for icon_line in ICONS_TO_REMOVE:
    src = src.replace(icon_line + "\n", "", 1)

with open(PATH, "w") as f:
    f.write(src)

result_lines = src.splitlines()
print(f"After: {len(result_lines)} lines")
print("Done")
