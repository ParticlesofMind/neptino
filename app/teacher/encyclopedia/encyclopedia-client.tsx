"use client";

import * as React from "react";

const CARD_BATCH = 30;

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

type TimelineEvent = {
  year: number;
  headline: string;
  displayDate?: string | null;
  media?: unknown;
};

type DetailProfile = {
  wikidataId?: string;
  label?: string;
  description?: string;
  extract?: string;
  birthDate?: string | null;
  deathDate?: string | null;
  birthPlace?: string | null;
  deathPlace?: string | null;
  occupation?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
};

type DetailField = { name: string; description?: string };

type RelatedItem = { name: string; relation: string; wikidataId?: string };

type DetailRecord = {
  profile?: DetailProfile;
  timeline?: TimelineEvent[];
  fields?: DetailField[];
  related?: RelatedItem[];
};

type SizeMode = "small" | "large";

const formatBadge = (text: string) => (
  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-700">
    {text}
  </span>
);

const initialsFor = (title: string) =>
  title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

const artworkFor = (type: KnowledgeItem["knowledgeType"]) => {
  const palette: Record<EntityType, string> = {
    Person: "from-amber-100 via-amber-200 to-orange-200 text-amber-900",
    Event: "from-blue-100 via-cyan-200 to-sky-200 text-blue-900",
    "Concept / Theory": "from-emerald-100 via-teal-200 to-green-200 text-emerald-900",
    Location: "from-violet-100 via-purple-200 to-fuchsia-200 text-violet-900",
    "Invention / Technology": "from-slate-100 via-gray-200 to-zinc-200 text-slate-900",
    Work: "from-rose-100 via-pink-200 to-red-200 text-rose-900",
    Institution: "from-indigo-100 via-blue-200 to-sky-200 text-indigo-900",
    "Movement / School": "from-lime-100 via-green-200 to-emerald-200 text-lime-900",
    "Era / Period": "from-yellow-100 via-amber-200 to-yellow-200 text-yellow-900",
  };
  const label: Record<EntityType, string> = {
    Person: "Person",
    Event: "Event",
    "Concept / Theory": "Concept",
    Location: "Location",
    "Invention / Technology": "Invention",
    Work: "Work",
    Institution: "Institution",
    "Movement / School": "Movement",
    "Era / Period": "Era",
  };
  return {
    gradient: palette[type] ?? "from-neutral-100 via-neutral-200 to-neutral-300 text-neutral-800",
    label: label[type] ?? type,
  };
};

const truncate = (text: string, max = 140) => {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const eraYear = (item: KnowledgeItem): number => {
  const label = item.eraLabel.toLowerCase();
  const numMatch = label.match(/(-?\d{1,4})/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    if (!Number.isNaN(val)) {
      return label.includes("bce") || val < 0 ? -Math.abs(val) : val;
    }
  }
  const map: Record<KnowledgeItem["eraGroup"], number> = {
    ancient: -500,
    "early-modern": 1500,
    modern: 1900,
    contemporary: 2000,
  };
  return map[item.eraGroup] ?? 0;
};

const wdField = (value: string | null | undefined, fallback = "Not provided") => value ?? fallback;

export default function EncyclopediaClient() {
  const [items, setItems] = React.useState<KnowledgeItem[]>([]);
  const [detailsById, setDetailsById] = React.useState<Record<string, DetailRecord | undefined>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [discipline, setDiscipline] = React.useState("all");
  const [knowledgeType, setKnowledgeType] = React.useState("all");
  const [mediaFilter, setMediaFilter] = React.useState("all");
  const [eraRange, setEraRange] = React.useState({ start: -800, end: 2100 });
  const [sizeMode, setSizeMode] = React.useState<SizeMode>("small");
  const [displayCount, setDisplayCount] = React.useState(CARD_BATCH);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/encyclopedia/catalog", { cache: "force-cache" });
        if (!res.ok) throw new Error("Failed to load encyclopedia data");
        const data = (await res.json()) as KnowledgeItem[];
        if (mounted) {
          setItems(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load encyclopedia data");
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const disciplines = React.useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.domain) unique.add(item.domain);
      item.secondaryDomains.forEach((domain) => unique.add(domain));
    });
    return Array.from(unique).sort();
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTerm = term
        ? [item.title, item.summary, item.tags.join(" ")].join(" ").toLowerCase().includes(term)
        : true;
      const matchesDiscipline =
        discipline === "all"
          ? true
          : item.domain === discipline || item.secondaryDomains.includes(discipline);
      const matchesType = knowledgeType === "all" ? true : item.knowledgeType === knowledgeType;
      const year = eraYear(item);
      const matchesEra = year >= eraRange.start && year <= eraRange.end;
      const matchesMedia =
        mediaFilter === "all"
          ? true
          : item.tags.some((tag) => tag.toLowerCase().includes(mediaFilter));
      return matchesTerm && matchesDiscipline && matchesType && matchesEra && matchesMedia;
    });
  }, [items, query, discipline, knowledgeType, mediaFilter, eraRange]);

  React.useEffect(() => {
    setDisplayCount(CARD_BATCH);
  }, [query, discipline, knowledgeType, mediaFilter, eraRange]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDisplayCount((prev) => Math.min(prev + CARD_BATCH, filteredItems.length));
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredItems.length]);

  React.useEffect(() => {
    const needsDetails = filteredItems.slice(0, displayCount).filter((item) => !detailsById[item.id]);
    if (needsDetails.length === 0) return;

    let cancelled = false;
    const loadDetails = async () => {
      for (const item of needsDetails) {
        if (cancelled) return;
        try {
          const res = await fetch(`/api/encyclopedia/details?id=${item.id}`);
          if (!res.ok) continue;
          const detail = (await res.json()) as DetailRecord;
          if (cancelled) return;
          setDetailsById((prev) => ({ ...prev, [item.id]: detail }));
        } catch {
          // Ignore detail failures and keep the card minimal.
        }
      }
    };

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [filteredItems, displayCount, detailsById]);

  React.useEffect(() => {
    if (sizeMode !== "large") return;

    const TL = (window as unknown as { TL?: { Timeline: new (el: string | HTMLElement, data: unknown, options?: Record<string, unknown>) => void } }).TL;
    if (!TL) return;

    const itemsToRender = filteredItems.slice(0, displayCount);
    requestAnimationFrame(() => {
      for (const item of itemsToRender) {
        const detail = detailsById[item.id];
        const events = detail?.timeline ?? [];
        const dated = events.filter((event) => event.year !== 0);
        if (dated.length === 0) continue;

        const el = document.getElementById(`timeline-${item.id}`);
        if (!el || el.dataset.mounted === "1") continue;
        el.dataset.mounted = "1";

        const tlData = {
          events: dated.map((event) => ({
            start_date: { year: event.year, display_date: event.displayDate || `${event.year}` },
            text: { headline: event.headline, text: event.displayDate || "" },
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
        } catch {
          // Ignore timeline failures and keep the card visible.
        }
      }
    });
  }, [sizeMode, filteredItems, displayCount, detailsById]);

  const resultLabel = filteredItems.length === 1 ? "item" : "items";

  const layoutClasses =
    sizeMode === "large"
      ? "grid w-full grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] encyclopedia-layout-scroll"
      : "grid w-full grid-cols-1 gap-6";

  const cardGridClasses =
    sizeMode === "small"
      ? "grid w-full grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
      : "grid w-full grid-cols-1 gap-6 card-scroll";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
        <p className="text-sm font-medium text-muted-foreground">Loading encyclopedia…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  const displayedItems = filteredItems.slice(0, displayCount);

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <label className="flex flex-col gap-2 md:col-span-1">
            <div className="relative">
              <input
                name="query"
                type="search"
                placeholder="Names, events, concepts..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
            </div>
          </label>
          <label className="flex flex-col gap-2">
            <select
              name="discipline"
              value={discipline}
              onChange={(event) => setDiscipline(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            >
              <option value="all">All domains</option>
              {disciplines.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <select
              name="knowledgeType"
              value={knowledgeType}
              onChange={(event) => setKnowledgeType(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              aria-label="Entity type"
            >
              <option value="all">All entity types</option>
              <option value="Person">Person</option>
              <option value="Event">Event</option>
              <option value="Location">Location</option>
              <option value="Concept / Theory">Concept / Theory</option>
              <option value="Invention / Technology">Invention / Technology</option>
              <option value="Work">Work</option>
              <option value="Institution">Institution</option>
              <option value="Movement / School">Movement / School</option>
              <option value="Era / Period">Era / Period</option>
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Media type">
              {[
                { value: "all", label: "All" },
                { value: "text", label: "Text" },
                { value: "audio", label: "Audio" },
                { value: "video", label: "Video" },
                { value: "interactive", label: "Interactive" },
              ].map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={
                    mediaFilter === chip.value
                      ? "rounded-full border border-input bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
                      : "rounded-full border border-input bg-background px-3 py-2 text-sm font-semibold text-muted-foreground hover:border-ring hover:text-foreground"
                  }
                  onClick={() => setMediaFilter(chip.value)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr]">
          <fieldset className="flex flex-col gap-2 md:col-span-2">
            <div className="rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-muted-foreground">
                <span>{eraRange.start}</span>
                <span className="text-muted-foreground/70">to</span>
                <span>{eraRange.end}</span>
              </div>
              <div className="era-range">
                <input
                  type="range"
                  min={-800}
                  max={2100}
                  step={50}
                  value={eraRange.start}
                  className="era-range-input era-start accent-primary"
                  onChange={(event) =>
                    setEraRange((prev) => ({
                      ...prev,
                      start: Math.min(parseInt(event.target.value, 10), prev.end - 50),
                    }))
                  }
                />
                <input
                  type="range"
                  min={-800}
                  max={2100}
                  step={50}
                  value={eraRange.end}
                  className="era-range-input era-end accent-primary"
                  onChange={(event) =>
                    setEraRange((prev) => ({
                      ...prev,
                      end: Math.max(parseInt(event.target.value, 10), prev.start + 50),
                    }))
                  }
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground" aria-live="polite">
          <span>{filteredItems.length} {resultLabel} available</span>
          <div className="flex items-center gap-2 text-sm">
            <div className="rounded-full border border-input bg-muted/40 p-1">
              <button
                type="button"
                className={
                  sizeMode === "small"
                    ? "inline-flex items-center gap-1 rounded-full bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border"
                    : "inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                }
                onClick={() => setSizeMode("small")}
              >
                Compact
              </button>
              <button
                type="button"
                className={
                  sizeMode === "large"
                    ? "inline-flex items-center gap-1 rounded-full bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border"
                    : "inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                }
                onClick={() => setSizeMode("large")}
              >
                Detailed
              </button>
            </div>
            <button
              type="button"
              className="rounded-full border border-input bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-ring hover:text-foreground"
              onClick={() => {
                setQuery("");
                setDiscipline("all");
                setKnowledgeType("all");
                setMediaFilter("all");
                setEraRange({ start: -800, end: 2100 });
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      <div className={layoutClasses}>
        <aside
          className={
            sizeMode === "large"
              ? "rounded-lg border border-border bg-background p-4 shadow-sm lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:p-5"
              : "hidden"
          }
        >
          <div className="space-y-2">
            {filteredItems.slice(0, 200).map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full rounded-lg border border-transparent px-3 py-2 text-left hover:border-primary-200 hover:bg-primary-50/60 focus:outline-none focus:ring-2 focus:ring-primary-400"
                onClick={() => {
                  const target = document.getElementById(item.id);
                  if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                    <p className="text-xs text-neutral-500">{item.knowledgeType}</p>
                  </div>
                  {formatBadge(item.domain)}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className={cardGridClasses}>
            {displayedItems.map((item, index) => {
              const detail = detailsById[item.id];
              const art = artworkFor(item.knowledgeType);
              const profile = detail?.profile;
              const isSmall = sizeMode === "small";
              const summary = truncate(profile?.description || item.summary, 120);
              const timeline = detail?.timeline ?? [];
              const firstEvent = timeline.find((event) => event.year !== 0);
              const subtitle = firstEvent?.displayDate
                ? `${firstEvent.displayDate} · ${item.eraLabel}`
                : item.eraLabel;

              if (isSmall) {
                return (
                  <article
                    key={item.id}
                    id={item.id}
                    className="rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md snap-start"
                  >
                    <div className="flex h-full flex-col gap-3 p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${art.gradient} flex items-center justify-center text-lg font-bold`}
                        >
                          {profile?.thumbnailUrl ? (
                            <img
                              src={profile.thumbnailUrl}
                              alt={item.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            initialsFor(item.title)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-neutral-700">
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1">{art.label}</span>
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1">{item.eraLabel}</span>
                          </div>
                          <h3
                            className="mt-1 truncate text-base font-semibold leading-tight text-neutral-900"
                            title={item.title}
                          >
                            {item.title}
                          </h3>
                          <p className="line-clamp-2 text-xs text-neutral-600">{summary}</p>
                          <p className="text-[11px] font-semibold text-neutral-500">{subtitle}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-neutral-700">
                        {[item.domain, ...item.secondaryDomains].slice(0, 3).map((domain) => (
                          <span
                            key={`${item.id}-${domain}`}
                            className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 ring-1 ring-primary-100"
                          >
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              }

              const fields = detail?.fields ?? [];
              const related = detail?.related ?? [];
              const knowledgeRows =
                fields.length > 0
                  ? fields.slice(0, 6).map((field) => field.name)
                  : [item.domain, ...item.secondaryDomains].slice(0, 6);
              const description = profile?.extract || profile?.description || item.summary;
              const occupationLabel = profile?.occupation ? capitalize(profile.occupation) : null;

              return (
                <article
                  key={item.id}
                  id={item.id}
                  className="rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:min-h-[calc(100vh-180px)]"
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_260px]">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-700">
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                            {item.knowledgeType}
                          </span>
                          {occupationLabel ? (
                            <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                              {occupationLabel}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                            {item.eraLabel}
                          </span>
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold text-neutral-700">
                            Card #{index + 1}
                          </span>
                        </div>
                        <h3 className="text-3xl font-semibold leading-tight text-neutral-900">
                          {item.title}
                        </h3>
                        {description ? (
                          <p className="text-sm leading-relaxed text-neutral-700">{description}</p>
                        ) : null}

                        <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white/60 p-3">
                          <div
                            id={`timeline-${item.id}`}
                            className="h-[220px] w-full"
                            aria-label={`Timeline for ${item.title}`}
                          >
                            {timeline.length ? null : (
                              <p className="text-sm text-neutral-500 italic">Timeline unavailable</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 space-y-4">
                          <div className="rounded-xl border border-neutral-200 bg-white/60 px-5 py-4">
                            <div className="flex flex-col gap-3">
                              <span className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                                Knowledge
                              </span>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-base text-neutral-700">
                                {knowledgeRows.map((field) => (
                                  <div key={`${item.id}-${field}`} className="flex items-center gap-2">
                                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary-400"></span>
                                    <span className="font-medium text-neutral-900">{capitalize(field)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-neutral-200 bg-white/60 px-5 py-4">
                            <div className="flex flex-col gap-3">
                              <span className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">
                                Related
                              </span>
                              {related.length ? (
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-base text-neutral-700">
                                  {related.slice(0, 6).map((relation) => (
                                    <div key={`${item.id}-${relation.name}`} className="flex items-center gap-2">
                                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400"></span>
                                      <span className="font-medium text-neutral-900">{relation.name}</span>
                                      <span className="text-neutral-400">·</span>
                                      <span className="text-neutral-500">{capitalize(relation.relation)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-base text-neutral-500 italic">No related data</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 lg:items-end">
                        <div
                          className={`relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br ${art.gradient} shadow-sm lg:w-[260px]`}
                        >
                          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-neutral-800 ring-1 ring-white/70 backdrop-blur">
                            <span className="h-2 w-2 rounded-full bg-primary-500"></span>
                            {art.label}
                          </div>
                          {profile?.thumbnailUrl ? (
                            <img
                              src={profile.thumbnailUrl}
                              alt={item.title}
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-end justify-center p-4 text-4xl font-bold text-neutral-900/80 drop-shadow-sm">
                              {initialsFor(item.title)}
                            </div>
                          )}
                        </div>

                        <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs lg:w-[260px]">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-600">
                            Profile
                            {!profile && <span className="ml-auto text-neutral-400 normal-case">Loading…</span>}
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between gap-2 text-neutral-600">
                              <span>Full name</span>
                              <span className="font-semibold text-neutral-900">
                                {profile?.label ?? item.title}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-neutral-600">
                              <span>Date of birth</span>
                              <span className="font-semibold text-neutral-900">
                                {wdField(profile?.birthDate)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-neutral-600">
                              <span>Place of birth</span>
                              <span className="font-semibold text-neutral-900">
                                {wdField(profile?.birthPlace)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3">
                            <div className="flex items-center justify-between gap-2 text-neutral-600">
                              <span>Date of death</span>
                              <span className="font-semibold text-neutral-900">
                                {wdField(profile?.deathDate)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-neutral-600">
                              <span>Place of death</span>
                              <span className="font-semibold text-neutral-900">
                                {wdField(profile?.deathPlace)}
                              </span>
                            </div>
                            {profile?.occupation ? (
                              <div className="flex items-center justify-between gap-2 text-neutral-600">
                                <span>Occupation</span>
                                <span className="font-semibold text-neutral-900">
                                  {capitalize(profile.occupation)}
                                </span>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 text-neutral-700">
                            <a
                              className="font-semibold text-primary-700 hover:underline"
                              href={`https://www.wikidata.org/wiki/${item.wikidataId ?? ""}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Wikidata ↗
                            </a>
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600">
                              {art.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {displayCount < filteredItems.length ? (
              <div ref={sentinelRef} className="scroll-sentinel col-span-full h-px"></div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
