#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type KnowledgeItem = {
  id: string;
  title: string;
  wikidataId: string;
  knowledgeType: "Movement / School";
  domain: string;
  secondaryDomains: string[];
  eraGroup: "ancient" | "early-modern" | "modern" | "contemporary";
  eraLabel: string;
  depth: "foundation" | "intermediate" | "advanced";
  summary: string;
  tags: string[];
};

type ClassDef = { id: string; name: string; domain: string; limit: number };

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../public/data/encyclopedia/movements.json");
const LIMIT = parseInt(process.env.LIMIT ?? "1500", 10);

const CLASSES: ClassDef[] = [
  { id: "Q25379", name: "art movement", domain: "Arts & Creative Expression", limit: 600 },
  { id: "Q23691", name: "philosophical movement", domain: "Philosophy & Thought", limit: 400 },
  { id: "Q178561", name: "literary movement", domain: "Language & Communication", limit: 300 },
  { id: "Q49768", name: "social movement", domain: "Social Sciences", limit: 300 },
];

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const classifyEra = (year: number | null): { eraGroup: KnowledgeItem["eraGroup"]; eraLabel: string } => {
  if (year === null) return { eraGroup: "modern", eraLabel: "Unknown" };
  if (year < 0) return { eraGroup: "ancient", eraLabel: `${Math.abs(year)} BCE` };
  if (year < 1500) return { eraGroup: "early-modern", eraLabel: `${Math.ceil(year / 100)}th century` };
  if (year < 1900) return { eraGroup: "modern", eraLabel: `${Math.ceil(year / 100)}th century` };
  if (year < 2000) return { eraGroup: "contemporary", eraLabel: "20th century" };
  return { eraGroup: "contemporary", eraLabel: "21st century" };
};

const classifyDepth = (sitelinks: number): KnowledgeItem["depth"] => {
  if (sitelinks >= 70) return "foundation";
  if (sitelinks >= 30) return "intermediate";
  return "advanced";
};

const buildQuery = (classId: string, limit: number) => `
SELECT ?item ?itemLabel ?itemDescription ?inception ?sl WHERE {
  ?item wdt:P31 wd:${classId} .
  ?item wikibase:sitelinks ?sl .
  FILTER(?sl >= 10)
  OPTIONAL { ?item wdt:P571 ?inception }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sl)
LIMIT ${limit}
`.trim();

async function sparqlFetch(sparql: string): Promise<Record<string, string>[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": "Neptino-Encyclopedia/1.1" },
  });
  if (!res.ok) throw new Error(`SPARQL ${res.status}`);
  const json = (await res.json()) as { results: { bindings: Record<string, { value: string }> } };
  return json.results.bindings.map((b) => {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(b)) row[k] = v.value;
    return row;
  });
}

async function main() {
  const seen = new Map<string, { classDomain: string; sitelinks: number; inception: number | null; label: string; desc: string }>();

  for (const cls of CLASSES) {
    const limit = Math.min(cls.limit, LIMIT);
    const rows = await sparqlFetch(buildQuery(cls.id, limit));
    for (const r of rows) {
      const wikidataId = r.item.split("/").pop();
      if (!wikidataId || seen.has(wikidataId)) continue;
      const date = r.inception ? new Date(r.inception) : null;
      const year = date && !Number.isNaN(date.getTime()) ? date.getUTCFullYear() : null;
      seen.set(wikidataId, {
        classDomain: cls.domain,
        sitelinks: parseInt(r.sl ?? "0", 10),
        inception: year,
        label: r.itemLabel,
        desc: r.itemDescription ?? "",
      });
    }
  }

  const catalog: KnowledgeItem[] = [];
  const seenSlugs = new Set<string>();

  for (const [wikidataId, row] of seen.entries()) {
    let id = slugify(row.label);
    if (seenSlugs.has(id)) id = `${id}-${wikidataId.toLowerCase()}`;
    seenSlugs.add(id);

    const era = classifyEra(row.inception);
    const depth = classifyDepth(row.sitelinks);

    catalog.push({
      id,
      title: row.label,
      wikidataId,
      knowledgeType: "Movement / School",
      domain: row.classDomain,
      secondaryDomains: [],
      eraGroup: era.eraGroup,
      eraLabel: era.eraLabel,
      depth,
      summary: row.desc || `${row.label} movement`,
      tags: [row.classDomain.toLowerCase()],
    });
  }

  catalog.sort((a, b) => (seen.get(b.wikidataId)?.sitelinks ?? 0) - (seen.get(a.wikidataId)?.sitelinks ?? 0));

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(catalog), "utf-8");
  console.log(`[movements] wrote ${catalog.length} items to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
