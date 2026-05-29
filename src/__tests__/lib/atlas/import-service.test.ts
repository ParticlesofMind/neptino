import { describe, expect, it } from "vitest"
import {
  normalizeImportSourceId,
  normalizeWikidataExternalId,
  resolveWikidataImportIds,
} from "@/lib/atlas/import-service"

describe("Atlas import service helpers", () => {
  it("normalizes exact Wikidata import IDs", () => {
    expect(normalizeWikidataExternalId(" q12560 ")).toBe("Q12560")
    expect(normalizeWikidataExternalId("File:Example.jpg")).toBeNull()
  })

  it("defaults exact imports to Wikidata", () => {
    expect(normalizeImportSourceId(undefined)).toBe("wikidata")
    expect(resolveWikidataImportIds({ externalId: "Q12560" })).toEqual(["Q12560"])
  })

  it("rejects exact imports for unsupported sources", () => {
    expect(() => resolveWikidataImportIds({ sourceId: "commons", externalId: "File:Example.jpg" }))
      .toThrow("Exact import is not implemented for commons.")
  })
})
