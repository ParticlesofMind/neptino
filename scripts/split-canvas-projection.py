import re
import sys

path = "/Users/benjaminjacklaubacher/Neptino/src/lib/curriculum/canvas-projection.ts"
with open(path, "r") as f:
    lines = f.readlines()

# Split boundary: estimateSessionPages starts just after resolveTemplateFieldState ends
# We search for the line containing "function estimateSessionPages"
boundary_line = None
for i, line in enumerate(lines):
    if line.strip().startswith("function estimateSessionPages"):
        boundary_line = i
        break

if boundary_line is None:
    print("ERROR: boundary not found")
    sys.exit(1)

print(f"Splitting at line {boundary_line + 1} (0-indexed: {boundary_line})")

# Part 1: keep lines 0..boundary_line in canvas-projection.ts
# Add re-export at the end for backward compat
projection_lines = lines[:boundary_line]
# Remove trailing blank lines
while projection_lines and projection_lines[-1].strip() == "":
    projection_lines.pop()
projection_lines.append('\n')

# Part 2: lines from boundary onwards go to canvas-lesson-projector.ts
projector_lines = lines[boundary_line:]

# Build the new projector file content
projector_header = [
    "// Full canvas lesson projector extracted from canvas-projection.ts\n",
    'import {\n',
    '  planLessonBodyLayout, estimateExpandedTaskCount,\n',
    '  resolveEnabledBlocks, resolveTemplateFieldState,\n',
    '  type RawCurriculumSessionRow, type RawScheduleGeneratedEntry, type LessonCanvasPageProjection,\n',
    '} from "@/lib/curriculum/canvas-projection"\n',
    'import { resolveTemplateSelection, type NormalizedTemplateConfig } from "@/lib/curriculum/template-source-of-truth"\n',
    'import type { TemplateType, TemplateBlockType } from "@/lib/curriculum/template-blocks"\n',
    '\n',
]

projector_content = projector_header + projector_lines

# Write both files
with open(path, "w") as f:
    f.writelines(projection_lines)

projector_path = "/Users/benjaminjacklaubacher/Neptino/src/lib/curriculum/canvas-lesson-projector.ts"
with open(projector_path, "w") as f:
    f.writelines(projector_content)

print(f"canvas-projection.ts: {len(projection_lines)} lines")
print(f"canvas-lesson-projector.ts: {len(projector_content)} lines")
print("Done")
