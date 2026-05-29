import type { AtlasInjectionOption } from "@/lib/atlas/composition-injection-types"
import {
  getAtlasSourceHierarchy,
  searchAtlasSources,
  type AtlasResourceType,
  type AtlasSourceSearchResult,
  type AtlasSourceStatus,
} from "@/lib/atlas/source-registry"
import { sourceProvenanceFromSearchResult } from "@/lib/atlas/source-provenance"

export type AtlasCompositionInjectionSearchRequest = {
  compositionPresetId: string
  query: string
  limit?: number
}

export type AtlasCompositionInjectionSearchResponse = {
  options: AtlasInjectionOption[]
  sources: AtlasSourceStatus[]
  diagnostics: string[]
}

const DEFAULT_INJECTION_LIMIT = 4
const MAX_INJECTION_LIMIT = 6

const COMPOSITION_RESOURCE_TYPES: Record<string, AtlasResourceType> = {
  "cartographic-simulation": "map",
  "source-analysis-workspace": "document",
  "map-investigation": "map",
  "data-investigation": "dataset",
  "historical-inquiry": "document",
  "practice-check": "text",
  "slide-presentation": "composition",
}

function clampLimit(limit: unknown): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_INJECTION_LIMIT
  }
  return Math.min(Math.max(Math.floor(limit), 1), MAX_INJECTION_LIMIT)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "source"
}

function sourceMetadata(result: AtlasSourceSearchResult): Record<string, unknown> {
  return {
    source_id: result.sourceId,
    source_label: result.sourceLabel,
    source_rank: result.sourceRank,
    source_url: result.externalUrl,
    external_id: result.externalId,
    retrieved_at: result.retrievedAt,
    license: result.license,
    license_url: result.licenseUrl,
    attribution: result.attribution,
    revision_id: result.revisionId,
    confidence: result.confidence,
    warnings: result.warnings,
  }
}

function sourcePayload(result: AtlasSourceSearchResult): Record<string, unknown> {
  return {
    sourceMetadata: sourceMetadata(result),
    sourceProvenance: sourceProvenanceFromSearchResult(result),
  }
}

function resultDescription(result: AtlasSourceSearchResult): string {
  return result.description || `Source-backed ${result.recordType} record from ${result.sourceLabel}.`
}

function temporalProfile(result: AtlasSourceSearchResult): Record<string, unknown> {
  return readRecord(result.payload.temporalProfile)
}

function spatialProfile(result: AtlasSourceSearchResult): Record<string, unknown> {
  return readRecord(result.payload.spatialProfile)
}

function pointFromResult(result: AtlasSourceSearchResult): { latitude: number; longitude: number; precision: number | null } | null {
  const point = readRecord(spatialProfile(result).point)
  if (typeof point.latitude !== "number" || typeof point.longitude !== "number") {
    return null
  }
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    precision: typeof point.precision === "number" ? point.precision : null,
  }
}

function firstDate(result: AtlasSourceSearchResult, keys: string[]): string | null {
  const temporal = temporalProfile(result)
  for (const key of keys) {
    const value = readString(temporal[key])
    if (value) return value
  }
  return null
}

function yearLabel(date: string | null): string | null {
  if (!date) return null
  const match = date.match(/-?\d{1,4}/)
  return match?.[0] ?? date
}

function temporalRangeLabel(result: AtlasSourceSearchResult): string {
  const start = yearLabel(firstDate(result, ["start", "inception", "birth"]))
  const end = yearLabel(firstDate(result, ["end", "dissolved", "death"]))
  const pointInTime = yearLabel(firstDate(result, ["pointInTime"]))
  if (start && end) return `${start}-${end}`
  if (start) return `from ${start}`
  if (end) return `until ${end}`
  if (pointInTime) return pointInTime
  return "No source date found"
}

function buildTimelineEvents(result: AtlasSourceSearchResult): Array<Record<string, unknown>> {
  const title = result.title
  const events: Array<Record<string, unknown>> = []
  const start = firstDate(result, ["start", "inception", "birth"])
  const pointInTime = firstDate(result, ["pointInTime"])
  const end = firstDate(result, ["end", "dissolved", "death"])

  if (start) {
    events.push({
      date: yearLabel(start) ?? start,
      label: "Start in source record",
      description: `${title} begins, is founded, or is first attested in the source metadata.`,
      color: "#2563eb",
    })
  }
  if (pointInTime) {
    events.push({
      date: yearLabel(pointInTime) ?? pointInTime,
      label: "Source-dated record",
      description: `${title} has a point-in-time value in the source metadata.`,
      color: "#14b8a6",
    })
  }
  if (end) {
    events.push({
      date: yearLabel(end) ?? end,
      label: "End in source record",
      description: `${title} ends, dissolves, or has a terminal date in the source metadata.`,
      color: "#ef4444",
    })
  }
  if (events.length === 0) {
    events.push({
      date: result.retrievedAt.slice(0, 10),
      label: "Source record retrieved",
      description: `${title} was imported from ${result.sourceLabel}; add dates after review.`,
      color: "#64748b",
    })
  }
  return events
}

function factRows(result: AtlasSourceSearchResult): string[][] {
  const point = pointFromResult(result)
  const rows: string[][] = [
    ["Title", result.title],
    ["Provider", result.sourceLabel],
    ["Identifier", result.externalId],
    ["License", result.license ?? "Review required"],
  ]
  const start = firstDate(result, ["start", "inception", "birth"])
  const end = firstDate(result, ["end", "dissolved", "death"])
  if (start) rows.push(["Start date", start])
  if (end) rows.push(["End date", end])
  if (point) rows.push(["Latitude", String(point.latitude)], ["Longitude", String(point.longitude)])
  return rows
}

function factAvailabilityRows(result: AtlasSourceSearchResult): string[][] {
  const point = pointFromResult(result)
  return [
    ["Description", result.description ? "1" : "0"],
    ["Temporal data", Object.keys(temporalProfile(result)).length > 0 ? "1" : "0"],
    ["Point geometry", point ? "1" : "0"],
    ["License", result.license ? "1" : "0"],
    ["Revision", result.revisionId ? "1" : "0"],
  ]
}

function sourcePacketSections(result: AtlasSourceSearchResult): Array<Record<string, unknown>> {
  const warnings = result.warnings.length > 0 ? result.warnings.join(" ") : "No automated source warning was returned."
  return [
    {
      heading: "Source record",
      body: `${result.title} (${result.externalId}) from ${result.sourceLabel}. ${resultDescription(result)}`,
    },
    {
      heading: "License and attribution",
      body: `${result.license ?? "License requires review"}. Attribution: ${result.attribution ?? result.sourceLabel}.`,
    },
    {
      heading: "Review notes",
      body: warnings,
    },
  ]
}

function buildCartographicOption(result: AtlasSourceSearchResult): AtlasInjectionOption {
  const point = pointFromResult(result)
  const description = resultDescription(result)
  const provenancePayload = sourcePayload(result)
  const pointDescription = point
    ? `${point.latitude.toFixed(3)}, ${point.longitude.toFixed(3)}`
    : "No source point geometry found"

  return {
    id: `atlas-${slugify(result.externalId)}-cartographic`,
    label: result.title,
    description,
    sourceLabel: `${result.sourceLabel}: ${result.externalId}`,
    compositionPresetId: "cartographic-simulation",
    patches: [
      {
        cardType: "legend",
        matchTitle: "Map legend",
        content: {
          title: `${result.title} source guide`,
          layout: "list",
          items: [
            { color: "#2563eb", label: "Entity source", description: `${result.sourceLabel} ${result.externalId}` },
            { color: "#14b8a6", label: "Temporal profile", description: temporalRangeLabel(result) },
            { color: "#f59e0b", label: "Spatial seed", description: pointDescription },
            { color: "#ef4444", label: "Review required", description: "Historical boundaries and claims need teacher review before use." },
          ],
          ...provenancePayload,
        },
      },
      {
        cardType: "map",
        matchTitle: "Scenario map",
        content: {
          title: `${result.title} map seed`,
          lat: point?.latitude ?? 20,
          lng: point?.longitude ?? 10,
          zoom: point ? 5 : 2,
          mapLayer: "Standard",
          layers: point ? ["Points", "Labels"] : [],
          points: point ? [{ lat: point.latitude, lng: point.longitude, label: result.title }] : [],
          source: `${result.sourceLabel} ${result.externalId}`,
          sourceUrl: result.externalUrl,
          attribution: result.attribution,
          ...provenancePayload,
        },
      },
      {
        cardType: "timeline",
        matchTitle: "Change over time",
        content: {
          title: `${result.title} source timeline`,
          orientation: "horizontal",
          events: buildTimelineEvents(result),
          ...provenancePayload,
        },
      },
      {
        cardType: "document",
        matchTitle: "Source packet",
        content: {
          title: `${result.title} source packet`,
          documentType: "web",
          fileType: "web",
          url: result.externalUrl,
          pages: 1,
          excerpt: description,
          sections: sourcePacketSections(result),
          source: result.sourceLabel,
          ...provenancePayload,
        },
      },
    ],
  }
}

function buildSourceAnalysisOption(result: AtlasSourceSearchResult): AtlasInjectionOption {
  const description = resultDescription(result)
  const provenancePayload = sourcePayload(result)
  return {
    id: `atlas-${slugify(result.externalId)}-source-analysis`,
    label: result.title,
    description,
    sourceLabel: `${result.sourceLabel}: ${result.externalId}`,
    compositionPresetId: "source-analysis-workspace",
    patches: [
      {
        cardType: "citation",
        matchTitle: "Source reference",
        content: {
          title: result.title,
          creator: result.sourceLabel,
          year: result.retrievedAt.slice(0, 4),
          sourceType: result.recordType,
          sourceUrl: result.externalUrl,
          license: result.license ?? "Review required",
          attribution: result.attribution ?? result.sourceLabel,
          ...provenancePayload,
        },
      },
      {
        cardType: "source-excerpt",
        matchTitle: "Evidence excerpt",
        content: {
          title: `${result.title} evidence excerpt`,
          excerpt: description,
          context: `Source record from ${result.sourceLabel}. Review the claim, license, and supporting references before classroom use.`,
          locator: result.externalId,
          citationTitle: result.sourceLabel,
          sourceUrl: result.externalUrl,
          ...provenancePayload,
        },
      },
      {
        cardType: "text-editor",
        matchTitle: "Analysis notes",
        content: {
          title: `${result.title} evidence notes`,
          document: `<h2>Claim</h2><p></p><h2>Evidence from ${escapeHtml(result.sourceLabel)}</h2><p>${escapeHtml(description)}</p><h2>Interpretation</h2><p></p>`,
          ...provenancePayload,
        },
      },
    ],
  }
}

function buildDataInvestigationOption(result: AtlasSourceSearchResult): AtlasInjectionOption {
  const description = resultDescription(result)
  const provenancePayload = sourcePayload(result)
  const facts = factRows(result)
  return {
    id: `atlas-${slugify(result.externalId)}-data-investigation`,
    label: result.title,
    description,
    sourceLabel: `${result.sourceLabel}: ${result.externalId}`,
    compositionPresetId: "data-investigation",
    patches: [
      {
        cardType: "dataset",
        content: {
          title: `${result.title} source facts`,
          source: result.externalUrl,
          format: "json",
          rows: facts.length,
          columns: 3,
          schemaVersion: "atlas-source-record-v1",
          refreshCadence: "Manual review",
          fields: ["field", "value", "source"],
          records: facts.map(([field, value]) => ({ field, value, source: result.sourceLabel })),
          ...provenancePayload,
        },
      },
      {
        cardType: "chart",
        content: {
          title: `${result.title} data availability`,
          chartType: "bar",
          xLabel: "Field",
          yLabel: "Available",
          source: result.sourceLabel,
          columns: ["Field", "Available"],
          rows: factAvailabilityRows(result),
          colorScheme: "Teal",
          ...provenancePayload,
        },
      },
      {
        cardType: "text",
        content: {
          title: `${result.title} investigation prompt`,
          text: `<p>${escapeHtml(description)}</p><p>Use the dataset and chart to identify which source fields are present and which claims need review.</p>`,
          ...provenancePayload,
        },
      },
    ],
  }
}

function buildMapInvestigationOption(result: AtlasSourceSearchResult): AtlasInjectionOption {
  const point = pointFromResult(result)
  const description = resultDescription(result)
  const provenancePayload = sourcePayload(result)
  return {
    id: `atlas-${slugify(result.externalId)}-map-investigation`,
    label: result.title,
    description,
    sourceLabel: `${result.sourceLabel}: ${result.externalId}`,
    compositionPresetId: "map-investigation",
    patches: [
      {
        cardType: "legend",
        matchTitle: "Layer legend",
        content: {
          title: `${result.title} layer legend`,
          layout: "list",
          items: [
            { color: "#2563eb", label: "Source location", description: point ? `${point.latitude.toFixed(3)}, ${point.longitude.toFixed(3)}` : "No point geometry in source record" },
            { color: "#f59e0b", label: "Review boundary", description: "Boundary geometry must be reviewed against a historical GIS source." },
          ],
          ...provenancePayload,
        },
      },
      {
        cardType: "map",
        matchTitle: "Investigation map",
        content: {
          title: `${result.title} investigation map`,
          lat: point?.latitude ?? 20,
          lng: point?.longitude ?? 10,
          zoom: point ? 5 : 2,
          mapLayer: "Standard",
          layers: point ? ["Points", "Labels"] : [],
          points: point ? [{ lat: point.latitude, lng: point.longitude, label: result.title }] : [],
          source: result.sourceLabel,
          sourceUrl: result.externalUrl,
          ...provenancePayload,
        },
      },
      {
        cardType: "gis-layer",
        matchTitle: "GIS source layer",
        content: {
          title: `${result.title} GIS layer candidate`,
          layerType: "boundary",
          geometryType: point ? "Point seed" : "Missing geometry",
          featureCount: point ? 1 : 0,
          dateRange: temporalRangeLabel(result),
          geometryPrecision: point ? "Point only; boundary required" : "No source geometry found",
          sourceUrl: result.externalUrl,
          warnings: result.warnings.length > 0 ? result.warnings : ["Source geometry requires teacher review."],
          ...provenancePayload,
        },
      },
      {
        cardType: "source-excerpt",
        matchTitle: "Map evidence",
        content: {
          title: `${result.title} map evidence`,
          excerpt: description,
          context: `Retrieved from ${result.sourceLabel}. Use this as evidence metadata, not as a finished historical boundary.`,
          locator: result.externalId,
          citationTitle: result.sourceLabel,
          sourceUrl: result.externalUrl,
          ...provenancePayload,
        },
      },
      {
        cardType: "text-editor",
        matchTitle: "Interpretation notes",
        content: {
          title: `${result.title} interpretation notes`,
          document: `<h2>Map claim</h2><p></p><h2>Source evidence</h2><p>${escapeHtml(description)}</p><h2>Boundary uncertainty</h2><p></p>`,
          ...provenancePayload,
        },
      },
    ],
  }
}

function buildHistoricalInquiryOption(result: AtlasSourceSearchResult): AtlasInjectionOption {
  const description = resultDescription(result)
  const provenancePayload = sourcePayload(result)
  return {
    id: `atlas-${slugify(result.externalId)}-historical-inquiry`,
    label: result.title,
    description,
    sourceLabel: `${result.sourceLabel}: ${result.externalId}`,
    compositionPresetId: "historical-inquiry",
    patches: [
      {
        cardType: "text",
        matchTitle: "Inquiry question",
        content: {
          title: `${result.title} inquiry question`,
          text: `<p>What claim can be made about ${escapeHtml(result.title)} using the source evidence, and what remains uncertain?</p>`,
          ...provenancePayload,
        },
      },
      {
        cardType: "timeline",
        matchTitle: "Chronology",
        content: {
          title: `${result.title} chronology`,
          orientation: "horizontal",
          events: buildTimelineEvents(result),
          ...provenancePayload,
        },
      },
      {
        cardType: "source-excerpt",
        matchTitle: "Primary source",
        content: {
          title: `${result.title} source excerpt`,
          excerpt: description,
          context: `Source record from ${result.sourceLabel}. Add corroborating primary or secondary sources before treating this as complete evidence.`,
          locator: result.externalId,
          citationTitle: result.sourceLabel,
          sourceUrl: result.externalUrl,
          ...provenancePayload,
        },
      },
      {
        cardType: "text-editor",
        matchTitle: "Argument draft",
        content: {
          title: `${result.title} argument draft`,
          document: `<h2>Claim</h2><p></p><h2>Evidence</h2><p>${escapeHtml(description)}</p><h2>Reasoning</h2><p></p><h2>Uncertainty</h2><p></p>`,
          ...provenancePayload,
        },
      },
      {
        cardType: "bibliography",
        matchTitle: "Source set",
        content: {
          title: `${result.title} source set`,
          style: "short",
          entries: [
            {
              title: result.title,
              creator: result.sourceLabel,
              year: result.retrievedAt.slice(0, 4),
              url: result.externalUrl ?? "",
              license: result.license ?? "Review required",
            },
          ],
          notes: result.warnings.join(" ") || "Add corroborating sources before approval.",
          ...provenancePayload,
        },
      },
    ],
  }
}

function buildPracticeOption(result: AtlasSourceSearchResult): AtlasInjectionOption {
  const description = resultDescription(result)
  const provenancePayload = sourcePayload(result)
  return {
    id: `atlas-${slugify(result.externalId)}-practice`,
    label: result.title,
    description,
    sourceLabel: `${result.sourceLabel}: ${result.externalId}`,
    compositionPresetId: "practice-check",
    patches: [
      {
        cardType: "text",
        content: {
          title: `${result.title} review prompt`,
          text: `<p>${escapeHtml(description)}</p><p>Check the statement against the source metadata before answering.</p>`,
          ...provenancePayload,
        },
      },
      {
        cardType: "interactive",
        content: {
          title: `${result.title} source check`,
          prompt: `Which statement is directly supported by the ${result.sourceLabel} record?`,
          interactionType: "multiple-choice",
          options: [
            { text: description, correct: true, feedback: "This statement comes from the selected source record." },
            { text: "The source provides a complete teacher-ready lesson plan.", correct: false, feedback: "The source record is evidence, not a finished lesson plan." },
            { text: "No review is needed before classroom use.", correct: false, feedback: "Source-backed imports still require teacher review." },
          ],
          ...provenancePayload,
        },
      },
    ],
  }
}

function buildSlideOption(result: AtlasSourceSearchResult): AtlasInjectionOption {
  const description = resultDescription(result)
  const provenancePayload = sourcePayload(result)
  return {
    id: `atlas-${slugify(result.externalId)}-slides`,
    label: result.title,
    description,
    sourceLabel: `${result.sourceLabel}: ${result.externalId}`,
    compositionPresetId: "slide-presentation",
    patches: [
      {
        cardType: "slides",
        content: {
          title: result.title,
          slides: [
            { title: result.title, body: description, notes: `${result.sourceLabel} ${result.externalId}` },
            { title: "Evidence", body: `Source URL: ${result.externalUrl ?? result.sourceLabel}`, notes: result.license ?? "Review license before reuse." },
            { title: "Review", body: result.warnings.join(" ") || "Add teacher interpretation and corroborating sources.", notes: "Confirm claims before delivery." },
          ],
          ...provenancePayload,
        },
      },
    ],
  }
}

export function buildAtlasCompositionInjectionOption(
  result: AtlasSourceSearchResult,
  compositionPresetId: string,
): AtlasInjectionOption | null {
  if (!result.title.trim()) return null

  switch (compositionPresetId) {
    case "cartographic-simulation":
      return buildCartographicOption(result)
    case "source-analysis-workspace":
      return buildSourceAnalysisOption(result)
    case "map-investigation":
      return buildMapInvestigationOption(result)
    case "data-investigation":
      return buildDataInvestigationOption(result)
    case "historical-inquiry":
      return buildHistoricalInquiryOption(result)
    case "practice-check":
      return buildPracticeOption(result)
    case "slide-presentation":
      return buildSlideOption(result)
    default:
      return null
  }
}

function dedupeOptions(options: AtlasInjectionOption[]): AtlasInjectionOption[] {
  const seen = new Set<string>()
  return options.filter((option) => {
    const key = `${option.compositionPresetId}:${option.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function searchAtlasCompositionInjections(
  request: AtlasCompositionInjectionSearchRequest,
): Promise<AtlasCompositionInjectionSearchResponse> {
  const query = request.query.trim()
  const limit = clampLimit(request.limit)
  const resourceType = COMPOSITION_RESOURCE_TYPES[request.compositionPresetId] ?? "composition"

  if (query.length < 2) {
    return {
      options: [],
      sources: getAtlasSourceHierarchy(resourceType),
      diagnostics: ["A query with at least 2 characters is required."],
    }
  }

  const response = await searchAtlasSources({
    query,
    resourceType,
    limit: limit * 2,
    geometryRequired: false,
    licensePolicy: "attribution-ok",
  })

  const options = dedupeOptions(
    response.results
      .map((result) => buildAtlasCompositionInjectionOption(result, request.compositionPresetId))
      .filter((option): option is AtlasInjectionOption => Boolean(option)),
  ).slice(0, limit)

  return {
    options,
    sources: response.sources,
    diagnostics: response.diagnostics,
  }
}
