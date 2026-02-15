/* ================================================================== */
/*  Marketplace — Pedagogical Asset Browser                            */
/*  Mirrors the Encyclopedia pattern but for teaching assets.          */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AssetCategory = "explanation" | "activity" | "assessment" | "simulation" | "planning";

type GradeLevel = "pre-k" | "k-2" | "3-5" | "6-8" | "9-12" | "higher-ed" | "adult";
type Difficulty = "introductory" | "intermediate" | "advanced";
type BloomLevel = "remember" | "understand" | "apply" | "analyse" | "evaluate" | "create";

interface LinkedEntity {
  id: string;
  type: string;
  name: string;
}

interface ForgeAsset {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  creatorName: string;
  createdAt: string;
  assetType: string;
  assetCategory: AssetCategory;
  subjectDomains: string[];
  topicTags: string[];
  gradeLevel: GradeLevel[];
  difficulty: Difficulty;
  estimatedDuration: string;
  bloomLevel: BloomLevel[];
  pedagogicalApproach: string[];
  learningObjectives: string[];
  linkedEntities: LinkedEntity[];
  interactivityType: "active" | "expositive" | "mixed";
  mediaFormat: string[];
  language: string;
  price: number | null;
  license: string;
  visibility: string;
  ratingAverage: number;
  ratingCount: number;
  downloadCount: number;
}

type ViewMode = "gallery" | "list";

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let assets: ForgeAsset[] = [];
let lastFiltered: ForgeAsset[] = [];
let currentView: ViewMode = "gallery";

/* ------------------------------------------------------------------ */
/*  DOM refs                                                           */
/* ------------------------------------------------------------------ */

const form = document.getElementById("forge-search-form") as HTMLFormElement | null;
const searchInput = document.getElementById("forge-search-input") as HTMLInputElement | null;
const categorySelect = document.getElementById("category-select") as HTMLSelectElement | null;
const domainSelect = document.getElementById("domain-select") as HTMLSelectElement | null;
const gradeSelect = document.getElementById("grade-select") as HTMLSelectElement | null;
const difficultySelect = document.getElementById("difficulty-select") as HTMLSelectElement | null;
const bloomSelect = document.getElementById("bloom-select") as HTMLSelectElement | null;
const priceSelect = document.getElementById("price-select") as HTMLSelectElement | null;
const resultCountEl = document.getElementById("forge-result-count");
const sidebarListEl = document.getElementById("forge-sidebar-list");
const cardGridEl = document.getElementById("forge-card-grid");
const listItemsEl = document.getElementById("forge-list-items");
const galleryView = document.getElementById("forge-gallery-view");
const listView = document.getElementById("forge-list-view");
const clearButton = document.getElementById("forge-clear-filters");
const viewButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".forge-view-toggle"));

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const CATEGORY_META: Record<AssetCategory, { label: string; gradient: string; icon: string }> = {
  explanation: { label: "Explanation", gradient: "from-blue-100 via-sky-200 to-cyan-200 text-blue-900", icon: "" },
  activity: { label: "Activity", gradient: "from-emerald-100 via-green-200 to-teal-200 text-emerald-900", icon: "" },
  assessment: { label: "Assessment", gradient: "from-amber-100 via-yellow-200 to-orange-200 text-amber-900", icon: "" },
  simulation: { label: "Simulation", gradient: "from-violet-100 via-purple-200 to-fuchsia-200 text-violet-900", icon: "" },
  planning: { label: "Planning", gradient: "from-slate-100 via-gray-200 to-zinc-200 text-slate-900", icon: "" },
};

const formatBadge = (text: string, color = "primary") =>
  `<span class="rounded-full bg-${color}-50 px-2.5 py-1 text-[11px] font-semibold text-${color}-700 ring-1 ring-${color}-100">${text}</span>`;

const formatDomainBadge = (text: string) => formatBadge(text, "primary");

const formatBloomBadge = (level: string) => {
  const colors: Record<string, string> = {
    remember: "amber", understand: "blue", apply: "emerald",
    analyse: "violet", evaluate: "rose", create: "fuchsia",
  };
  return formatBadge(capitalize(level), colors[level] ?? "neutral");
};

const formatPrice = (price: number | null) =>
  price === null ? '<span class="font-bold text-emerald-600">Free</span>' : `<span class="font-bold text-neutral-900">$${price.toFixed(2)}</span>`;

const formatRating = (avg: number, count: number) => {
  const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
  return `<span class="text-amber-500">${stars}</span> <span class="text-neutral-500 text-xs">(${count})</span>`;
};

const formatDownloads = (count: number) => {
  if (count >= 10000) return `${(count / 1000).toFixed(0)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return `${count}`;
};

/* ------------------------------------------------------------------ */
/*  Filtering                                                          */
/* ------------------------------------------------------------------ */

const matchesFilters = (asset: ForgeAsset): boolean => {
  const term = searchInput?.value.trim().toLowerCase() ?? "";
  const category = categorySelect?.value ?? "all";
  const domain = domainSelect?.value ?? "all";
  const grade = gradeSelect?.value ?? "all";
  const difficulty = difficultySelect?.value ?? "all";
  const bloom = bloomSelect?.value ?? "all";
  const price = priceSelect?.value ?? "all";

  if (term) {
    const searchable = [asset.title, asset.description, asset.assetType, ...asset.topicTags, ...asset.subjectDomains].join(" ").toLowerCase();
    if (!searchable.includes(term)) return false;
  }
  if (category !== "all" && asset.assetCategory !== category) return false;
  if (domain !== "all" && !asset.subjectDomains.includes(domain)) return false;
  if (grade !== "all" && !asset.gradeLevel.includes(grade as GradeLevel)) return false;
  if (difficulty !== "all" && asset.difficulty !== difficulty) return false;
  if (bloom !== "all" && !asset.bloomLevel.includes(bloom as BloomLevel)) return false;
  if (price === "free" && asset.price !== null) return false;
  if (price === "paid" && asset.price === null) return false;

  return true;
};

/* ------------------------------------------------------------------ */
/*  Render — Sidebar                                                   */
/* ------------------------------------------------------------------ */

const renderSidebar = (items: ForgeAsset[]) => {
  if (!sidebarListEl) return;
  const sidebarItems = items.slice(0, 200);
  sidebarListEl.innerHTML = sidebarItems
    .map(
      (asset) => `
        <button type="button" data-target="${asset.id}" class="w-full rounded-lg border border-transparent px-3 py-2 text-left hover:border-primary-200 hover:bg-primary-50/60 focus:outline-none focus:ring-2 focus:ring-primary-400">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-neutral-900 truncate">${asset.title}</p>
              <p class="text-xs text-neutral-500">${CATEGORY_META[asset.assetCategory]?.icon ?? ""} ${asset.assetType}</p>
            </div>
            <div class="flex-shrink-0">${formatPrice(asset.price)}</div>
          </div>
        </button>
      `,
    )
    .join("");

  sidebarListEl.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      if (!targetId) return;
      requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  });
};

/* ------------------------------------------------------------------ */
/*  Render — Cards                                                     */
/* ------------------------------------------------------------------ */

const renderCardHtml = (asset: ForgeAsset): string => {
  const cat = CATEGORY_META[asset.assetCategory];

  const domainBadges = asset.subjectDomains.map(formatDomainBadge).join("");
  const bloomBadges = asset.bloomLevel.map(formatBloomBadge).join("");
  const tagBadges = asset.topicTags.slice(0, 4).map((t) => formatBadge(t, "neutral")).join("");

  const linkedSection = asset.linkedEntities.length > 0
    ? `<div class="mt-3 pt-3 border-t border-neutral-200">
         <p class="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Linked Encyclopedia Entities</p>
         <div class="flex flex-wrap gap-1.5">
           ${asset.linkedEntities.map((e) => `<span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">${e.name}</span>`).join("")}
         </div>
       </div>`
    : "";

  return `
    <article id="${asset.id}" class="rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div class="p-5">
        <div class="flex flex-col gap-3">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${cat.gradient} text-lg">${cat.icon}</div>
              <div>
                <span class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">${cat.label}</span>
                <span class="mx-1 text-neutral-300">·</span>
                <span class="text-[11px] font-semibold text-neutral-600">${asset.assetType}</span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              ${formatPrice(asset.price)}
            </div>
          </div>

          <!-- Title -->
          <h3 class="text-lg font-semibold text-neutral-900 leading-tight">${asset.title}</h3>

          <!-- Description -->
          <p class="text-sm leading-relaxed text-neutral-600 line-clamp-2">${asset.description}</p>

          <!-- Meta row -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="rounded-md bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-700">${asset.estimatedDuration}</span>
            <span class="rounded-md bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-700">${capitalize(asset.difficulty)}</span>
            <span class="rounded-md bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-700">${asset.gradeLevel.join(", ")}</span>
            <span class="rounded-md bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-700">↓ ${formatDownloads(asset.downloadCount)}</span>
          </div>

          <!-- Rating -->
          <div class="flex items-center gap-3 text-sm">
            ${formatRating(asset.ratingAverage, asset.ratingCount)}
            <span class="text-neutral-400">·</span>
            <span class="text-xs text-neutral-500">by ${asset.creatorName}</span>
          </div>

          <!-- Domains -->
          <div class="flex flex-wrap gap-1.5">${domainBadges}</div>

          <!-- Bloom levels -->
          <div class="flex flex-wrap gap-1.5">${bloomBadges}</div>

          <!-- Topic tags -->
          <div class="flex flex-wrap gap-1.5">${tagBadges}</div>

          <!-- Linked entities -->
          ${linkedSection}

          <!-- Learning objectives (collapsed) -->
          ${asset.learningObjectives.length > 0 ? `
          <details class="mt-2">
            <summary class="text-xs font-semibold text-primary-700 cursor-pointer hover:text-primary-800">Learning Objectives (${asset.learningObjectives.length})</summary>
            <ul class="mt-2 space-y-1 pl-4 text-xs text-neutral-600 list-disc">
              ${asset.learningObjectives.map((obj) => `<li>${obj}</li>`).join("")}
            </ul>
          </details>` : ""}
        </div>
      </div>
    </article>
  `;
};

const renderCards = (items: ForgeAsset[]) => {
  if (!cardGridEl) return;
  cardGridEl.innerHTML = items.map(renderCardHtml).join("");
};

/* ------------------------------------------------------------------ */
/*  Render — List                                                      */
/* ------------------------------------------------------------------ */

const renderList = (items: ForgeAsset[]) => {
  if (!listItemsEl) return;
  const listItems = items.slice(0, 200);
  listItemsEl.innerHTML = listItems
    .map(
      (asset) => `
        <li class="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-neutral-50">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-lg">${CATEGORY_META[asset.assetCategory]?.icon ?? ""}</span>
              <p class="text-base font-semibold text-neutral-900 truncate">${asset.title}</p>
              <span class="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700 flex-shrink-0">${asset.assetType}</span>
            </div>
            <p class="text-sm text-neutral-600 line-clamp-1 mt-0.5">${asset.description}</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
              <span class="rounded-md bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-700">${asset.estimatedDuration}</span>
              <span class="rounded-md bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-700">${capitalize(asset.difficulty)}</span>
              <span class="rounded-md bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-700">${asset.gradeLevel.join(", ")}</span>
              ${asset.subjectDomains.map(formatDomainBadge).join("")}
            </div>
          </div>
          <div class="flex flex-col items-end gap-1 flex-shrink-0 text-sm">
            ${formatPrice(asset.price)}
            <div>${formatRating(asset.ratingAverage, asset.ratingCount)}</div>
            <span class="text-xs text-neutral-400">↓ ${formatDownloads(asset.downloadCount)}</span>
          </div>
        </li>
      `,
    )
    .join("");
};

/* ------------------------------------------------------------------ */
/*  Render — orchestrator                                              */
/* ------------------------------------------------------------------ */

function render() {
  const filtered = assets.filter(matchesFilters);
  lastFiltered = filtered;

  const label = filtered.length === 1 ? "asset" : "assets";
  if (resultCountEl) resultCountEl.textContent = `${filtered.length} ${label} available`;

  renderSidebar(filtered);
  renderCards(filtered);
  renderList(filtered);
}

/* ------------------------------------------------------------------ */
/*  View toggle                                                        */
/* ------------------------------------------------------------------ */

const setView = (view: ViewMode) => {
  currentView = view;
  if (galleryView && listView) {
    galleryView.classList.toggle("hidden", view !== "gallery");
    listView.classList.toggle("hidden", view !== "list");
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

/* ------------------------------------------------------------------ */
/*  Events                                                             */
/* ------------------------------------------------------------------ */

const attachEvents = () => {
  if (!form) return;

  form.addEventListener("submit", (e) => { e.preventDefault(); render(); });

  const selects = [categorySelect, domainSelect, gradeSelect, difficultySelect, bloomSelect, priceSelect];
  selects.forEach((sel) => sel?.addEventListener("change", render));

  // Live search on typing (debounced)
  let debounceTimer: ReturnType<typeof setTimeout>;
  searchInput?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 200);
  });

  viewButtons.forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view as ViewMode)));

  clearButton?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    selects.forEach((sel) => { if (sel) sel.value = "all"; });
    setView("gallery");
    render();
  });
};

/* ------------------------------------------------------------------ */
/*  Data loading                                                       */
/* ------------------------------------------------------------------ */

const showLoading = () => {
  const overlay = document.getElementById("forge-loading");
  const content = document.getElementById("forge-content");
  if (overlay) overlay.classList.remove("hidden");
  if (content) content.classList.add("hidden");
};

const hideLoading = () => {
  const overlay = document.getElementById("forge-loading");
  const content = document.getElementById("forge-content");
  if (overlay) overlay.classList.add("hidden");
  if (content) content.classList.remove("hidden");
};

async function loadData(): Promise<ForgeAsset[]> {
  const res = await fetch("/data/marketplace/assets.json");
  if (!res.ok) throw new Error(`Failed to load Marketplace data: ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

const bootstrap = async () => {
  if (!form) return;

  showLoading();
  setView("gallery");
  attachEvents();

  try {
    const data = await loadData();
    assets = data;
  } catch (err) {
    console.error("[marketplace] Failed to load data:", err);
    hideLoading();
    if (resultCountEl) resultCountEl.textContent = "Failed to load data";
    return;
  }

  // Dynamically populate domain filter from loaded data
  if (domainSelect) {
    const allDomains = new Set<string>();
    for (const asset of assets) {
      asset.subjectDomains.forEach((d) => allDomains.add(d));
    }
    const sorted = [...allDomains].sort();
    for (const dom of sorted) {
      const opt = document.createElement("option");
      opt.value = dom;
      opt.textContent = dom;
      domainSelect.appendChild(opt);
    }
  }

  hideLoading();
  render();
};

document.addEventListener("DOMContentLoaded", bootstrap);
