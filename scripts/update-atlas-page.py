import re
import sys

path = "/Users/benjaminjacklaubacher/Neptino/src/app/(dashboard)/teacher/atlas/page.tsx"
with open(path, "r") as f:
    content = f.read()

# 1) Add import from atlas-page-utils; trim down the `import type` from @/types/atlas
# The page component still uses ISCEDDomain, ENTITY_TYPES, MEDIA_TYPES, etc. — keep those.
# But EntityType, AtlasLayer, AtlasContentType are only used in the type definitions we're removing.
# We'll keep the full import for safety and rely on TS to flag any true unused imports.

new_imports = (
    'import {\n'
    '  getSingleParam, normalizeFilter, parsePositiveInt, uniqueSorted,\n'
    '  buildQueryString, getVisiblePages, formatMetadataValue, capitalize,\n'
    '  normalizeEntityTitle, titlesLikelyMatch, parseYearValue,\n'
    '  buildTimelineEvents, buildTimelineEventsWithFallback, readClaimString,\n'
    '  isLikelyImageMediaType, isLikelyImageUrl, isLikelyVideoUrl, isLikelyAudioUrl,\n'
    '  readMediaImageUrl, getWikidataCardData,\n'
    '} from "./atlas-page-utils"\n'
    'import type {\n'
    '  SearchParams, EncyclopediaItemRow, WikidataCardData, TimelineEvent,\n'
    '  MediaRow, PanelItemRow, PanelMediaRow,\n'
    '} from "./atlas-page-utils"\n'
)

# Insert after the @/types/atlas value import
old_anchor = 'import { ENTITY_TYPES, MEDIA_TYPES, PRODUCT_TYPES, ACTIVITY_TYPES, ISCED_DOMAINS, getLayerName } from "@/types/atlas"\n'
if old_anchor not in content:
    print("ERROR: anchor not found")
    sys.exit(1)
content = content.replace(old_anchor, old_anchor + new_imports, 1)

# 2) Delete local type definitions (SearchParams through PanelMediaRow) 
#    They appear after `const PAGE_SIZE = 24\n\n`
#    and end before `function getSingleParam`
pattern_types = r'\ntype SearchParams.*?(?=\nfunction getSingleParam)'
match = re.search(pattern_types, content, re.DOTALL)
if not match:
    print("ERROR: type definitions block not found")
    sys.exit(1)
print(f"Removing type defs: {match.end() - match.start()} chars")
content = content[:match.start()] + content[match.end():]

# 3) Delete all local utility functions from getSingleParam through getWikidataCardData
#    They end just before `export default async function TeacherAtlasPage`
pattern_funcs = r'\nfunction getSingleParam.*?(?=\nexport default async function TeacherAtlasPage)'
match = re.search(pattern_funcs, content, re.DOTALL)
if not match:
    print("ERROR: utility functions block not found")
    sys.exit(1)
print(f"Removing utility functions: {match.end() - match.start()} chars")
content = content[:match.start()] + content[match.end():]

with open(path, "w") as f:
    f.write(content)
print("Done: atlas/page.tsx updated")
