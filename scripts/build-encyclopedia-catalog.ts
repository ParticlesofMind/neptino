#!/usr/bin/env tsx
/**
 * build-encyclopedia-catalog.ts
 *
 * Fetches tens of thousands of notable historical figures from Wikidata SPARQL
 * and writes them as a JSON catalog to public/data/encyclopedia/historical-figures.json
 *
 * Each occupation category is queried separately (fast) and results are
 * ordered by Wikipedia sitelinks count so the most notable figures come first.
 *
 * Usage:
 *   npx tsx scripts/build-encyclopedia-catalog.ts
 *   npm run build:encyclopedia
 *
 * Options (env vars):
 *   LIMIT=50000         Max figures to fetch (default 50000)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../public/data/encyclopedia/historical-figures.json");

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const LIMIT = parseInt(process.env.LIMIT ?? "50000", 10);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** The 12 knowledge domains (adapted from ISCED-F 2013, corrected for Western biases) */
const CORE_DOMAINS = [
  "Mathematics & Logic",
  "Natural Sciences",
  "Medical & Health Sciences",
  "Engineering & Technology",
  "Philosophy & Thought",
  "Social Sciences",
  "Arts & Creative Expression",
  "Language & Communication",
  "Governance & Institutions",
  "Spiritual & Religious Thought",
  "Exploration & Discovery",
  "Agriculture & Ecology",
] as const;

type CoreDomain = (typeof CORE_DOMAINS)[number];

interface CatalogItem {
  id: string;
  title: string;
  wikidataId: string;
  knowledgeType: "Person";
  domain: CoreDomain;
  secondaryDomains: CoreDomain[];
  eraGroup: "ancient" | "early-modern" | "modern" | "contemporary";
  eraLabel: string;
  depth: "foundation" | "intermediate" | "advanced";
  summary: string;
  tags: string[];
}

/* ------------------------------------------------------------------ */
/*  Domain mapping from occupation keywords                            */
/* ------------------------------------------------------------------ */

/**
 * Maps occupation keywords → primary core domain.
 * Secondary domains are inferred by multi-match: if an occupation string
 * matches keywords for multiple domains, extra matches become secondaries.
 */
const DOMAIN_MAP: Record<string, CoreDomain> = {
  // ── Natural Sciences ──────────────────────────────────────────────
  physicist: "Natural Sciences",
  chemist: "Natural Sciences",
  biologist: "Natural Sciences",
  astronomer: "Natural Sciences",
  geologist: "Natural Sciences",
  botanist: "Natural Sciences",
  zoologist: "Natural Sciences",
  geneticist: "Natural Sciences",
  neuroscientist: "Natural Sciences",
  paleontologist: "Natural Sciences",
  meteorologist: "Natural Sciences",
  oceanographer: "Natural Sciences",
  ecologist: "Natural Sciences",
  microbiologist: "Natural Sciences",

  // ── Medical & Health Sciences ─────────────────────────────────────
  physician: "Medical & Health Sciences",
  surgeon: "Medical & Health Sciences",
  pharmacist: "Medical & Health Sciences",
  nurse: "Medical & Health Sciences",
  psychoanalyst: "Medical & Health Sciences",

  // ── Social Sciences ───────────────────────────────────────────────
  psychologist: "Social Sciences",
  "political scientist": "Social Sciences",
  linguist: "Social Sciences",
  sociologist: "Social Sciences",
  anthropologist: "Social Sciences",
  archaeologist: "Social Sciences",
  economist: "Social Sciences",
  historian: "Social Sciences",

  // ── Mathematics & Logic ───────────────────────────────────────────
  mathematician: "Mathematics & Logic",

  // ── Engineering & Technology ──────────────────────────────────────
  "computer scientist": "Engineering & Technology",
  engineer: "Engineering & Technology",
  inventor: "Engineering & Technology",
  computer: "Engineering & Technology",
  programmer: "Engineering & Technology",
  astronaut: "Engineering & Technology",
  architect: "Engineering & Technology",

  // ── Philosophy & Thought ──────────────────────────────────────────
  philosopher: "Philosophy & Thought",

  // ── Spiritual & Religious Thought ─────────────────────────────────
  theologian: "Spiritual & Religious Thought",
  cleric: "Spiritual & Religious Thought",
  priest: "Spiritual & Religious Thought",
  bishop: "Spiritual & Religious Thought",
  pope: "Spiritual & Religious Thought",
  missionary: "Spiritual & Religious Thought",
  rabbi: "Spiritual & Religious Thought",
  imam: "Spiritual & Religious Thought",
  monk: "Spiritual & Religious Thought",

  // ── Arts & Creative Expression ────────────────────────────────────
  writer: "Arts & Creative Expression",
  poet: "Arts & Creative Expression",
  novelist: "Arts & Creative Expression",
  playwright: "Arts & Creative Expression",
  author: "Arts & Creative Expression",
  essayist: "Arts & Creative Expression",
  screenwriter: "Arts & Creative Expression",
  lyricist: "Arts & Creative Expression",
  literary: "Arts & Creative Expression",
  artist: "Arts & Creative Expression",
  painter: "Arts & Creative Expression",
  sculptor: "Arts & Creative Expression",
  photographer: "Arts & Creative Expression",
  illustrator: "Arts & Creative Expression",
  "graphic designer": "Arts & Creative Expression",
  printmaker: "Arts & Creative Expression",
  engraver: "Arts & Creative Expression",
  ceramicist: "Arts & Creative Expression",
  composer: "Arts & Creative Expression",
  musician: "Arts & Creative Expression",
  singer: "Arts & Creative Expression",
  conductor: "Arts & Creative Expression",
  pianist: "Arts & Creative Expression",
  violinist: "Arts & Creative Expression",
  opera: "Arts & Creative Expression",
  actor: "Arts & Creative Expression",
  actress: "Arts & Creative Expression",
  "film director": "Arts & Creative Expression",
  director: "Arts & Creative Expression",
  dancer: "Arts & Creative Expression",
  choreographer: "Arts & Creative Expression",

  // ── Language & Communication ──────────────────────────────────────
  journalist: "Language & Communication",
  translator: "Language & Communication",

  // ── Governance & Institutions ─────────────────────────────────────
  politician: "Governance & Institutions",
  diplomat: "Governance & Institutions",
  statesman: "Governance & Institutions",
  monarch: "Governance & Institutions",
  emperor: "Governance & Institutions",
  president: "Governance & Institutions",
  prime: "Governance & Institutions",
  revolutionary: "Governance & Institutions",
  jurist: "Governance & Institutions",
  lawyer: "Governance & Institutions",
  judge: "Governance & Institutions",
  activist: "Governance & Institutions",

  // ── Economics (Social Sciences) ───────────────────────────────────
  businessperson: "Social Sciences",
  industrialist: "Social Sciences",
  entrepreneur: "Social Sciences",

  // ── Military (Governance & Institutions) ──────────────────────────
  general: "Governance & Institutions",
  military: "Governance & Institutions",
  admiral: "Governance & Institutions",
  officer: "Governance & Institutions",

  // ── Exploration & Discovery ───────────────────────────────────────
  explorer: "Exploration & Discovery",
  navigator: "Exploration & Discovery",
  cartographer: "Exploration & Discovery",
  geographer: "Exploration & Discovery",

  // ── Agriculture & Ecology ─────────────────────────────────────────
  pedagogue: "Social Sciences",
  professor: "Social Sciences",
  academic: "Social Sciences",
};

/**
 * Secondary-domain rules: certain occupation keywords strongly imply
 * a second domain beyond the primary.
 */
const SECONDARY_RULES: { keyword: string; domain: CoreDomain }[] = [
  // Scientists who also contributed to Philosophy
  { keyword: "philosopher", domain: "Natural Sciences" },
  // Politicians who led wars
  { keyword: "monarch",     domain: "Governance & Institutions" },
  { keyword: "emperor",     domain: "Governance & Institutions" },
  // Engineers/inventors → Sciences background
  { keyword: "engineer",    domain: "Natural Sciences" },
  { keyword: "inventor",    domain: "Natural Sciences" },
  // Economists → Social Sciences
  { keyword: "economist",   domain: "Social Sciences" },
  // Psychologist → Social Sciences secondary
  { keyword: "psychologist", domain: "Medical & Health Sciences" },
  // Architect → Arts as secondary
  { keyword: "architect",   domain: "Arts & Creative Expression" },
  // Mathematician → Natural Sciences as secondary
  { keyword: "mathematician", domain: "Natural Sciences" },
  // Explorer → Natural Sciences as secondary (naturalists)
  { keyword: "explorer",    domain: "Natural Sciences" },
  // Journalist → Language & Communication
  { keyword: "journalist",  domain: "Language & Communication" },
  // Activist → Governance & Institutions
  { keyword: "activist",    domain: "Governance & Institutions" },
  // Theologian → Philosophy as secondary
  { keyword: "theologian",  domain: "Philosophy & Thought" },
];

function inferDomains(
  occupation: string,
  categoryDomain: CoreDomain,
): { primary: CoreDomain; secondary: CoreDomain[] } {
  const occ = occupation.toLowerCase();
  const matched = new Set<CoreDomain>();

  // 1. Match keywords → domains
  for (const [keyword, domain] of Object.entries(DOMAIN_MAP)) {
    if (occ.includes(keyword)) matched.add(domain);
  }

  // 2. Always include the category's declared domain
  matched.add(categoryDomain);

  // 3. Apply secondary rules
  const extra = new Set<CoreDomain>();
  for (const rule of SECONDARY_RULES) {
    if (occ.includes(rule.keyword) && !matched.has(rule.domain)) {
      extra.add(rule.domain);
    }
  }

  // 4. Pick primary: the category domain is the most specific
  const primary = categoryDomain;
  const secondary = [...matched, ...extra]
    .filter((d) => d !== primary)
    .slice(0, 2); // max 2 secondary

  return { primary, secondary };
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

function classifyDepth(sitelinks: number): CatalogItem["depth"] {
  if (sitelinks >= 80) return "foundation";
  if (sitelinks >= 40) return "intermediate";
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
function buildCategoryQuery(occupationId: string, _occupationName: string, limit: number): string {
  return `
SELECT ?item ?itemLabel ?itemDescription ?birthDate ?sl
WHERE {
  ?item wdt:P31 wd:Q5 .
  ?item wdt:P106 wd:${occupationId} .
  ?item wdt:P569 ?birthDate .
  ?item wikibase:sitelinks ?sl .
  FILTER(?sl >= 10)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sl)
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

/** Categories of occupations to query, with their Wikidata IDs, per-category limits, and primary domain */
const OCCUPATION_CATEGORIES: { id: string; name: string; limit: number; domain: CoreDomain }[] = [
  // ── Natural Sciences ─────────────────────────────────────────────
  { id: "Q169470",  name: "physicist",            limit: 1200, domain: "Natural Sciences" },
  { id: "Q593644",  name: "chemist",              limit: 800,  domain: "Natural Sciences" },
  { id: "Q864503",  name: "biologist",            limit: 600,  domain: "Natural Sciences" },
  { id: "Q11063",   name: "astronomer",           limit: 600,  domain: "Natural Sciences" },
  { id: "Q520549",  name: "geologist",            limit: 400,  domain: "Natural Sciences" },
  { id: "Q2374149", name: "botanist",             limit: 400,  domain: "Natural Sciences" },
  { id: "Q350979",  name: "zoologist",            limit: 300,  domain: "Natural Sciences" },
  { id: "Q2504617", name: "paleontologist",       limit: 200,  domain: "Natural Sciences" },
  { id: "Q2259451", name: "meteorologist",        limit: 150,  domain: "Natural Sciences" },

  // ── Medical & Health Sciences ────────────────────────────────────
  { id: "Q39631",   name: "physician",            limit: 600,  domain: "Medical & Health Sciences" },
  { id: "Q774306",  name: "surgeon",              limit: 300,  domain: "Medical & Health Sciences" },
  { id: "Q2640827", name: "pharmacist",           limit: 150,  domain: "Medical & Health Sciences" },

  // ── Social Sciences ──────────────────────────────────────────────
  { id: "Q212980",  name: "psychologist",         limit: 400,  domain: "Social Sciences" },
  { id: "Q188094",  name: "economist",            limit: 600,  domain: "Social Sciences" },
  { id: "Q3621491", name: "historian",            limit: 800,  domain: "Social Sciences" },
  { id: "Q10876391",name: "archaeologist",        limit: 300,  domain: "Social Sciences" },
  { id: "Q2306091", name: "sociologist",          limit: 300,  domain: "Social Sciences" },
  { id: "Q1622272", name: "university professor", limit: 500,  domain: "Social Sciences" },

  // ── Mathematics & Logic ───────────────────────────────────────────
  { id: "Q170790",  name: "mathematician",        limit: 1200, domain: "Mathematics & Logic" },

  // ── Engineering & Technology ──────────────────────────────────────
  { id: "Q15839134",name: "computer scientist",   limit: 300,  domain: "Engineering & Technology" },
  { id: "Q81096",   name: "engineer",             limit: 800,  domain: "Engineering & Technology" },
  { id: "Q205375",  name: "inventor",             limit: 600,  domain: "Engineering & Technology" },
  { id: "Q11631",   name: "astronaut",            limit: 300,  domain: "Engineering & Technology" },

  // ── Arts & Creative Expression ────────────────────────────────────
  { id: "Q36180",   name: "writer",               limit: 2000, domain: "Arts & Creative Expression" },
  { id: "Q49757",   name: "poet",                 limit: 1200, domain: "Arts & Creative Expression" },
  { id: "Q6625963", name: "novelist",             limit: 1000, domain: "Arts & Creative Expression" },
  { id: "Q214917",  name: "playwright",           limit: 600,  domain: "Arts & Creative Expression" },
  { id: "Q4853732", name: "essayist",             limit: 300,  domain: "Arts & Creative Expression" },
  { id: "Q28389",   name: "screenwriter",         limit: 400,  domain: "Arts & Creative Expression" },
  { id: "Q1028181", name: "painter",              limit: 1500, domain: "Arts & Creative Expression" },
  { id: "Q1281618", name: "sculptor",             limit: 500,  domain: "Arts & Creative Expression" },
  { id: "Q42973",   name: "architect",            limit: 600,  domain: "Arts & Creative Expression" },
  { id: "Q33231",   name: "photographer",         limit: 400,  domain: "Arts & Creative Expression" },
  { id: "Q644687",  name: "illustrator",          limit: 300,  domain: "Arts & Creative Expression" },
  { id: "Q36834",   name: "composer",             limit: 1000, domain: "Arts & Creative Expression" },
  { id: "Q639669",  name: "musician",             limit: 800,  domain: "Arts & Creative Expression" },
  { id: "Q177220",  name: "singer",               limit: 300,  domain: "Arts & Creative Expression" },
  { id: "Q158852",  name: "conductor",            limit: 300,  domain: "Arts & Creative Expression" },
  { id: "Q33999",   name: "actor",                limit: 1000, domain: "Arts & Creative Expression" },
  { id: "Q2526255", name: "film director",        limit: 800,  domain: "Arts & Creative Expression" },
  { id: "Q486748",  name: "dancer",               limit: 200,  domain: "Arts & Creative Expression" },
  { id: "Q2490358", name: "choreographer",        limit: 150,  domain: "Arts & Creative Expression" },

  // ── Language & Communication ──────────────────────────────────────
  { id: "Q1930187", name: "journalist",           limit: 500,  domain: "Language & Communication" },
  { id: "Q333634",  name: "translator",           limit: 200,  domain: "Language & Communication" },

  // ── Governance & Institutions ─────────────────────────────────────
  { id: "Q82955",   name: "politician",           limit: 800,  domain: "Governance & Institutions" },
  { id: "Q116",     name: "monarch",              limit: 800,  domain: "Governance & Institutions" },
  { id: "Q193391",  name: "diplomat",             limit: 400,  domain: "Governance & Institutions" },
  { id: "Q82594",   name: "lawyer",               limit: 300,  domain: "Governance & Institutions" },
  { id: "Q16533",   name: "judge",                limit: 300,  domain: "Governance & Institutions" },
  { id: "Q189290",  name: "military officer",     limit: 800,  domain: "Governance & Institutions" },

  // ── Exploration & Discovery ───────────────────────────────────────
  { id: "Q13582652",name: "explorer",             limit: 400,  domain: "Exploration & Discovery" },

  // ── Philosophy & Thought ──────────────────────────────────────────
  { id: "Q4964182", name: "philosopher",          limit: 800,  domain: "Philosophy & Thought" },

  // ── Spiritual & Religious Thought ─────────────────────────────────
  { id: "Q1234713", name: "theologian",           limit: 400,  domain: "Spiritual & Religious Thought" },
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
      /** Primary domain from the first category that matched this figure */
      categoryDomain: CoreDomain;
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
          sitelinks: parseInt(row.sl ?? "0", 10),
          categoryDomain: cat.domain,
        });
        newCount++;
      }
      console.log(`    → ${newCount} new unique figures (total: ${byId.size})`);
    } catch (err) {
      console.warn(`    Category ${cat.name} failed (non-fatal):`, err);
    }

    // Polite pause between categories
    if (ci < OCCUPATION_CATEGORIES.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
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
    const { primary, secondary } = inferDomains(allOccupations, fig.categoryDomain);
    const era = classifyEra(fig.birthYear);
    const depth = classifyDepth(fig.sitelinks);

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
      knowledgeType: "Person",
      domain: primary,
      secondaryDomains: secondary,
      eraGroup: era.eraGroup,
      eraLabel: era.eraLabel,
      depth,
      summary: fig.description || `${fig.label} — ${allOccupations || "historical figure"}.`,
      tags,
    });
  }

  // Sort by sitelinks (most notable first)
  catalog.sort((a, b) => {
    const slA = byId.get(a.wikidataId)?.sitelinks ?? 0;
    const slB = byId.get(b.wikidataId)?.sitelinks ?? 0;
    return slB - slA;
  });
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

  // Domain breakdown
  const byDomain: Record<string, number> = {};
  for (const item of catalog) {
    byDomain[item.domain] = (byDomain[item.domain] ?? 0) + 1;
  }
  console.log(`  Domain breakdown:`);
  for (const [dom, count] of Object.entries(byDomain).sort(([, a], [, b]) => b - a)) {
    console.log(`    ${dom}: ${count}`);
  }
  const withSecondary = catalog.filter((i) => i.secondaryDomains.length > 0).length;
  console.log(`  Figures with secondary domains: ${withSecondary} (${((withSecondary / catalog.length) * 100).toFixed(1)}%)`);
  const allDoms = new Set<string>();
  for (const item of catalog) {
    allDoms.add(item.domain);
    item.secondaryDomains.forEach((d) => allDoms.add(d));
  }
  console.log(`  Domains represented: ${[...allDoms].sort().join(", ")}`);

  // 3. Write JSON
  console.log("[3/3] Writing catalog…");
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(catalog) + "\n", "utf-8");
  console.log(`  ✔ Written ${catalog.length} items to ${OUT_PATH}`);
  console.log();
  console.log("Done! Run `npm run dev` to see the encyclopedia.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
