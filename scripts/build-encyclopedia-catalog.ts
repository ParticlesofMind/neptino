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

/** The 10 core domains shared across all knowledge types */
const CORE_DOMAINS = [
  "Philosophy & Religion",
  "Politics & Governance",
  "Economics & Commerce",
  "Sciences",
  "Mathematics & Logic",
  "Technology & Engineering",
  "Arts, Literature & Culture",
  "Military, Conflict & Strategy",
  "Exploration & Environment",
  "Society & Social Movements",
] as const;

type CoreDomain = (typeof CORE_DOMAINS)[number];

interface CatalogItem {
  id: string;
  title: string;
  wikidataId: string;
  knowledgeType: "Historical Figures";
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
  // ── Sciences ──────────────────────────────────────────────────────
  physicist: "Sciences",
  chemist: "Sciences",
  biologist: "Sciences",
  astronomer: "Sciences",
  geologist: "Sciences",
  botanist: "Sciences",
  zoologist: "Sciences",
  geneticist: "Sciences",
  neuroscientist: "Sciences",
  paleontologist: "Sciences",
  meteorologist: "Sciences",
  oceanographer: "Sciences",
  ecologist: "Sciences",
  microbiologist: "Sciences",
  physician: "Sciences",
  surgeon: "Sciences",
  pharmacist: "Sciences",
  nurse: "Sciences",
  psychoanalyst: "Sciences",
  psychologist: "Sciences",
  "political scientist": "Sciences",
  linguist: "Sciences",

  // ── Mathematics & Logic ───────────────────────────────────────────
  mathematician: "Mathematics & Logic",

  // ── Technology & Engineering ──────────────────────────────────────
  "computer scientist": "Technology & Engineering",
  engineer: "Technology & Engineering",
  inventor: "Technology & Engineering",
  computer: "Technology & Engineering",
  programmer: "Technology & Engineering",
  astronaut: "Technology & Engineering",
  architect: "Technology & Engineering",

  // ── Philosophy & Religion ─────────────────────────────────────────
  philosopher: "Philosophy & Religion",
  theologian: "Philosophy & Religion",
  cleric: "Philosophy & Religion",
  priest: "Philosophy & Religion",
  bishop: "Philosophy & Religion",
  pope: "Philosophy & Religion",
  missionary: "Philosophy & Religion",
  rabbi: "Philosophy & Religion",
  imam: "Philosophy & Religion",
  monk: "Philosophy & Religion",

  // ── Arts, Literature & Culture ────────────────────────────────────
  writer: "Arts, Literature & Culture",
  poet: "Arts, Literature & Culture",
  novelist: "Arts, Literature & Culture",
  playwright: "Arts, Literature & Culture",
  author: "Arts, Literature & Culture",
  essayist: "Arts, Literature & Culture",
  journalist: "Arts, Literature & Culture",
  translator: "Arts, Literature & Culture",
  screenwriter: "Arts, Literature & Culture",
  lyricist: "Arts, Literature & Culture",
  literary: "Arts, Literature & Culture",
  artist: "Arts, Literature & Culture",
  painter: "Arts, Literature & Culture",
  sculptor: "Arts, Literature & Culture",
  photographer: "Arts, Literature & Culture",
  illustrator: "Arts, Literature & Culture",
  "graphic designer": "Arts, Literature & Culture",
  printmaker: "Arts, Literature & Culture",
  engraver: "Arts, Literature & Culture",
  ceramicist: "Arts, Literature & Culture",
  composer: "Arts, Literature & Culture",
  musician: "Arts, Literature & Culture",
  singer: "Arts, Literature & Culture",
  conductor: "Arts, Literature & Culture",
  pianist: "Arts, Literature & Culture",
  violinist: "Arts, Literature & Culture",
  opera: "Arts, Literature & Culture",
  actor: "Arts, Literature & Culture",
  actress: "Arts, Literature & Culture",
  "film director": "Arts, Literature & Culture",
  director: "Arts, Literature & Culture",
  dancer: "Arts, Literature & Culture",
  choreographer: "Arts, Literature & Culture",

  // ── Politics & Governance ─────────────────────────────────────────
  politician: "Politics & Governance",
  diplomat: "Politics & Governance",
  statesman: "Politics & Governance",
  monarch: "Politics & Governance",
  emperor: "Politics & Governance",
  president: "Politics & Governance",
  prime: "Politics & Governance",
  activist: "Society & Social Movements",
  revolutionary: "Politics & Governance",
  jurist: "Politics & Governance",
  lawyer: "Politics & Governance",
  judge: "Politics & Governance",

  // ── Economics & Commerce ──────────────────────────────────────────
  economist: "Economics & Commerce",
  businessperson: "Economics & Commerce",
  industrialist: "Economics & Commerce",
  entrepreneur: "Economics & Commerce",

  // ── Military, Conflict & Strategy ─────────────────────────────────
  general: "Military, Conflict & Strategy",
  military: "Military, Conflict & Strategy",
  admiral: "Military, Conflict & Strategy",
  officer: "Military, Conflict & Strategy",

  // ── Exploration & Environment ─────────────────────────────────────
  explorer: "Exploration & Environment",
  navigator: "Exploration & Environment",
  cartographer: "Exploration & Environment",
  geographer: "Exploration & Environment",

  // ── Society & Social Movements ────────────────────────────────────
  historian: "Society & Social Movements",
  archaeologist: "Society & Social Movements",
  anthropologist: "Society & Social Movements",
  sociologist: "Society & Social Movements",
  pedagogue: "Society & Social Movements",
  professor: "Society & Social Movements",
  academic: "Society & Social Movements",
};

/**
 * Secondary-domain rules: certain occupation keywords strongly imply
 * a second domain beyond the primary.
 */
const SECONDARY_RULES: { keyword: string; domain: CoreDomain }[] = [
  // Scientists who also contributed to Philosophy
  { keyword: "philosopher", domain: "Sciences" },           // philosopher-scientists
  // Politicians who led wars
  { keyword: "monarch",     domain: "Military, Conflict & Strategy" },
  { keyword: "emperor",     domain: "Military, Conflict & Strategy" },
  // Engineers/inventors → Sciences background
  { keyword: "engineer",    domain: "Sciences" },
  { keyword: "inventor",    domain: "Sciences" },
  // Economists → Sciences (social science)
  { keyword: "economist",   domain: "Sciences" },
  // Psychologist → Sciences
  { keyword: "psychologist", domain: "Society & Social Movements" },
  // Architect → Arts as secondary
  { keyword: "architect",   domain: "Arts, Literature & Culture" },
  // Mathematician → Sciences as secondary
  { keyword: "mathematician", domain: "Sciences" },
  // Explorer → Sciences as secondary (naturalists)
  { keyword: "explorer",    domain: "Sciences" },
  // Journalist → Society
  { keyword: "journalist",  domain: "Society & Social Movements" },
  // Activist → Politics
  { keyword: "activist",    domain: "Politics & Governance" },
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
  // ── Sciences ──────────────────────────────────────────────────────
  { id: "Q169470",  name: "physicist",            limit: 1200, domain: "Sciences" },
  { id: "Q593644",  name: "chemist",              limit: 800,  domain: "Sciences" },
  { id: "Q864503",  name: "biologist",            limit: 600,  domain: "Sciences" },
  { id: "Q11063",   name: "astronomer",           limit: 600,  domain: "Sciences" },
  { id: "Q520549",  name: "geologist",            limit: 400,  domain: "Sciences" },
  { id: "Q2374149", name: "botanist",             limit: 400,  domain: "Sciences" },
  { id: "Q350979",  name: "zoologist",            limit: 300,  domain: "Sciences" },
  { id: "Q2504617", name: "paleontologist",       limit: 200,  domain: "Sciences" },
  { id: "Q2259451", name: "meteorologist",        limit: 150,  domain: "Sciences" },
  { id: "Q39631",   name: "physician",            limit: 600,  domain: "Sciences" },
  { id: "Q774306",  name: "surgeon",              limit: 300,  domain: "Sciences" },
  { id: "Q2640827", name: "pharmacist",           limit: 150,  domain: "Sciences" },
  { id: "Q212980",  name: "psychologist",         limit: 400,  domain: "Sciences" },

  // ── Mathematics & Logic ───────────────────────────────────────────
  { id: "Q170790",  name: "mathematician",        limit: 1200, domain: "Mathematics & Logic" },

  // ── Technology & Engineering ──────────────────────────────────────
  { id: "Q15839134",name: "computer scientist",   limit: 300,  domain: "Technology & Engineering" },
  { id: "Q81096",   name: "engineer",             limit: 800,  domain: "Technology & Engineering" },
  { id: "Q205375",  name: "inventor",             limit: 600,  domain: "Technology & Engineering" },
  { id: "Q11631",   name: "astronaut",            limit: 300,  domain: "Technology & Engineering" },

  // ── Arts, Literature & Culture ────────────────────────────────────
  { id: "Q36180",   name: "writer",               limit: 2000, domain: "Arts, Literature & Culture" },
  { id: "Q49757",   name: "poet",                 limit: 1200, domain: "Arts, Literature & Culture" },
  { id: "Q6625963", name: "novelist",             limit: 1000, domain: "Arts, Literature & Culture" },
  { id: "Q214917",  name: "playwright",           limit: 600,  domain: "Arts, Literature & Culture" },
  { id: "Q1930187", name: "journalist",           limit: 500,  domain: "Arts, Literature & Culture" },
  { id: "Q4853732", name: "essayist",             limit: 300,  domain: "Arts, Literature & Culture" },
  { id: "Q333634",  name: "translator",           limit: 200,  domain: "Arts, Literature & Culture" },
  { id: "Q28389",   name: "screenwriter",         limit: 400,  domain: "Arts, Literature & Culture" },
  { id: "Q1028181", name: "painter",              limit: 1500, domain: "Arts, Literature & Culture" },
  { id: "Q1281618", name: "sculptor",             limit: 500,  domain: "Arts, Literature & Culture" },
  { id: "Q42973",   name: "architect",            limit: 600,  domain: "Arts, Literature & Culture" },
  { id: "Q33231",   name: "photographer",         limit: 400,  domain: "Arts, Literature & Culture" },
  { id: "Q644687",  name: "illustrator",          limit: 300,  domain: "Arts, Literature & Culture" },
  { id: "Q36834",   name: "composer",             limit: 1000, domain: "Arts, Literature & Culture" },
  { id: "Q639669",  name: "musician",             limit: 800,  domain: "Arts, Literature & Culture" },
  { id: "Q177220",  name: "singer",               limit: 300,  domain: "Arts, Literature & Culture" },
  { id: "Q158852",  name: "conductor",            limit: 300,  domain: "Arts, Literature & Culture" },
  { id: "Q33999",   name: "actor",                limit: 1000, domain: "Arts, Literature & Culture" },
  { id: "Q2526255", name: "film director",        limit: 800,  domain: "Arts, Literature & Culture" },
  { id: "Q486748",  name: "dancer",               limit: 200,  domain: "Arts, Literature & Culture" },
  { id: "Q2490358", name: "choreographer",        limit: 150,  domain: "Arts, Literature & Culture" },

  // ── Politics & Governance ─────────────────────────────────────────
  { id: "Q82955",   name: "politician",           limit: 800,  domain: "Politics & Governance" },
  { id: "Q116",     name: "monarch",              limit: 800,  domain: "Politics & Governance" },
  { id: "Q193391",  name: "diplomat",             limit: 400,  domain: "Politics & Governance" },
  { id: "Q82594",   name: "lawyer",               limit: 300,  domain: "Politics & Governance" },
  { id: "Q16533",   name: "judge",                limit: 300,  domain: "Politics & Governance" },

  // ── Economics & Commerce ──────────────────────────────────────────
  { id: "Q188094",  name: "economist",            limit: 600,  domain: "Economics & Commerce" },

  // ── Military, Conflict & Strategy ─────────────────────────────────
  { id: "Q189290",  name: "military officer",     limit: 800,  domain: "Military, Conflict & Strategy" },

  // ── Exploration & Environment ─────────────────────────────────────
  { id: "Q13582652",name: "explorer",             limit: 400,  domain: "Exploration & Environment" },

  // ── Philosophy & Religion ─────────────────────────────────────────
  { id: "Q4964182", name: "philosopher",          limit: 800,  domain: "Philosophy & Religion" },
  { id: "Q1234713", name: "theologian",           limit: 400,  domain: "Philosophy & Religion" },

  // ── Society & Social Movements ────────────────────────────────────
  { id: "Q3621491", name: "historian",            limit: 800,  domain: "Society & Social Movements" },
  { id: "Q10876391",name: "archaeologist",        limit: 300,  domain: "Society & Social Movements" },
  { id: "Q2306091", name: "sociologist",          limit: 300,  domain: "Society & Social Movements" },
  { id: "Q1622272", name: "university professor", limit: 500,  domain: "Society & Social Movements" },
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
      knowledgeType: "Historical Figures",
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
