import type { SupabaseClient } from "@supabase/supabase-js"
import {
  assembleEntityPack,
  promoteAssetCandidate,
  promoteEntityCandidate,
  setAssetCandidateReviewStatus,
  setEntityCandidateReviewStatus,
  upsertAssetCandidate,
  upsertEntityCandidate,
  upsertSourceRecord,
  type AtlasAssetCandidateRow,
  type AtlasEntityCandidateRow,
} from "@/lib/atlas/repository"
import {
  buildWikidataEntityCandidate,
  buildWikidataSourceRecord,
  fetchCommonsAssetsFromWikidataEntity,
  fetchWikidataEntity,
  searchWikidataEntities,
  wikidataEntityIdFromSearchItem,
} from "@/lib/atlas/wikidata"

type AtlasClient = SupabaseClient

export type AtlasImportRequest = {
  query: string
  sourceId?: string | null
  externalId?: string | null
  limit?: number
  includeAssets?: boolean
  promote?: boolean
  assemblePack?: boolean
}

export type AtlasImportResult = {
  jobId: string
  recordsSeen: number
  entityCandidates: AtlasEntityCandidateRow[]
  assetCandidates: AtlasAssetCandidateRow[]
  promotedItemIds: string[]
  promotedMediaIds: string[]
  packIds: string[]
}

async function createImportJob(client: AtlasClient, request: AtlasImportRequest): Promise<string> {
  const sourceId = normalizeImportSourceId(request.sourceId)
  const importQuery = request.externalId
    ? `${sourceId}:${request.externalId.trim().toUpperCase()}`
    : request.query

  const { data, error } = await client
    .from("atlas_import_jobs")
    .insert({
      source_id: sourceId,
      job_kind: "import",
      query: importQuery,
      status: "running",
      started_at: new Date().toISOString(),
      metadata: {
        external_id: request.externalId ?? null,
        include_assets: request.includeAssets ?? true,
        promote: request.promote ?? false,
        assemble_pack: request.assemblePack ?? false,
      },
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(`Create Atlas import job: ${error?.message ?? "no data returned"}`)
  }

  return data.id as string
}

async function finishImportJob(
  client: AtlasClient,
  jobId: string,
  status: "succeeded" | "failed",
  result: Partial<AtlasImportResult> & { errorMessage?: string },
) {
  const { error } = await client
    .from("atlas_import_jobs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      records_seen: result.recordsSeen ?? 0,
      records_created: (result.entityCandidates?.length ?? 0) + (result.assetCandidates?.length ?? 0),
      records_updated: 0,
      error_message: result.errorMessage ?? null,
      metadata: {
        entity_candidate_ids: result.entityCandidates?.map((candidate) => candidate.id) ?? [],
        asset_candidate_ids: result.assetCandidates?.map((candidate) => candidate.id) ?? [],
        promoted_item_ids: result.promotedItemIds ?? [],
        promoted_media_ids: result.promotedMediaIds ?? [],
        pack_ids: result.packIds ?? [],
      },
    })
    .eq("id", jobId)

  if (error) {
    throw new Error(`Finish Atlas import job: ${error.message}`)
  }
}

export function normalizeWikidataExternalId(value: string): string | null {
  const normalized = value.trim().toUpperCase()
  return /^Q\d+$/.test(normalized) ? normalized : null
}

export function normalizeImportSourceId(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase()
  return normalized || "wikidata"
}

export function resolveWikidataImportIds(request: Pick<AtlasImportRequest, "sourceId" | "externalId">): string[] | null {
  const sourceId = normalizeImportSourceId(request.sourceId)
  if (!request.externalId) {
    return null
  }
  if (sourceId !== "wikidata") {
    throw new Error(`Exact import is not implemented for ${sourceId}.`)
  }

  const wikidataId = normalizeWikidataExternalId(request.externalId)
  if (!wikidataId) {
    throw new Error("Wikidata exact import requires an externalId like Q12560.")
  }
  return [wikidataId]
}

export async function importWikidataAtlasQuery(
  client: AtlasClient,
  request: AtlasImportRequest,
): Promise<AtlasImportResult> {
  const query = request.query.trim()
  const sourceId = normalizeImportSourceId(request.sourceId)
  if (sourceId !== "wikidata") {
    throw new Error(`Import is not implemented for ${sourceId}.`)
  }
  const exactIds = resolveWikidataImportIds(request)
  if (!exactIds && query.length < 2) {
    throw new Error("Import query must contain at least 2 characters.")
  }

  const jobId = await createImportJob(client, request)
  const includeAssets = request.includeAssets ?? true
  const limit = Math.min(Math.max(request.limit ?? 1, 1), 5)

  const result: AtlasImportResult = {
    jobId,
    recordsSeen: 0,
    entityCandidates: [],
    assetCandidates: [],
    promotedItemIds: [],
    promotedMediaIds: [],
    packIds: [],
  }

  try {
    const qids = exactIds ?? (
      await searchWikidataEntities(query, limit)
    ).map(wikidataEntityIdFromSearchItem).filter((value): value is string => Boolean(value))
    result.recordsSeen = qids.length

    for (const qid of qids) {
      const entity = await fetchWikidataEntity(qid)
      const sourceRecord = await upsertSourceRecord(client, buildWikidataSourceRecord(entity))
      const entityCandidate = await upsertEntityCandidate(
        client,
        buildWikidataEntityCandidate(entity, sourceRecord.id),
      )
      result.entityCandidates.push(entityCandidate)

      if (includeAssets) {
        const commonsAssets = await fetchCommonsAssetsFromWikidataEntity(entity, 3)
        for (const commonsAsset of commonsAssets) {
          const commonsRecord = await upsertSourceRecord(client, commonsAsset.sourceRecord)
          const assetCandidate = await upsertAssetCandidate(client, {
            ...commonsAsset.assetCandidate,
            sourceRecordId: commonsRecord.id,
            linkedEntityCandidateId: entityCandidate.id,
          })
          result.assetCandidates.push(assetCandidate)
        }
      }

      if (request.promote) {
        await setEntityCandidateReviewStatus(client, entityCandidate.id, "approved")
        const promotedEntity = await promoteEntityCandidate(client, entityCandidate.id, { approveIfNeeded: true })
        result.promotedItemIds.push(promotedEntity.itemId)

        const linkedAssets = result.assetCandidates.filter((asset) => asset.linked_entity_candidate_id === entityCandidate.id)
        for (const asset of linkedAssets) {
          await setAssetCandidateReviewStatus(client, asset.id, "approved")
          const promotedAsset = await promoteAssetCandidate(client, asset.id, { approveIfNeeded: true })
          result.promotedMediaIds.push(promotedAsset.mediaId)
        }

        if (request.assemblePack) {
          const pack = await assembleEntityPack(client, entityCandidate.id, { reviewStatus: "approved" })
          if (pack && typeof pack === "object" && "id" in pack && typeof pack.id === "string") {
            result.packIds.push(pack.id)
          }
        }
      }
    }

    await finishImportJob(client, jobId, "succeeded", result)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import error"
    await finishImportJob(client, jobId, "failed", { ...result, errorMessage: message })
    throw error
  }
}
