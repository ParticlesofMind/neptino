#!/usr/bin/env tsx
/**
 * build-encyclopedia-catalog.ts
 *
 * Fetches thousands of notable historical figures from Wikidata SPARQL
 * and writes them as a JSON catalog to src/data/encyclopedia/historical-figures.json
 *
 * Usage:
 *   npx tsx scripts/build-encyclopedia-catalog.ts
 *   npm run build:encyclopedia
 *
 * Options (env vars):
 *   LIMIT=5000          Max figures to fetch (default 5000)
 *   MIN_SITELINKS=20    Minimum Wikipedia sitelinks for notability (default 20)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../src/data/encyclopedia/historical-figures.json");

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const LIMIT = parseInt(process.env.LIMIT ?? "5000", 10);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CatalogItem {
  id: string;
  title: string;
  wikidataId: string;
  knowledgeType: "Historical Figures";
  disciplines: string[];
  eraGroup: "ancient" | "early-modern" | "modern" | "contemporary";
  eraLabel: string;
  depth: "foundation" | "intermediate" | "advanced";
  summary: string;
  tags: string[];
}

/* ------------------------------------------------------------------ */
/*  Discipline mapping from occupation superclasses                    */
/* ------------------------------------------------------------------ */

/** Map broad occupation keywords → disciplines */
const DISCIPLINE_MAP: Record<string, string> = {
  mathematician: "Mathematics",
  physicist: "Physics",
  chemist: "Chemistry",
  biologist: "Biology",
  astronomer: "Physics",
  geologist: "Biology",
  engineer: "Technology",
  inventor: "Technology",
  computer: "Technology",
  programmer: "Technology",
  physician: "Biology",
  surgeon: "Biology",
  philosopher: "Philosophy",
  writer: "Literature",
  poet: "Literature",
  novelist: "Literature",
  playwright: "Literature",
  author: "Literature",
  historian: "History",
  archaeologist: "History",
  politician: "Politics",
  diplomat: "Politics",
  statesman: "Politics",
  monarch: "Politics",
  emperor: "Politics",
  president: "Politics",
  prime: "Politics",
  general: "History",
  military: "History",
  admiral: "History",
  artist: "Art",
  painter: "Art",
  sculptor: "Art",
  architect: "Art",
  composer: "Music",
  musician: "Music",
  singer: "Music",
  explorer: "History",
  navigator: "History",
  economist: "Economics",
  sociologist: "Social Science",
  psychologist: "Social Science",
  theologian: "Philosophy",
  jurist: "Politics",
  lawyer: "Politics",
  astronaut: "Technology",
  activist: "Politics",
  revolutionary: "Politics",
};

function inferDisciplines(occupation: string): string[] {
  const occ = occupation.toLowerCase();
  const disciplines = new Set<string>();

  for (const [keyword, discipline] of Object.entries(DISCIPLINE_MAP)) {
    if (occ.includes(keyword)) disciplines.add(discipline);
  }

  // Always include History for historical figures
  disciplines.add("History");

  return [...disciplines].slice(0, 4);
}

/* ------------------------------------------------------------------ */
/*  Era classification from birth year                                 */
/* ------------------------------------------------------------------ */

function classifyEra(birthYear: number): { eraGroup: CatalogItem["eraGroup"]; eraLabel: string } {
  if (birthYear < 0) {
    return { eraGroup: "ancient", eraLabel: `${Math.abs(birthYear)} BCE` };
  }
  if (birthYear < 500) {
    return { eraGroup: "ancient", eraLabel: `${Math.ceil(birthYear / 100)}th century` };
  }
  if (birthYear < 1500) {
    return { eraGroup: "early-modern", eraLabel: `${Math.ceil(birthYear / 100)}th century` };
  }
  if (birthYear < 1800) {
    return { eraGroup: "early-modern", eraLabel: `${Math.ceil(birthYear / 100)}th century` };
  }
  if (birthYear < 1900) {
    return { eraGroup: "modern", eraLabel: "19th century" };
  }
  if (birthYear < 2000) {
    return { eraGroup: "contemporary", eraLabel: "20th century" };
  }
  return { eraGroup: "contemporary", eraLabel: "21st century" };
}

/* ------------------------------------------------------------------ */
/*  Depth classification by sitelinks count (proxy for notability)     */
/* ------------------------------------------------------------------ */

function classifyDepth(occupationCount: number): CatalogItem["depth"] {
  // Without sitelinks, use occupation count as a rough proxy for notability.
  // Figures with many indexed occupations tend to be more prominent.
  if (occupationCount >= 3) return "foundation";
  if (occupationCount >= 2) return "intermediate";
  return "advanced";
}

/* ------------------------------------------------------------------ */
/*  Slugify for id field                                               */
/* ------------------------------------------------------------------ */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  SPARQL query                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build a SPARQL query for notable people in a specific occupation category.
 * Querying by specific occupation class is MUCH faster than scanning all Q5 instances.
 */
function buildCategoryQuery(occupationId: string, occupationName: string, limit: number): string {
  return `
SELECT ?item ?itemLabel ?itemDescription ?birthDate
WHERE {
  ?item wdt:P31 wd:Q5 .
  ?item wdt:P106 wd:${occupationId} .
  ?item wdt:P569 ?birthDate .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${limit}
  `.trim();
}

/**
 * Fetch occupations for a batch of Wikidata IDs.
 * Uses VALUES to query specific items efficiently.
 */
function buildOccupationQuery(ids: string[]): string {
  const values = ids.map((id) => `wd:${id}`).join(" ");
  return `
SELECT ?item ?occupationLabel
WHERE {
  VALUES ?item { ${values} }
  ?item wdt:P106 ?occupation .
  ?occupation rdfs:label ?occupationLabel .
  FILTER(LANG(?occupationLabel) = "en")
}
  `.trim();
}

/** Categories of occupations to query, with their Wikidata IDs and per-category limits */
const OCCUPATION_CATEGORIES: { id: string; name: string; limit: number; discipline: string }[] = [
  // Scientists
  { id: "Q170790", name: "mathematician", limit: 300, discipline: "Mathematics" },
  { id: "Q169470", name: "physicist", limit: 300, discipline: "Physics" },
  { id: "Q593644", name: "chemist", limit: 150, discipline: "Chemistry" },
  { id: "Q864503", name: "biologist", limit: 150, discipline: "Biology" },
  { id: "Q11063", name: "astronomer", limit: 150, discipline: "Physics" },
  { id: "Q81096", name: "engineer", limit: 200, discipline: "Technology" },
  { id: "Q205375", name: "inventor", limit: 150, discipline: "Technology" },
  // Writers & artists
  { id: "Q36180", name: "writer", limit: 400, discipline: "Literature" },
  { id: "Q49757", name: "poet", limit: 200, discipline: "Literature" },
  { id: "Q1028181", name: "painter", limit: 300, discipline: "Art" },
  { id: "Q1281618", name: "sculptor", limit: 100, discipline: "Art" },
  { id: "Q42973", name: "architect", limit: 150, discipline: "Art" },
  { id: "Q36834", name: "composer", limit: 250, discipline: "Music" },
  // Politics & history
  { id: "Q82955", name: "politician", limit: 400, discipline: "Politics" },
  { id: "Q116", name: "monarch", limit: 200, discipline: "Politics" },
  { id: "Q189290", name: "military officer", limit: 200, discipline: "History" },
  { id: "Q3621491", name: "historian", limit: 200, discipline: "History" },
  { id: "Q13582652", name: "explorer", limit: 150, discipline: "History" },
  // Philosophers & thinkers
  { id: "Q4964182", name: "philosopher", limit: 250, discipline: "Philosophy" },
  { id: "Q188094", name: "economist", limit: 150, discipline: "Economics" },
  // Medicine
  { id: "Q39631", name: "physician", limit: 200, discipline: "Biology" },
];

/* ------------------------------------------------------------------ */
/*  Fetch with retry                                                   */
/* ------------------------------------------------------------------ */

async function sparqlFetch(sparql: string): Promise<Record<string, string>[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  [sparql] Attempt ${attempt}/${maxRetries}…`);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "Neptino-Encyclopedia-Builder/1.0 (educational project)",
        },
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const wait = Math.min(30_000, 5_000 * attempt);
        console.warn(`  [sparql] Rate limited (429). Waiting ${wait / 1000}s…`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        console.warn(`  [sparql] HTTP ${res.status}: ${res.statusText}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 3_000 * attempt));
          continue;
        }
        throw new Error(`SPARQL query failed: HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        results: { bindings: Record<string, { value: string }>[] };
      };

      return json.results.bindings.map((b) => {
        const row: Record<string, string> = {};
        for (const [k, v] of Object.entries(b)) row[k] = v.value;
        return row;
      });
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`  [sparql] Error: ${err}. Retrying…`);
      await new Promise((r) => setTimeout(r, 3_000 * attempt));
    }
  }

  return [];
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   Neptino Encyclopedia — Catalog Builder            ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`  Target:       ${OUT_PATH}`);
  console.log(`  Limit:        ${LIMIT} figures`);
  console.log();

  // 1. Fetch people by occupation category (fast targeted queries)
  console.log(`[1/3] Querying Wikidata by ${OCCUPATION_CATEGORIES.length} occupation categories…`);

  const byId = new Map<
    string,
    {
      wikidataId: string;
      label: string;
      description: string;
      birthYear: number;
      occupations: Set<string>;
      sitelinks: number;
    }
  >();

  for (let ci = 0; ci < OCCUPATION_CATEGORIES.length; ci++) {
    const cat = OCCUPATION_CATEGORIES[ci];
    const catLimit = Math.min(cat.limit, LIMIT);
    console.log(`  [${ci + 1}/${OCCUPATION_CATEGORIES.length}] ${cat.name} (${cat.id}, limit ${catLimit})…`);

    try {
      const sparql = buildCategoryQuery(cat.id, cat.name, catLimit);
      const rows = await sparqlFetch(sparql);
      console.log(`    → ${rows.length} rows`);

      let newCount = 0;
      for (const row of rows) {
        const wikidataId = row.item?.split("/").pop();
        if (!wikidataId) continue;

        const label = row.itemLabel;
        if (!label || label === wikidataId) continue;

        const existing = byId.get(wikidataId);
        if (existing) {
          existing.occupations.add(cat.name);
          continue;
        }

        // Parse birth year
        const birthRaw = row.birthDate ?? "";
        const isBce = birthRaw.startsWith("-");
        const d = new Date(isBce ? birthRaw.slice(1) : birthRaw);
        if (isNaN(d.getTime())) continue;
        const birthYear = isBce ? -d.getFullYear() : d.getFullYear();

        byId.set(wikidataId, {
          wikidataId,
          label,
          description: row.itemDescription ?? "",
          birthYear,
          occupations: new Set([cat.name]),
          sitelinks: 0, // not available in this query mode
        });
        newCount++;
      }
      console.log(`    → ${newCount} new unique figures (total: ${byId.size})`);
    } catch (err) {
      console.warn(`    Category ${cat.name} failed (non-fatal):`, err);
    }

    // Polite pause between categories
    if (ci < OCCUPATION_CATEGORIES.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Early stop if we have enough
    if (byId.size >= LIMIT) {
      console.log(`  Reached limit of ${LIMIT} unique figures. Stopping.`);
      break;
    }
  }

  console.log(`\n  Total unique figures: ${byId.size}`);

  // 2. Build catalog items
  console.log("[2/3] Building catalog…");
  const seenSlugs = new Set<string>();
  const catalog: CatalogItem[] = [];

  for (const fig of byId.values()) {
    const allOccupations = [...fig.occupations].join(", ");
    const disciplines = inferDisciplines(allOccupations);
    const era = classifyEra(fig.birthYear);
    const depth = classifyDepth(fig.occupations.size);

    let slug = slugify(fig.label);
    // Ensure unique id
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${fig.wikidataId.toLowerCase()}`;
    }
    seenSlugs.add(slug);

    // Build tags from occupations (up to 3)
    const tags = [...fig.occupations]
      .slice(0, 3)
      .map((o) => o.toLowerCase());

    catalog.push({
      id: slug,
      title: fig.label,
      wikidataId: fig.wikidataId,
      knowledgeType: "Historical Figures",
      disciplines,
      eraGroup: era.eraGroup,
      eraLabel: era.eraLabel,
      depth,
      summary: fig.description || `${fig.label} — ${allOccupations || "historical figure"}.`,
      tags,
    });
  }

  // Sort alphabetically since we don't have sitelinks for notability ranking
  catalog.sort((a, b) => a.title.localeCompare(b.title));
  console.log(`  → ${catalog.length} catalog items built`);

  // Stats
  const byEra = { ancient: 0, "early-modern": 0, modern: 0, contemporary: 0 };
  const byDepth = { foundation: 0, intermediate: 0, advanced: 0 };
  for (const item of catalog) {
    byEra[item.eraGroup]++;
    byDepth[item.depth]++;
  }

  console.log(`  Era breakdown: ${JSON.stringify(byEra)}`);
  console.log(`  Depth breakdown: ${JSON.stringify(byDepth)}`);

  // Collect all disciplines
  const allDisc = new Set<string>();
  for (const item of catalog) item.disciplines.forEach((d) => allDisc.add(d));
  console.log(`  Disciplines: ${[...allDisc].sort().join(", ")}`);

  // 3. Write JSON
  console.log("[3/3] Writing catalog…");
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(catalog, null, 2) + "\n", "utf-8");
  console.log(`  ✔ Written ${catalog.length} items to ${OUT_PATH}`);
  console.log();
  console.log("Done! Run `npm run dev` to see the encyclopedia.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
