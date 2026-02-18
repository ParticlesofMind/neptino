import { fetchFigureData, type WikidataProfile, type WikidataFigureData, type WikidataRelatedPerson, type WikidataTimelineEvent } from "./encyclopedia/wikidata";
import {
  fetchManifest,
  fetchItems,
  fetchItemDetail,
  fetchMedia,
  parseRoute,
  PAGE_SIZE,
  type EncyclopediaListItem,
  type EncyclopediaDetailItem,
  type EncyclopediaFilters,
  type EncyclopediaManifest,
  type EncyclopediaMediaItem,
} from "./encyclopedia/encyclopediaApi.js";

type EntityType =
  | "Person"
  | "Event"
  | "Location"
  | "Concept / Theory"
  | "Invention / Technology"
  | "Work"
  | "Institution"
  | "Movement / School"
  | "Era / Period";

/**
 * KnowledgeItem is the UI-facing shape. We map DB rows (snake_case)
 * into this camelCase form so existing rendering code stays untouched.
 */
type KnowledgeItem = {
  id: string;
  title: string;
  wikidataId?: string;
  knowledgeType: EntityType;
  domain: string;
  secondaryDomains: string[];
  eraGroup: "ancient" | "early-modern" | "modern" | "contemporary";
  eraLabel: string;
  depth: "foundation" | "intermediate" | "advanced";
  summary: string;
  tags: string[];
};

/** Convert a Supabase row into the UI KnowledgeItem shape */
function rowToKnowledgeItem(row: EncyclopediaListItem): KnowledgeItem {
  return {
    id: row.id,
    title: row.title,
    wikidataId: row.wikidata_id ?? undefined,
    knowledgeType: (row.knowledge_type ?? "Person") as EntityType,
    domain: row.domain ?? "Unknown",
    secondaryDomains: row.secondary_domains ?? [],
    eraGroup: row.era_group ?? "modern",
    eraLabel: row.era_label ?? "",
    depth: row.depth ?? "intermediate",
    summary: row.summary ?? "",
    tags: row.tags ?? [],
  };
}

/** All Wikidata data indexed by item id */
const wdData = new Map<string, WikidataFigureData>();

// Feature flag: turn off remote Wikidata enrichment to speed up page load when
// the data already lives in Supabase/local JSON. Defaults to false unless
// explicitly enabled via Vite env.
const ENABLE_ENRICHMENT = (import.meta.env?.VITE_ENCYCLOPEDIA_ENRICH ?? "false") === "true";

type DisplayMode = "small" | "large";

/** Items currently shown in the UI (the current page from Supabase) */
let knowledgeItems: KnowledgeItem[] = [];

/** Pagination & search state */
let currentPage = 0;
let totalCount = 0;
let searchQuery = "";
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let activeFilters: EncyclopediaFilters = {};
let manifest: EncyclopediaManifest | null = null;
/** True while a fetch is in-flight — prevents duplicate requests */
let isFetching = false;

const form = document.getElementById("knowledge-search-form") as HTMLFormElement | null;
const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
const disciplineSelect = document.getElementById("discipline-select") as HTMLSelectElement | null;
const typeSelect = document.getElementById("type-select") as HTMLSelectElement | null;
const mediaSelect = document.getElementById("media-select") as HTMLSelectElement | null;
const resultCountEl = document.getElementById("result-count");
const cardGridEl = document.getElementById("card-grid");
const clearButton = document.getElementById("clear-filters");
const displayButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".display-toggle"));
const paginationEl = document.getElementById("pagination-controls");

let displayMode: DisplayMode = "small";

/** Cache of Wikipedia thumbnail URLs keyed by wikidata_id (e.g. "Q937") */
const thumbnailCache = new Map<string, string>();

/** How many cards to render per batch (within a single page of results) */
const CARD_BATCH = PAGE_SIZE;
let renderedCount = 0;
let scrollSentinelObserver: IntersectionObserver | null = null;

const getCheckedValues = (name: string) =>
  Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)).map((el) => el.value);

const formatBadge = (text: string) =>
  `<span class="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100">${text}</span>`;

const initialsFor = (title: string) =>
  title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

const artworkFor = (type: KnowledgeItem["knowledgeType"]) => {
  const palette: Record<EntityType, string> = {
    "Person": "from-amber-100 via-amber-200 to-orange-200 text-amber-900",
    "Event": "from-blue-100 via-cyan-200 to-sky-200 text-blue-900",
    "Concept / Theory": "from-emerald-100 via-teal-200 to-green-200 text-emerald-900",
    "Location": "from-violet-100 via-purple-200 to-fuchsia-200 text-violet-900",
    "Invention / Technology": "from-slate-100 via-gray-200 to-zinc-200 text-slate-900",
    "Work": "from-rose-100 via-pink-200 to-red-200 text-rose-900",
    "Institution": "from-indigo-100 via-blue-200 to-sky-200 text-indigo-900",
    "Movement / School": "from-lime-100 via-green-200 to-emerald-200 text-lime-900",
    "Era / Period": "from-yellow-100 via-amber-200 to-yellow-200 text-yellow-900",
  };
  const label: Record<EntityType, string> = {
    "Person": "Person",
    "Event": "Event",
    "Concept / Theory": "Concept",
    "Location": "Location",
    "Invention / Technology": "Invention",
    "Work": "Work",
    "Institution": "Institution",
    "Movement / School": "Movement",
    "Era / Period": "Era",
  };
  return {
    gradient: palette[type] ?? "from-neutral-100 via-neutral-200 to-neutral-300 text-neutral-800",
    label: label[type] ?? type,
  };
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/* ------------------------------------------------------------------ */
/*  Lazy enrichment via IntersectionObserver                           */
/* ------------------------------------------------------------------ */

let enrichObserver: IntersectionObserver | null = null;

/** Enrich a single card when it becomes visible */
const enrichOnVisible = (entries: IntersectionObserverEntry[]) => {
  if (!ENABLE_ENRICHMENT) return;
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const el = entry.target as HTMLElement;
    const itemId = el.id;
    if (!itemId || wdData.has(itemId)) {
      enrichObserver?.unobserve(el);
      continue;
    }
    const item = knowledgeItems.find((i) => i.id === itemId);
    if (!item?.wikidataId) {
      enrichObserver?.unobserve(el);
      continue;
    }
    enrichObserver?.unobserve(el);
    fetchFigureData(item.wikidataId, item.title)
      .then((data: WikidataFigureData) => {
        wdData.set(itemId, data);
        // Update only this single card instead of re-rendering everything
        updateSingleCard(itemId);
        requestAnimationFrame(mountTimelines);
      })
      .catch((err: unknown) => console.warn(`[encyclopedia] Failed for ${item.title}:`, err));
  }
};

/** Start observing all rendered card elements */
const observeCards = () => {
  if (!ENABLE_ENRICHMENT) return;
  if (!enrichObserver) {
    enrichObserver = new IntersectionObserver(enrichOnVisible, { rootMargin: "200px" });
  }
  if (!cardGridEl) return;
  cardGridEl.querySelectorAll<HTMLElement>("article[id]").forEach((el) => {
    if (!wdData.has(el.id)) enrichObserver!.observe(el);
  });
};

/** Format a Wikidata field for display, with fallback */
const wdField = (value: string | null | undefined, fallback = "Not provided") => value ?? fallback;

/**
 * Build active filters from the current UI state and trigger a Supabase
 * query. Replaces the old client-side matchesFilters approach.
 */
function buildFiltersFromUI(): EncyclopediaFilters {
  const discipline = disciplineSelect?.value ?? "all";
  const knowledgeType = typeSelect?.value ?? "all";
  const mediaType = mediaSelect?.value ?? "all";
  const eras = getCheckedValues("era");
  const depths = getCheckedValues("depth");

  return {
    knowledge_type: knowledgeType !== "all" ? knowledgeType : null,
    domain: discipline !== "all" ? discipline : null,
    era_group: eras.length === 1 ? eras[0] as EncyclopediaFilters["era_group"] : null,
    depth: depths.length === 1 ? depths[0] as EncyclopediaFilters["depth"] : null,
    media_type: mediaType !== "all" ? mediaType : null,
  };
}

/** Build the bottom section HTML for large-size cards — three stacked panels */
const renderLargeCardBottom = (
  item: KnowledgeItem,
  _wd: WikidataProfile | undefined,
  timelineItems: WikidataTimelineEvent[],
): string => {
  /* -------------------------------------------------------------- */
  /*  1. TIMELINE — Knight Lab TimelineJS container                  */
  /* -------------------------------------------------------------- */

  const dated = ENABLE_ENRICHMENT ? timelineItems.filter((e) => e.year !== 0).slice(0, 7) : [];
  const timelineContainerId = `timeline-${item.id}`;

  let timelineHtml: string;
  if (!ENABLE_ENRICHMENT) {
    timelineHtml = '<p class="text-sm text-neutral-500 italic">Enrichment disabled for speed.</p>';
  } else if (dated.length === 0) {
    timelineHtml = '<p class="text-sm text-neutral-500 italic">Timeline loading…</p>';
  } else {
    // The div will be initialized by mountTimelines() after render
    timelineHtml = `<div id="${timelineContainerId}" class="w-full" style="height:150px;"></div>`;
  }

  /* -------------------------------------------------------------- */
  /*  2. RELATED KNOWLEDGE — fields of work from Wikidata            */
  /* -------------------------------------------------------------- */

  const fields = ENABLE_ENRICHMENT ? wdData.get(item.id)?.fields ?? [] : [];
  const knowledgeRows =
    (fields.length > 0 ? fields.slice(0, 6) : [item.domain, ...item.secondaryDomains].slice(0, 6).map((d) => ({ name: d, description: "" })))
      .map(
        (f: { name: string; description: string }) => `
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 flex-shrink-0 rounded-full bg-primary-400"></span>
            <span class="font-medium text-neutral-900">${capitalize(f.name)}</span>
          </div>
        `,
      )
      .join("");

  /* -------------------------------------------------------------- */
  /*  3. RELATED HISTORICAL FIGURES from Wikidata                    */
  /* -------------------------------------------------------------- */

  const related = ENABLE_ENRICHMENT ? wdData.get(item.id)?.related ?? [] : [];
  const relatedRows =
    !ENABLE_ENRICHMENT
      ? '<p class="text-base text-neutral-500 italic">Enrichment disabled for speed.</p>'
      : related.length > 0
        ? related
            .slice(0, 6)
            .map(
              (p: WikidataRelatedPerson) => `
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400"></span>
                  <span class="font-medium text-neutral-900">${p.name}</span>
                  <span class="text-neutral-400">·</span>
                  <span class="text-neutral-500">${capitalize(p.relation)}</span>
                </div>
              `,
            )
            .join("")
        : '<p class="text-base text-neutral-500 italic">Loading…</p>';

  /* -------------------------------------------------------------- */
  /*  Assemble — all three stacked vertically                        */
  /* -------------------------------------------------------------- */

  return `
    <div class="mt-4 space-y-4">

      <div class="rounded-xl border border-neutral-200 bg-white/60 p-3">
        ${timelineHtml}
      </div>

      <div class="rounded-xl border border-neutral-200 bg-white/60 px-5 py-4">
        <div class="flex flex-col gap-3">
          <span class="font-semibold text-sm text-neutral-500 uppercase tracking-[0.12em]">Knowledge</span>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-base text-neutral-700">${knowledgeRows}</div>
        </div>
      </div>

      <div class="rounded-xl border border-neutral-200 bg-white/60 px-5 py-4">
        <div class="flex flex-col gap-3">
          <span class="font-semibold text-sm text-neutral-500 uppercase tracking-[0.12em]">Related</span>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-base text-neutral-700">${relatedRows}</div>
        </div>
      </div>

    </div>
  `;
};

/* ------------------------------------------------------------------ */
/*  Wikipedia thumbnail batch-fetching                                 */
/* ------------------------------------------------------------------ */

/**
 * Fetch Wikipedia thumbnails for a batch of items by their wikidata_id.
 * Uses the Wikidata API (wbgetentities) to grab P18 (image) claims,
 * then converts the Commons filename into a thumbnail URL.
 * Results are cached so we never re-fetch the same QID.
 */
async function fetchThumbnails(items: KnowledgeItem[]): Promise<void> {
  const qids = items
    .map((i) => i.wikidataId)
    .filter((q): q is string => !!q && !thumbnailCache.has(q));
  if (qids.length === 0) return;

  // Wikidata allows up to 50 ids per request
  const batchSize = 50;
  for (let i = 0; i < qids.length; i += batchSize) {
    const batch = qids.slice(i, i + batchSize);
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join("|")}&props=claims&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json() as {
        entities: Record<string, { claims?: { P18?: Array<{ mainsnak: { datavalue?: { value: string } } }> } }>;
      };

      for (const [qid, entity] of Object.entries(json.entities)) {
        const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (filename) {
          // Commons Special:FilePath handles redirects and generates thumbnails
          const thumbUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename.replace(/ /g, "_"))}?width=300`;
          thumbnailCache.set(qid, thumbUrl);
        } else {
          thumbnailCache.set(qid, ""); // mark as "no image"
        }
      }
    } catch (err) {
      console.warn("[encyclopedia] Thumbnail batch fetch failed:", err);
    }
  }
}

/** Get a cached thumbnail src for an item, or "" if none */
const thumbFor = (item: KnowledgeItem): string =>
  (item.wikidataId ? thumbnailCache.get(item.wikidataId) : "") ?? "";

/* ------------------------------------------------------------------ */
/*  Card renderers — one per display mode                              */
/* ------------------------------------------------------------------ */

/** Small mode: compact info cards — fits ≥ 3 per row */
const renderSmallCard = (item: KnowledgeItem): string => {
  const art = artworkFor(item.knowledgeType);
  const thumb = thumbFor(item);
  const imageInner = thumb
    ? `<img src="${thumb}" alt="${item.title}" class="h-full w-full object-cover" loading="lazy" />`
    : `<div class="flex h-full w-full items-center justify-center bg-gradient-to-br ${art.gradient} text-lg font-bold opacity-70">${initialsFor(item.title)}</div>`;

  return `
    <article id="${item.id}" class="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer" data-slug="${item.id}">
      <div class="flex gap-3 p-3">
        <div class="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden">${imageInner}</div>
        <div class="flex flex-col justify-center min-w-0">
          <h3 class="text-sm font-semibold text-neutral-900 leading-tight line-clamp-1">${item.title}</h3>
          <p class="text-[11px] text-neutral-500 line-clamp-1">${item.eraLabel}</p>
          <div class="mt-1 flex flex-wrap gap-1">
            <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">${item.knowledgeType}</span>
            ${formatBadge(item.domain)}
          </div>
        </div>
      </div>
      <div class="border-t border-neutral-100 px-3 py-2">
        <p class="text-[11px] leading-relaxed text-neutral-600 line-clamp-2">${item.summary}</p>
      </div>
    </article>
  `;
};

/** Large mode: detailed expanded cards with full profile info */
const renderLargeCard = (item: KnowledgeItem, index: number): string => {
  const art = artworkFor(item.knowledgeType);
  const wd = wdData.get(item.id)?.profile;
  const thumb = thumbFor(item);
  const occupationLabel = wd?.occupation ? capitalize(wd.occupation) : null;
  const description = wd?.extract || wd?.description || item.summary;
  const tags = item.tags.slice(0, 5);

  // Image
  const imageInner = thumb
    ? `<img src="${thumb}" alt="${item.title}" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />`
    : `<div class="absolute inset-0 flex items-center justify-center text-5xl font-bold opacity-50">${initialsFor(item.title)}</div>`;

  // Meta badges
  const badges = [
    `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${item.knowledgeType}</span>`,
    occupationLabel ? `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${occupationLabel}</span>` : "",
    `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${item.eraLabel}</span>`,
    `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">Card #${index + 1}</span>`,
  ].filter(Boolean).join("\n");

  // Profile rows
  const profileRows = [
    { label: "Full name", value: wd?.label ?? item.title },
    { label: "Date of birth", value: wdField(wd?.birthDate) },
    { label: "Place of birth", value: wdField(wd?.birthPlace) },
    { label: "Date of death", value: wdField(wd?.deathDate) },
    { label: "Place of death", value: wdField(wd?.deathPlace) },
    ...(wd?.occupation ? [{ label: "Occupation", value: capitalize(wd.occupation) }] : []),
    { label: "Era", value: item.eraLabel },
    { label: "Depth", value: capitalize(item.depth) },
  ].map(
    (r) => `<div class="flex items-center justify-between gap-2 text-neutral-600"><span class="text-xs">${r.label}</span><span class="text-xs font-semibold text-neutral-900">${r.value}</span></div>`
  ).join("");

  // Domains
  const domainBadges = [item.domain, ...item.secondaryDomains].map(formatBadge).join("");

  // Tags
  const tagBadges = tags.map(
    (t) => `<span class="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">${t}</span>`
  ).join("");

  // Timeline events
  const tlEvents = ENABLE_ENRICHMENT ? wdData.get(item.id)?.timeline ?? [] : [];
  const bottomSections = renderLargeCardBottom(item, wd, tlEvents);

  return `
    <article id="${item.id}" class="rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md cursor-pointer" data-slug="${item.id}">
      <div class="p-5">
        <div class="flex flex-col lg:grid lg:grid-cols-[1fr_280px] gap-5">
          <!-- Left column: text content -->
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-2">${badges}</div>
            <h3 class="text-2xl font-bold text-neutral-900 leading-tight">${item.title}</h3>
            <p class="text-sm leading-relaxed text-neutral-700">${description}</p>
            ${tags.length > 0 ? `<div class="flex flex-wrap gap-1.5">${tagBadges}</div>` : ""}
            <div class="flex flex-wrap gap-1.5">${domainBadges}</div>
            ${bottomSections}
          </div>

          <!-- Right column: image + profile -->
          <div class="flex flex-col gap-3">
            <div class="relative aspect-[4/5] rounded-xl bg-gradient-to-br ${art.gradient} overflow-hidden shadow-sm">
              ${imageInner}
              <div class="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-neutral-800 ring-1 ring-white/70 backdrop-blur">
                <span class="h-2 w-2 rounded-full bg-primary-500"></span>
                ${art.label}
              </div>
            </div>

            <div class="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-2">
              <div class="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.1em]">Profile</div>
              ${profileRows}
              ${item.wikidataId ? `<div class="pt-2 border-t border-neutral-200"><a class="text-xs text-primary-700 font-semibold hover:underline" href="https://www.wikidata.org/wiki/${item.wikidataId}" target="_blank" rel="noopener noreferrer">Wikidata ↗</a></div>` : ""}
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
};

/* ------------------------------------------------------------------ */
/*  Media card renderer — matches entity card style exactly            */
/* ------------------------------------------------------------------ */

/**
 * Render a media card — dispatches to small or large based on displayMode.
 */
const renderMediaCard = (m: EncyclopediaMediaItem): string => {
  return displayMode === "large" ? renderLargeMediaCard(m) : renderSmallMediaCard(m);
};

/* ── Small media card (same structure as renderSmallCard) ──────────── */
const renderSmallMediaCard = (m: EncyclopediaMediaItem): string => {
  const meta = m.metadata ?? {};
  const subtitle = buildMediaSubtitle(m.media_type, meta);

  const initials = m.title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return `
    <article class="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer" data-media-id="${m.id}">
      <div class="flex gap-3 p-3">
        <div class="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden">
          <div class="flex h-full w-full items-center justify-center bg-neutral-100 text-lg font-bold text-neutral-400">${initials}</div>
        </div>
        <div class="flex flex-col justify-center min-w-0">
          <h3 class="text-sm font-semibold text-neutral-900 leading-tight line-clamp-1">${m.title}</h3>
          <p class="text-[11px] text-neutral-500 line-clamp-1">${subtitle}</p>
          <div class="mt-1 flex flex-wrap gap-1">
            <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">${m.media_type}</span>
            ${m.entity_title ? `<span class="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700 ring-1 ring-primary-100">${m.entity_title}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="border-t border-neutral-100 px-3 py-2">
        <p class="text-[11px] leading-relaxed text-neutral-600 line-clamp-2">${m.description ?? ""}</p>
      </div>
    </article>
  `;
};

/* ── Large media card (same structure as compendium large card) ────── */
const renderLargeMediaCard = (m: EncyclopediaMediaItem): string => {
  const meta = m.metadata ?? {};
  const subtitle = buildMediaSubtitle(m.media_type, meta);

  // Type-specific content block
  const contentBlock = buildMediaContentBlock(m);

  // Badges
  const badges = [
    `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${m.media_type}</span>`,
    m.entity_title ? `<span class="rounded-full bg-primary-50 px-3 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100">${m.entity_title}</span>` : "",
    m.entity_knowledge_type ? `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${m.entity_knowledge_type}</span>` : "",
  ].filter(Boolean).join("\n");

  // Metadata rows
  const metaRows = buildMediaMetaRows(m.media_type, meta);

  return `
    <article class="rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md cursor-pointer" data-media-id="${m.id}">
      <div class="p-5">
        <div class="flex flex-col gap-4">
          <!-- Badges -->
          <div class="flex flex-wrap items-center gap-2">${badges}</div>

          <!-- Title -->
          <h3 class="text-2xl font-bold text-neutral-900 leading-tight">${m.title}</h3>
          <p class="text-sm text-neutral-500">${subtitle}</p>

          <!-- Description -->
          <p class="text-sm leading-relaxed text-neutral-700">${m.description ?? ""}</p>

          <!-- Type-specific content (audio player, readable text, etc.) -->
          ${contentBlock}

          <!-- Metadata -->
          ${metaRows ? `
          <div class="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-2">
            <div class="text-[11px] font-semibold text-neutral-500 uppercase tracking-[0.1em]">Details</div>
            ${metaRows}
          </div>` : ""}
        </div>
      </div>
    </article>
  `;
};

/** Build the type-specific content block for large media cards */
function buildMediaContentBlock(m: EncyclopediaMediaItem): string {
  const meta = m.metadata ?? {};

  switch (m.media_type) {
    case "Audio":
      return `
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <audio controls preload="metadata" crossorigin="anonymous" class="w-full">
            <source src="${m.url}" />
            Your browser does not support the audio element.
          </audio>
        </div>`;

    case "Video":
      return `
        <div class="rounded-lg border border-neutral-200 bg-black overflow-hidden" style="aspect-ratio:16/9">
          <video controls preload="metadata" class="w-full h-full object-contain rounded-lg" src="${m.url}">
            Your browser does not support the video element.
          </video>
        </div>`;

    case "Text":
      return `
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
          <div class="prose prose-sm max-w-none text-neutral-800 leading-relaxed">
            <p>${m.description ?? ""}</p>
          </div>
          ${meta.source ? `<div class="mt-3 pt-3 border-t border-neutral-200 text-xs text-neutral-500">Source: ${meta.source}</div>` : ""}
          ${m.url && !m.url.includes("example.com") ? `<div class="mt-2"><a href="${m.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-primary-700 font-semibold hover:underline">Read full text ↗</a></div>` : ""}
        </div>`;

    case "Maps":
      return `
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center">
          ${m.url && !m.url.includes("example.com")
            ? `<img src="${m.url}" alt="${m.title}" class="w-full rounded-lg" />`
            : `<div class="py-8 text-sm text-neutral-400">Map content will be available when media is uploaded.</div>`}
        </div>`;

    case "Timeline": {
      const events = Number(meta.events) || 0;
      const span = meta.span ? String(meta.span) : "";
      return `
        <div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div class="flex items-center justify-between text-sm text-neutral-600">
            ${events ? `<span>${events} events</span>` : ""}
            ${span ? `<span>${span}</span>` : ""}
          </div>
          <div class="mt-2 py-4 text-center text-sm text-neutral-400">Timeline visualization will load here.</div>
        </div>`;
    }

    default:
      return "";
  }
}

/** Build metadata rows for the large card details panel */
function buildMediaMetaRows(_type: string, meta: Record<string, unknown>): string {
  const rows: { label: string; value: string }[] = [];

  if (meta.source) rows.push({ label: "Source", value: String(meta.source) });
  if (meta.duration) rows.push({ label: "Duration", value: String(meta.duration) });
  if (meta.wordCount) rows.push({ label: "Word count", value: Number(meta.wordCount).toLocaleString() });
  if (meta.pages) rows.push({ label: "Pages", value: String(meta.pages) });
  if (meta.readingTime) rows.push({ label: "Reading time", value: String(meta.readingTime) });
  if (meta.resolution) rows.push({ label: "Resolution", value: String(meta.resolution) });
  if (meta.recorded) rows.push({ label: "Recorded", value: String(meta.recorded) });
  if (meta.format) rows.push({ label: "Format", value: String(meta.format) });
  if (meta.era) rows.push({ label: "Era", value: String(meta.era) });
  if (meta.events) rows.push({ label: "Events", value: String(meta.events) });
  if (meta.span) rows.push({ label: "Span", value: String(meta.span) });

  if (rows.length === 0) return "";

  return rows.map(
    (r) => `<div class="flex items-center justify-between gap-2 text-neutral-600"><span class="text-xs">${r.label}</span><span class="text-xs font-semibold text-neutral-900">${r.value}</span></div>`
  ).join("");
}

/** Build a concise subtitle string from media-type-specific metadata */
function buildMediaSubtitle(type: string, meta: Record<string, unknown>): string {
  switch (type) {
    case "Audio": {
      const parts: string[] = [];
      if (meta.duration) parts.push(String(meta.duration));
      if (meta.source) parts.push(String(meta.source));
      return parts.join(" · ") || "Audio";
    }
    case "Video": {
      const parts: string[] = [];
      if (meta.duration) parts.push(String(meta.duration));
      if (meta.resolution) parts.push(String(meta.resolution));
      if (meta.source) parts.push(String(meta.source));
      return parts.join(" · ") || "Video";
    }
    case "Text": {
      const parts: string[] = [];
      if (meta.wordCount) parts.push(`${Number(meta.wordCount).toLocaleString()} words`);
      if (meta.source) parts.push(String(meta.source));
      return parts.join(" · ") || "Text";
    }
    case "Maps": {
      const parts: string[] = [];
      if (meta.format) parts.push(String(meta.format));
      if (meta.era) parts.push(String(meta.era));
      if (meta.dateRange) parts.push(String(meta.dateRange));
      return parts.join(" · ") || "Map";
    }
    case "Timeline": {
      const parts: string[] = [];
      if (meta.events) parts.push(`${meta.events} events`);
      if (meta.span) parts.push(String(meta.span));
      return parts.join(" · ") || "Timeline";
    }
    default:
      return "";
  }
}

/** Render a single card's HTML — dispatches to the correct mode renderer */
const renderSingleCardHtml = (item: KnowledgeItem, index: number): string => {
  switch (displayMode) {
    case "small":   return renderSmallCard(item);
    case "large":   return renderLargeCard(item, index);
  }
};

/** Append the next batch of cards and set up a sentinel for infinite scroll */
const appendCardBatch = (items: KnowledgeItem[]) => {
  if (!cardGridEl) return;
  const batch = items.slice(renderedCount, renderedCount + CARD_BATCH);
  if (batch.length === 0) return;

  // Remove old sentinel
  cardGridEl.querySelector(".scroll-sentinel")?.remove();

  const fragment = document.createDocumentFragment();
  const temp = document.createElement("div");
  temp.innerHTML = batch.map((item, i) => renderSingleCardHtml(item, renderedCount + i)).join("");
  while (temp.firstChild) fragment.appendChild(temp.firstChild);

  renderedCount += batch.length;

  // If more items remain, add a sentinel element to trigger the next batch
  if (renderedCount < items.length) {
    const sentinel = document.createElement("div");
    sentinel.className = "scroll-sentinel col-span-full";
    sentinel.style.height = "1px";
    fragment.appendChild(sentinel);
  }

  cardGridEl.appendChild(fragment);

  // Observe the sentinel for infinite scroll
  const sentinelEl = cardGridEl.querySelector(".scroll-sentinel");
  if (sentinelEl) {
    if (!scrollSentinelObserver) {
      scrollSentinelObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              appendCardBatch(lastFiltered);
              // Also observe new cards for enrichment
              requestAnimationFrame(observeCards);
            }
          }
        },
        { rootMargin: "400px" },
      );
    }
    scrollSentinelObserver.observe(sentinelEl);
  }
};

/** Update a single card in-place after enrichment data arrives */
const updateSingleCard = (itemId: string) => {
  if (!cardGridEl) return;
  const item = lastFiltered.find((i) => i.id === itemId);
  if (!item) return;
  const existing = cardGridEl.querySelector<HTMLElement>(`article#${CSS.escape(itemId)}`);
  if (!existing) return;
  const idx = lastFiltered.indexOf(item);
  const temp = document.createElement("div");
  temp.innerHTML = renderSingleCardHtml(item, idx);
  if (temp.firstElementChild) {
    existing.replaceWith(temp.firstElementChild);
  }
};

/** Mount Knight Lab TimelineJS instances into rendered containers */
const mountTimelines = () => {
  if (!ENABLE_ENRICHMENT) return;
  if (displayMode !== "large") return;

  // Declare TL on window (loaded via CDN script tag)
  const TL = (window as unknown as { TL?: { Timeline: new (el: string | HTMLElement, data: unknown, options?: unknown) => void } }).TL;
  if (!TL) {
    console.warn("[encyclopedia] TimelineJS not loaded yet");
    return;
  }

  for (const item of knowledgeItems) {
    const events = wdData.get(item.id)?.timeline ?? [];
    const dated = events.filter((e: WikidataTimelineEvent) => e.year !== 0).slice(0, 7);
    if (dated.length === 0) continue;

    const el = document.getElementById(`timeline-${item.id}`);
    if (!el || el.dataset.mounted === "1") continue;
    el.dataset.mounted = "1";

    // Build TimelineJS JSON data
    const tlData = {
      events: dated.map((ev: WikidataTimelineEvent) => ({
        start_date: { year: ev.year },
        text: { headline: ev.headline },
      })),
    };

    try {
      new TL.Timeline(el, tlData, {
        timenav_height: 140,
        timenav_height_percentage: 100,
        start_at_slide: 0,
        hash_bookmark: false,
        initial_zoom: 1,
        scale_factor: 1,
        optimal_tick_width: 80,
      });
    } catch (err) {
      console.warn(`[encyclopedia] TimelineJS init failed for ${item.title}:`, err);
    }
  }
};

const updateCounts = (count: number) => {
  const label = count === 1 ? "item" : "items";
  if (resultCountEl) resultCountEl.textContent = `${count} ${label} available`;
};

/** Keep track of last filtered set */
let lastFiltered: KnowledgeItem[] = [];

const matchesEntityFilters = (
  media: EncyclopediaMediaItem,
  filters: EncyclopediaFilters,
): boolean => {
  if (filters.knowledge_type && media.entity_knowledge_type !== filters.knowledge_type) {
    return false;
  }

  if (filters.domain) {
    const domain = media.entity_domain ?? "";
    const secondary = media.entity_secondary_domains ?? [];
    if (!(domain === filters.domain || secondary.includes(filters.domain))) {
      return false;
    }
  }

  if (filters.era_group && media.entity_era_group !== filters.era_group) {
    return false;
  }

  if (filters.depth && media.entity_depth !== filters.depth) {
    return false;
  }

  return true;
};

/**
 * Core render: fetches the current page of items from Supabase with
 * active filters and search, then renders the results.
 *
 * Media type filter logic:
 *   – "all"        → Compendium cards + all media cards
 *   – "Compendium" → Compendium cards only (entity overview)
 *   – "Audio" etc. → Media cards of that type only
 */
async function render() {
  if (isFetching) return;
  isFetching = true;

  activeFilters = buildFiltersFromUI();
  searchQuery = searchInput?.value.trim() ?? "";

  const mediaFilter = activeFilters.media_type; // null = "all"
  const showCompendium = !mediaFilter || mediaFilter === "Compendium";
  const showMedia = !mediaFilter || (mediaFilter !== "Compendium");

  try {
    applyGridLayout();

    let compendiumHtml = "";
    let mediaHtml = "";
    let total = 0;

    // ── Compendium cards (entity overviews) ──
    if (showCompendium) {
      // Strip media_type from filters so fetchItems doesn't try to filter by it
      const entityFilters = { ...activeFilters, media_type: null };
      const { data, count } = await fetchItems(currentPage, entityFilters, searchQuery);
      knowledgeItems = data.map(rowToKnowledgeItem);
      totalCount = count;
      lastFiltered = knowledgeItems;
      total += count;

      await fetchThumbnails(knowledgeItems);

      // Build HTML for compendium cards
      knowledgeItems.forEach((item, i) => {
        compendiumHtml += renderSingleCardHtml(item, i);
      });
    }

    // ── Media cards (Audio, Video, Text, Maps, Timeline) ──
    if (showMedia) {
      const typeArg = mediaFilter && mediaFilter !== "Compendium" ? mediaFilter : null;
      const { data: mediaItems } = await fetchMedia(typeArg);
      const filteredMedia = mediaItems.filter((m) => matchesEntityFilters(m, activeFilters));
      total += filteredMedia.length;

      mediaHtml = filteredMedia.map(renderMediaCard).join("");
    }

    // ── Combine and render ──
    if (cardGridEl) {
      scrollSentinelObserver?.disconnect();
      scrollSentinelObserver = null;
      renderedCount = 0;
      cardGridEl.innerHTML = compendiumHtml + mediaHtml;
    }

    totalCount = total;
    updateCounts(total);

    // Only show pagination for compendium-only view
    if (showCompendium && !showMedia) {
      renderPagination();
    } else if (paginationEl) {
      paginationEl.innerHTML = "";
    }

    // Initialize TimelineJS for newly rendered compendium cards
    if (showCompendium && ENABLE_ENRICHMENT) {
      requestAnimationFrame(mountTimelines);
      requestAnimationFrame(observeCards);
    }
  } catch (err) {
    console.error("[encyclopedia] Fetch failed:", err);
  } finally {
    isFetching = false;
  }
}

/** Render prev/next pagination controls */
const renderPagination = () => {
  if (!paginationEl) return;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  if (totalPages <= 1) {
    paginationEl.innerHTML = "";
    return;
  }

  const prevDisabled = currentPage === 0;
  const nextDisabled = currentPage >= totalPages - 1;

  paginationEl.innerHTML = `
    <div class="flex items-center justify-center gap-3 py-4">
      <button id="page-prev" class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed" ${prevDisabled ? "disabled" : ""}>← Previous</button>
      <span class="text-sm text-neutral-600">Page ${currentPage + 1} of ${totalPages.toLocaleString()} · ${totalCount.toLocaleString()} items</span>
      <button id="page-next" class="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed" ${nextDisabled ? "disabled" : ""}>Next →</button>
    </div>
  `;

  document.getElementById("page-prev")?.addEventListener("click", () => {
    if (currentPage > 0) { currentPage--; render(); }
  });
  document.getElementById("page-next")?.addEventListener("click", () => {
    if (currentPage < totalPages - 1) { currentPage++; render(); }
  });
};

/** Apply the grid class for the current display mode */
const applyGridLayout = () => {
  if (!cardGridEl) return;
  const gridClasses: Record<DisplayMode, string> = {
    small:   "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3",
    large:   "grid grid-cols-1 gap-5",
  };
  cardGridEl.className = gridClasses[displayMode];
};

/** Switch display mode, update button styles, and re-render */
const setDisplayMode = (mode: DisplayMode) => {
  displayMode = mode;
  applyGridLayout();
  void render();
  displayButtons.forEach((btn) => {
    const isActive = btn.dataset.display === mode;
    btn.classList.toggle("bg-white", isActive);
    btn.classList.toggle("shadow-sm", isActive);
    btn.classList.toggle("ring-1", isActive);
    btn.classList.toggle("ring-neutral-200", isActive);
    btn.classList.toggle("text-neutral-800", isActive);
    btn.classList.toggle("text-neutral-700", !isActive);
  });
};

/** When any filter changes, reset to page 0 and re-fetch */
const onFilterChange = () => {
  currentPage = 0;
  void render();
};

/** Debounced search: wait 300ms after typing stops before querying */
const onSearchInput = () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentPage = 0;
    void render();
  }, 300);
};

const attachEvents = () => {
  if (!form || !searchInput || !disciplineSelect || !typeSelect) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    currentPage = 0;
    void render();
  });

  // Debounced search on keystroke
  searchInput.addEventListener("input", onSearchInput);

  [disciplineSelect, typeSelect, mediaSelect].forEach((el) => el?.addEventListener("change", onFilterChange));

  document
    .querySelectorAll<HTMLInputElement>("input[name='era'], input[name='depth']")
    .forEach((el) => el.addEventListener("change", onFilterChange));

  displayButtons.forEach((btn) => btn.addEventListener("click", () => setDisplayMode(btn.dataset.display as DisplayMode)));

  clearButton?.addEventListener("click", () => {
    searchInput.value = "";
    disciplineSelect.value = "all";
    typeSelect.value = "all";
    if (mediaSelect) mediaSelect.value = "all";
    document
      .querySelectorAll<HTMLInputElement>("input[name='era'], input[name='depth']")
      .forEach((el) => {
        el.checked = false;
      });
    currentPage = 0;
    searchQuery = "";
    activeFilters = {};
    setDisplayMode("small");  });

  // Hash-based detail routing
  window.addEventListener("hashchange", handleHashRoute);

  // Delegated click handler for entity links inside media cards
  cardGridEl?.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>("a[data-slug]");
    if (link) {
      e.preventDefault();
      const slug = link.dataset.slug;
      if (slug) location.hash = `#/Item/${slug}`;
    }
  });
};

/* ------------------------------------------------------------------ */
/*  Detail panel (hash-based routing)                                  */
/* ------------------------------------------------------------------ */

async function handleHashRoute() {
  const route = parseRoute();
  if (!route) {
    // Back to list — unhide content, hide detail
    document.getElementById("detail-panel")?.classList.add("hidden");
    document.getElementById("encyclopedia-content")?.classList.remove("hidden");
    return;
  }

  const detail = await fetchItemDetail(route.slug);
  if (!detail) {
    console.warn(`[encyclopedia] Item not found: ${route.slug}`);
    return;
  }

  renderDetailPanel(detail);
}

function renderDetailPanel(data: EncyclopediaDetailItem) {
  const item = rowToKnowledgeItem(data);
  const meta = data.metadata ?? {};

  // Hide list, show detail
  document.getElementById("encyclopedia-content")?.classList.add("hidden");

  let panel = document.getElementById("detail-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "detail-panel";
    document.getElementById("encyclopedia-loading")?.parentElement?.appendChild(panel);
  }
  panel.classList.remove("hidden");

  const occupations = Array.isArray(meta.occupations) ? (meta.occupations as string[]).join(", ") : "";

  panel.innerHTML = `
    <div class="mx-auto max-w-4xl px-6 py-8">
      <button id="detail-back" class="mb-6 inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50">← Back to list</button>
      <h1 class="text-3xl font-bold text-neutral-900">${item.title}</h1>
      <div class="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
        <span class="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">${item.knowledgeType}</span>
        <span class="rounded-full bg-primary-50 px-3 py-1 text-primary-700">${item.domain}</span>
        <span class="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">${item.eraLabel}</span>
        <span class="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">${capitalize(item.depth)} depth</span>
      </div>
      ${occupations ? `<p class="mt-3 text-sm text-neutral-600">${occupations}</p>` : ""}
      <p class="mt-4 text-base leading-relaxed text-neutral-700">${item.summary}</p>
      <div class="mt-6 flex flex-wrap gap-2">
        ${item.tags.map((t) => `<span class="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">${t}</span>`).join("")}
      </div>
      ${item.secondaryDomains.length > 0 ? `
        <div class="mt-4">
          <span class="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Secondary domains</span>
          <div class="mt-1 flex flex-wrap gap-2">
            ${item.secondaryDomains.map((d) => `<span class="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100">${d}</span>`).join("")}
          </div>
        </div>
      ` : ""}
      ${item.wikidataId ? `<a class="mt-4 inline-block text-sm text-primary-700 font-semibold hover:underline" href="https://www.wikidata.org/wiki/${item.wikidataId}" target="_blank" rel="noopener noreferrer">View on Wikidata ↗</a>` : ""}
    </div>
  `;

  document.getElementById("detail-back")?.addEventListener("click", () => {
    location.hash = "";
  });
}

/* ------------------------------------------------------------------ */
/*  Async data loading                                                 */
/* ------------------------------------------------------------------ */

const showLoading = () => {
  const overlay = document.getElementById("encyclopedia-loading");
  const content = document.getElementById("encyclopedia-content");
  if (overlay) overlay.classList.remove("hidden");
  if (content) content.classList.add("hidden");
};

const hideLoading = () => {
  const overlay = document.getElementById("encyclopedia-loading");
  const content = document.getElementById("encyclopedia-content");
  if (overlay) overlay.classList.add("hidden");
  if (content) content.classList.remove("hidden");
};

const bootstrap = async () => {
  if (!form) return;

  showLoading();

  // Attach UI events immediately so controls are responsive
  setDisplayMode("small");
  attachEvents();

  try {
    // Phase 1: Load the static manifest to populate filter dropdowns instantly
    manifest = await fetchManifest();
    if (resultCountEl) {
      resultCountEl.textContent = `${manifest.totalCount.toLocaleString()} items available`;
    }

    // Populate domain filter from manifest (instant, no DB query)
    if (disciplineSelect) {
      for (const dom of manifest.domains) {
        const opt = document.createElement("option");
        opt.value = dom;
        opt.textContent = dom;
        disciplineSelect.appendChild(opt);
      }
    }

    // Populate knowledge type filter from manifest
    if (typeSelect) {
      for (const kt of Object.keys(manifest.knowledgeTypes)) {
        const opt = document.createElement("option");
        opt.value = kt;
        opt.textContent = `${kt} (${manifest.knowledgeTypes[kt].toLocaleString()})`;
        typeSelect.appendChild(opt);
      }
    }

    // Populate media type filter from manifest (data-driven, not hardcoded)
    if (mediaSelect && manifest.mediaTypes) {
      // Clear existing options except the first "All" option
      while (mediaSelect.options.length > 1) mediaSelect.remove(1);
      for (const [mt, count] of Object.entries(manifest.mediaTypes)) {
        const opt = document.createElement("option");
        opt.value = mt;
        opt.textContent = `${mt} (${count})`;
        mediaSelect.appendChild(opt);
      }
    }

    hideLoading();

    // Phase 2: Load first page of items from Supabase
    await render();

    // Check if there's a hash route to handle on load
    if (location.hash) {
      await handleHashRoute();
    }
  } catch (err) {
    console.error("[encyclopedia] Bootstrap failed:", err);
    hideLoading();
    if (resultCountEl) resultCountEl.textContent = "Failed to load data";
  }
};

document.addEventListener("DOMContentLoaded", bootstrap);
