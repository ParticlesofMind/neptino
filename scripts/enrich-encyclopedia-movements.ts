#!/usr/bin/env tsx
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = resolve(__dirname, "../public/data/encyclopedia/movements.json");
const OUT_PATH = resolve(__dirname, "../public/data/encyclopedia/movements-details.json");
const BATCH = Math.max(1, Math.min(50, parseInt(process.env.BATCH ?? "40", 10)));
const LIMIT = parseInt(process.env.LIMIT ?? "0", 10) || Number.POSITIVE_INFINITY;
const SUMMARY_CONCURRENCY = Math.max(1, parseInt(process.env.SUMMARY_CONCURRENCY ?? "4", 10));

interface CatalogItem { id: string; title: string; wikidataId?: string }

interface Profile {
  wikidataId: string;
  label: string;
  description: string;
  extract: string;
  inception: string | null;
  dissolution: string | null;
  country: string | null;
  field: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
}

interface Timeline { year: number; headline: string; displayDate: string; media: string | null }
interface Field { name: string; description: string }
interface Related { name: string; relation: string; wikidataId: string }
interface Detail { profile: Profile; timeline: Timeline[]; fields: Field[]; related: Related[] }

type Entity = Record<string, unknown>;

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const commons = (file: string, width?: number) => {
  const base = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
  return width ? `${base}?width=${width}` : base;
};

const firstClaimValue = (entity: Entity, prop: string): unknown => {
  const claims = (entity as { claims?: Record<string, unknown> }).claims as
    | Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>
    | undefined;
  const claim = claims?.[prop]?.[0];
  return claim?.mainsnak?.datavalue?.value;
};

const itemIds = (entity: Entity, prop: string, limit = 3): string[] => {
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

const timeToLabel = (time?: string): { year: number; label: string } | null => {
  if (!time) return null;
  const m = time.match(/([+-]?\d{1,4})/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  if (Number.isNaN(year)) return null;
  return { year, label: year < 0 ? `${Math.abs(year)} BCE` : `${year}` };
};

const timelineFrom = (inception: string | undefined, end: string | undefined): Timeline[] => {
  const events: Timeline[] = [];
  const inc = timeToLabel(inception);
  if (inc) events.push({ year: inc.year, headline: "Founded", displayDate: inc.label, media: null });
  const out = timeToLabel(end);
  if (out) events.push({ year: out.year, headline: "Ended", displayDate: out.label, media: null });
  return events;
};

async function fetchEntities(ids: string[], props = "labels|descriptions|claims|sitelinks"): Promise<Record<string, Entity>> {
  if (!ids.length) return {};
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: ids.join("|"),
    format: "json",
    props,
    languages: "en",
    sitefilter: "enwiki",
  });
  const res = await fetch(`https://www.wikidata.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": "Neptino-Encyclopedia/1.1" },
  });
  if (!res.ok) throw new Error(`wbgetentities ${res.status}`);
  const json = (await res.json()) as { entities?: Record<string, Entity> };
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
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

async function fetchSummary(title: string): Promise<{ extract: string; thumb: string | null }> {
  const slug = encodeURIComponent(title.replace(/\s+/g, "_"));
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
    if (!res.ok) return { extract: "", thumb: null };
    const json = (await res.json()) as { extract?: string; thumbnail?: { source?: string } };
    return { extract: json.extract ?? "", thumb: json.thumbnail?.source ?? null };
  } catch {
    return { extract: "", thumb: null };
  }
}

async function fetchSummaries(entries: Array<{ key: string; title: string }>): Promise<Record<string, { extract: string; thumb: string | null }>> {
  const result: Record<string, { extract: string; thumb: string | null }> = {};
  let idx = 0;
  const worker = async () => {
    while (idx < entries.length) {
      const current = entries[idx++];
      result[current.key] = await fetchSummary(current.title);
    }
  };
  await Promise.all(Array.from({ length: SUMMARY_CONCURRENCY }, worker));
  return result;
}

async function build(): Promise<Record<string, Detail>> {
  const raw = readFileSync(SOURCE_PATH, "utf-8");
  const base = JSON.parse(raw) as CatalogItem[];
  const items = base.filter((i) => i.wikidataId).slice(0, LIMIT);

  const detailMap: Record<string, Detail> = {};

  for (const batch of chunk(items, BATCH)) {
    const ids = batch.map((b) => b.wikidataId!) as string[];
    const entities = await fetchEntities(ids);

    const labelIds = new Set<string>();
    const summaryEntries: Array<{ key: string; title: string }> = [];

    for (const item of batch) {
      const entity = entities[item.wikidataId!];
      if (!entity) continue;
      const enTitle = (entity as { sitelinks?: { enwiki?: { title?: string } } }).sitelinks?.enwiki?.title;
      if (enTitle) summaryEntries.push({ key: item.id, title: enTitle });
      itemIds(entity, "P101", 5).forEach((id) => labelIds.add(id));
      itemIds(entity, "P737", 6).forEach((id) => labelIds.add(id));
      const countryId = itemIds(entity, "P17", 1)[0];
      if (countryId) labelIds.add(countryId);
    }

    const labelMap = await fetchLabels([...labelIds]);
    const summaryMap = await fetchSummaries(summaryEntries);

    for (const item of batch) {
      const entity = entities[item.wikidataId!];
      if (!entity) continue;

      const labels = (entity as { labels?: { en?: { value?: string } } }).labels ?? {};
      const descriptions = (entity as { descriptions?: { en?: { value?: string } } }).descriptions ?? {};
      const title = labels.en?.value ?? item.title;
      const summary = summaryMap[item.id] ?? { extract: "", thumb: null };

      const inception = (firstClaimValue(entity, "P571") as { time?: string } | undefined)?.time;
      const dissolved = (firstClaimValue(entity, "P576") as { time?: string } | undefined)?.time;
      const countryId = itemIds(entity, "P17", 1)[0];
      const fieldId = itemIds(entity, "P101", 1)[0];
      const fieldName = fieldId ? labelMap[fieldId] ?? null : null;

      const related: Related[] = [];
      for (const id of itemIds(entity, "P737", 6)) related.push({ name: labelMap[id] ?? id, relation: "influenced by", wikidataId: id });

      const imageFile = firstClaimValue(entity, "P18") as string | undefined;

      const profile: Profile = {
        wikidataId: item.wikidataId!,
        label: title,
        description: descriptions.en?.value ?? "",
        extract: summary.extract || descriptions.en?.value || "",
        inception: inception ? timeToLabel(inception)?.label ?? null : null,
        dissolution: dissolved ? timeToLabel(dissolved)?.label ?? null : null,
        country: countryId ? labelMap[countryId] ?? null : null,
        field: fieldName,
        imageUrl: imageFile ? commons(imageFile) : null,
        thumbnailUrl: imageFile ? commons(imageFile, 320) : summary.thumb,
      };

      const fields: Field[] = fieldName ? [{ name: fieldName, description: "" }] : [];
      const timeline = timelineFrom(inception, dissolved);

      detailMap[item.id] = { profile, timeline, fields, related };
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  return detailMap;
}

(async () => {
  try {
    const details = await build();
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(details), "utf-8");
    console.log(`[movements] wrote ${Object.keys(details).length} detail records to ${OUT_PATH}`);
  } catch (err) {
    console.error("[movements] failed", err);
    process.exit(1);
  }
})();
