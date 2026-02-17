/**
 * Encyclopedia API — Supabase-backed data layer
 *
 * Handles paginated list queries, full-text search, filtering, and
 * individual detail page fetches against the `encyclopedia_items` table.
 *
 * The frontend never loads all records. It relies on:
 *  1. A static manifest (manifest.json ~2KB) for filter options & counts.
 *  2. Paginated queries (24 items/page) for the list view.
 *  3. On-demand single-row fetch for detail views.
 */

import { supabase } from "../backend/supabase.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type EntityType =
  | "Person"
  | "Event"
  | "Location"
  | "Concept / Theory"
  | "Invention / Technology"
  | "Work"
  | "Institution"
  | "Movement / School"
  | "Era / Period";

export type EraGroup = "ancient" | "early-modern" | "modern" | "contemporary";
export type DepthLevel = "foundation" | "intermediate" | "advanced";

/** Shape of a row returned from the list query (excludes search_vector) */
export interface EncyclopediaListItem {
  id: string;
  title: string;
  wikidata_id: string | null;
  knowledge_type: string;
  domain: string | null;
  secondary_domains: string[] | null;
  era_group: EraGroup | null;
  era_label: string | null;
  depth: DepthLevel | null;
  summary: string | null;
  tags: string[] | null;
}

/** Full row returned from detail query */
export interface EncyclopediaDetailItem extends EncyclopediaListItem {
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

/** A media resource row from the encyclopedia_media table */
export interface EncyclopediaMediaItem {
  id: string;
  item_id: string;
  media_type: string;
  title: string;
  description: string | null;
  url: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  /** Joined from parent entity */
  entity_title?: string;
  entity_knowledge_type?: string;
  entity_domain?: string | null;
  entity_secondary_domains?: string[] | null;
  entity_era_group?: EraGroup | null;
  entity_depth?: DepthLevel | null;
}

/** Manifest shape from the static JSON */
export interface EncyclopediaManifest {
  totalCount: number;
  seededAt: string;
  knowledgeTypes: Record<string, number>;
  domains: string[];
  domainCounts: Record<string, number>;
  eraGroups: string[];
  eraCounts: Record<string, number>;
  depthCounts: Record<string, number>;
  mediaTypes: Record<string, number>;
  totalMedia: number;
}

/** Active filter state */
export interface EncyclopediaFilters {
  knowledge_type?: string | null;
  domain?: string | null;
  era_group?: EraGroup | null;
  depth?: DepthLevel | null;
  media_type?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const PAGE_SIZE = 24;

/** Columns selected for list queries — excludes metadata and search_vector */
const LIST_COLUMNS =
  "id, title, wikidata_id, knowledge_type, domain, secondary_domains, era_group, era_label, depth, summary, tags";

/* ------------------------------------------------------------------ */
/*  Manifest (cached in memory after first fetch)                      */
/* ------------------------------------------------------------------ */

let cachedManifest: EncyclopediaManifest | null = null;

/**
 * Load the static manifest. Returns cached version on subsequent calls.
 * This is the only file loaded at page init — everything else comes from
 * Supabase queries on demand.
 */
export async function fetchManifest(): Promise<EncyclopediaManifest> {
  if (cachedManifest) return cachedManifest;

  const res = await fetch("/data/encyclopedia/manifest.json");
  if (!res.ok) {
    throw new Error(`Failed to load encyclopedia manifest: ${res.status}`);
  }
  cachedManifest = (await res.json()) as EncyclopediaManifest;
  return cachedManifest;
}

/* ------------------------------------------------------------------ */
/*  Paginated list query                                               */
/* ------------------------------------------------------------------ */

export interface FetchItemsResult {
  data: EncyclopediaListItem[];
  /** Estimated count from the current filter set. */
  count: number;
}

/**
 * Fetch a page of encyclopedia items with optional filters and search.
 *
 * @param page       Zero-based page index
 * @param filters    Active filter selections
 * @param search     Free-text search query (minimum 3 chars to fire)
 */
export async function fetchItems(
  page: number,
  filters: EncyclopediaFilters = {},
  search = "",
): Promise<FetchItemsResult> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("encyclopedia_items")
    .select(LIST_COLUMNS, { count: "estimated" })
    .range(from, to);

  // Apply filters
  if (filters.knowledge_type) {
    query = query.eq("knowledge_type", filters.knowledge_type);
  }
  if (filters.domain) {
    // Match primary domain OR secondary_domains containing the value
    query = query.or(`domain.eq.${filters.domain},secondary_domains.cs.{"${filters.domain}"}`);
  }
  if (filters.era_group) {
    query = query.eq("era_group", filters.era_group);
  }
  if (filters.depth) {
    query = query.eq("depth", filters.depth);
  }

  // Media type filter — find items that have at least one media of this type
  if (filters.media_type) {
    const { data: mediaData } = await supabase
      .from("encyclopedia_media")
      .select("item_id")
      .eq("media_type", filters.media_type);
    const itemIds = [...new Set((mediaData ?? []).map((m: { item_id: string }) => m.item_id))];
    if (itemIds.length === 0) return { data: [], count: 0 };
    query = query.in("id", itemIds);
  }

  // Full-text search (only if query is meaningful)
  if (search.trim().length > 2) {
    query = query.textSearch("search_vector", search, {
      type: "websearch",
      config: "english",
    });
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[encyclopediaApi] fetchItems error:", error.message);
    return { data: [], count: 0 };
  }

  return {
    data: (data ?? []) as EncyclopediaListItem[],
    count: count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Detail page query                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fetch a single encyclopedia item by slug (id).
 * Returns the full row including metadata.
 */
export async function fetchItemDetail(
  slug: string,
): Promise<EncyclopediaDetailItem | null> {
  const { data, error } = await supabase
    .from("encyclopedia_items")
    .select("*")
    .eq("id", slug)
    .single();

  if (error) {
    console.error("[encyclopediaApi] fetchItemDetail error:", error.message);
    return null;
  }

  return data as EncyclopediaDetailItem;
}

/* ------------------------------------------------------------------ */
/*  Media queries                                                      */
/* ------------------------------------------------------------------ */

export interface FetchMediaResult {
  data: EncyclopediaMediaItem[];
  count: number;
}

/**
 * Fetch media resources, optionally filtered by media_type.
 * Joins entity title and knowledge_type from encyclopedia_items for display.
 */
export async function fetchMedia(
  mediaType?: string | null,
): Promise<FetchMediaResult> {
  let query = supabase
    .from("encyclopedia_media")
    .select("id, item_id, media_type, title, description, url, metadata, created_at", { count: "estimated" })
    .order("media_type")
    .order("title");

  if (mediaType) {
    query = query.eq("media_type", mediaType);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error("[encyclopediaApi] fetchMedia error:", error.message);
    return { data: [], count: 0 };
  }

  const mediaItems = (data ?? []) as EncyclopediaMediaItem[];

  // Batch-fetch parent entity titles
  const itemIds = [...new Set(mediaItems.map((m) => m.item_id))];
  if (itemIds.length > 0) {
    const { data: entities } = await supabase
      .from("encyclopedia_items")
      .select("id, title, knowledge_type, domain, secondary_domains, era_group, depth")
      .in("id", itemIds);
    const entityMap = new Map(
      (entities ?? []).map((e: {
        id: string;
        title: string;
        knowledge_type: string;
        domain: string | null;
        secondary_domains: string[] | null;
        era_group: EraGroup | null;
        depth: DepthLevel | null;
      }) => [e.id, e]),
    );
    for (const m of mediaItems) {
      const parent = entityMap.get(m.item_id);
      if (parent) {
        m.entity_title = parent.title;
        m.entity_knowledge_type = parent.knowledge_type;
        m.entity_domain = parent.domain;
        m.entity_secondary_domains = parent.secondary_domains;
        m.entity_era_group = parent.era_group;
        m.entity_depth = parent.depth;
      }
    }
  }

  return { data: mediaItems, count: count ?? 0 };
}

/* ------------------------------------------------------------------ */
/*  Hash-based routing helper                                          */
/* ------------------------------------------------------------------ */

/**
 * Parse the current URL hash into a route.
 *
 *  #/Person/albert-einstein  →  { type: "Person", slug: "albert-einstein" }
 *  #/                        →  null  (list view)
 *  (empty)                   →  null
 */
export function parseRoute(): { type: string; slug: string } | null {
  const hash = location.hash.replace("#/", "");
  if (!hash) return null;
  const [type, slug] = hash.split("/");
  if (type && slug) return { type, slug };
  return null;
}
