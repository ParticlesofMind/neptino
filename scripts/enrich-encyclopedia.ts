#!/usr/bin/env tsx
/**
 * Offline enrichment for encyclopedia figures.
 * Reads the generated catalog JSON and prefetches Wikidata + Wikipedia fields in batches.
 * Outputs a single detail map consumable by the frontend so no client-side scraping is needed.
 *
 * Usage: npx tsx scripts/enrich-encyclopedia.ts [env]
 *   LIMIT=500   // optional: process only the first N figures (debug)
 *   BATCH=40    // optional: Wikidata wbgetentities batch size (max 50)
 *   SUMMARY_CONCURRENCY=4 // Wikipedia summary fetch concurrency
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type KnowledgeItem = {
  id: string;
  title: string;
  wikidataId?: string;
};

type WikidataProfile = {
  wikidataId: string;
  label: string;
  description: string;
  extract: string;
  birthDate: string | null;
  deathDate: string | null;
  birthPlace: string | null;
  deathPlace: string | null;
  occupation: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
};

type WikidataTimelineEvent = {
  year: number;
  headline: string;
  displayDate: string;
  media: string | null;
};

type WikidataFieldOfWork = { name: string; description: string };

type WikidataRelatedPerson = { name: string; relation: string; wikidataId: string };

type WikidataFigureData = {
  profile: WikidataProfile;
  timeline: WikidataTimelineEvent[];
  fields: WikidataFieldOfWork[];
  related: WikidataRelatedPerson[];
};

type EntityMap = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = resolve(__dirname, "../public/data/encyclopedia/historical-figures.json");
const OUT_PATH = resolve(__dirname, "../public/data/encyclopedia/historical-figures-details.json");

const BATCH_SIZE = Math.max(1, Math.min(50, parseInt(process.env.BATCH ?? "40", 10)));
const LIMIT = parseInt(process.env.LIMIT ?? "0", 10) || Number.POSITIVE_INFINITY;
const SUMMARY_CONCURRENCY = Math.max(1, parseInt(process.env.SUMMARY_CONCURRENCY ?? "4", 10));

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const commonsUrl = (fileName: string, width?: number): string => {
  const base = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
  return width ? `${base}?width=${width}` : base;
};

const toYear = (timeValue: string | undefined): { year: number; display: string } | null => {
  if (!timeValue) return null;
  const m = timeValue.match(/([+-]?\d{1,4})/);
  if (!m) return null;
  const rawYear = parseInt(m[1], 10);
  if (Number.isNaN(rawYear)) return null;
  return { year: rawYear, display: rawYear < 0 ? `${Math.abs(rawYear)} BCE` : `${rawYear}` };
};

const fmtDate = (timeValue: string | undefined): string | null => {
  const y = toYear(timeValue);
  if (!y) return null;
  return y.year < 0 ? y.display : y.display;
};

const firstClaimValue = (entity: EntityMap, prop: string): unknown => {
  const claims = (entity as { claims?: Record<string, unknown> }).claims as
    | Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>
    | undefined;
  const claim = claims?.[prop]?.[0];
  return claim?.mainsnak?.datavalue?.value;
};

const itemIds = (entity: EntityMap, prop: string, limit = 3): string[] => {
  const claims = (entity as { claims?: Record<string, unknown> }).claims as
    | Record<string, { mainsnak?: { datavalue?: { value?: { id?: string } } } }[]>
    | undefined;
  const entries = claims?.[prop] ?? [];
  const ids: string[] = [];
  for (const c of entries) {
    const id = c?.mainsnak?.datavalue?.value && (c.mainsnak.datavalue.value as { id?: string }).id;
    if (id && ids.length < limit) ids.push(id);
  }
  return ids;
};

const timelineFromDates = (birth: string | undefined, death: string | undefined): WikidataTimelineEvent[] => {
  const events: WikidataTimelineEvent[] = [];
  const b = toYear(birth);
  if (b) events.push({ year: b.year, headline: "Born", displayDate: b.display, media: null });
  const d = toYear(death);
  if (d) events.push({ year: d.year, headline: "Died", displayDate: d.display, media: null });
  return events;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/*  Wikidata + Wikipedia fetchers                                     */
/* ------------------------------------------------------------------ */

async function fetchEntities(ids: string[], props = "labels|descriptions|claims|sitelinks"): Promise<Record<string, EntityMap>> {
  if (!ids.length) return {};
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: ids.join("|"),
    format: "json",
    props,
    languages: "en",
    sitefilter: "enwiki",
  });
  const url = `https://www.wikidata.org/w/api.php?${params.toString()}`;
  const res = await fetch(url, { headers: { "User-Agent": "Neptino-Encyclopedia/1.0" } });
  if (!res.ok) throw new Error(`wbgetentities ${res.status}`);
  const json = (await res.json()) as { entities?: Record<string, EntityMap> };
  return json.entities ?? {};
}

async function fetchLabels(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const group of chunk(ids, 50)) {
    const ents = await fetchEntities(group, "labels");
    for (const [id, entity] of Object.entries(ents)) {
      const label = (entity as { labels?: { en?: { value?: string } } }).labels?.en?.value;
      if (label) out[id] = label;
    }
    await delay(200);
  }
  return out;
}

async function fetchSummary(title: string): Promise<{ extract: string; thumb: string | null }> {
  const slug = encodeURIComponent(title.replace(/\s+/g, "_"));
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
  if (!res.ok) return { extract: "", thumb: null };
  const json = (await res.json()) as { extract?: string; thumbnail?: { source?: string } };
  return { extract: json.extract ?? "", thumb: json.thumbnail?.source ?? null };
}

async function fetchSummaries(titles: Array<{ key: string; title: string }>): Promise<Record<string, { extract: string; thumb: string | null }>> {
  const result: Record<string, { extract: string; thumb: string | null }> = {};
  let idx = 0;
  const worker = async () => {
    while (idx < titles.length) {
      const current = titles[idx++];
      try {
        result[current.key] = await fetchSummary(current.title);
      } catch (err) {
        console.warn(`[enrich] summary failed for ${current.title}:`, err);
        result[current.key] = { extract: "", thumb: null };
      }
    }
  };
  await Promise.all(Array.from({ length: SUMMARY_CONCURRENCY }, worker));
  return result;
}

/* ------------------------------------------------------------------ */
/*  Main enrichment                                                    */
/* ------------------------------------------------------------------ */

async function build(): Promise<Record<string, WikidataFigureData>> {
  const raw = readFileSync(SOURCE_PATH, "utf-8");
  const base = JSON.parse(raw) as KnowledgeItem[];
  const items = base.filter((i) => i.wikidataId).slice(0, LIMIT);

  console.log(`[enrich] Loaded ${items.length} figures (source: ${SOURCE_PATH})`);

  const detailMap: Record<string, WikidataFigureData> = {};

  for (const [batchIndex, batch] of chunk(items, BATCH_SIZE).entries()) {
    const ids = batch.map((b) => b.wikidataId!) as string[];
    console.log(`[enrich] Batch ${batchIndex + 1}: fetching ${ids.length} ids…`);
    const entities = await fetchEntities(ids);

    const labelIds = new Set<string>();
    const summaries: Array<{ key: string; title: string }> = [];

    for (const item of batch) {
      const entity = entities[item.wikidataId!];
      if (!entity) continue;
      const enTitle = (entity as { sitelinks?: { enwiki?: { title?: string } } }).sitelinks?.enwiki?.title;
      if (enTitle) summaries.push({ key: item.id, title: enTitle });

      itemIds(entity, "P106", 3).forEach((id) => labelIds.add(id)); // occupations
      itemIds(entity, "P101", 5).forEach((id) => labelIds.add(id)); // fields of work
      itemIds(entity, "P737", 4).forEach((id) => labelIds.add(id)); // influenced by
      itemIds(entity, "P802", 4).forEach((id) => labelIds.add(id)); // students
      itemIds(entity, "P1066", 2).forEach((id) => labelIds.add(id)); // student of
      itemIds(entity, "P184", 2).forEach((id) => labelIds.add(id)); // doctoral advisor
      itemIds(entity, "P19", 1).forEach((id) => labelIds.add(id)); // birth place
      itemIds(entity, "P20", 1).forEach((id) => labelIds.add(id)); // death place
    }

    const labelMap = await fetchLabels([...labelIds]);
    const summaryMap = await fetchSummaries(summaries);

    for (const item of batch) {
      const entity = entities[item.wikidataId!];
      if (!entity) continue;

      const labels = (entity as { labels?: { en?: { value?: string } } }).labels ?? {};
      const descriptions = (entity as { descriptions?: { en?: { value?: string } } }).descriptions ?? {};
      const title = labels.en?.value ?? item.title;
      const summary = summaryMap[item.id] ?? { extract: "", thumb: null };

      const birthDate = (firstClaimValue(entity, "P569") as { time?: string } | undefined)?.time;
      const deathDate = (firstClaimValue(entity, "P570") as { time?: string } | undefined)?.time;
      const birthPlaceId = itemIds(entity, "P19", 1)[0];
      const deathPlaceId = itemIds(entity, "P20", 1)[0];
      const occupations = itemIds(entity, "P106", 3);
      const fields = itemIds(entity, "P101", 6).map((id) => ({ name: labelMap[id] ?? id, description: "" }));

      const related: WikidataRelatedPerson[] = [];
      for (const id of itemIds(entity, "P737", 4)) {
        related.push({ name: labelMap[id] ?? id, relation: "influenced by", wikidataId: id });
      }
      for (const id of itemIds(entity, "P802", 3)) {
        related.push({ name: labelMap[id] ?? id, relation: "student", wikidataId: id });
      }
      for (const id of itemIds(entity, "P1066", 2)) {
        related.push({ name: labelMap[id] ?? id, relation: "student of", wikidataId: id });
      }
      for (const id of itemIds(entity, "P184", 2)) {
        related.push({ name: labelMap[id] ?? id, relation: "doctoral advisor", wikidataId: id });
      }

      const imageFile = firstClaimValue(entity, "P18") as string | undefined;
      const profile: WikidataProfile = {
        wikidataId: item.wikidataId!,
        label: title,
        description: descriptions.en?.value ?? "",
        extract: summary.extract || descriptions.en?.value || "",
        birthDate: fmtDate(birthDate),
        deathDate: fmtDate(deathDate),
        birthPlace: birthPlaceId ? labelMap[birthPlaceId] ?? null : null,
        deathPlace: deathPlaceId ? labelMap[deathPlaceId] ?? null : null,
        occupation: occupations.length ? labelMap[occupations[0]] ?? null : null,
        imageUrl: imageFile ? commonsUrl(imageFile) : null,
        thumbnailUrl: imageFile ? commonsUrl(imageFile, 320) : summary.thumb,
      };

      const timeline = timelineFromDates(birthDate, deathDate);

      detailMap[item.id] = { profile, timeline, fields, related };
    }

    await delay(400); // polite pause between batches
  }

  return detailMap;
}

/* ------------------------------------------------------------------ */
/*  Entrypoint                                                        */
/* ------------------------------------------------------------------ */

(async () => {
  try {
    console.log("╔════════════════════════════════════════╗");
    console.log("║   Neptino Encyclopedia Enrichment      ║");
    console.log("╚════════════════════════════════════════╝");

    const details = await build();
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(details), "utf-8");
    console.log(`[enrich] Wrote ${Object.keys(details).length} records → ${OUT_PATH}`);
  } catch (err) {
    console.error("[enrich] Fatal error", err);
    process.exit(1);
  }
})();
