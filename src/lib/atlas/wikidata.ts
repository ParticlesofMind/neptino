import type {
  AtlasAssetCandidateInput,
  AtlasEntityCandidateInput,
  AtlasSourceRecordInput,
  JsonRecord,
} from "@/lib/atlas/repository"

type WikidataSearchItem = {
  id?: string
  title?: string
  label?: string
  description?: string
  concepturi?: string
}

type WikidataSearchResponse = {
  search?: WikidataSearchItem[]
}

type WikidataClaim = {
  mainsnak?: {
    datavalue?: {
      value?: unknown
    }
  }
}

export type WikidataEntity = {
  id: string
  title?: string
  labels?: Record<string, { value?: string }>
  descriptions?: Record<string, { value?: string }>
  aliases?: Record<string, Array<{ value?: string }>>
  claims?: Record<string, WikidataClaim[]>
  sitelinks?: Record<string, { title?: string }>
  modified?: string
  lastrevid?: number
}

export type CommonsAsset = {
  sourceRecord: AtlasSourceRecordInput
  assetCandidate: Omit<AtlasAssetCandidateInput, "sourceRecordId" | "linkedEntityCandidateId">
}

const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php"
const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"
const CC0_LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/"

const CLAIM_INSTANCE_OF = "P31"
const CLAIM_SUBCLASS_OF = "P279"
const CLAIM_INCEPTION = "P571"
const CLAIM_DISSOLVED = "P576"
const CLAIM_BIRTH_DATE = "P569"
const CLAIM_DEATH_DATE = "P570"
const CLAIM_START_TIME = "P580"
const CLAIM_END_TIME = "P582"
const CLAIM_POINT_IN_TIME = "P585"
const CLAIM_COORDINATE_LOCATION = "P625"
const CLAIM_IMAGE = "P18"

const ENTITY_QIDS = {
  human: "Q5",
  city: "Q515",
  country: "Q6256",
  sovereignState: "Q3624078",
  historicalCountry: "Q3024240",
  empire: "Q48349",
  literaryWork: "Q7725634",
  writtenWork: "Q47461344",
  creativeWork: "Q17537576",
  play: "Q25379",
  book: "Q571",
  event: "Q1656682",
  historicalEvent: "Q198",
  organization: "Q43229",
  movement: "Q49773",
} as const

function buildUrl(baseUrl: string, params: Record<string, string | number>): string {
  const url = new URL(baseUrl)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "Accept": "application/json",
      "User-Agent": "NeptinoAtlasRepository/1.0 (source-backed educational import)",
    },
    signal: AbortSignal.timeout(12_000),
  })

  if (!response.ok) {
    throw new Error(`External source returned ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function stripHtml(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const stripped = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
  return stripped || null
}

function entityLabel(entity: WikidataEntity): string {
  return entity.labels?.en?.value ?? entity.title ?? entity.id
}

function entityDescription(entity: WikidataEntity): string | null {
  return entity.descriptions?.en?.value ?? null
}

function entityAliases(entity: WikidataEntity): string[] {
  const seen = new Set<string>()
  const aliases: string[] = []
  for (const alias of entity.aliases?.en ?? []) {
    if (!alias.value || seen.has(alias.value)) {
      continue
    }
    seen.add(alias.value)
    aliases.push(alias.value)
  }
  return aliases
}

function claimEntityIds(entity: WikidataEntity, propertyId: string): string[] {
  return (entity.claims?.[propertyId] ?? [])
    .map((claim) => {
      const value = claim.mainsnak?.datavalue?.value
      if (!isRecord(value) || typeof value["numeric-id"] !== "number") {
        return null
      }
      return `Q${value["numeric-id"]}`
    })
    .filter((value): value is string => Boolean(value))
}

function claimString(entity: WikidataEntity, propertyId: string): string | null {
  const value = entity.claims?.[propertyId]?.[0]?.mainsnak?.datavalue?.value
  return typeof value === "string" ? value : null
}

function claimTime(entity: WikidataEntity, propertyId: string): string | null {
  const value = entity.claims?.[propertyId]?.[0]?.mainsnak?.datavalue?.value
  if (!isRecord(value) || typeof value.time !== "string") {
    return null
  }
  return value.time.replace(/^\+/, "").split("T")[0]
}

function coordinateClaim(entity: WikidataEntity): JsonRecord {
  const value = entity.claims?.[CLAIM_COORDINATE_LOCATION]?.[0]?.mainsnak?.datavalue?.value
  if (!isRecord(value) || typeof value.latitude !== "number" || typeof value.longitude !== "number") {
    return {}
  }
  return {
    point: {
      latitude: value.latitude,
      longitude: value.longitude,
      precision: typeof value.precision === "number" ? value.precision : null,
      globe: typeof value.globe === "string" ? value.globe : null,
    },
    geometryAvailability: "point",
  }
}

function hasAny(values: string[], qids: string[]): boolean {
  return qids.some((qid) => values.includes(qid))
}

export function inferWikidataClassification(entity: WikidataEntity): Pick<
  AtlasEntityCandidateInput,
  "suggestedEntityType" | "suggestedSubtype" | "suggestedDomains" | "classificationConfidence" | "warnings"
> {
  const title = entityLabel(entity).toLowerCase()
  const instanceOrSubclass = [
    ...claimEntityIds(entity, CLAIM_INSTANCE_OF),
    ...claimEntityIds(entity, CLAIM_SUBCLASS_OF),
  ]
  const warnings: unknown[] = []

  if (hasAny(instanceOrSubclass, [ENTITY_QIDS.human])) {
    return {
      suggestedEntityType: "Person",
      suggestedSubtype: null,
      suggestedDomains: ["Arts and humanities"],
      classificationConfidence: 0.95,
      warnings,
    }
  }

  if (hasAny(instanceOrSubclass, [ENTITY_QIDS.literaryWork, ENTITY_QIDS.writtenWork, ENTITY_QIDS.creativeWork, ENTITY_QIDS.play, ENTITY_QIDS.book])) {
    return {
      suggestedEntityType: "Work",
      suggestedSubtype: instanceOrSubclass.includes(ENTITY_QIDS.play) ? "Play" : instanceOrSubclass.includes(ENTITY_QIDS.book) ? "Book" : null,
      suggestedDomains: ["Arts and humanities"],
      classificationConfidence: 0.82,
      warnings,
    }
  }

  if (hasAny(instanceOrSubclass, [ENTITY_QIDS.empire]) || title.includes("empire")) {
    return {
      suggestedEntityType: "Institution",
      suggestedSubtype: "Empire",
      suggestedDomains: ["Arts and humanities", "Social sciences, journalism and information"],
      classificationConfidence: 0.82,
      warnings,
    }
  }

  if (hasAny(instanceOrSubclass, [ENTITY_QIDS.sovereignState, ENTITY_QIDS.historicalCountry, ENTITY_QIDS.country])) {
    return {
      suggestedEntityType: "Institution",
      suggestedSubtype: "Polity",
      suggestedDomains: ["Social sciences, journalism and information", "Arts and humanities"],
      classificationConfidence: 0.78,
      warnings,
    }
  }

  if (hasAny(instanceOrSubclass, [ENTITY_QIDS.city])) {
    return {
      suggestedEntityType: "Environment",
      suggestedSubtype: "City",
      suggestedDomains: ["Social sciences, journalism and information"],
      classificationConfidence: 0.82,
      warnings,
    }
  }

  if (hasAny(instanceOrSubclass, [ENTITY_QIDS.event, ENTITY_QIDS.historicalEvent])) {
    return {
      suggestedEntityType: "Time",
      suggestedSubtype: "Event",
      suggestedDomains: ["Arts and humanities"],
      classificationConfidence: 0.76,
      warnings,
    }
  }

  if (hasAny(instanceOrSubclass, [ENTITY_QIDS.organization])) {
    return {
      suggestedEntityType: "Institution",
      suggestedSubtype: "Organization",
      suggestedDomains: ["Social sciences, journalism and information"],
      classificationConfidence: 0.72,
      warnings,
    }
  }

  if (hasAny(instanceOrSubclass, [ENTITY_QIDS.movement])) {
    return {
      suggestedEntityType: "Movement",
      suggestedSubtype: null,
      suggestedDomains: ["Arts and humanities", "Social sciences, journalism and information"],
      classificationConfidence: 0.72,
      warnings,
    }
  }

  warnings.push({
    code: "classification_uncertain",
    message: "Wikidata import could not confidently map this item into the current Atlas taxonomy.",
  })

  return {
    suggestedEntityType: "Instance",
    suggestedSubtype: null,
    suggestedDomains: [],
    classificationConfidence: 0.45,
    warnings,
  }
}

export function buildWikidataTemporalProfile(entity: WikidataEntity): JsonRecord {
  const profile: JsonRecord = {}
  const inception = claimTime(entity, CLAIM_INCEPTION)
  const dissolved = claimTime(entity, CLAIM_DISSOLVED)
  const birth = claimTime(entity, CLAIM_BIRTH_DATE)
  const death = claimTime(entity, CLAIM_DEATH_DATE)
  const start = claimTime(entity, CLAIM_START_TIME)
  const end = claimTime(entity, CLAIM_END_TIME)
  const pointInTime = claimTime(entity, CLAIM_POINT_IN_TIME)

  if (inception) profile.inception = inception
  if (dissolved) profile.dissolved = dissolved
  if (birth) profile.birth = birth
  if (death) profile.death = death
  if (start || inception || birth) profile.start = start ?? inception ?? birth
  if (end || dissolved || death) profile.end = end ?? dissolved ?? death
  if (pointInTime) profile.pointInTime = pointInTime
  if (Object.keys(profile).length > 0) profile.precision = "source-provided"

  return profile
}

export async function searchWikidataEntities(query: string, limit = 5): Promise<WikidataSearchItem[]> {
  const payload = await fetchJson<WikidataSearchResponse>(
    buildUrl(WIKIDATA_API_URL, {
      action: "wbsearchentities",
      search: query,
      language: "en",
      uselang: "en",
      format: "json",
      limit,
    }),
  )

  return (payload.search ?? []).filter((item) => Boolean(item.id))
}

export async function fetchWikidataEntity(wikidataId: string): Promise<WikidataEntity> {
  const qid = wikidataId.trim().toUpperCase()
  const payload = await fetchJson<{ entities?: Record<string, WikidataEntity> }>(
    `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`,
  )
  const entity = payload.entities?.[qid]
  if (!entity || entity.id === "-1") {
    throw new Error(`Wikidata entity not found: ${qid}`)
  }
  return entity
}

export function buildWikidataSourceRecord(entity: WikidataEntity): AtlasSourceRecordInput {
  return {
    sourceId: "wikidata",
    externalId: entity.id,
    externalUrl: `https://www.wikidata.org/wiki/${entity.id}`,
    recordType: "entity",
    title: entityLabel(entity),
    description: entityDescription(entity),
    language: "en",
    license: "CC0 1.0",
    licenseUrl: CC0_LICENSE_URL,
    attribution: "Wikidata contributors",
    revisionId: typeof entity.lastrevid === "number" ? String(entity.lastrevid) : null,
    retrievedAt: new Date().toISOString(),
    rawPayload: entity,
  }
}

export function buildWikidataEntityCandidate(
  entity: WikidataEntity,
  primarySourceRecordId: string,
): AtlasEntityCandidateInput {
  const classification = inferWikidataClassification(entity)
  return {
    primarySourceRecordId,
    wikidataId: entity.id,
    title: entityLabel(entity),
    aliases: entityAliases(entity),
    description: entityDescription(entity),
    suggestedEntityType: classification.suggestedEntityType,
    suggestedSubtype: classification.suggestedSubtype,
    suggestedDomains: classification.suggestedDomains,
    spatialProfile: coordinateClaim(entity),
    temporalProfile: buildWikidataTemporalProfile(entity),
    sourceConfidence: 0.9,
    classificationConfidence: classification.classificationConfidence,
    reviewStatus: "needs_review",
    warnings: classification.warnings,
    rawMergeContext: {
      wikidata: {
        qid: entity.id,
        sitelinks: Object.keys(entity.sitelinks ?? {}),
        instanceOf: claimEntityIds(entity, CLAIM_INSTANCE_OF),
        subclassOf: claimEntityIds(entity, CLAIM_SUBCLASS_OF),
      },
    },
  }
}

function commonsFileTitle(fileName: string): string {
  const normalized = fileName.trim().replace(/\s+/g, "_")
  return normalized.toLowerCase().startsWith("file:") ? normalized : `File:${normalized}`
}

function readCommonsMetadataValue(metadata: JsonRecord, key: string): string | null {
  const value = metadata[key]
  if (!isRecord(value)) {
    return null
  }
  return stripHtml(value.value)
}

function inferMediaTypeFromMime(mimeType: string | null): string {
  if (!mimeType) return "Image"
  if (mimeType.startsWith("image/")) return "Image"
  if (mimeType.startsWith("audio/")) return "Audio"
  if (mimeType.startsWith("video/")) return "Video"
  if (mimeType === "application/pdf") return "Document"
  return "Document"
}

export function wikidataImageFileNames(entity: WikidataEntity): string[] {
  const seen = new Set<string>()
  const files: string[] = []
  for (const claim of entity.claims?.[CLAIM_IMAGE] ?? []) {
    const value = claim.mainsnak?.datavalue?.value
    if (typeof value !== "string" || seen.has(value)) {
      continue
    }
    seen.add(value)
    files.push(value)
  }
  return files
}

export async function fetchCommonsAssetForFile(fileName: string): Promise<CommonsAsset | null> {
  const title = commonsFileTitle(fileName)
  const payload = await fetchJson<{ query?: { pages?: Record<string, JsonRecord> } }>(
    buildUrl(COMMONS_API_URL, {
      action: "query",
      titles: title,
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      format: "json",
    }),
  )

  const page = Object.values(payload.query?.pages ?? {})[0]
  if (!page || page.missing) {
    return null
  }

  const imageInfo = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null
  if (!isRecord(imageInfo)) {
    return null
  }

  const metadata = isRecord(imageInfo.extmetadata) ? imageInfo.extmetadata : {}
  const url = typeof imageInfo.url === "string" ? imageInfo.url : null
  const mimeType = typeof imageInfo.mime === "string" ? imageInfo.mime : null
  const objectName = readCommonsMetadataValue(metadata, "ObjectName")
  const description = readCommonsMetadataValue(metadata, "ImageDescription")
  const license = readCommonsMetadataValue(metadata, "LicenseShortName")
  const licenseUrl = readCommonsMetadataValue(metadata, "LicenseUrl")
  const artist = readCommonsMetadataValue(metadata, "Artist")
  const credit = readCommonsMetadataValue(metadata, "Credit")
  const attribution = [artist, credit].filter(Boolean).join(" / ") || "Wikimedia Commons contributors"
  const warnings: unknown[] = []

  if (license && /BY|SA/i.test(license)) {
    warnings.push({
      code: "attribution_required",
      message: "Commons file license requires attribution and may include share-alike terms.",
    })
  }

  return {
    sourceRecord: {
      sourceId: "commons",
      externalId: title,
      externalUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
      recordType: "media",
      title: objectName ?? title.replace(/^File:/, ""),
      description,
      language: "en",
      license,
      licenseUrl,
      attribution,
      revisionId: typeof page.pageid === "number" ? String(page.pageid) : null,
      retrievedAt: new Date().toISOString(),
      rawPayload: page,
    },
    assetCandidate: {
      title: objectName ?? title.replace(/^File:/, ""),
      description,
      suggestedMediaType: inferMediaTypeFromMime(mimeType),
      url,
      mimeType,
      license,
      licenseUrl,
      attribution,
      qualityScore: 0.72,
      reviewStatus: "needs_review",
      warnings,
      metadata: {
        commons_title: title,
        thumbnail_url: url ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title.replace(/^File:/, ""))}?width=1200` : null,
        mime_type: mimeType,
      },
    },
  }
}

export async function fetchCommonsAssetsFromWikidataEntity(entity: WikidataEntity, limit = 3): Promise<CommonsAsset[]> {
  const assets: CommonsAsset[] = []
  for (const fileName of wikidataImageFileNames(entity).slice(0, limit)) {
    const asset = await fetchCommonsAssetForFile(fileName)
    if (asset) {
      assets.push(asset)
    }
  }
  return assets
}

export function wikidataEntityIdFromSearchItem(item: WikidataSearchItem): string | null {
  return item.id && /^Q\d+$/i.test(item.id) ? item.id.toUpperCase() : null
}

export function wikidataSourceSummary(entity: WikidataEntity): JsonRecord {
  return {
    qid: entity.id,
    label: entityLabel(entity),
    description: entityDescription(entity),
    image: claimString(entity, CLAIM_IMAGE),
    modified: entity.modified ?? null,
    lastrevid: entity.lastrevid ?? null,
  }
}
