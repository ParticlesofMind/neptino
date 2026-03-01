import sys

toolbar_path = "/Users/benjaminjacklaubacher/Neptino/src/components/coursebuilder/create/toolbar/ToolBar.tsx"
with open(toolbar_path, "r") as f:
    lines = f.readlines()

total = len(lines)

# Find boundaries
# Option primitives start at "// ─── Option primitives"
# ToolOptionsStrip starts at "// ─── Tool options strip"
# ToolButton starts at "function ToolButton"
# ToolBar starts at "export function ToolBar"

def find_line(lines, text):
    for i, line in enumerate(lines):
        if text in line:
            return i
    return -1

opt_primitives_start = find_line(lines, "// ─── Option primitives")
opts_strip_comment_start = find_line(lines, "// ─── Tool options strip")
tool_button_start = find_line(lines, "function ToolButton<")
toolbar_start = find_line(lines, "export function ToolBar()")

print(f"opt_primitives_start: {opt_primitives_start + 1}")
print(f"opts_strip_comment_start: {opts_strip_comment_start + 1}")
print(f"tool_button_start: {tool_button_start + 1}")
print(f"toolbar_start: {toolbar_start + 1}")
print(f"total: {total}")

if any(x == -1 for x in [opt_primitives_start, opts_strip_comment_start, tool_button_start, toolbar_start]):
    print("ERROR: boundary not found")
    sys.exit(1)

# Extract toolbar-options.tsx = lines opt_primitives_start .. tool_button_start
# The new file needs "use client" + imports + those lines
options_lines = lines[opt_primitives_start:tool_button_start]

options_content = (
    '"use client"\n'
    '\n'
    'import { useState } from "react"\n'
    'import type { BuildTool, AnimateTool } from "../store/canvasStore"\n'
    '\n'
)
options_content += "".join(options_lines)
# Export ToolOptionsStrip (it was private in original file)
options_content = options_content.replace("function ToolOptionsStrip(", "export function ToolOptionsStrip(")

# ToolBar.tsx keeps:
# Lines 0..opt_primitives_start-1 (original imports + types)
# Lines tool_button_start..end
# Plus an import of ToolOptionsStrip from toolbar-options
import_line = 'import { ToolOptionsStrip } from "./toolbar-options"\n'

kept_start = lines[:opt_primitives_start]
kept_end = lines[tool_button_start:]

# Find where to insert import (after last import statement)
last_import_idx = 0
for i, line in enumerate(kept_start):
    if line.strip().startswith("import"):
        last_import_idx = i

kept_start.insert(last_import_idx + 1, import_line)

new_toolbar_content = "".join(kept_start + kept_end)

with open(toolbar_path, "w") as f:
    f.write(new_toolbar_content)

options_path = "/Users/benjaminjacklaubacher/Neptino/src/components/coursebuilder/create/toolbar/toolbar-options.tsx"
with open(options_path, "w") as f:
    f.write(options_content)

print(f"ToolBar.tsx: {len((kept_start + kept_end))} lines")
print(f"toolbar-options.tsx: {len(options_content.splitlines())} lines")
print("Done")
