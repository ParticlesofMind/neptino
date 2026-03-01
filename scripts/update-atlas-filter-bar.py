import re
import sys

path = "/Users/benjaminjacklaubacher/Neptino/src/components/encyclopedia/atlas-filter-bar.tsx"
with open(path, "r") as f:
    content = f.read()

# 1) Add import after the last existing import
old_anchor = 'import { TAXONOMY, CATEGORY_KEYS, layerToCat, type CatKey } from "./atlas-taxonomy"\n'
if old_anchor not in content:
    print("ERROR: import anchor not found")
    sys.exit(1)
new_import = 'import { AtlasIscedPanel } from "./atlas-isced-panel"\n'
content = content.replace(old_anchor, old_anchor + new_import, 1)

# 2) Delete the inline IscedPanel function using string markers
start_marker = "  // ── ISCED mini-panel"
end_marker = "  // ── Render"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("ERROR: markers not found", repr(content[8000:8100]))
    sys.exit(1)
print(f"Removing IscedPanel block: {end_idx - start_idx} chars")
content = content[:start_idx] + content[end_idx:]

# 3) Replace all <IscedPanel ... /> with <AtlasIscedPanel ... iscedSearch/setIscedSearch />
# All three occurrences have the same closing pattern: "anchor={panelAnchor ?? undefined}\n              />"
old_closing = "anchor={panelAnchor ?? undefined}\n              />"
new_closing = "anchor={panelAnchor ?? undefined}\n                iscedSearch={iscedSearch}\n                setIscedSearch={setIscedSearch}\n              />"
content = content.replace(old_closing, new_closing)

# Rename all remaining <IscedPanel to <AtlasIscedPanel
content = content.replace("<IscedPanel", "<AtlasIscedPanel")

with open(path, "w") as f:
    f.write(content)
print("Done: atlas-filter-bar.tsx updated")
print(f"Lines: {len(content.splitlines())}")
