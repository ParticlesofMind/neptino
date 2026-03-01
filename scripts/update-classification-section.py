#!/usr/bin/env python3
"""
Replace inline classYears and curricularFrameworks arrays inside
ClassificationSection component with references to the extracted constants.
"""

PATH = "src/components/coursebuilder/sections/classification-section.tsx"

with open(PATH, "r") as f:
    src = f.read()

lines = src.splitlines(keepends=True)
print(f"Before: {len(lines)} lines")

# Locate the start of classYears array
start_marker = '  const classYears = [\n'
end_marker = '  // Helper to match display string'

start_idx = src.find(start_marker)
end_idx = src.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"ERROR: markers not found. start={start_idx}, end={end_idx}")
    exit(1)

replacement = "  const classYears = CLASS_YEARS\n  const curricularFrameworks = CURRICULAR_FRAMEWORKS\n\n  "
new_src = src[:start_idx] + replacement + src[end_idx:]

with open(PATH, "w") as f:
    f.write(new_src)

lines2 = new_src.splitlines()
print(f"After: {len(lines2)} lines")
print("Done")
