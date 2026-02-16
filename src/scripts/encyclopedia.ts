import { fetchFigureData, type WikidataProfile, type WikidataFigureData, type WikidataRelatedPerson, type WikidataTimelineEvent } from "./encyclopedia/wikidata";

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

/** All Wikidata data indexed by item id */
const wdData = new Map<string, WikidataFigureData>();

// Feature flag: turn off remote Wikidata enrichment to speed up page load when
// the data already lives in Supabase/local JSON. Defaults to false unless
// explicitly enabled via Vite env.
const ENABLE_ENRICHMENT = (import.meta.env?.VITE_ENCYCLOPEDIA_ENRICH ?? "false") === "true";

type ViewMode = "gallery" | "list";
type SizeMode = "small" | "large";

type DataSource = KnowledgeItem[];

/** Populated asynchronously from fetched JSON */
let knowledgeItems: DataSource = [];

const form = document.getElementById("knowledge-search-form") as HTMLFormElement | null;
const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
const disciplineSelect = document.getElementById("discipline-select") as HTMLSelectElement | null;
const typeSelect = document.getElementById("type-select") as HTMLSelectElement | null;
const resultCountEl = document.getElementById("result-count");
const sidebarListEl = document.getElementById("sidebar-list");
const cardGridEl = document.getElementById("card-grid");
const listItemsEl = document.getElementById("list-items");
const galleryView = document.getElementById("gallery-view");
const listView = document.getElementById("list-view");
const clearButton = document.getElementById("clear-filters");
const viewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".view-toggle"));
const sizeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".size-toggle"));

let sizeMode: SizeMode = "small";

/** How many cards to render per batch */
const CARD_BATCH = 30;
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

const matchesFilters = (item: KnowledgeItem) => {
  if (!searchInput || !disciplineSelect || !typeSelect) return false;

  const term = searchInput.value.trim().toLowerCase();
  const discipline = disciplineSelect.value;
  const knowledgeType = typeSelect.value;
  const eras = getCheckedValues("era");
  const depths = getCheckedValues("depth");

  const matchesTerm = term
    ? [item.title, item.summary, item.tags.join(" ")].join(" ").toLowerCase().includes(term)
    : true;

  const matchesDiscipline = discipline === "all" ? true : (item.domain === discipline || item.secondaryDomains.includes(discipline));
  const matchesType = knowledgeType === "all" ? true : item.knowledgeType === knowledgeType;
  const matchesEra = eras.length === 0 ? true : eras.includes(item.eraGroup);
  const matchesDepth = depths.length === 0 ? true : depths.includes(item.depth);

  return matchesTerm && matchesDiscipline && matchesType && matchesEra && matchesDepth;
};

/** Sidebar now shows the current filtered list (paginated in the sidebar itself, max 50) */
const renderSidebar = (items: KnowledgeItem[]) => {
  if (!sidebarListEl) return;
  // Show all filtered items in sidebar (capped for DOM perf)
  const sidebarItems = items.slice(0, 200);
  sidebarListEl.innerHTML = sidebarItems
    .map(
      (item) => `
        <button type="button" data-target="${item.id}" class="w-full rounded-lg border border-transparent px-3 py-2 text-left hover:border-primary-200 hover:bg-primary-50/60 focus:outline-none focus:ring-2 focus:ring-primary-400">
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-neutral-900">${item.title}</p>
              <p class="text-xs text-neutral-500">${item.knowledgeType}</p>
            </div>
            ${formatBadge(item.domain)}
          </div>
        </button>
      `
    )
    .join("");

  sidebarListEl.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      if (!targetId) return;
      // Scroll to the target card
      requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  });
};

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

const renderCards = (items: KnowledgeItem[]) => {
  if (!cardGridEl) return;

  // Tear down previous scroll sentinel observer
  scrollSentinelObserver?.disconnect();
  scrollSentinelObserver = null;
  renderedCount = 0;
  cardGridEl.innerHTML = "";

  // Render first batch immediately
  appendCardBatch(items);
};

/** Render a single card's HTML */
const renderSingleCardHtml = (item: KnowledgeItem, index: number): string => {
      const art = artworkFor(item.knowledgeType);
      const wd = wdData.get(item.id)?.profile;
      const isSmall = sizeMode === "small";
      const media = {
        small: { padding: "p-4", title: "text-xl", height: "", image: "w-full", layout: "flex flex-col gap-4" },
        large: { padding: "p-6", title: "text-3xl", height: "lg:h-[calc(100vh-220px)]", image: "w-full lg:w-[260px]", layout: "flex flex-col lg:grid lg:grid-cols-[1fr_260px] gap-6 h-full" },
      }[sizeMode];

      const occupationLabel = wd?.occupation ? capitalize(wd.occupation) : null;
      // Use the Wikipedia extract (multi-sentence) for large view, nothing for small
      const description = isSmall
        ? ""
        : (wd?.extract || wd?.description || item.summary);

      const metaRow = isSmall
        ? `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${item.knowledgeType}</span>`
        : `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${item.knowledgeType}</span>
           ${occupationLabel ? `<span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${occupationLabel}</span>` : ""}
           <span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${item.eraLabel}</span>
           <span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">Card #${index + 1}</span>`;

      // Image area – use Wikidata thumbnail when available
      const imageInner = wd?.thumbnailUrl
        ? `<img src="${wd.thumbnailUrl}" alt="${item.title}" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />`
        : `<div class="text-4xl font-bold text-neutral-900/80 drop-shadow-sm">${initialsFor(item.title)}</div>`;

      const profileCard = isSmall
        ? `<div class="w-full ${media.image} rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-2 text-xs">
             <div class="flex items-center justify-between gap-2 text-neutral-600"><span>Era</span><span class="font-semibold text-neutral-900">${item.eraLabel}</span></div>
             <div class="flex items-center justify-between gap-2 text-neutral-600"><span>Depth</span><span class="font-semibold text-neutral-900">${capitalize(item.depth)}</span></div>
             <div class="flex items-start justify-between gap-2 text-neutral-600"><span class="pt-0.5">Domain</span><span class="flex flex-wrap justify-end gap-1.5">${[item.domain, ...item.secondaryDomains]
               .map(formatBadge)
               .join("")}</span></div>
           </div>`
        : `<div class="w-full ${media.image} rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 space-y-3 text-xs">
             <div class="flex items-center gap-2 text-[11px] font-semibold text-neutral-600 uppercase tracking-[0.1em]">Profile${wd ? "" : ` <span class="ml-auto text-neutral-400 normal-case">Loading…</span>`}</div>
             <div class="space-y-2">
               <div class="flex items-center justify-between gap-2 text-neutral-600"><span>Full name</span><span class="font-semibold text-neutral-900">${wd?.label ?? item.title}</span></div>
               <div class="flex items-center justify-between gap-2 text-neutral-600"><span>Date of birth</span><span class="font-semibold text-neutral-900">${wdField(wd?.birthDate)}</span></div>
               <div class="flex items-center justify-between gap-2 text-neutral-600"><span>Place of birth</span><span class="font-semibold text-neutral-900">${wdField(wd?.birthPlace)}</span></div>
             </div>
             <div class="space-y-2 pt-2 border-t border-neutral-200">
               <div class="flex items-center justify-between gap-2 text-neutral-600"><span>Date of death</span><span class="font-semibold text-neutral-900">${wdField(wd?.deathDate)}</span></div>
               <div class="flex items-center justify-between gap-2 text-neutral-600"><span>Place of death</span><span class="font-semibold text-neutral-900">${wdField(wd?.deathPlace)}</span></div>
               ${wd?.occupation ? `<div class="flex items-center justify-between gap-2 text-neutral-600"><span>Occupation</span><span class="font-semibold text-neutral-900">${capitalize(wd.occupation)}</span></div>` : ""}
             </div>
             <div class="pt-2 border-t border-neutral-200">
               <a class="text-primary-700 font-semibold hover:underline" href="https://www.wikidata.org/wiki/${item.wikidataId ?? ""}" target="_blank" rel="noopener noreferrer">Wikidata ↗</a>
             </div>
           </div>`;

      // Timeline events from Wikidata
      const tlEvents = ENABLE_ENRICHMENT ? wdData.get(item.id)?.timeline ?? [] : [];

      const bottomSections = isSmall ? "" : renderLargeCardBottom(item, wd, tlEvents);

      return `
        <article id="${item.id}" class="rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${media.height}">
          <div class="${media.padding} h-full">
            <div class="${media.layout}">
              <div class="flex flex-col gap-4">
                <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-700">${metaRow}</div>
                <h3 class="${media.title} font-semibold text-neutral-900 leading-tight">${item.title}</h3>
                ${description ? `<p class="text-sm leading-relaxed text-neutral-700">${description}</p>` : ""}
                ${bottomSections}
              </div>

              <div class="flex flex-col gap-3 items-start lg:items-end">
                <div class="relative ${media.image} aspect-[4/5] rounded-xl bg-gradient-to-br ${art.gradient} overflow-hidden shadow-sm flex items-end p-4">
                  <div class="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-neutral-800 ring-1 ring-white/70 backdrop-blur">
                    <span class="h-2 w-2 rounded-full bg-primary-500"></span>
                    ${art.label}
                  </div>
                  ${imageInner}
                </div>
                ${profileCard}
              </div>
            </div>
          </div>
        </article>
      `;
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

const renderList = (items: KnowledgeItem[]) => {
  if (!listItemsEl) return;
  // Cap list rendering for DOM perf
  const listItems = items.slice(0, 200);
  listItemsEl.innerHTML = listItems
    .map(
      (item) => `
        <li class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-base font-semibold text-neutral-900">${item.title}</p>
              <span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">${item.knowledgeType}</span>
            </div>
            <p class="text-sm text-neutral-600">${item.summary}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
              <span class="rounded-md bg-neutral-100 px-3 py-1 font-semibold text-neutral-700">${item.eraLabel}</span>
              <span class="rounded-md bg-neutral-100 px-3 py-1 font-semibold text-neutral-700">${capitalize(item.depth)} depth</span>
              ${[item.domain, ...item.secondaryDomains].map(formatBadge).join("")}
            </div>
          </div>
          <div class="flex flex-wrap justify-start sm:justify-end gap-2 text-xs font-semibold text-primary-700">
            ${item.tags.map((tag) => `<span class="rounded-full bg-primary-50 px-3 py-1">${tag}</span>`).join("")}
          </div>
        </li>
      `
    )
    .join("");
};

/** Mount Knight Lab TimelineJS instances into rendered containers */
const mountTimelines = () => {
  if (!ENABLE_ENRICHMENT) return;
  if (sizeMode !== "large") return;

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

function render() {
  const filtered = knowledgeItems.filter(matchesFilters);
  lastFiltered = filtered;

  updateCounts(filtered.length);
  renderSidebar(filtered);
  renderCards(filtered);
  renderList(filtered);

  // Initialize TimelineJS instances for newly rendered cards
  if (ENABLE_ENRICHMENT) {
    requestAnimationFrame(mountTimelines);
    // Start observing visible cards for lazy Wikidata enrichment
    requestAnimationFrame(observeCards);
  }
}

const applySize = () => {
  if (!cardGridEl) return;
  const sizeClasses: Record<SizeMode, string> = {
    small: "grid grid-cols-3 gap-4",
    large: "grid grid-cols-1 gap-6",
  };
  cardGridEl.className = sizeClasses[sizeMode];
};

const setView = (view: ViewMode) => {
  if (galleryView && listView) {
    const showGallery = view === "gallery";
    galleryView.classList.toggle("hidden", !showGallery);
    listView.classList.toggle("hidden", showGallery);
  }

  viewButtons.forEach((btn) => {
    const isActive = btn.dataset.view === view;
    btn.classList.toggle("bg-white", isActive);
    btn.classList.toggle("shadow-sm", isActive);
    btn.classList.toggle("ring-1", isActive);
    btn.classList.toggle("ring-neutral-200", isActive);
    btn.classList.toggle("text-neutral-800", isActive);
    btn.classList.toggle("text-neutral-700", !isActive);
  });
};

const setSize = (size: SizeMode) => {
  sizeMode = size;
  applySize();
  render();
  sizeButtons.forEach((btn) => {
    const isActive = btn.dataset.size === size;
    btn.classList.toggle("bg-white", isActive);
    btn.classList.toggle("shadow-sm", isActive);
    btn.classList.toggle("ring-1", isActive);
    btn.classList.toggle("ring-neutral-200", isActive);
    btn.classList.toggle("text-neutral-800", isActive);
    btn.classList.toggle("text-neutral-700", !isActive);
  });
};

const attachEvents = () => {
  if (!form || !searchInput || !disciplineSelect || !typeSelect) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });

  [disciplineSelect, typeSelect].forEach((el) => el.addEventListener("change", render));

  document
    .querySelectorAll<HTMLInputElement>("input[name='era'], input[name='depth']")
    .forEach((el) => el.addEventListener("change", render));

  viewButtons.forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view as ViewMode)));
  sizeButtons.forEach((btn) => btn.addEventListener("click", () => setSize(btn.dataset.size as SizeMode)));

  clearButton?.addEventListener("click", () => {
    searchInput.value = "";
    disciplineSelect.value = "all";
    typeSelect.value = "all";
    document
      .querySelectorAll<HTMLInputElement>("input[name='era'], input[name='depth']")
      .forEach((el) => {
        el.checked = false;
      });
    setView("gallery");
    setSize("small");
    render();
  });
};

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

async function loadData(): Promise<KnowledgeItem[]> {
  // Data intentionally disabled; render shell UI only.
  return [];
}

const bootstrap = async () => {
  if (!form) return;

  showLoading();

  // Attach UI events immediately so controls are responsive
  setView("gallery");
  attachEvents();

  try {
    knowledgeItems = await loadData();
  } catch (err) {
    console.error("[encyclopedia] Data loading is disabled:", err);
    hideLoading();
    if (resultCountEl) resultCountEl.textContent = "Failed to load data";
    return;
  }

  // Dynamically populate domain filter from loaded data
  if (disciplineSelect) {
    const allDomains = new Set<string>();
    for (const item of knowledgeItems) {
      allDomains.add(item.domain);
      item.secondaryDomains.forEach((d) => allDomains.add(d));
    }
    const sorted = [...allDomains].sort();
    for (const dom of sorted) {
      const opt = document.createElement("option");
      opt.value = dom;
      opt.textContent = dom;
      disciplineSelect.appendChild(opt);
    }
  }

  hideLoading();
  setSize("small");
  render();

  // Lazy enrichment happens via IntersectionObserver (set up in render)
};

document.addEventListener("DOMContentLoaded", bootstrap);
