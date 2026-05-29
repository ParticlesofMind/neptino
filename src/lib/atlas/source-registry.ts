import {
  buildWikidataSourceRecord,
  buildWikidataSpatialProfile,
  buildWikidataTemporalProfile,
  fetchCommonsAssetsFromWikidataEntity,
  fetchWikidataEntity,
  inferWikidataClassification,
  searchWikidataEntities,
  wikidataEntityAliases,
  wikidataEntityIdFromSearchItem,
  wikidataSourceSummary,
  type WikidataEntity,
} from "@/lib/atlas/wikidata"

export type AtlasSourceRank = "S" | "A" | "B" | "C" | "D"
export type AtlasSourceRecordType = "entity" | "media" | "dataset" | "geometry" | "document" | "claim" | "product" | "task" | "unknown"
export type AtlasResourceType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "animation"
  | "dataset"
  | "map"
  | "chart"
  | "diagram"
  | "document"
  | "timeline"
  | "composition"

type AtlasSourceSearchStrategy = "wikidata" | "wikidata-linked-commons" | "planned"

export type AtlasSourceDefinition = {
  id: string
  label: string
  baseUrl: string
  sourceRank: AtlasSourceRank
  defaultLicense: string | null
  defaultLicenseUrl: string | null
  requiresAttribution: boolean
  commercialUseStatus: "allowed" | "restricted" | "mixed" | "unknown"
  apiKind: "sparql" | "rest" | "download" | "file" | "manual" | "other"
  resourceTypes: AtlasResourceType[]
  notes: string
  requiredEnvVars?: string[]
  searchStrategy: AtlasSourceSearchStrategy
}

export type AtlasSourceStatus = {
  id: string
  label: string
  sourceRank: AtlasSourceRank
  baseUrl: string
  resourceTypes: AtlasResourceType[]
  queryable: boolean
  status: "available" | "missing_api_key" | "planned"
  missingEnvVars: string[]
  notes: string
}

export type AtlasSourceSearchRequest = {
  query: string
  resourceType?: AtlasResourceType
  limit?: number
  sourceIds?: string[]
  dateRange?: { start?: string; end?: string }
  geometryRequired?: boolean
  licensePolicy?: "open" | "attribution-ok" | "review-required"
}

export type AtlasSourceSearchResult = {
  sourceId: string
  sourceLabel: string
  sourceRank: AtlasSourceRank
  recordType: AtlasSourceRecordType
  externalId: string
  externalUrl: string | null
  title: string
  description: string | null
  license: string | null
  licenseUrl: string | null
  attribution: string | null
  retrievedAt: string
  revisionId: string | null
  confidence: number
  warnings: string[]
  payload: Record<string, unknown>
}

export type AtlasSourceSearchResponse = {
  results: AtlasSourceSearchResult[]
  sources: AtlasSourceStatus[]
  diagnostics: string[]
}

const DEFAULT_SOURCE_LIMIT = 4
const MAX_SOURCE_LIMIT = 8

export const ATLAS_SOURCE_REGISTRY: AtlasSourceDefinition[] = [
  {
    id: "wikidata",
    label: "Wikidata",
    baseUrl: "https://www.wikidata.org",
    sourceRank: "S",
    defaultLicense: "CC0 1.0",
    defaultLicenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    requiresAttribution: false,
    commercialUseStatus: "allowed",
    apiKind: "sparql",
    resourceTypes: ["dataset", "timeline", "diagram", "map", "chart", "document", "text", "composition"],
    notes: "Primary entity spine, identifiers, claims, dates, aliases, and relations.",
    searchStrategy: "wikidata",
  },
  {
    id: "natural_earth",
    label: "Natural Earth",
    baseUrl: "https://www.naturalearthdata.com",
    sourceRank: "S",
    defaultLicense: "Public domain",
    defaultLicenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
    requiresAttribution: false,
    commercialUseStatus: "allowed",
    apiKind: "download",
    resourceTypes: ["map", "dataset", "composition"],
    notes: "Stable modern baseline cartographic data; not a historical boundary source.",
    searchStrategy: "planned",
  },
  {
    id: "openhistoricalmap",
    label: "OpenHistoricalMap",
    baseUrl: "https://www.openhistoricalmap.org",
    sourceRank: "A",
    defaultLicense: "Mixed public-domain-oriented data",
    defaultLicenseUrl: "https://www.openhistoricalmap.org/copyright",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["map", "timeline", "composition"],
    notes: "Primary open temporal map source; coverage and object-level sourcing are uneven.",
    searchStrategy: "planned",
  },
  {
    id: "whg",
    label: "World Historical Gazetteer",
    baseUrl: "https://whgazetteer.org",
    sourceRank: "A",
    defaultLicense: "CC BY 4.0 Non-Commercial unless specified",
    defaultLicenseUrl: "https://whgazetteer.org",
    requiresAttribution: true,
    commercialUseStatus: "restricted",
    apiKind: "rest",
    resourceTypes: ["map", "timeline", "document", "composition"],
    notes: "Historical place reconciliation and temporal place metadata; commercial reuse needs legal review.",
    requiredEnvVars: ["WHG_API_TOKEN"],
    searchStrategy: "planned",
  },
  {
    id: "commons",
    label: "Wikimedia Commons",
    baseUrl: "https://commons.wikimedia.org",
    sourceRank: "A",
    defaultLicense: null,
    defaultLicenseUrl: null,
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["image", "audio", "video", "document", "map", "composition"],
    notes: "Free media repository. Licenses and attribution requirements are checked per file.",
    searchStrategy: "wikidata-linked-commons",
  },
  {
    id: "loc",
    label: "Library of Congress",
    baseUrl: "https://www.loc.gov",
    sourceRank: "A",
    defaultLicense: null,
    defaultLicenseUrl: null,
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["image", "audio", "video", "document", "map", "text", "timeline", "composition"],
    notes: "Primary-source documents, images, maps, audio, and video. Rights advisories vary per item.",
    searchStrategy: "planned",
  },
  {
    id: "owid",
    label: "Our World in Data",
    baseUrl: "https://ourworldindata.org",
    sourceRank: "A",
    defaultLicense: "CC BY 4.0 / mixed underlying sources",
    defaultLicenseUrl: "https://ourworldindata.org/how-to-use-our-world-in-data",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["dataset", "chart", "map", "timeline", "composition"],
    notes: "Chart-ready datasets with strong metadata; underlying data-provider terms must be preserved.",
    searchStrategy: "planned",
  },
  {
    id: "world_bank",
    label: "World Bank Open Data",
    baseUrl: "https://data.worldbank.org",
    sourceRank: "A",
    defaultLicense: "World Bank Open Data terms",
    defaultLicenseUrl: "https://www.worldbank.org/en/about/legal/terms-and-conditions",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["dataset", "chart", "map", "composition"],
    notes: "Official development and economic indicators with attribution requirements.",
    searchStrategy: "planned",
  },
  {
    id: "oecd",
    label: "OECD Data",
    baseUrl: "https://www.oecd.org/en/data.html",
    sourceRank: "A",
    defaultLicense: "CC BY 4.0 / mixed exceptions",
    defaultLicenseUrl: "https://www.oecd.org/en/about/oecd-open-by-default-policy.html",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["dataset", "chart", "composition"],
    notes: "Policy and economic indicators; exceptions and rate limits need review.",
    searchStrategy: "planned",
  },
  {
    id: "unesco_uis",
    label: "UNESCO UIS",
    baseUrl: "https://databrowser.uis.unesco.org",
    sourceRank: "A",
    defaultLicense: "CC BY-SA 4.0",
    defaultLicenseUrl: "https://databrowser.uis.unesco.org/terms-and-conditions",
    requiresAttribution: true,
    commercialUseStatus: "restricted",
    apiKind: "rest",
    resourceTypes: ["dataset", "chart", "composition"],
    notes: "Official education, science, and culture statistics; share-alike obligations apply.",
    searchStrategy: "planned",
  },
  {
    id: "internet_archive",
    label: "Internet Archive",
    baseUrl: "https://archive.org",
    sourceRank: "A",
    defaultLicense: null,
    defaultLicenseUrl: null,
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["text", "image", "audio", "video", "document", "composition"],
    notes: "Large archival corpus. Rights and metadata quality vary per item.",
    searchStrategy: "planned",
  },
  {
    id: "project_gutenberg",
    label: "Project Gutenberg",
    baseUrl: "https://www.gutenberg.org",
    sourceRank: "A",
    defaultLicense: "Mostly public domain in the United States",
    defaultLicenseUrl: "https://www.gutenberg.org/policy/license.html",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "download",
    resourceTypes: ["text", "document", "composition"],
    notes: "Public-domain text corpus with jurisdiction and edition caveats.",
    searchStrategy: "planned",
  },
  {
    id: "europeana",
    label: "Europeana",
    baseUrl: "https://www.europeana.eu",
    sourceRank: "A",
    defaultLicense: "Metadata CC0 / mixed content rights",
    defaultLicenseUrl: "https://www.europeana.eu/en/rights/usage-guidelines-for-metadata",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["image", "audio", "video", "document", "map", "composition"],
    notes: "European GLAM discovery source. Content rights vary by provider.",
    requiredEnvVars: ["EUROPEANA_API_KEY"],
    searchStrategy: "planned",
  },
  {
    id: "dpla",
    label: "DPLA",
    baseUrl: "https://dp.la",
    sourceRank: "A",
    defaultLicense: "Metadata CC0 / mixed content rights",
    defaultLicenseUrl: "https://dp.la/about/terms-conditions",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["image", "audio", "video", "document", "composition"],
    notes: "US cultural heritage discovery source. Asset reuse depends on source institution rights.",
    requiredEnvVars: ["DPLA_API_KEY"],
    searchStrategy: "planned",
  },
  {
    id: "fred",
    label: "FRED",
    baseUrl: "https://fred.stlouisfed.org",
    sourceRank: "A",
    defaultLicense: "FRED terms plus underlying source terms",
    defaultLicenseUrl: "https://fred.stlouisfed.org/docs/api/terms_of_use.html",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["dataset", "chart", "composition"],
    notes: "Macroeconomic and US indicator time-series source. Requires an API key.",
    requiredEnvVars: ["FRED_API_KEY"],
    searchStrategy: "planned",
  },
  {
    id: "nypl",
    label: "NYPL Digital Collections",
    baseUrl: "https://api.repo.nypl.org",
    sourceRank: "B",
    defaultLicense: "Public-domain/no-known-US-copyright filters available",
    defaultLicenseUrl: "https://api.repo.nypl.org",
    requiresAttribution: true,
    commercialUseStatus: "mixed",
    apiKind: "rest",
    resourceTypes: ["image", "document", "map", "composition"],
    notes: "Useful public-domain collection source, but not a deep long-term dependency.",
    requiredEnvVars: ["NYPL_API_KEY"],
    searchStrategy: "planned",
  },
]

const RESOURCE_SOURCE_PRIORITY: Partial<Record<AtlasResourceType, string[]>> = {
  map: ["openhistoricalmap", "whg", "natural_earth", "wikidata", "commons", "loc", "europeana", "nypl"],
  timeline: ["wikidata", "whg", "openhistoricalmap", "loc", "europeana", "internet_archive"],
  chart: ["owid", "world_bank", "oecd", "unesco_uis", "fred", "wikidata"],
  dataset: ["wikidata", "owid", "world_bank", "oecd", "unesco_uis", "fred"],
  image: ["commons", "loc", "europeana", "dpla", "nypl", "internet_archive"],
  audio: ["commons", "internet_archive", "loc", "europeana", "dpla"],
  video: ["commons", "internet_archive", "loc", "europeana", "dpla"],
  text: ["project_gutenberg", "internet_archive", "loc", "wikidata"],
  document: ["loc", "internet_archive", "project_gutenberg", "europeana", "dpla", "commons", "wikidata"],
  diagram: ["wikidata"],
  composition: ["wikidata", "commons", "openhistoricalmap", "whg", "natural_earth", "owid", "loc", "europeana", "dpla"],
}

const COMMONS_RESOURCE_TYPES = new Set<AtlasResourceType>(["image", "audio", "video", "document", "map", "composition"])
const RANK_ORDER: Record<AtlasSourceRank, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 }

function clampLimit(limit: unknown): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_SOURCE_LIMIT
  }
  return Math.min(Math.max(Math.floor(limit), 1), MAX_SOURCE_LIMIT)
}

function sourceSupportsResource(source: AtlasSourceDefinition, resourceType?: AtlasResourceType): boolean {
  return !resourceType || source.resourceTypes.includes(resourceType)
}

function missingEnvVarsForSource(
  source: AtlasSourceDefinition,
  env: Record<string, string | undefined>,
): string[] {
  return (source.requiredEnvVars ?? []).filter((name) => !env[name])
}

function getSourceStatus(source: AtlasSourceDefinition, env: Record<string, string | undefined>): AtlasSourceStatus {
  const missingEnvVars = missingEnvVarsForSource(source, env)
  const hasImplementedStrategy = source.searchStrategy !== "planned"
  const queryable = hasImplementedStrategy && missingEnvVars.length === 0
  return {
    id: source.id,
    label: source.label,
    sourceRank: source.sourceRank,
    baseUrl: source.baseUrl,
    resourceTypes: source.resourceTypes,
    queryable,
    status: queryable ? "available" : missingEnvVars.length > 0 ? "missing_api_key" : "planned",
    missingEnvVars,
    notes: source.notes,
  }
}

function sourcePriority(resourceType: AtlasResourceType | undefined, sourceId: string): number {
  const priority = resourceType ? RESOURCE_SOURCE_PRIORITY[resourceType] : undefined
  const index = priority?.indexOf(sourceId) ?? -1
  return index >= 0 ? index : 100
}

function sortSources(resourceType: AtlasResourceType | undefined, sources: AtlasSourceDefinition[]): AtlasSourceDefinition[] {
  return [...sources].sort((a, b) => (
    sourcePriority(resourceType, a.id) - sourcePriority(resourceType, b.id) ||
    RANK_ORDER[a.sourceRank] - RANK_ORDER[b.sourceRank] ||
    a.label.localeCompare(b.label)
  ))
}

function getSourceDefinition(sourceId: string): AtlasSourceDefinition | undefined {
  return ATLAS_SOURCE_REGISTRY.find((source) => source.id === sourceId)
}

function warningToMessage(warning: unknown): string | null {
  if (typeof warning === "string") return warning
  if (!warning || typeof warning !== "object" || Array.isArray(warning)) return null
  const record = warning as Record<string, unknown>
  return typeof record.message === "string" ? record.message : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function hasPointGeometry(spatialProfile: Record<string, unknown>): boolean {
  const point = spatialProfile.point
  return isRecord(point) && typeof point.latitude === "number" && typeof point.longitude === "number"
}

function normalizeWikidataWarnings(entity: WikidataEntity, geometryRequired: boolean | undefined): string[] {
  const classification = inferWikidataClassification(entity)
  const warnings = (classification.warnings ?? []).map(warningToMessage).filter((message): message is string => Boolean(message))
  const spatialProfile = buildWikidataSpatialProfile(entity)
  if (geometryRequired && !hasPointGeometry(spatialProfile)) {
    warnings.push("This source record does not include point geometry.")
  }
  return warnings
}

function resultSourceRank(sourceId: string): AtlasSourceRank {
  return getSourceDefinition(sourceId)?.sourceRank ?? "C"
}

function sortSearchResults(resourceType: AtlasResourceType | undefined, results: AtlasSourceSearchResult[]): AtlasSourceSearchResult[] {
  return [...results].sort((a, b) => (
    sourcePriority(resourceType, a.sourceId) - sourcePriority(resourceType, b.sourceId) ||
    RANK_ORDER[a.sourceRank] - RANK_ORDER[b.sourceRank] ||
    b.confidence - a.confidence ||
    a.title.localeCompare(b.title)
  ))
}

function buildWikidataResult(
  entity: WikidataEntity,
  request: Pick<AtlasSourceSearchRequest, "geometryRequired">,
): AtlasSourceSearchResult | null {
  const source = getSourceDefinition("wikidata")
  if (!source) return null

  const sourceRecord = buildWikidataSourceRecord(entity)
  const spatialProfile = buildWikidataSpatialProfile(entity)
  if (request.geometryRequired && !hasPointGeometry(spatialProfile)) {
    return null
  }

  const temporalProfile = buildWikidataTemporalProfile(entity)
  const classification = inferWikidataClassification(entity)
  const hasTemporalData = Object.keys(temporalProfile).length > 0
  const hasSpatialData = hasPointGeometry(spatialProfile)

  return {
    sourceId: source.id,
    sourceLabel: source.label,
    sourceRank: source.sourceRank,
    recordType: "entity",
    externalId: sourceRecord.externalId,
    externalUrl: sourceRecord.externalUrl ?? null,
    title: sourceRecord.title ?? entity.id,
    description: sourceRecord.description ?? null,
    license: sourceRecord.license ?? source.defaultLicense,
    licenseUrl: sourceRecord.licenseUrl ?? source.defaultLicenseUrl,
    attribution: sourceRecord.attribution ?? null,
    retrievedAt: sourceRecord.retrievedAt ?? new Date().toISOString(),
    revisionId: sourceRecord.revisionId ?? null,
    confidence: hasTemporalData || hasSpatialData ? 0.9 : 0.78,
    warnings: normalizeWikidataWarnings(entity, request.geometryRequired),
    payload: {
      wikidata: wikidataSourceSummary(entity),
      aliases: wikidataEntityAliases(entity),
      classification: {
        suggestedEntityType: classification.suggestedEntityType,
        suggestedSubtype: classification.suggestedSubtype,
        suggestedDomains: classification.suggestedDomains,
        classificationConfidence: classification.classificationConfidence,
      },
      spatialProfile,
      temporalProfile,
    },
  }
}

async function searchWikidataBackedSources(
  request: AtlasSourceSearchRequest,
  includeWikidata: boolean,
  includeCommons: boolean,
): Promise<AtlasSourceSearchResult[]> {
  const limit = clampLimit(request.limit)
  const searchItems = await searchWikidataEntities(request.query, limit)
  const qids = searchItems
    .map(wikidataEntityIdFromSearchItem)
    .filter((value): value is string => Boolean(value))

  const entities = await Promise.all(
    qids.map(async (qid) => {
      try {
        return await fetchWikidataEntity(qid)
      } catch {
        return null
      }
    }),
  )

  const results: AtlasSourceSearchResult[] = []
  for (const entity of entities) {
    if (!entity) continue

    if (includeWikidata) {
      const wikidataResult = buildWikidataResult(entity, request)
      if (wikidataResult) {
        results.push(wikidataResult)
      }
    }

    if (!includeCommons || (request.resourceType && !COMMONS_RESOURCE_TYPES.has(request.resourceType))) {
      continue
    }

    const commonsAssets = await fetchCommonsAssetsFromWikidataEntity(entity, Math.min(limit, 3)).catch(() => [])
    for (const commonsAsset of commonsAssets) {
      const record = commonsAsset.sourceRecord
      const source = getSourceDefinition(record.sourceId)
      if (!source) continue
      const warnings = (commonsAsset.assetCandidate.warnings ?? [])
        .map(warningToMessage)
        .filter((message): message is string => Boolean(message))

      results.push({
        sourceId: source.id,
        sourceLabel: source.label,
        sourceRank: resultSourceRank(source.id),
        recordType: record.recordType,
        externalId: record.externalId,
        externalUrl: record.externalUrl ?? null,
        title: record.title ?? commonsAsset.assetCandidate.title,
        description: record.description ?? commonsAsset.assetCandidate.description ?? null,
        license: record.license ?? commonsAsset.assetCandidate.license ?? source.defaultLicense,
        licenseUrl: record.licenseUrl ?? commonsAsset.assetCandidate.licenseUrl ?? source.defaultLicenseUrl,
        attribution: record.attribution ?? commonsAsset.assetCandidate.attribution ?? null,
        retrievedAt: record.retrievedAt ?? new Date().toISOString(),
        revisionId: record.revisionId ?? null,
        confidence: commonsAsset.assetCandidate.qualityScore ?? 0.72,
        warnings,
        payload: {
          asset: commonsAsset.assetCandidate,
          linkedWikidataId: entity.id,
        },
      })
    }
  }

  return results
}

export function getAtlasSourceHierarchy(
  resourceType?: AtlasResourceType,
  env: Record<string, string | undefined> = process.env,
): AtlasSourceStatus[] {
  return sortSources(
    resourceType,
    ATLAS_SOURCE_REGISTRY.filter((source) => sourceSupportsResource(source, resourceType)),
  ).map((source) => getSourceStatus(source, env))
}

export async function searchAtlasSources(request: AtlasSourceSearchRequest): Promise<AtlasSourceSearchResponse> {
  const query = request.query.trim()
  const resourceType = request.resourceType
  const sourceIds = new Set(request.sourceIds?.map((sourceId) => sourceId.trim()).filter(Boolean) ?? [])
  const hierarchy = getAtlasSourceHierarchy(resourceType)
  const sourcesToUse = hierarchy.filter((source) => (
    source.queryable &&
    (sourceIds.size === 0 || sourceIds.has(source.id))
  ))

  if (query.length < 2) {
    return {
      results: [],
      sources: hierarchy,
      diagnostics: ["A query with at least 2 characters is required."],
    }
  }

  const diagnostics = hierarchy
    .filter((source) => source.status === "missing_api_key")
    .map((source) => `${source.label} requires ${source.missingEnvVars.join(", ")}.`)

  const includeWikidata = sourcesToUse.some((source) => source.id === "wikidata")
  const includeCommons = sourcesToUse.some((source) => source.id === "commons")
  const shouldSearchWikidata = includeWikidata || includeCommons

  const results = shouldSearchWikidata
    ? await searchWikidataBackedSources({ ...request, query }, includeWikidata, includeCommons)
    : []

  return {
    results: sortSearchResults(resourceType, results).slice(0, clampLimit(request.limit)),
    sources: hierarchy,
    diagnostics,
  }
}
