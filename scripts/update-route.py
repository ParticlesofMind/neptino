import re
import sys

path = "/Users/benjaminjacklaubacher/Neptino/src/app/api/generate-curriculum/route.ts"
with open(path, "r") as f:
    content = f.read()

# 1) Add new imports after the 3rd existing import
new_imports = (
    'import {\n'
    '  repairJSON,\n'
    '  extractLessonsViaRegex,\n'
    '  extractModulesViaRegex,\n'
    '  cleanModelOutput,\n'
    '  fitToCount,\n'
    '  normalizeGeneratedLessons,\n'
    '} from "./generation-route-utils"\n'
    'import type { GeneratedLesson, GeneratedModule } from "./generation-route-utils"\n'
)

old_anchor = 'import type { GenerationAction } from "@/lib/curriculum/ai-generation-service"\n'
if old_anchor not in content:
    print("ERROR: import anchor not found")
    sys.exit(1)
content = content.replace(old_anchor, old_anchor + new_imports, 1)

# 2) Delete the interfaces + utility functions block (before SYSTEM_PROMPT_BASE)
pattern = r'\n/\*\* Shape of each lesson in the generated curriculum \*/\n.*?(?=\nconst SYSTEM_PROMPT_BASE)'
match = re.search(pattern, content, re.DOTALL)
if not match:
    print("ERROR: block not found")
    sys.exit(1)
print(f"Removing block: {match.end() - match.start()} chars")
content = content[:match.start()] + content[match.end():]

with open(path, "w") as f:
    f.write(content)
print("Done: route.ts updated")
