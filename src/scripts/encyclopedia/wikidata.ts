/**
 * Wikidata + Wikipedia data fetching for Encyclopedia cards.
 *
 * Design: dead-simple, no queues, no parallelism.
 * - One SPARQL call at a time, sequential within each figure.
 * - 10-second AbortController timeout per request.
 * - Every public function catches errors and returns defaults.
 * - Console logging at every step for debugging.
 * - Session cache so data is never re-fetched.
 */

const SPARQL = "https://query.wikidata.org/sparql";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WikidataProfile {
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
}

export interface WikidataTimelineEvent {
  year: number;
  headline: string;
  media: string | null;
}

export interface WikidataFieldOfWork {
  name: string;
  description: string;
}

export interface WikidataRelatedPerson {
  name: string;
  relation: string;
  wikidataId: string;
}

export interface WikidataFigureData {
  profile: WikidataProfile;
  timeline: WikidataTimelineEvent[];
  fields: WikidataFieldOfWork[];
  related: WikidataRelatedPerson[];
}

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

const cache = new Map<string, WikidataFigureData>();

/* ------------------------------------------------------------------ */
/*  Core: run ONE SPARQL query                                         */
/* ------------------------------------------------------------------ */

type Row = Record<string, string>;

async function query(sparql: string): Promise<Row[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  const url = `${SPARQL}?query=${encodeURIComponent(sparql)}&format=json`;

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/sparql-results+json" },
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[wiki] SPARQL responded ${res.status}`);
      return [];
    }

    const json = (await res.json()) as {
      results: { bindings: Record<string, { value: string }>[] };
    };

    return json.results.bindings.map((b) => {
      const row: Row = {};
      for (const [k, v] of Object.entries(b)) row[k] = v.value;
      return row;
    });
  } catch (err) {
    clearTimeout(timer);
    console.warn("[wiki] SPARQL fetch failed:", err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Wikipedia extract (REST API, not SPARQL)                           */
/* ------------------------------------------------------------------ */

async function getExtract(title: string): Promise<string> {
  const slug = encodeURIComponent(title.replace(/\s+/g, "_"));
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`,
    );
    if (!res.ok) return "";
    const json = (await res.json()) as { extract?: string };
    return json.extract ?? "";
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function thumbUrl(commonsFile: string, w = 300): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsFile)}?width=${w}`;
}

function fmtDate(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const bce = raw.startsWith("-");
    const d = new Date(bce ? raw.slice(1) : raw);
    if (isNaN(d.getTime())) return raw;
    const s = `${d.toLocaleString("en-US", { month: "long" })} ${d.getDate()}, ${d.getFullYear()}`;
    return bce ? `${s} BCE` : s;
  } catch {
    return raw;
  }
}

function dedup<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = key(x).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/*  Individual data fetchers (each = 1 SPARQL call)                    */
/* ------------------------------------------------------------------ */

async function profileQuery(id: string, title: string): Promise<WikidataProfile> {
  console.log(`[wiki] ${title}: fetching profile…`);

  // Two queries: one for core facts (no Cartesian product), one for occupations
  const rows = await query(`
    SELECT ?label ?description ?birthDate ?deathDate
           ?birthPlaceLabel ?deathPlaceLabel ?image
    WHERE {
      wd:${id} rdfs:label ?label . FILTER(LANG(?label)="en")
      OPTIONAL { wd:${id} schema:description ?description . FILTER(LANG(?description)="en") }
      OPTIONAL { wd:${id} wdt:P569 ?birthDate }
      OPTIONAL { wd:${id} wdt:P570 ?deathDate }
      OPTIONAL { wd:${id} wdt:P19 ?bp . ?bp rdfs:label ?birthPlaceLabel . FILTER(LANG(?birthPlaceLabel)="en") }
      OPTIONAL { wd:${id} wdt:P20 ?dp . ?dp rdfs:label ?deathPlaceLabel . FILTER(LANG(?deathPlaceLabel)="en") }
      OPTIONAL { wd:${id} wdt:P18 ?image }
    } LIMIT 1
  `);

  // Separate query for occupations to avoid Cartesian product
  const occRows = await query(`
    SELECT ?occupationLabel WHERE {
      wd:${id} wdt:P106 ?occ .
      ?occ rdfs:label ?occupationLabel . FILTER(LANG(?occupationLabel)="en")
    } LIMIT 5
  `);
  // Pick most descriptive occupation (longest label, skip generic ones)
  const occupations = occRows
    .map((r) => r.occupationLabel)
    .filter((o) => o && !['person', 'human'].includes(o.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  const bestOccupation = occupations[0] ?? null;

  const r = rows[0];
  if (!r) {
    console.warn(`[wiki] ${title}: profile query returned 0 rows`);
    return emptyProfile(id, title);
  }

  console.log(`[wiki] ${title}: profile OK — label="${r.label}", birth="${r.birthDate}"`);

  let thumbnailUrl: string | null = null;
  if (r.image) {
    const fn = decodeURIComponent(r.image.split("/").pop() ?? "");
    if (fn) thumbnailUrl = thumbUrl(fn);
  }

  // Wikipedia extract (separate REST call)
  console.log(`[wiki] ${title}: fetching Wikipedia extract…`);
  const extract = await getExtract(r.label ?? title);
  console.log(`[wiki] ${title}: extract ${extract ? `OK (${extract.length} chars)` : "empty"}`);

  return {
    wikidataId: id,
    label: r.label ?? title,
    description: r.description ?? "",
    extract,
    birthDate: fmtDate(r.birthDate),
    deathDate: fmtDate(r.deathDate),
    birthPlace: r.birthPlaceLabel ?? null,
    deathPlace: r.deathPlaceLabel ?? null,
    occupation: bestOccupation,
    imageUrl: r.image ?? null,
    thumbnailUrl,
  };
}

async function timelineQuery(id: string, title: string): Promise<WikidataTimelineEvent[]> {
  console.log(`[wiki] ${title}: fetching timeline…`);

  // Broad query: birth, death, positions held, education, employer, awards,
  // significant events — ALL requiring a date (no OPTIONAL dates that return empty).
  const rows = await query(`
    SELECT ?eventLabel ?date WHERE {
      { BIND("Born" AS ?eventLabel) wd:${id} wdt:P569 ?date . }
      UNION { BIND("Died" AS ?eventLabel) wd:${id} wdt:P570 ?date . }
      UNION { wd:${id} p:P39 ?s . ?s ps:P39 ?pos .
              ?pos rdfs:label ?eventLabel . FILTER(LANG(?eventLabel)="en")
              ?s pq:P580 ?date . }
      UNION { wd:${id} p:P69 ?s . ?s ps:P69 ?sc .
              ?sc rdfs:label ?eventLabel . FILTER(LANG(?eventLabel)="en")
              ?s pq:P580 ?date . }
      UNION { wd:${id} p:P108 ?s . ?s ps:P108 ?emp .
              ?emp rdfs:label ?eventLabel . FILTER(LANG(?eventLabel)="en")
              ?s pq:P580 ?date . }
      UNION { wd:${id} p:P166 ?s . ?s ps:P166 ?a .
              ?a rdfs:label ?eventLabel . FILTER(LANG(?eventLabel)="en")
              ?s pq:P585 ?date . }
      UNION { wd:${id} p:P793 ?s . ?s ps:P793 ?e .
              ?e rdfs:label ?eventLabel . FILTER(LANG(?eventLabel)="en")
              ?s pq:P585 ?date . }
    } ORDER BY ?date LIMIT 20
  `);

  const events = dedup(
    rows
      .filter((r) => r.date && r.eventLabel)
      .map((r) => {
        const raw = r.date;
        const bce = raw.startsWith("-");
        const d = new Date(bce ? raw.slice(1) : raw);
        const year = bce ? -d.getFullYear() : d.getFullYear();
        const headline = (r.eventLabel ?? "Event").split(/\s+/).slice(0, 6).join(" ");
        return { year, headline, media: null };
      }),
    (e) => `${e.year}:${e.headline}`,
  ).slice(0, 7);

  console.log(`[wiki] ${title}: timeline OK — ${events.length} dated events`);
  return events;
}

async function fieldsQuery(id: string, title: string): Promise<WikidataFieldOfWork[]> {
  console.log(`[wiki] ${title}: fetching fields of work…`);

  const rows = await query(`
    SELECT DISTINCT ?fieldLabel ?fieldDesc WHERE {
      { wd:${id} wdt:P101 ?f }
      UNION
      { wd:${id} wdt:P800 ?w . ?w wdt:P361 ?f }
      ?f rdfs:label ?fieldLabel . FILTER(LANG(?fieldLabel)="en")
      OPTIONAL { ?f schema:description ?fieldDesc . FILTER(LANG(?fieldDesc)="en") }
    } LIMIT 10
  `);

  const fields = dedup(
    rows.map((r) => ({ name: r.fieldLabel ?? "Unknown", description: r.fieldDesc ?? "" })),
    (f) => f.name,
  );

  console.log(`[wiki] ${title}: fields OK — ${fields.length} fields`);
  return fields;
}

async function relatedQuery(id: string, title: string): Promise<WikidataRelatedPerson[]> {
  console.log(`[wiki] ${title}: fetching related people…`);

  const rows = await query(`
    SELECT DISTINCT ?personLabel ?personId ?relation WHERE {
      { wd:${id} wdt:P1066 ?p . BIND("teacher" AS ?relation) }
      UNION { wd:${id} wdt:P184  ?p . BIND("doctoral advisor" AS ?relation) }
      UNION { wd:${id} wdt:P802  ?p . BIND("student" AS ?relation) }
      UNION { wd:${id} wdt:P185  ?p . BIND("doctoral student" AS ?relation) }
      UNION { wd:${id} wdt:P737  ?p . BIND("influenced by" AS ?relation) }
      UNION { ?q wdt:P737 wd:${id} . BIND(?q AS ?p) BIND("influenced" AS ?relation) }
      UNION { wd:${id} wdt:P26   ?p . BIND("spouse" AS ?relation) }
      ?p rdfs:label ?personLabel . FILTER(LANG(?personLabel)="en")
      BIND(REPLACE(STR(?p),"http://www.wikidata.org/entity/","") AS ?personId)
    } LIMIT 12
  `);

  const people = dedup(
    rows.map((r) => ({
      name: r.personLabel ?? "Unknown",
      relation: r.relation ?? "",
      wikidataId: r.personId ?? "",
    })),
    (p) => p.name,
  );

  console.log(`[wiki] ${title}: related OK — ${people.length} people`);
  return people;
}

/* ------------------------------------------------------------------ */
/*  Empty profile fallback                                             */
/* ------------------------------------------------------------------ */

function emptyProfile(id: string, title: string): WikidataProfile {
  return {
    wikidataId: id,
    label: title,
    description: "",
    extract: "",
    birthDate: null,
    deathDate: null,
    birthPlace: null,
    deathPlace: null,
    occupation: null,
    imageUrl: null,
    thumbnailUrl: null,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API: fetch everything for one figure                        */
/* ------------------------------------------------------------------ */

export async function fetchFigureData(
  wikidataId: string,
  title: string,
): Promise<WikidataFigureData> {
  // Return from cache if available
  if (cache.has(wikidataId)) {
    console.log(`[wiki] ${title}: returning cached data`);
    return cache.get(wikidataId)!;
  }

  console.log(`[wiki] ▶ Starting ${title} (${wikidataId})`);

  // Run queries one at a time with small pauses between them.
  // Each query has its own try/catch so one failure doesn't kill the rest.

  let profile: WikidataProfile;
  try {
    profile = await profileQuery(wikidataId, title);
  } catch (err) {
    console.warn(`[wiki] ${title}: profile error`, err);
    profile = emptyProfile(wikidataId, title);
  }

  await sleep(250);

  let timeline: WikidataTimelineEvent[] = [];
  try {
    timeline = await timelineQuery(wikidataId, title);
  } catch (err) {
    console.warn(`[wiki] ${title}: timeline error`, err);
  }

  await sleep(250);

  let fields: WikidataFieldOfWork[] = [];
  try {
    fields = await fieldsQuery(wikidataId, title);
  } catch (err) {
    console.warn(`[wiki] ${title}: fields error`, err);
  }

  await sleep(250);

  let related: WikidataRelatedPerson[] = [];
  try {
    related = await relatedQuery(wikidataId, title);
  } catch (err) {
    console.warn(`[wiki] ${title}: related error`, err);
  }

  const data: WikidataFigureData = { profile, timeline, fields, related };
  cache.set(wikidataId, data);

  console.log(`[wiki] ✔ Done ${title}`);
  return data;
}
