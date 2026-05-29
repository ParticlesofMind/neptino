import { describe, expect, it } from "vitest"
import {
  buildWikidataTemporalProfile,
  inferWikidataClassification,
  type WikidataEntity,
} from "@/lib/atlas/wikidata"

function entityWithClaims(claims: WikidataEntity["claims"]): WikidataEntity {
  return {
    id: "Q1",
    labels: { en: { value: "Example" } },
    claims,
  }
}

function entityIdClaim(qid: number) {
  return {
    mainsnak: {
      datavalue: {
        value: { "numeric-id": qid },
      },
    },
  }
}

function timeClaim(time: string) {
  return {
    mainsnak: {
      datavalue: {
        value: { time },
      },
    },
  }
}

describe("Wikidata Atlas mapping", () => {
  it("maps humans to Atlas Person candidates", () => {
    const classification = inferWikidataClassification(entityWithClaims({ P31: [entityIdClaim(5)] }))
    expect(classification.suggestedEntityType).toBe("Person")
    expect(classification.classificationConfidence).toBeGreaterThan(0.9)
  })

  it("maps empire titles to Institution candidates", () => {
    const classification = inferWikidataClassification({
      ...entityWithClaims({ P31: [] }),
      labels: { en: { value: "Ottoman Empire" } },
    })
    expect(classification.suggestedEntityType).toBe("Institution")
    expect(classification.suggestedSubtype).toBe("Empire")
  })

  it("extracts source-provided temporal profiles", () => {
    const profile = buildWikidataTemporalProfile(
      entityWithClaims({
        P571: [timeClaim("+1299-01-01T00:00:00Z")],
        P576: [timeClaim("+1922-11-01T00:00:00Z")],
      }),
    )
    expect(profile.start).toBe("1299-01-01")
    expect(profile.end).toBe("1922-11-01")
    expect(profile.precision).toBe("source-provided")
  })
})
