import re
import sys

path = "/Users/benjaminjacklaubacher/Neptino/src/lib/curriculum/ai-generation-service.ts"
with open(path, "r") as f:
    content = f.read()

# The type/interface definitions end just before `function tokenizeSeedText`
# We delete from that point onwards and replace with re-export statements.

pattern = r'\nfunction tokenizeSeedText.*'
match = re.search(pattern, content, re.DOTALL)
if not match:
    print("ERROR: tokenizeSeedText boundary not found")
    sys.exit(1)

print(f"Cutting at char {match.start()}, keeping first {match.start()} chars of type defs")

re_exports = '''
// Re-export all functions from extracted modules for backward compatibility
export { buildLocalGeneratedCurriculum, buildGenerationContext } from "@/lib/curriculum/generation-context-builder"
export { formatGenerationPrompt } from "@/lib/curriculum/generation-prompt-builder"
export { parseGenerationResponse, callGenerationAPI } from "@/lib/curriculum/generation-api-client"
'''

new_content = content[:match.start()] + re_exports
with open(path, "w") as f:
    f.write(new_content)
print(f"Done: ai-generation-service.ts reduced from {len(content.splitlines())} lines")
