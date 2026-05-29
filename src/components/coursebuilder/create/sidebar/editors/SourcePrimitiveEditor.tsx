"use client"

import type { CardType } from "../../types"
import { normalizeSourceProvenance, type AtlasContentReviewStatus } from "@/lib/atlas/source-provenance"
import { CardTypePreview } from "../../cards/CardTypePreview"
import { EditorPreviewFrame } from "./editor-preview-frame"
import { EditorSplitLayout } from "./editor-split-layout"
import {
  StudioFieldGrid,
  StudioInput,
  StudioSection,
  StudioSelect,
  StudioTextarea,
} from "./studio-primitives"

interface SourcePrimitiveEditorProps {
  cardType: CardType
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function entriesToText(entries: unknown): string {
  if (!Array.isArray(entries)) return ""
  return entries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)))
    .map((entry) => [
      stringValue(entry.title),
      stringValue(entry.creator),
      stringValue(entry.year),
      stringValue(entry.url),
      stringValue(entry.license),
    ].join(" | "))
    .join("\n")
}

function textToEntries(value: string): Array<Record<string, string>> {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = "", creator = "", year = "", url = "", license = ""] = line.split("|").map((part) => part.trim())
      return { title, creator, year, url, license }
    })
}

function warningText(content: Record<string, unknown>): string {
  const provenance = normalizeSourceProvenance(content)
  if (provenance.warnings.length > 0) return provenance.warnings.join("\n")
  if (Array.isArray(content.warnings)) return content.warnings.map(String).join("\n")
  return ""
}

function SourceFields({ content, onChange }: Pick<SourcePrimitiveEditorProps, "content" | "onChange">) {
  const provenance = normalizeSourceProvenance(content)
  const citation = provenance.citations[0]
  const sourceRecord = provenance.sourceRecords[0]
  const sourceLabel = citation?.sourceLabel ?? citation?.title ?? sourceRecord?.sourceLabel ?? ""
  const sourceUrl = citation?.url ?? sourceRecord?.externalUrl ?? stringValue(content.sourceUrl)
  const license = citation?.license ?? stringValue(content.license)
  const confidence = provenance.confidence
  const warnings = warningText(content)

  const updateProvenance = (patch: Partial<ReturnType<typeof normalizeSourceProvenance>>) => {
    onChange("sourceProvenance", {
      ...provenance,
      ...patch,
    })
  }

  const updateCitation = (patch: Record<string, unknown>) => {
    const current = provenance.citations[0] ?? {
      id: "manual-source",
      title: sourceLabel || "Manual source",
    }
    updateProvenance({
      citations: [{ ...current, ...patch }],
    })
  }

  return (
    <StudioSection label="Source and review">
      <StudioFieldGrid>
        <StudioInput
          label="Source"
          value={sourceLabel}
          placeholder="Archive, dataset, article, provider"
          onChange={(event) => {
            const next = event.target.value
            updateCitation({ title: next || "Manual source", sourceLabel: next })
          }}
        />
        <StudioInput
          label="URL"
          value={sourceUrl ?? ""}
          placeholder="https://..."
          onChange={(event) => updateCitation({ url: event.target.value })}
        />
      </StudioFieldGrid>
      <StudioFieldGrid>
        <StudioInput
          label="License"
          value={license ?? ""}
          placeholder="CC0, CC BY, public domain"
          onChange={(event) => updateCitation({ license: event.target.value })}
        />
        <StudioInput
          label="Confidence"
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={confidence}
          onChange={(event) => updateProvenance({ confidence: Number(event.target.value) })}
        />
      </StudioFieldGrid>
      <StudioSelect
        label="Review state"
        value={provenance.reviewStatus}
        onChange={(event) => updateProvenance({ reviewStatus: event.target.value as AtlasContentReviewStatus })}
      >
        <option value="unreviewed">Unreviewed</option>
        <option value="teacher-reviewed">Teacher reviewed</option>
        <option value="disputed">Disputed</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </StudioSelect>
      <StudioTextarea
        label="Warnings"
        rows={3}
        value={warnings}
        placeholder="One warning per line"
        onChange={(event) => updateProvenance({ warnings: event.target.value.split("\n").map((entry) => entry.trim()).filter(Boolean) })}
      />
    </StudioSection>
  )
}

function SpecificFields({ cardType, content, onChange }: SourcePrimitiveEditorProps) {
  if (cardType === "source-excerpt") {
    return (
      <>
        <StudioSection label="Passage" priority="primary">
          <StudioInput label="Title" value={stringValue(content.title)} onChange={(event) => onChange("title", event.target.value)} />
          <StudioTextarea label="Excerpt" rows={7} value={stringValue(content.excerpt)} onChange={(event) => onChange("excerpt", event.target.value)} />
          <StudioTextarea label="Context" rows={4} value={stringValue(content.context)} onChange={(event) => onChange("context", event.target.value)} />
          <StudioInput label="Locator" value={stringValue(content.locator)} placeholder="Page, paragraph, timestamp, map sheet" onChange={(event) => onChange("locator", event.target.value)} />
        </StudioSection>
      </>
    )
  }

  if (cardType === "citation") {
    return (
      <StudioSection label="Citation" priority="primary">
        <StudioInput label="Title" value={stringValue(content.title)} onChange={(event) => onChange("title", event.target.value)} />
        <StudioFieldGrid>
          <StudioInput label="Creator" value={stringValue(content.creator)} onChange={(event) => onChange("creator", event.target.value)} />
          <StudioInput label="Year" value={stringValue(content.year)} onChange={(event) => onChange("year", event.target.value)} />
        </StudioFieldGrid>
        <StudioFieldGrid>
          <StudioInput label="Type" value={stringValue(content.sourceType)} placeholder="book, map, dataset, web" onChange={(event) => onChange("sourceType", event.target.value)} />
          <StudioInput label="Attribution" value={stringValue(content.attribution)} onChange={(event) => onChange("attribution", event.target.value)} />
        </StudioFieldGrid>
      </StudioSection>
    )
  }

  if (cardType === "bibliography") {
    return (
      <StudioSection label="Bibliography" priority="primary">
        <StudioInput label="Title" value={stringValue(content.title)} onChange={(event) => onChange("title", event.target.value)} />
        <StudioSelect label="Style" value={stringValue(content.style) || "short"} onChange={(event) => onChange("style", event.target.value)}>
          <option value="short">Short</option>
          <option value="mla">MLA</option>
          <option value="apa">APA</option>
          <option value="chicago">Chicago</option>
        </StudioSelect>
        <StudioTextarea
          label="Entries"
          rows={8}
          value={entriesToText(content.entries)}
          placeholder="Title | Creator | Year | URL | License"
          onChange={(event) => onChange("entries", textToEntries(event.target.value))}
        />
        <StudioTextarea label="Notes" rows={3} value={stringValue(content.notes)} onChange={(event) => onChange("notes", event.target.value)} />
      </StudioSection>
    )
  }

  return (
    <StudioSection label="GIS layer" priority="primary">
      <StudioInput label="Title" value={stringValue(content.title)} onChange={(event) => onChange("title", event.target.value)} />
      <StudioFieldGrid>
        <StudioSelect label="Layer type" value={stringValue(content.layerType) || "boundary"} onChange={(event) => onChange("layerType", event.target.value)}>
          <option value="boundary">Boundary</option>
          <option value="route">Route</option>
          <option value="point">Point set</option>
          <option value="raster">Raster reference</option>
          <option value="choropleth">Choropleth</option>
        </StudioSelect>
        <StudioInput label="Geometry type" value={stringValue(content.geometryType)} placeholder="GeoJSON, WMS, raster" onChange={(event) => onChange("geometryType", event.target.value)} />
      </StudioFieldGrid>
      <StudioFieldGrid>
        <StudioInput label="Feature count" type="number" min={0} value={numberValue(content.featureCount)} onChange={(event) => onChange("featureCount", Number(event.target.value))} />
        <StudioInput label="Date range" value={stringValue(content.dateRange)} placeholder="c. 1845" onChange={(event) => onChange("dateRange", event.target.value)} />
      </StudioFieldGrid>
      <StudioInput label="Geometry precision" value={stringValue(content.geometryPrecision)} placeholder="generalized polygon, source-backed boundary" onChange={(event) => onChange("geometryPrecision", event.target.value)} />
    </StudioSection>
  )
}

export function SourcePrimitiveEditor({ cardType, content, onChange }: SourcePrimitiveEditorProps) {
  return (
    <EditorSplitLayout
      sidebarWidthClassName="md:w-[30rem] md:flex-none xl:w-[34rem]"
      previewClassName="bg-[#f5f7fb]"
      sidebar={(
        <div className="h-full min-h-0 overflow-y-auto bg-white">
          <SpecificFields cardType={cardType} content={content} onChange={onChange} />
          <SourceFields content={content} onChange={onChange} />
        </div>
      )}
      preview={(
        <div className="flex h-full min-h-0 items-center justify-center px-6 py-6 md:px-8">
          <EditorPreviewFrame
            cardType={cardType}
            title={stringValue(content.title)}
            onTitleChange={(next) => onChange("title", next)}
            className="w-full max-w-3xl"
            bodyClassName="p-5"
          >
            <CardTypePreview cardType={cardType} content={content} hideTitle />
          </EditorPreviewFrame>
        </div>
      )}
    />
  )
}
