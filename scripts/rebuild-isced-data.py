#!/usr/bin/env python3
"""
Fetch ISCED-F 2013 hierarchy from Eionet and rebuild the JSON file for Coursebuilder classification.

This script fetches the official ISCED Fields of Education and Training (ISCED-F 2013) dataset
from the European Data Dictionary (Eionet) CSV export, then generates a hierarchical JSON with:
  - 11 broad fields (2-digit codes, e.g. "01" Education)
  - ~29 narrow fields (3-digit codes, e.g. "011" Education – General)
  - ~80 detailed fields (4-digit codes, e.g. "0111" Education science)

Source: https://dd.eionet.europa.eu/vocabulary/eurostat/iscedf13/csv
Standard: UNESCO ISCED-F 2013
Usage: python scripts/rebuild-isced-data.py
Dependencies: (stdlib only)
Output: src/data/isced2011.json (compatible with Coursebuilder classification UI)
"""
import csv
import io
import json
import re
import unicodedata
import urllib.request
from pathlib import Path


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    text = re.sub(r"-+", "-", text)
    return text or "item"


def node(code: str, label: str):
    return {
        "value": f"{code}-{slugify(label)}",
        "label": label,
        "code": code,
    }


def main():
    csv_path = Path("/tmp/iscedf13.csv")
    print(f"Reading {csv_path} ...")
    raw = csv_path.read_text(encoding="utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(raw)))

    # Keep only canonical 2/3/4 digit codes like F01, F011, F0111
    items = []
    for r in rows:
        notation = (r.get("Notation") or "").strip()
        label = (r.get("Label") or "").strip()
        m = re.fullmatch(r"F(\d{2}|\d{3}|\d{4})", notation)
        if not m:
            continue
        code = m.group(1)
        items.append((code, label))

    # Prefer first-seen labels (source can include near-duplicates in extended variants we filtered out)
    labels = {}
    for code, label in items:
        labels.setdefault(code, label)

    broad_codes = sorted([c for c in labels if len(c) == 2])
    narrow_codes = sorted([c for c in labels if len(c) == 3 and c[:2] in labels])
    detailed_codes = sorted([c for c in labels if len(c) == 4 and c[:3] in labels])

    domains = []
    for bc in broad_codes:
        b = node(bc, labels[bc])
        subjects = []
        for nc in [c for c in narrow_codes if c.startswith(bc)]:
            n = node(nc, labels[nc])
            topics = []
            for dc in [c for c in detailed_codes if c.startswith(nc)]:
                d = node(dc, labels[dc])
                d["subtopics"] = [{"value": f"{dc}-other", "label": "Other", "code": f"{dc}-other"}]
                topics.append(d)
            n["topics"] = topics
            subjects.append(n)
        b["subjects"] = subjects
        domains.append(b)

    out = {"domains": domains}
    path = Path("src/data/isced2011.json")
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(f"✅ Written {path}")
    print(f"   broad={len(broad_codes)}, narrow={len(narrow_codes)}, detailed={len(detailed_codes)}")
    print(f"   Broad codes: {','.join(broad_codes)}")


if __name__ == "__main__":
    main()
