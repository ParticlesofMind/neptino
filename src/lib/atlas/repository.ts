import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getLayerForType, type AtlasContentType, type AtlasLayer, type EntityType } from "@/types/atlas"

export type JsonRecord = Record<string, unknown>

export type AtlasReviewStatus = "new" | "needs_review" | "approved" | "rejected" | "promoted"
export type AtlasPackReviewStatus = "draft" | "needs_review" | "approved" | "retired"

export type AtlasSourceRecordInput = {
  sourceId: string
  externalId: string
  externalUrl?: string | null
  recordType: "entity" | "media" | "dataset" | "geometry" | "document" | "claim" | "product" | "task" | "unknown"
  title?: string | null
  description?: string | null
  language?: string | null
  license?: string | null
  licenseUrl?: string | null
  attribution?: string | null
  revisionId?: string | null
  retrievedAt?: string | null
  rawPayload: unknown
}

export type AtlasSourceRecordRow = {
  id: string
  source_id: string
  external_id: string
  external_url: string | null
  record_type: string
  title: string | null
  description: string | null
  language: string | null
  license: string | null
  license_url: string | null
  attribution: string | null
  revision_id: string | null
  retrieved_at: string
  raw_payload: unknown
  content_hash: string | null
  created_at: string
}

export type AtlasSourceRow = {
  id: string
  label: string
  source_rank: string
  default_license: string | null
  default_license_url: string | null
  requires_attribution: boolean
  commercial_use_status: string
  api_kind: string
  enabled: boolean
}

export type AtlasEntityCandidateInput = {
  primarySourceRecordId: string
  wikidataId?: string | null
  title: string
  aliases?: string[]
  description?: string | null
  suggestedEntityType?: string | null
  suggestedSubtype?: string | null
  suggestedDomains?: string[]
  spatialProfile?: JsonRecord
  temporalProfile?: JsonRecord
  sourceConfidence?: number | null
  classificationConfidence?: number | null
  reviewStatus?: AtlasReviewStatus
  warnings?: unknown[]
  rawMergeContext?: JsonRecord
}

export type AtlasEntityCandidateRow = {
  id: string
  primary_source_record_id: string
  wikidata_id: string | null
  title: string
  aliases: string[]
  description: string | null
  suggested_entity_type: string | null
  suggested_subtype: string | null
  suggested_domains: string[]
  spatial_profile: JsonRecord
  temporal_profile: JsonRecord
  source_confidence: number | null
  classification_confidence: number | null
  review_status: AtlasReviewStatus
  warnings: unknown[]
  raw_merge_context: JsonRecord
  promoted_item_id: string | null
  created_at: string
  updated_at: string
}

export type AtlasAssetCandidateInput = {
  sourceRecordId: string
  linkedEntityCandidateId?: string | null
  linkedItemId?: string | null
  title: string
  description?: string | null
  suggestedMediaType?: string | null
  url?: string | null
  storagePath?: string | null
  mimeType?: string | null
  license?: string | null
  licenseUrl?: string | null
  attribution?: string | null
  qualityScore?: number | null
  reviewStatus?: AtlasReviewStatus
  warnings?: unknown[]
  metadata?: JsonRecord
}

export type AtlasAssetCandidateRow = {
  id: string
  source_record_id: string
  linked_entity_candidate_id: string | null
  linked_item_id: string | null
  title: string
  description: string | null
  suggested_media_type: string | null
  url: string | null
  storage_path: string | null
  mime_type: string | null
  license: string | null
  license_url: string | null
  attribution: string | null
  quality_score: number | null
  review_status: AtlasReviewStatus
  warnings: unknown[]
  metadata: JsonRecord
  promoted_media_id: string | null
  created_at: string
  updated_at: string
}

export type AtlasProductCandidateInput = {
  linkedEntityCandidateId?: string | null
  linkedItemId?: string | null
  title: string
  description?: string | null
  suggestedProductType?: string | null
  inputRecordIds?: string[]
  renderPayload?: JsonRecord
  sourceSummary?: JsonRecord
  confidence?: number | null
  reviewStatus?: AtlasReviewStatus
  warnings?: unknown[]
}

export type AtlasTaskCandidateInput = {
  linkedEntityCandidateId?: string | null
  linkedItemId?: string | null
  title: string
  description?: string | null
  activityFamily?: string | null
  studentAction?: string | null
  pedagogicalRole?: string | null
  inputRecordIds?: string[]
  taskPayload?: JsonRecord
  rubricPayload?: JsonRecord
  reviewStatus?: AtlasReviewStatus
  warnings?: unknown[]
}

export type PromotedEntityResult = {
  itemId: string
  candidate: AtlasEntityCandidateRow
}

export type PromotedMediaResult = {
  mediaId: string
  itemId: string
  layer: AtlasLayer
}

export type RepositoryCandidateSummary = {
  id: string
  title: string
  description: string | null
  wikidataId: string | null
  reviewStatus: AtlasReviewStatus
  suggestedEntityType: string | null
  suggestedSubtype: string | null
  suggestedDomains: string[]
  warnings: unknown[]
  promotedItemId: string | null
  createdAt: string
  updatedAt: string
  source: {
    id: string
    label: string
    rank: string
    externalId: string
    externalUrl: string | null
    license: string | null
    licenseUrl: string | null
    revisionId: string | null
    retrievedAt: string
  } | null
  assetCandidates: Array<{
    id: string
    title: string
    suggestedMediaType: string | null
    reviewStatus: AtlasReviewStatus
    promotedMediaId: string | null
    url: string | null
    license: string | null
  }>
}

type AtlasClient = SupabaseClient

function assertSupabaseResult<T>(result: { data: T | null; error: { message: string } | null }, action: string): T {
  if (result.error) {
    throw new Error(`${action}: ${result.error.message}`)
  }
  if (result.data === null) {
    throw new Error(`${action}: no data returned`)
  }
  return result.data
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(",")}]`
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export function buildContentHash(payload: unknown): string {
  return createHash("sha256").update(stableJsonStringify(payload)).digest("hex")
}

export function slugifyAtlasId(value: string, fallback = "atlas-item"): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || fallback
}

function asJsonRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {}
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === "string")
}

function readFirstYear(value: unknown): number | null {
  if (typeof value !== "string") {
    return null
  }
  const match = value.match(/-?\d{1,4}/)
  if (!match) {
    return null
  }
  const parsed = Number.parseInt(match[0], 10)
  return Number.isNaN(parsed) ? null : parsed
}

function inferEraGroup(temporalProfile: JsonRecord): string | null {
  const year =
    readFirstYear(temporalProfile.start) ??
    readFirstYear(temporalProfile.birth) ??
    readFirstYear(temporalProfile.inception) ??
    readFirstYear(temporalProfile.pointInTime)

  if (year === null) {
    return null
  }
  if (year < 500) {
    return "ancient"
  }
  if (year < 1800) {
    return "early-modern"
  }
  if (year < 1946) {
    return "modern"
  }
  return "contemporary"
}

function buildEraLabel(temporalProfile: JsonRecord): string | null {
  const start =
    typeof temporalProfile.start === "string"
      ? temporalProfile.start
      : typeof temporalProfile.birth === "string"
        ? temporalProfile.birth
        : typeof temporalProfile.inception === "string"
          ? temporalProfile.inception
          : null
  const end =
    typeof temporalProfile.end === "string"
      ? temporalProfile.end
      : typeof temporalProfile.death === "string"
        ? temporalProfile.death
        : typeof temporalProfile.dissolved === "string"
          ? temporalProfile.dissolved
          : null

  const startYear = start ? readFirstYear(start) : null
  const endYear = end ? readFirstYear(end) : null

  if (startYear !== null && endYear !== null) {
    return `${startYear}-${endYear}`
  }
  if (startYear !== null) {
    return `${startYear}-`
  }
  return null
}

function buildPromotedItemId(candidate: AtlasEntityCandidateRow): string {
  if (candidate.promoted_item_id) {
    return candidate.promoted_item_id
  }
  if (candidate.wikidata_id) {
    return `wikidata-${candidate.wikidata_id.toLowerCase()}`
  }
  return slugifyAtlasId(candidate.title)
}

function buildPromotedMediaId(itemId: string, title: string, existingId?: string | null): string {
  return existingId ?? `${itemId}--${slugifyAtlasId(title, "resource")}`
}

async function getSourceRecord(client: AtlasClient, id: string): Promise<AtlasSourceRecordRow> {
  const result = await client.from("atlas_source_records").select("*").eq("id", id).single()
  return assertSupabaseResult(result, "Load Atlas source record") as AtlasSourceRecordRow
}

async function getSource(client: AtlasClient, sourceId: string): Promise<AtlasSourceRow | null> {
  const { data, error } = await client
    .from("atlas_sources")
    .select("id,label,source_rank,default_license,default_license_url,requires_attribution,commercial_use_status,api_kind,enabled")
    .eq("id", sourceId)
    .maybeSingle()
  if (error) {
    throw new Error(`Load Atlas source: ${error.message}`)
  }
  return (data ?? null) as AtlasSourceRow | null
}

async function getEntityCandidate(client: AtlasClient, id: string): Promise<AtlasEntityCandidateRow> {
  const result = await client.from("atlas_entity_candidates").select("*").eq("id", id).single()
  return assertSupabaseResult(result, "Load Atlas entity candidate") as AtlasEntityCandidateRow
}

async function resolvePromotedItemId(client: AtlasClient, candidate: AtlasEntityCandidateRow): Promise<string | null> {
  if (candidate.promoted_item_id) {
    return candidate.promoted_item_id
  }
  if (candidate.wikidata_id) {
    const { data, error } = await client
      .from("encyclopedia_items")
      .select("id")
      .eq("wikidata_id", candidate.wikidata_id)
      .maybeSingle()
    if (error) {
      throw new Error(`Resolve promoted Atlas item: ${error.message}`)
    }
    return data?.id ?? null
  }
  return null
}

async function updateReviewStatus(
  client: AtlasClient,
  table: string,
  id: string,
  reviewStatus: AtlasReviewStatus,
  promotedColumn?: string,
  promotedId?: string,
) {
  const payload: Record<string, unknown> = { review_status: reviewStatus }
  if (promotedColumn && promotedId) {
    payload[promotedColumn] = promotedId
  }
  const { error } = await client.from(table).update(payload).eq("id", id)
  if (error) {
    throw new Error(`Update ${table} review status: ${error.message}`)
  }
}

export async function upsertSourceRecord(
  client: AtlasClient,
  input: AtlasSourceRecordInput,
): Promise<AtlasSourceRecordRow> {
  const rawPayload = input.rawPayload ?? {}
  const result = await client
    .from("atlas_source_records")
    .upsert(
      {
        source_id: input.sourceId,
        external_id: input.externalId,
        external_url: input.externalUrl ?? null,
        record_type: input.recordType,
        title: input.title ?? null,
        description: input.description ?? null,
        language: input.language ?? null,
        license: input.license ?? null,
        license_url: input.licenseUrl ?? null,
        attribution: input.attribution ?? null,
        revision_id: input.revisionId ?? null,
        retrieved_at: input.retrievedAt ?? new Date().toISOString(),
        raw_payload: rawPayload,
        content_hash: buildContentHash(rawPayload),
      },
      { onConflict: "source_id,external_id" },
    )
    .select("*")
    .single()

  return assertSupabaseResult(result, "Upsert Atlas source record") as AtlasSourceRecordRow
}

export async function upsertEntityCandidate(
  client: AtlasClient,
  input: AtlasEntityCandidateInput,
): Promise<AtlasEntityCandidateRow> {
  const result = await client
    .from("atlas_entity_candidates")
    .upsert(
      {
        primary_source_record_id: input.primarySourceRecordId,
        wikidata_id: input.wikidataId ?? null,
        title: input.title,
        aliases: input.aliases ?? [],
        description: input.description ?? null,
        suggested_entity_type: input.suggestedEntityType ?? null,
        suggested_subtype: input.suggestedSubtype ?? null,
        suggested_domains: input.suggestedDomains ?? [],
        spatial_profile: input.spatialProfile ?? {},
        temporal_profile: input.temporalProfile ?? {},
        source_confidence: input.sourceConfidence ?? null,
        classification_confidence: input.classificationConfidence ?? null,
        review_status: input.reviewStatus ?? "needs_review",
        warnings: input.warnings ?? [],
        raw_merge_context: input.rawMergeContext ?? {},
      },
      { onConflict: "primary_source_record_id" },
    )
    .select("*")
    .single()

  return assertSupabaseResult(result, "Upsert Atlas entity candidate") as AtlasEntityCandidateRow
}

export async function upsertAssetCandidate(
  client: AtlasClient,
  input: AtlasAssetCandidateInput,
): Promise<AtlasAssetCandidateRow> {
  const result = await client
    .from("atlas_asset_candidates")
    .upsert(
      {
        source_record_id: input.sourceRecordId,
        linked_entity_candidate_id: input.linkedEntityCandidateId ?? null,
        linked_item_id: input.linkedItemId ?? null,
        title: input.title,
        description: input.description ?? null,
        suggested_media_type: input.suggestedMediaType ?? null,
        url: input.url ?? null,
        storage_path: input.storagePath ?? null,
        mime_type: input.mimeType ?? null,
        license: input.license ?? null,
        license_url: input.licenseUrl ?? null,
        attribution: input.attribution ?? null,
        quality_score: input.qualityScore ?? null,
        review_status: input.reviewStatus ?? "needs_review",
        warnings: input.warnings ?? [],
        metadata: input.metadata ?? {},
      },
      { onConflict: "source_record_id" },
    )
    .select("*")
    .single()

  return assertSupabaseResult(result, "Upsert Atlas asset candidate") as AtlasAssetCandidateRow
}

export async function upsertProductCandidate(client: AtlasClient, input: AtlasProductCandidateInput) {
  const result = await client
    .from("atlas_product_candidates")
    .insert({
      linked_entity_candidate_id: input.linkedEntityCandidateId ?? null,
      linked_item_id: input.linkedItemId ?? null,
      title: input.title,
      description: input.description ?? null,
      suggested_product_type: input.suggestedProductType ?? null,
      input_record_ids: input.inputRecordIds ?? [],
      render_payload: input.renderPayload ?? {},
      source_summary: input.sourceSummary ?? {},
      confidence: input.confidence ?? null,
      review_status: input.reviewStatus ?? "needs_review",
      warnings: input.warnings ?? [],
    })
    .select("*")
    .single()

  return assertSupabaseResult(result, "Create Atlas product candidate")
}

export async function upsertTaskCandidate(client: AtlasClient, input: AtlasTaskCandidateInput) {
  const result = await client
    .from("atlas_task_candidates")
    .insert({
      linked_entity_candidate_id: input.linkedEntityCandidateId ?? null,
      linked_item_id: input.linkedItemId ?? null,
      title: input.title,
      description: input.description ?? null,
      activity_family: input.activityFamily ?? null,
      student_action: input.studentAction ?? null,
      pedagogical_role: input.pedagogicalRole ?? null,
      input_record_ids: input.inputRecordIds ?? [],
      task_payload: input.taskPayload ?? {},
      rubric_payload: input.rubricPayload ?? {},
      review_status: input.reviewStatus ?? "needs_review",
      warnings: input.warnings ?? [],
    })
    .select("*")
    .single()

  return assertSupabaseResult(result, "Create Atlas task candidate")
}

export async function setEntityCandidateReviewStatus(
  client: AtlasClient,
  candidateId: string,
  reviewStatus: AtlasReviewStatus,
): Promise<void> {
  await updateReviewStatus(client, "atlas_entity_candidates", candidateId, reviewStatus)
}

export async function setAssetCandidateReviewStatus(
  client: AtlasClient,
  candidateId: string,
  reviewStatus: AtlasReviewStatus,
): Promise<void> {
  await updateReviewStatus(client, "atlas_asset_candidates", candidateId, reviewStatus)
}

export async function promoteEntityCandidate(
  client: AtlasClient,
  candidateId: string,
  options: { approveIfNeeded?: boolean } = {},
): Promise<PromotedEntityResult> {
  const candidate = await getEntityCandidate(client, candidateId)
  if (candidate.review_status === "rejected") {
    throw new Error("Rejected entity candidates cannot be promoted.")
  }
  if (!["approved", "promoted"].includes(candidate.review_status) && !options.approveIfNeeded) {
    throw new Error("Entity candidate must be approved before promotion.")
  }

  const sourceRecord = await getSourceRecord(client, candidate.primary_source_record_id)
  const source = await getSource(client, sourceRecord.source_id)
  const existingItemId = await resolvePromotedItemId(client, candidate)
  const itemId = existingItemId ?? buildPromotedItemId(candidate)

  const { data: existingItem, error: existingError } = await client
    .from("encyclopedia_items")
    .select("id,metadata")
    .eq("id", itemId)
    .maybeSingle()
  if (existingError) {
    throw new Error(`Load promoted Atlas item: ${existingError.message}`)
  }

  const temporalProfile = asJsonRecord(candidate.temporal_profile)
  const metadata = {
    ...asJsonRecord(existingItem?.metadata),
    aliases: candidate.aliases,
    spatial_profile: candidate.spatial_profile,
    temporal_profile: candidate.temporal_profile,
    atlas_repository: {
      entity_candidate_id: candidate.id,
      primary_source_record_id: sourceRecord.id,
      source_id: sourceRecord.source_id,
      source_label: source?.label ?? sourceRecord.source_id,
      source_rank: source?.source_rank ?? null,
      source_external_id: sourceRecord.external_id,
      source_url: sourceRecord.external_url,
      source_record_content_hash: sourceRecord.content_hash,
      license: sourceRecord.license ?? source?.default_license ?? null,
      license_url: sourceRecord.license_url ?? source?.default_license_url ?? null,
      attribution: sourceRecord.attribution,
      revision_id: sourceRecord.revision_id,
      retrieved_at: sourceRecord.retrieved_at,
      promoted_at: new Date().toISOString(),
      source_confidence: candidate.source_confidence,
      classification_confidence: candidate.classification_confidence,
      warnings: candidate.warnings,
    },
  }

  const result = await client
    .from("encyclopedia_items")
    .upsert(
      {
        id: itemId,
        wikidata_id: candidate.wikidata_id,
        title: candidate.title,
        knowledge_type: (candidate.suggested_entity_type ?? "Instance") as EntityType,
        sub_type: candidate.suggested_subtype,
        domain: candidate.suggested_domains[0] ?? null,
        secondary_domains: candidate.suggested_domains.slice(1),
        era_group: inferEraGroup(temporalProfile),
        era_label: buildEraLabel(temporalProfile),
        depth: "overview",
        summary: candidate.description,
        tags: [...new Set([candidate.suggested_subtype, ...candidate.aliases].filter(Boolean))],
        metadata,
      },
      { onConflict: "id" },
    )
    .select("id")
    .single()

  const promoted = assertSupabaseResult(result, "Promote Atlas entity candidate") as { id: string }
  await updateReviewStatus(client, "atlas_entity_candidates", candidate.id, "promoted", "promoted_item_id", promoted.id)

  return { itemId: promoted.id, candidate: { ...candidate, promoted_item_id: promoted.id, review_status: "promoted" } }
}

async function resolveLinkedItemForCandidate(
  client: AtlasClient,
  linkedItemId: string | null,
  linkedEntityCandidateId: string | null,
): Promise<string> {
  if (linkedItemId) {
    return linkedItemId
  }
  if (!linkedEntityCandidateId) {
    throw new Error("Candidate is not linked to an Atlas entity.")
  }
  const entity = await getEntityCandidate(client, linkedEntityCandidateId)
  const itemId = await resolvePromotedItemId(client, entity)
  if (!itemId) {
    throw new Error("Promote the linked entity candidate before promoting its resources.")
  }
  return itemId
}

async function promoteMediaLikeCandidate(
  client: AtlasClient,
  table: "atlas_asset_candidates" | "atlas_product_candidates" | "atlas_task_candidates",
  candidateId: string,
  options: { approveIfNeeded?: boolean; layer: AtlasLayer },
): Promise<PromotedMediaResult> {
  const result = await client.from(table).select("*").eq("id", candidateId).single()
  const candidate = assertSupabaseResult(result, `Load ${table} candidate`) as Record<string, unknown>
  const reviewStatus = String(candidate.review_status ?? "new") as AtlasReviewStatus
  if (reviewStatus === "rejected") {
    throw new Error("Rejected candidates cannot be promoted.")
  }
  if (!["approved", "promoted"].includes(reviewStatus) && !options.approveIfNeeded) {
    throw new Error("Candidate must be approved before promotion.")
  }

  const itemId = await resolveLinkedItemForCandidate(
    client,
    typeof candidate.linked_item_id === "string" ? candidate.linked_item_id : null,
    typeof candidate.linked_entity_candidate_id === "string" ? candidate.linked_entity_candidate_id : null,
  )

  const typeValue =
    typeof candidate.suggested_media_type === "string"
      ? candidate.suggested_media_type
      : typeof candidate.suggested_product_type === "string"
        ? candidate.suggested_product_type
        : typeof candidate.activity_family === "string"
          ? candidate.activity_family
          : "Narrative"
  const layer = getLayerForType(typeValue) ?? options.layer
  const title = String(candidate.title ?? "Atlas resource")
  const mediaId = buildPromotedMediaId(itemId, title, typeof candidate.promoted_media_id === "string" ? candidate.promoted_media_id : null)

  const sourceRecordId =
    typeof candidate.source_record_id === "string"
      ? candidate.source_record_id
      : Array.isArray(candidate.input_record_ids)
        ? asStringArray(candidate.input_record_ids)[0]
        : null
  const sourceRecord = sourceRecordId ? await getSourceRecord(client, sourceRecordId) : null
  const source = sourceRecord ? await getSource(client, sourceRecord.source_id) : null

  const metadata = {
    ...asJsonRecord(candidate.metadata),
    render_payload: asJsonRecord(candidate.render_payload),
    task_payload: asJsonRecord(candidate.task_payload),
    rubric_payload: asJsonRecord(candidate.rubric_payload),
    source_summary: asJsonRecord(candidate.source_summary),
    atlas_repository: {
      candidate_table: table,
      candidate_id: candidateId,
      source_record_id: sourceRecord?.id ?? null,
      source_id: sourceRecord?.source_id ?? null,
      source_label: source?.label ?? null,
      source_rank: source?.source_rank ?? null,
      source_external_id: sourceRecord?.external_id ?? null,
      source_url: sourceRecord?.external_url ?? null,
      source_record_content_hash: sourceRecord?.content_hash ?? null,
      license: candidate.license ?? sourceRecord?.license ?? source?.default_license ?? null,
      license_url: candidate.license_url ?? sourceRecord?.license_url ?? source?.default_license_url ?? null,
      attribution: candidate.attribution ?? sourceRecord?.attribution ?? null,
      revision_id: sourceRecord?.revision_id ?? null,
      retrieved_at: sourceRecord?.retrieved_at ?? null,
      promoted_at: new Date().toISOString(),
      warnings: candidate.warnings ?? [],
    },
  }

  const upsertResult = await client
    .from("encyclopedia_media")
    .upsert(
      {
        id: mediaId,
        item_id: itemId,
        media_type: typeValue as AtlasContentType,
        layer,
        title,
        description: typeof candidate.description === "string" ? candidate.description : null,
        url: typeof candidate.url === "string" ? candidate.url : null,
        metadata,
      },
      { onConflict: "id" },
    )
    .select("id")
    .single()
  const promoted = assertSupabaseResult(upsertResult, `Promote ${table} candidate`) as { id: string }
  await updateReviewStatus(client, table, candidateId, "promoted", "promoted_media_id", promoted.id)

  return { mediaId: promoted.id, itemId, layer }
}

export async function promoteAssetCandidate(
  client: AtlasClient,
  candidateId: string,
  options: { approveIfNeeded?: boolean } = {},
): Promise<PromotedMediaResult> {
  return promoteMediaLikeCandidate(client, "atlas_asset_candidates", candidateId, { ...options, layer: 2 })
}

export async function promoteProductCandidate(
  client: AtlasClient,
  candidateId: string,
  options: { approveIfNeeded?: boolean } = {},
): Promise<PromotedMediaResult> {
  return promoteMediaLikeCandidate(client, "atlas_product_candidates", candidateId, { ...options, layer: 3 })
}

export async function promoteTaskCandidate(
  client: AtlasClient,
  candidateId: string,
  options: { approveIfNeeded?: boolean } = {},
): Promise<PromotedMediaResult> {
  return promoteMediaLikeCandidate(client, "atlas_task_candidates", candidateId, { ...options, layer: 4 })
}

export async function assembleEntityPack(
  client: AtlasClient,
  entityCandidateId: string,
  options: { reviewStatus?: AtlasPackReviewStatus } = {},
) {
  const candidate = await getEntityCandidate(client, entityCandidateId)
  const itemId = await resolvePromotedItemId(client, candidate)
  if (!itemId) {
    throw new Error("Promote the entity candidate before assembling an Atlas pack.")
  }

  const [assetResult, productResult, taskResult] = await Promise.all([
    client.from("atlas_asset_candidates").select("id,source_record_id,review_status").eq("linked_entity_candidate_id", candidate.id),
    client.from("atlas_product_candidates").select("id,input_record_ids,review_status").eq("linked_entity_candidate_id", candidate.id),
    client.from("atlas_task_candidates").select("id,input_record_ids,review_status").eq("linked_entity_candidate_id", candidate.id),
  ])
  if (assetResult.error) throw new Error(`Load asset candidates for pack: ${assetResult.error.message}`)
  if (productResult.error) throw new Error(`Load product candidates for pack: ${productResult.error.message}`)
  if (taskResult.error) throw new Error(`Load task candidates for pack: ${taskResult.error.message}`)

  const sourceRecord = await getSourceRecord(client, candidate.primary_source_record_id)
  const source = await getSource(client, sourceRecord.source_id)
  const packType = candidate.suggested_entity_type === "Work"
    ? "Work"
    : candidate.suggested_subtype === "Place"
      ? "Place"
      : candidate.suggested_subtype === "Event"
        ? "Event"
        : candidate.suggested_entity_type === "Concept"
          ? "Concept"
          : candidate.suggested_entity_type === "Process"
            ? "Process"
            : "Entity"

  const packId = `pack-${itemId}`
  const packResult = await client
    .from("atlas_packs")
    .upsert(
      {
        id: packId,
        title: `${candidate.title} pack`,
        description: candidate.description,
        pack_type: packType,
        anchor_item_id: itemId,
        anchor_entity_candidate_id: candidate.id,
        domain: candidate.suggested_domains[0] ?? null,
        secondary_domains: candidate.suggested_domains.slice(1),
        era_group: inferEraGroup(asJsonRecord(candidate.temporal_profile)),
        entity_ids: [itemId],
        asset_ids: (assetResult.data ?? []).map((row) => row.id),
        product_ids: (productResult.data ?? []).map((row) => row.id),
        task_ids: (taskResult.data ?? []).map((row) => row.id),
        source_summary: {
          sources: [
            {
              source_id: sourceRecord.source_id,
              source_label: source?.label ?? sourceRecord.source_id,
              source_rank: source?.source_rank ?? null,
              external_id: sourceRecord.external_id,
              external_url: sourceRecord.external_url,
              license: sourceRecord.license ?? source?.default_license ?? null,
              license_url: sourceRecord.license_url ?? source?.default_license_url ?? null,
              attribution: sourceRecord.attribution,
              retrieved_at: sourceRecord.retrieved_at,
            },
          ],
        },
        quality_score: candidate.source_confidence,
        review_status: options.reviewStatus ?? "draft",
      },
      { onConflict: "id" },
    )
    .select("*")
    .single()

  return assertSupabaseResult(packResult, "Assemble Atlas pack")
}

export async function listRepositoryCandidates(
  client: AtlasClient,
  options: { limit?: number; status?: AtlasReviewStatus | "all"; query?: string } = {},
): Promise<RepositoryCandidateSummary[]> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
  let query = client
    .from("atlas_entity_candidates")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (options.status && options.status !== "all") {
    query = query.eq("review_status", options.status)
  }
  if (options.query?.trim()) {
    query = query.ilike("title", `%${options.query.trim()}%`)
  }

  const { data: candidates, error } = await query
  if (error) {
    throw new Error(`List Atlas repository candidates: ${error.message}`)
  }

  const rows = (candidates ?? []) as AtlasEntityCandidateRow[]
  const sourceRecordIds = [...new Set(rows.map((row) => row.primary_source_record_id))]
  const candidateIds = rows.map((row) => row.id)

  const [sourceRecordsResult, assetsResult] = await Promise.all([
    sourceRecordIds.length
      ? client.from("atlas_source_records").select("*").in("id", sourceRecordIds)
      : Promise.resolve({ data: [], error: null }),
    candidateIds.length
      ? client
          .from("atlas_asset_candidates")
          .select("id,linked_entity_candidate_id,title,suggested_media_type,review_status,promoted_media_id,url,license")
          .in("linked_entity_candidate_id", candidateIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (sourceRecordsResult.error) {
    throw new Error(`List Atlas source records: ${sourceRecordsResult.error.message}`)
  }
  if (assetsResult.error) {
    throw new Error(`List Atlas asset candidates: ${assetsResult.error.message}`)
  }

  const sourceRecords = new Map<string, AtlasSourceRecordRow>()
  for (const record of (sourceRecordsResult.data ?? []) as AtlasSourceRecordRow[]) {
    sourceRecords.set(record.id, record)
  }

  const sourceIds = [...new Set([...sourceRecords.values()].map((record) => record.source_id))]
  const sourcesResult = sourceIds.length
    ? await client
        .from("atlas_sources")
        .select("id,label,source_rank,default_license,default_license_url,requires_attribution,commercial_use_status,api_kind,enabled")
        .in("id", sourceIds)
    : { data: [], error: null }
  if (sourcesResult.error) {
    throw new Error(`List Atlas sources: ${sourcesResult.error.message}`)
  }
  const sources = new Map<string, AtlasSourceRow>()
  for (const source of (sourcesResult.data ?? []) as AtlasSourceRow[]) {
    sources.set(source.id, source)
  }

  const assetsByCandidate = new Map<string, RepositoryCandidateSummary["assetCandidates"]>()
  for (const asset of (assetsResult.data ?? []) as Array<Record<string, unknown>>) {
    const candidateId = String(asset.linked_entity_candidate_id ?? "")
    if (!candidateId) continue
    const current = assetsByCandidate.get(candidateId) ?? []
    current.push({
      id: String(asset.id),
      title: String(asset.title ?? "Untitled asset"),
      suggestedMediaType: typeof asset.suggested_media_type === "string" ? asset.suggested_media_type : null,
      reviewStatus: String(asset.review_status ?? "new") as AtlasReviewStatus,
      promotedMediaId: typeof asset.promoted_media_id === "string" ? asset.promoted_media_id : null,
      url: typeof asset.url === "string" ? asset.url : null,
      license: typeof asset.license === "string" ? asset.license : null,
    })
    assetsByCandidate.set(candidateId, current)
  }

  return rows.map((candidate) => {
    const sourceRecord = sourceRecords.get(candidate.primary_source_record_id)
    const source = sourceRecord ? sources.get(sourceRecord.source_id) : null
    return {
      id: candidate.id,
      title: candidate.title,
      description: candidate.description,
      wikidataId: candidate.wikidata_id,
      reviewStatus: candidate.review_status,
      suggestedEntityType: candidate.suggested_entity_type,
      suggestedSubtype: candidate.suggested_subtype,
      suggestedDomains: candidate.suggested_domains,
      warnings: candidate.warnings,
      promotedItemId: candidate.promoted_item_id,
      createdAt: candidate.created_at,
      updatedAt: candidate.updated_at,
      source: sourceRecord
        ? {
            id: sourceRecord.source_id,
            label: source?.label ?? sourceRecord.source_id,
            rank: source?.source_rank ?? "?",
            externalId: sourceRecord.external_id,
            externalUrl: sourceRecord.external_url,
            license: sourceRecord.license ?? source?.default_license ?? null,
            licenseUrl: sourceRecord.license_url ?? source?.default_license_url ?? null,
            revisionId: sourceRecord.revision_id,
            retrievedAt: sourceRecord.retrieved_at,
          }
        : null,
      assetCandidates: assetsByCandidate.get(candidate.id) ?? [],
    }
  })
}
