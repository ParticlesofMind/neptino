import { describe, expect, it } from "vitest"
import {
  normalizeSourceProvenance,
  sourceProvenanceFromSearchResult,
  withDefaultSourceProvenance,
} from "@/lib/atlas/source-provenance"
import type { AtlasSourceSearchResult } from "@/lib/atlas/source-registry"

function sourceResult(): AtlasSourceSearchResult {
  return {
    sourceId: "wikidata",
    sourceLabel: "Wikidata",
    sourceRank: "S",
    recordType: "entity",
    externalId: "Q42",
    externalUrl: "https://www.wikidata.org/wiki/Q42",
    title: "Douglas Adams",
    description: "English writer and humorist",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    attribution: "Wikidata contributors",
    retrievedAt: "2026-05-28T10:00:00.000Z",
    revisionId: "123",
    confidence: 0.87,
    warnings: ["Claims require review."],
    payload: { qid: "Q42" },
  }
}

describe("source provenance", () => {
  it("builds a shared provenance payload from source results", () => {
    const provenance = sourceProvenanceFromSearchResult(sourceResult())

    expect(provenance).toMatchObject({
      confidence: 0.87,
      reviewStatus: "unreviewed",
      warnings: ["Claims require review."],
      sourceRecords: [
        expect.objectContaining({
          sourceId: "wikidata",
          externalId: "Q42",
        }),
      ],
      citations: [
        expect.objectContaining({
          title: "Douglas Adams",
          sourceLabel: "Wikidata",
          license: "CC0 1.0",
        }),
      ],
    })
  })

  it("normalizes legacy source metadata into the shared payload", () => {
    const provenance = normalizeSourceProvenance({
      title: "Map",
      sourceMetadata: {
        source_id: "openhistoricalmap",
        source_label: "OpenHistoricalMap",
        source_rank: "A",
        external_id: "way/123",
        source_url: "https://www.openhistoricalmap.org/way/123",
        confidence: 0.42,
        warnings: ["Geometry is incomplete."],
      },
    })

    expect(provenance.sourceRecords[0]).toMatchObject({
      sourceId: "openhistoricalmap",
      sourceLabel: "OpenHistoricalMap",
      externalId: "way/123",
    })
    expect(provenance.citations[0]?.url).toBe("https://www.openhistoricalmap.org/way/123")
    expect(provenance.warnings).toEqual(["Geometry is incomplete."])
  })

  it("normalizes teacher feedback attached to a provenance payload", () => {
    const provenance = normalizeSourceProvenance({
      title: "Boundary source",
      sourceProvenance: {
        teacherFeedback: [
          {
            teacher_id: "teacher-1",
            rating: 4.5,
            accuracy_rating: 3,
            review_status: "disputed",
            rejection_reason: "low_quality",
            correction_payload: { note: "Use a reviewed boundary layer." },
          },
        ],
      },
    })

    expect(provenance.teacherFeedback[0]).toMatchObject({
      teacherId: "teacher-1",
      rating: 4.5,
      accuracyRating: 3,
      reviewStatus: "disputed",
      rejectionReason: "low_quality",
      correctionPayload: { note: "Use a reviewed boundary layer." },
    })
  })

  it("attaches an empty provenance payload to new card content", () => {
    const content = withDefaultSourceProvenance({ title: "Untitled" })
    expect(content.sourceProvenance).toMatchObject({
      sourceRecords: [],
      citations: [],
      confidence: 0,
      reviewStatus: "unreviewed",
      teacherFeedback: [],
    })
  })
})
