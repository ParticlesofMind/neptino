import { describe, expect, it } from "vitest"
import { buildAtlasCompositionInjectionOption } from "@/lib/atlas/composition-injection-service"
import type { AtlasSourceSearchResult } from "@/lib/atlas/source-registry"

function sourceResult(overrides: Partial<AtlasSourceSearchResult> = {}): AtlasSourceSearchResult {
  return {
    sourceId: "wikidata",
    sourceLabel: "Wikidata",
    sourceRank: "S",
    recordType: "entity",
    externalId: "Q12560",
    externalUrl: "https://www.wikidata.org/wiki/Q12560",
    title: "Ottoman Empire",
    description: "historical empire in Anatolia and the Balkans",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    attribution: "Wikidata contributors",
    retrievedAt: "2026-05-27T10:00:00.000Z",
    revisionId: "123",
    confidence: 0.9,
    warnings: ["Historical boundaries need review."],
    payload: {
      spatialProfile: {
        point: {
          latitude: 39.2,
          longitude: 31.1,
          precision: 0.1,
        },
        geometryAvailability: "point",
      },
      temporalProfile: {
        start: "1299-01-01",
        end: "1922-11-01",
        precision: "source-provided",
      },
      wikidata: {
        qid: "Q12560",
        label: "Ottoman Empire",
      },
    },
    ...overrides,
  }
}

describe("Atlas composition injection service", () => {
  it("builds cartographic composition patches from a source result", () => {
    const option = buildAtlasCompositionInjectionOption(sourceResult(), "cartographic-simulation")
    expect(option?.label).toBe("Ottoman Empire")
    expect(option?.compositionPresetId).toBe("cartographic-simulation")

    const mapPatch = option?.patches.find((patch) => patch.cardType === "map")
    expect(mapPatch?.content).toMatchObject({
      title: "Ottoman Empire map seed",
      lat: 39.2,
      lng: 31.1,
      source: "Wikidata Q12560",
    })

    const timelinePatch = option?.patches.find((patch) => patch.cardType === "timeline")
    expect(timelinePatch?.content.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: "1299", label: "Start in source record" }),
        expect.objectContaining({ date: "1922", label: "End in source record" }),
      ]),
    )
  })

  it("builds data investigation patches with source-backed fact rows", () => {
    const option = buildAtlasCompositionInjectionOption(sourceResult(), "data-investigation")
    const datasetPatch = option?.patches.find((patch) => patch.cardType === "dataset")
    const chartPatch = option?.patches.find((patch) => patch.cardType === "chart")

    expect(datasetPatch?.content).toMatchObject({
      title: "Ottoman Empire source facts",
      source: "https://www.wikidata.org/wiki/Q12560",
      rows: 8,
      columns: 3,
      schemaVersion: "atlas-source-record-v1",
    })
    expect(datasetPatch?.content.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "Start date", value: "1299-01-01" }),
        expect.objectContaining({ field: "Latitude", value: "39.2" }),
      ]),
    )

    expect(chartPatch?.content).toMatchObject({
      title: "Ottoman Empire data availability",
      chartType: "bar",
      columns: ["Field", "Available"],
    })
  })

  it("builds source analysis patches for citation, excerpt, and writing workspaces", () => {
    const option = buildAtlasCompositionInjectionOption(sourceResult(), "source-analysis-workspace")
    expect(option?.patches.map((patch) => patch.cardType)).toEqual(["citation", "source-excerpt", "text-editor"])
    expect(option?.patches.find((patch) => patch.cardType === "source-excerpt")?.content).toMatchObject({
      title: "Ottoman Empire evidence excerpt",
      locator: "Q12560",
    })
  })

  it("builds map investigation patches with GIS layer provenance", () => {
    const option = buildAtlasCompositionInjectionOption(sourceResult(), "map-investigation")
    expect(option?.patches.map((patch) => patch.cardType)).toEqual(["legend", "map", "gis-layer", "source-excerpt", "text-editor"])

    const gisPatch = option?.patches.find((patch) => patch.cardType === "gis-layer")
    expect(gisPatch?.content).toMatchObject({
      title: "Ottoman Empire GIS layer candidate",
      layerType: "boundary",
      geometryType: "Point seed",
      dateRange: "1299-1922",
    })
    expect(gisPatch?.content.sourceProvenance).toMatchObject({
      reviewStatus: "unreviewed",
      confidence: 0.9,
    })
  })

  it("builds historical inquiry patches with a bibliography source set", () => {
    const option = buildAtlasCompositionInjectionOption(sourceResult(), "historical-inquiry")
    expect(option?.patches.map((patch) => patch.cardType)).toEqual(["text", "timeline", "source-excerpt", "text-editor", "bibliography"])
    expect(option?.patches.find((patch) => patch.cardType === "bibliography")?.content).toMatchObject({
      title: "Ottoman Empire source set",
      entries: [
        expect.objectContaining({
          title: "Ottoman Empire",
          creator: "Wikidata",
        }),
      ],
    })
  })
})
