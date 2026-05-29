import type {
  AtlasSourceRank,
  AtlasSourceRecordType,
  AtlasSourceSearchResult,
} from "@/lib/atlas/source-registry"

export type AtlasContentReviewStatus =
  | "unreviewed"
  | "teacher-reviewed"
  | "disputed"
  | "approved"
  | "rejected"

export interface AtlasCitation {
  id: string
  title: string
  url?: string | null
  author?: string | null
  year?: string | null
  sourceId?: string | null
  sourceLabel?: string | null
  sourceRank?: AtlasSourceRank | null
  license?: string | null
  licenseUrl?: string | null
  attribution?: string | null
  retrievedAt?: string | null
}

export interface AtlasSourceRecordReference {
  recordId?: string | null
  sourceId: string
  sourceLabel: string
  sourceRank?: AtlasSourceRank | null
  recordType?: AtlasSourceRecordType | null
  externalId?: string | null
  externalUrl?: string | null
  revisionId?: string | null
  retrievedAt?: string | null
}

export interface AtlasTeacherSourceFeedback {
  id?: string
  teacherId?: string | null
  rating?: number | null
  accuracyRating?: number | null
  visualQualityRating?: number | null
  classroomFitRating?: number | null
  reviewStatus?: Exclude<AtlasContentReviewStatus, "unreviewed"> | null
  rejectionReason?: string | null
  note?: string | null
  correction?: string | null
  correctionPayload?: Record<string, unknown> | null
  createdAt?: string | null
}

export interface AtlasSourceProvenancePayload {
  sourceRecords: AtlasSourceRecordReference[]
  citations: AtlasCitation[]
  confidence: number
  warnings: string[]
  reviewStatus: AtlasContentReviewStatus
  teacherFeedback: AtlasTeacherSourceFeedback[]
  renderPayload: Record<string, unknown>
}

export const EMPTY_SOURCE_PROVENANCE: AtlasSourceProvenancePayload = {
  sourceRecords: [],
  citations: [],
  confidence: 0,
  warnings: [],
  reviewStatus: "unreviewed",
  teacherFeedback: [],
  renderPayload: {},
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function clampConfidence(value: unknown): number {
  const numeric = readNumber(value)
  if (numeric == null) return 0
  return Math.min(1, Math.max(0, numeric))
}

function normalizeWarnings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((entry) => entry.trim()).filter(Boolean)
  }
  const warning = readString(value)
  return warning ? [warning] : []
}

function normalizeReviewStatus(value: unknown): AtlasContentReviewStatus {
  switch (value) {
    case "teacher-reviewed":
    case "disputed":
    case "approved":
    case "rejected":
      return value
    default:
      return "unreviewed"
  }
}

function readSourceRank(value: unknown): AtlasSourceRank | null {
  const rank = readString(value)
  return rank === "S" || rank === "A" || rank === "B" || rank === "C" || rank === "D" ? rank : null
}

function readRecordType(value: unknown): AtlasSourceRecordType | null {
  const recordType = readString(value)
  switch (recordType) {
    case "entity":
    case "media":
    case "dataset":
    case "geometry":
    case "document":
    case "claim":
    case "product":
    case "task":
    case "unknown":
      return recordType
    default:
      return null
  }
}

function normalizeCitation(value: unknown, fallbackIndex: number): AtlasCitation | null {
  if (!isRecord(value)) return null
  const title = readString(value.title) ?? readString(value.label) ?? readString(value.sourceLabel)
  const url = readString(value.url) ?? readString(value.sourceUrl) ?? readString(value.externalUrl)
  if (!title && !url) return null

  return {
    id: readString(value.id) ?? `citation-${fallbackIndex + 1}`,
    title: title ?? url ?? "Citation",
    url,
    author: readString(value.author),
    year: readString(value.year),
    sourceId: readString(value.sourceId) ?? readString(value.source_id),
    sourceLabel: readString(value.sourceLabel) ?? readString(value.source_label),
    sourceRank: readSourceRank(value.sourceRank) ?? readSourceRank(value.source_rank),
    license: readString(value.license),
    licenseUrl: readString(value.licenseUrl) ?? readString(value.license_url),
    attribution: readString(value.attribution),
    retrievedAt: readString(value.retrievedAt) ?? readString(value.retrieved_at),
  }
}

function normalizeSourceRecord(value: unknown): AtlasSourceRecordReference | null {
  if (!isRecord(value)) return null
  const sourceId = readString(value.sourceId) ?? readString(value.source_id)
  const sourceLabel = readString(value.sourceLabel) ?? readString(value.source_label) ?? sourceId
  if (!sourceId || !sourceLabel) return null

  return {
    recordId: readString(value.recordId) ?? readString(value.record_id),
    sourceId,
    sourceLabel,
    sourceRank: readSourceRank(value.sourceRank) ?? readSourceRank(value.source_rank),
    recordType: readRecordType(value.recordType) ?? readRecordType(value.record_type),
    externalId: readString(value.externalId) ?? readString(value.external_id),
    externalUrl: readString(value.externalUrl) ?? readString(value.external_url) ?? readString(value.sourceUrl) ?? readString(value.source_url),
    revisionId: readString(value.revisionId) ?? readString(value.revision_id),
    retrievedAt: readString(value.retrievedAt) ?? readString(value.retrieved_at),
  }
}

function normalizeTeacherFeedback(value: unknown): AtlasTeacherSourceFeedback[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .map((entry, index) => {
      const reviewStatus = normalizeReviewStatus(entry.reviewStatus ?? entry.review_status)
      return {
        id: readString(entry.id) ?? `feedback-${index + 1}`,
        teacherId: readString(entry.teacherId) ?? readString(entry.teacher_id),
        rating: readNumber(entry.rating),
        accuracyRating: readNumber(entry.accuracyRating) ?? readNumber(entry.accuracy_rating),
        visualQualityRating: readNumber(entry.visualQualityRating) ?? readNumber(entry.visual_quality_rating),
        classroomFitRating: readNumber(entry.classroomFitRating) ?? readNumber(entry.classroom_fit_rating),
        reviewStatus: reviewStatus === "unreviewed" ? null : reviewStatus,
        rejectionReason: readString(entry.rejectionReason) ?? readString(entry.rejection_reason),
        note: readString(entry.note),
        correction: readString(entry.correction),
        correctionPayload: isRecord(entry.correctionPayload)
          ? entry.correctionPayload
          : isRecord(entry.correction_payload) ? entry.correction_payload : null,
        createdAt: readString(entry.createdAt) ?? readString(entry.created_at),
      }
    })
}

export function sourceProvenanceFromSearchResult(result: AtlasSourceSearchResult): AtlasSourceProvenancePayload {
  return {
    sourceRecords: [
      {
        sourceId: result.sourceId,
        sourceLabel: result.sourceLabel,
        sourceRank: result.sourceRank,
        recordType: result.recordType,
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        revisionId: result.revisionId,
        retrievedAt: result.retrievedAt,
      },
    ],
    citations: [
      {
        id: `${result.sourceId}-${result.externalId}`,
        title: result.title,
        url: result.externalUrl,
        sourceId: result.sourceId,
        sourceLabel: result.sourceLabel,
        sourceRank: result.sourceRank,
        license: result.license,
        licenseUrl: result.licenseUrl,
        attribution: result.attribution,
        retrievedAt: result.retrievedAt,
      },
    ],
    confidence: clampConfidence(result.confidence),
    warnings: result.warnings,
    reviewStatus: "unreviewed",
    teacherFeedback: [],
    renderPayload: result.payload,
  }
}

export function sourceProvenanceFromMetadata(metadata: unknown): AtlasSourceProvenancePayload {
  if (!isRecord(metadata)) return { ...EMPTY_SOURCE_PROVENANCE }
  const sourceId = readString(metadata.source_id) ?? readString(metadata.sourceId) ?? "unknown"
  const sourceLabel = readString(metadata.source_label) ?? readString(metadata.sourceLabel) ?? sourceId
  const externalId = readString(metadata.external_id) ?? readString(metadata.externalId)
  const externalUrl = readString(metadata.source_url) ?? readString(metadata.sourceUrl) ?? readString(metadata.external_url) ?? readString(metadata.externalUrl)
  const retrievedAt = readString(metadata.retrieved_at) ?? readString(metadata.retrievedAt)
  const sourceRank = readSourceRank(metadata.source_rank) ?? readSourceRank(metadata.sourceRank)

  return {
    sourceRecords: sourceId === "unknown"
      ? []
      : [{
          sourceId,
          sourceLabel,
          sourceRank,
          externalId,
          externalUrl,
          revisionId: readString(metadata.revision_id) ?? readString(metadata.revisionId),
          retrievedAt,
        }],
    citations: externalUrl || sourceId !== "unknown"
      ? [{
          id: `${sourceId}-${externalId ?? "record"}`,
          title: readString(metadata.title) ?? sourceLabel,
          url: externalUrl,
          sourceId,
          sourceLabel,
          sourceRank,
          license: readString(metadata.license),
          licenseUrl: readString(metadata.license_url) ?? readString(metadata.licenseUrl),
          attribution: readString(metadata.attribution),
          retrievedAt,
        }]
      : [],
    confidence: clampConfidence(metadata.confidence),
    warnings: normalizeWarnings(metadata.warnings),
    reviewStatus: normalizeReviewStatus(metadata.review_status ?? metadata.reviewStatus),
    teacherFeedback: normalizeTeacherFeedback(metadata.teacherFeedback ?? metadata.teacher_feedback),
    renderPayload: isRecord(metadata.render_payload) ? metadata.render_payload : {},
  }
}

export function normalizeSourceProvenance(content: Record<string, unknown>): AtlasSourceProvenancePayload {
  const raw = content.sourceProvenance
  const legacy = sourceProvenanceFromMetadata(content.sourceMetadata)
  const directSource = readString(content.source) ?? readString(content.sourceUrl) ?? readString(content.attribution)
  const directCitation = directSource
    ? {
        id: "manual-source",
        title: directSource,
        url: readString(content.sourceUrl),
        attribution: readString(content.attribution),
        license: readString(content.license),
      }
    : null

  if (!isRecord(raw)) {
    if (!directSource && legacy.sourceRecords.length === 0 && legacy.citations.length === 0) {
      return { ...EMPTY_SOURCE_PROVENANCE }
    }

    return {
      ...legacy,
      citations: legacy.citations.length > 0
        ? legacy.citations
        : directCitation ? [directCitation] : [],
    }
  }

  const sourceRecords = Array.isArray(raw.sourceRecords)
    ? raw.sourceRecords.flatMap((entry) => {
        const normalized = normalizeSourceRecord(entry)
        return normalized ? [normalized] : []
      })
    : legacy.sourceRecords

  const rawCitations = Array.isArray(raw.citations)
    ? raw.citations.flatMap((entry, index) => {
        const normalized = normalizeCitation(entry, index)
        return normalized ? [normalized] : []
      })
    : legacy.citations
  const citations = rawCitations.length > 0 ? rawCitations : directCitation ? [directCitation] : []

  return {
    sourceRecords,
    citations,
    confidence: clampConfidence(raw.confidence ?? legacy.confidence),
    warnings: normalizeWarnings(raw.warnings).length > 0 ? normalizeWarnings(raw.warnings) : legacy.warnings,
    reviewStatus: normalizeReviewStatus(raw.reviewStatus ?? legacy.reviewStatus),
    teacherFeedback: normalizeTeacherFeedback(raw.teacherFeedback),
    renderPayload: isRecord(raw.renderPayload) ? raw.renderPayload : legacy.renderPayload,
  }
}

export function withDefaultSourceProvenance<T extends Record<string, unknown>>(content: T): T & { sourceProvenance: AtlasSourceProvenancePayload } {
  return {
    ...content,
    sourceProvenance: normalizeSourceProvenance(content),
  }
}

export function hasVisibleSourceProvenance(content: Record<string, unknown>): boolean {
  const provenance = normalizeSourceProvenance(content)
  return (
    provenance.sourceRecords.length > 0 ||
    provenance.citations.length > 0 ||
    provenance.warnings.length > 0 ||
    provenance.teacherFeedback.length > 0 ||
    provenance.reviewStatus !== "unreviewed" ||
    provenance.confidence > 0
  )
}
