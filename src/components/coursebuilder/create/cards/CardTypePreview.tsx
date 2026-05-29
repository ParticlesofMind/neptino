"use client"

/**
 * CardTypePreview
 *
 * Self-contained visual preview component for every card type.
 * Extracted from the teacher card gallery so MakePanel (and future components)
 * can render the same gallery-quality preview without duplicating code.
 *
 * Usage:
 *   <CardTypePreview cardType="chart" content={{ chartType: "line", xLabel: "Year", yLabel: "°C" }} />
 */

import dynamic from "next/dynamic"
import {
  Bot,
  Box,
  Check,
  ClipboardList,
  Database,
  ExternalLink,
  FileCode2,
  Gamepad2,
  Image as ImageIcon,
  Layers,
  List,
  MessageSquare,
  Mic,
  ScrollText,
  Timer,
} from "lucide-react"
import type { CardType } from "../types"
import { CARD_TYPE_META } from "./card-type-registry"
import {
  AnimationPreview,
  AudioPreview,
  ChartPreview,
  DiagramPreview,
  LegendPreview,
  MapPreview,
  RichSimPlaceholder,
  VideoPreview,
} from "./card-type-preview-subviews"
import { PretextText, type PretextTextTone } from "../text/PretextText"

const Model3DViewer = dynamic(
  () => import("@/components/coursebuilder/model-3d-viewer").then((m) => m.Model3DViewer),
  { ssr: false },
)

const TimelineJSPreview = dynamic(
  () => import("./card-types/timeline-preview-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3" style={{ height: 160 }}>
        <div className="h-3 w-28 rounded bg-neutral-200" />
        <div className="mt-3 h-[112px] rounded bg-neutral-100" />
      </div>
    ),
  },
)

function PreviewText({
  text,
  emptyText,
  className,
  tone = "plain",
  fontSizePx = 11,
  lineHeightPx = 17,
  fontWeight = 400,
  maxLines,
  italic = false,
}: {
  text: string
  emptyText?: string
  className?: string
  tone?: PretextTextTone
  fontSizePx?: number
  lineHeightPx?: number
  fontWeight?: number
  maxLines?: number
  italic?: boolean
}) {
  return (
    <PretextText
      text={text}
      emptyText={emptyText}
      className={className}
      tone={tone}
      fontSizePx={fontSizePx}
      lineHeightPx={lineHeightPx}
      fontWeight={fontWeight}
      maxLines={maxLines}
      italic={italic}
    />
  )
}

export { CARD_TYPE_META } from "./card-type-registry"
export type { CardTypeMeta } from "./card-type-registry"

// ─── Main exported component ──────────────────────────────────────────────────

export interface CardTypePreviewProps {
  cardType:  CardType
  content:   Record<string, unknown>
  hideTitle?: boolean
  onTitleChange?: (title: string) => void
}

/**
 * Renders a gallery-quality visual preview for a given card type and content.
 */
export function CardTypePreview({ cardType, content, hideTitle, onTitleChange }: CardTypePreviewProps) {
  const meta  = CARD_TYPE_META[cardType]
  const title = typeof content["title"] === "string" ? content["title"] : ""

  const body = (() => { switch (cardType) {
    case "text": {
      const html = typeof content["text"] === "string" ? content["text"] : ""
      // Strip HTML tags for plain-text preview (safe — teacher-authored only)
      const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      return (
        <div className="overflow-auto">
          <PreviewText
            text={plain}
            emptyText="Add your copy here."
            className="text-sm leading-relaxed text-muted-foreground"
            tone="soft"
            fontSizePx={14}
            lineHeightPx={22}
            maxLines={8}
          />
        </div>
      )
    }

    case "image": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      const alt = typeof content["alt"] === "string" ? content["alt"] : title
      const caption = typeof content["caption"] === "string" ? content["caption"] : ""
      const attribution = typeof content["attribution"] === "string" ? content["attribution"] : ""
      return (
        <div className="rounded-xl overflow-hidden">
          {url
            ? (
              <div style={{ aspectRatio: "4/3", width: "100%", overflow: "hidden" }} className="rounded-xl bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={alt || "Image"} className="w-full h-full object-cover" />
              </div>
            )
            : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border gap-2 bg-muted/20" style={{ aspectRatio: "4/3" }}>
                <ImageIcon className="h-7 w-7 text-muted-foreground/30" />
                <span className="text-[11px] text-muted-foreground">No image provided.</span>
              </div>
            )
          }
          {(caption || attribution) && (
            <div className="mt-2 space-y-0.5">
              {caption && (
                <PreviewText
                  text={caption}
                  className="text-[11px] leading-relaxed text-muted-foreground"
                  tone="caption"
                  fontSizePx={11}
                  lineHeightPx={16}
                  maxLines={3}
                />
              )}
              {attribution && <p className="text-[10px] text-muted-foreground/60 italic">{attribution}</p>}
            </div>
          )}
        </div>
      )
    }

    case "audio": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
        if (!url) return (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border h-32 bg-muted/20">
            <span className="text-[11px] text-muted-foreground">No audio provided.</span>
          </div>
        )
      return <AudioPreview url={url} />
    }

    case "video": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      if (!url) return (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border h-32 bg-muted/20">
          <span className="text-[11px] text-muted-foreground">No video provided.</span>
        </div>
      )
      return <VideoPreview url={url} />
    }

    case "animation": {
      const format   = typeof content["format"]   === "string" ? content["format"]   : ""
      const duration = typeof content["duration"] === "string" ? content["duration"] : ""
      const fps      = typeof content["fps"]      === "number" ? content["fps"]      : 0
      const animUrl  = typeof content["url"]      === "string" ? content["url"]      : undefined
      return <AnimationPreview format={format} duration={duration} fps={fps} url={animUrl} />
    }

    case "map": {
      const lat    = typeof content["lat"]    === "number" ? content["lat"]    : 20
      const lng    = typeof content["lng"]    === "number" ? content["lng"]    : 10
      const zoom   = typeof content["zoom"]   === "number" ? content["zoom"]   : 2
      const layers = Array.isArray(content["layers"]) ? content["layers"] as string[] : []
      return <MapPreview lat={lat} lng={lng} zoom={zoom} layers={layers} />
    }

    case "chart": {
      const chartType   = typeof content["chartType"]   === "string" ? content["chartType"]   : "line"
      const xLabel      = typeof content["xLabel"]      === "string" ? content["xLabel"]      : ""
      const yLabel      = typeof content["yLabel"]      === "string" ? content["yLabel"]      : ""
      const source      = typeof content["source"]      === "string" ? content["source"]      : ""
      const colorScheme = typeof content["colorScheme"] === "string" ? content["colorScheme"] : undefined
      return (
        <ChartPreview
          chartType={chartType}
          xLabel={xLabel}
          yLabel={yLabel}
          source={source}
          columns={content["columns"]}
          rows={content["rows"]}
          chartData={content["chartData"]}
          colorScheme={colorScheme}
        />
      )
    }

    case "diagram": {
      const diagramType = typeof content["diagramType"] === "string" ? content["diagramType"] : "flowchart"
      return (
        <DiagramPreview
          diagramType={diagramType}
          nodes={content["nodes"]}
          edges={content["edges"]}
        />
      )
    }

    case "model-3d":
      return <Model3DViewer content={content} />

    case "table": {
      const rawCols = content["columns"]
      const cols = (
        Array.isArray(rawCols) ? rawCols.map(String) :
        typeof rawCols === "string" ? rawCols.split(",").map(s => s.trim()) :
        ["Column 1", "Column 2", "Column 3"]
      ).slice(0, 5)
      const rows: string[][] = Array.isArray(content["rows"]) ? (content["rows"] as string[][]) : [["—", "—", "—"]]
      return (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {cols.map((c, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-foreground/80 whitespace-nowrap">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 4).map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/20">
                  {cols.map((_, ci) => <td key={ci} className="px-3 py-2 text-muted-foreground">{row[ci] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case "source-excerpt": {
      const excerpt = typeof content["excerpt"] === "string" ? content["excerpt"] : ""
      const context = typeof content["context"] === "string" ? content["context"] : ""
      const locator = typeof content["locator"] === "string" ? content["locator"] : ""
      const citationTitle = typeof content["citationTitle"] === "string" ? content["citationTitle"] : typeof content["sourceTitle"] === "string" ? content["sourceTitle"] : ""
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <PreviewText
              text={excerpt}
              emptyText="Add a quoted or paraphrased source passage."
              className="text-[13px] leading-relaxed text-foreground"
              tone="source"
              fontSizePx={13}
              lineHeightPx={20}
              maxLines={6}
            />
          </div>
          {(context || locator || citationTitle) && (
            <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {citationTitle && <p className="font-semibold text-foreground/80">{citationTitle}</p>}
              {locator && <p>{locator}</p>}
              {context && (
                <PreviewText
                  text={context}
                  className="text-[11px] leading-relaxed text-muted-foreground"
                  tone="paper"
                  fontSizePx={11}
                  lineHeightPx={17}
                  maxLines={3}
                />
              )}
            </div>
          )}
        </div>
      )
    }

    case "citation": {
      const creator = typeof content["creator"] === "string" ? content["creator"] : ""
      const year = typeof content["year"] === "string" ? content["year"] : ""
      const sourceType = typeof content["sourceType"] === "string" ? content["sourceType"] : ""
      const sourceUrl = typeof content["sourceUrl"] === "string" ? content["sourceUrl"] : typeof content["url"] === "string" ? content["url"] : ""
      const license = typeof content["license"] === "string" ? content["license"] : ""
      const attribution = typeof content["attribution"] === "string" ? content["attribution"] : ""
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-background px-4 py-3">
            <p className="text-[13px] font-semibold leading-snug text-foreground">{title || "Untitled source"}</p>
            {(creator || year) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {[creator, year].filter(Boolean).join(", ")}
              </p>
            )}
            {(sourceType || license) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sourceType && <span className="rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">{sourceType}</span>}
                {license && <span className="rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">{license}</span>}
              </div>
            )}
          </div>
          {sourceUrl && <p className="truncate text-[10px] text-muted-foreground">{sourceUrl}</p>}
          {attribution && <p className="text-[10px] italic text-muted-foreground/70">{attribution}</p>}
        </div>
      )
    }

    case "bibliography": {
      const entries = Array.isArray(content["entries"])
        ? (content["entries"] as Array<Record<string, unknown>>)
        : []
      const notes = typeof content["notes"] === "string" ? content["notes"] : ""
      const style = typeof content["style"] === "string" ? content["style"] : ""
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-[12px] font-semibold text-foreground">{entries.length} source{entries.length === 1 ? "" : "s"}</span>
            {style && <span className="ml-auto rounded border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">{style}</span>}
          </div>
          <div className="space-y-2">
            {(entries.length > 0 ? entries : [{ title: "Add a citation", creator: "", year: "" }]).slice(0, 5).map((entry, index) => {
              const entryTitle = typeof entry.title === "string" ? entry.title : `Source ${index + 1}`
              const creator = typeof entry.creator === "string" ? entry.creator : ""
              const year = typeof entry.year === "string" ? entry.year : ""
              const license = typeof entry.license === "string" ? entry.license : ""
              return (
                <div key={`${entryTitle}-${index}`} className="rounded-lg border border-border bg-background px-3 py-2">
                  <p className="text-[11px] font-semibold text-foreground line-clamp-1">{entryTitle}</p>
                  {(creator || year || license) && (
                    <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1">
                      {[creator, year, license].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          {notes && (
            <PreviewText
              text={notes}
              className="text-[11px] leading-relaxed text-muted-foreground"
              tone="paper"
              fontSizePx={11}
              lineHeightPx={17}
              maxLines={3}
            />
          )}
        </div>
      )
    }

    case "gis-layer": {
      const layerType = typeof content["layerType"] === "string" ? content["layerType"] : "layer"
      const geometryType = typeof content["geometryType"] === "string" ? content["geometryType"] : "GeoJSON"
      const featureCount = typeof content["featureCount"] === "number" ? content["featureCount"] : 0
      const dateRange = typeof content["dateRange"] === "string" ? content["dateRange"] : ""
      const precision = typeof content["geometryPrecision"] === "string" ? content["geometryPrecision"] : ""
      const warnings = Array.isArray(content["warnings"]) ? content["warnings"].map(String).filter(Boolean) : []
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-foreground">{title || "GIS layer"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{layerType} · {geometryType}</p>
              </div>
              <span className="rounded border border-border bg-background px-2 py-1 text-[10px] font-semibold text-muted-foreground">{featureCount} feature{featureCount === 1 ? "" : "s"}</span>
            </div>
            {(dateRange || precision) && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                <div className="rounded border border-border bg-background px-2 py-1.5">{dateRange || "No date range"}</div>
                <div className="rounded border border-border bg-background px-2 py-1.5">{precision || "Unknown precision"}</div>
              </div>
            )}
          </div>
          {warnings.length > 0 && (
            <div className="space-y-1">
              {warnings.slice(0, 2).map((warning, index) => (
                <p key={`${warning}-${index}`} className="rounded border border-[#f1dfb8] bg-[#fff7e6] px-2 py-1 text-[10px] leading-relaxed text-[#8a5b16]">{warning}</p>
              ))}
            </div>
          )}
        </div>
      )
    }

    case "document": {
      const fileType = typeof content["documentType"] === "string"
        ? content["documentType"].toUpperCase()
        : typeof content["fileType"] === "string"
        ? content["fileType"].toUpperCase()
        : "PDF"
      const pages = typeof content["pages"] === "number" ? content["pages"] : 0
      const excerpt = typeof content["excerpt"] === "string" ? content["excerpt"] : ""
      const sections: { heading: string; body: string }[] = (() => {
        const raw = content["sections"]
        const normalize = (value: unknown) => Array.isArray(value)
          ? value
            .filter((section): section is { heading?: unknown; body?: unknown } => typeof section === "object" && section !== null)
            .map((section) => ({
              heading: typeof section.heading === "string" ? section.heading : "",
              body: typeof section.body === "string" ? section.body : "",
            }))
          : []

        if (Array.isArray(raw)) return normalize(raw)
        if (typeof raw !== "string") return []

        try { return normalize(JSON.parse(raw) as unknown) } catch { return [] }
      })()
      return (
        <div className="space-y-3">
          {/* Document header */}
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-border bg-muted/20 shadow-sm">
              <ScrollText className="h-5 w-5 text-muted-foreground/70" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-foreground leading-tight line-clamp-2">{title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {fileType && (
                  <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{fileType}</span>
                )}
                {pages > 0 && (
                  <span className="text-[11px] text-muted-foreground">{pages} pages</span>
                )}
              </div>
            </div>
          </div>
          {/* Content preview lines */}
          {excerpt && (
            <PreviewText
              text={excerpt}
              className="text-[12px] text-muted-foreground leading-relaxed italic"
              tone="paper"
              fontSizePx={12}
              lineHeightPx={18}
              maxLines={3}
              italic
            />
          )}
          {sections.slice(0, 2).map((sec, i) => (
            <div key={i} className="border-l-2 border-border pl-3">
              {sec.heading && <p className="text-[11px] font-semibold text-foreground mb-0.5">{sec.heading}</p>}
              <PreviewText
                text={sec.body}
                emptyText="Section body..."
                className="text-[11px] text-muted-foreground leading-relaxed"
                tone="plain"
                fontSizePx={11}
                lineHeightPx={17}
                maxLines={2}
              />
            </div>
          ))}
          {sections.length === 0 && !excerpt && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 gap-2">
              <ScrollText className="h-6 w-6 text-muted-foreground/30" />
              <span className="text-[11px] text-muted-foreground">Add content to preview the document.</span>
            </div>
          )}
        </div>
      )
    }

    // ─── Embed ─────────────────────────────────────────────────────────────────
    case "embed": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      const provider = typeof content["provider"] === "string" ? content["provider"] : ""
      const caption = typeof content["caption"] === "string" ? content["caption"] : ""
      const attribution = typeof content["attribution"] === "string" ? content["attribution"] : ""

      return (
        <div className="space-y-3">
          {url ? (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20" style={{ aspectRatio: "16 / 9" }}>
              <iframe
                src={url}
                className="h-full w-full border-0"
                title={title || "Embedded resource"}
                sandbox="allow-same-origin allow-scripts allow-popups"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8">
              <ExternalLink className="h-6 w-6 text-muted-foreground/30" />
              <span className="mt-2 text-[11px] text-muted-foreground">Add an embeddable URL.</span>
            </div>
          )}
          {(provider || caption || attribution || url) && (
            <div className="space-y-1">
              {(provider || url) && (
                <p className="truncate text-[11px] font-medium text-foreground">
                  {provider || url}
                </p>
              )}
              {caption && (
                <PreviewText
                  text={caption}
                  className="text-[11px] leading-relaxed text-muted-foreground"
                  tone="caption"
                  fontSizePx={11}
                  lineHeightPx={17}
                  maxLines={3}
                />
              )}
              {attribution && <p className="text-[10px] text-muted-foreground/60 italic">{attribution}</p>}
            </div>
          )}
        </div>
      )
    }

    // ─── Flashcards ─────────────────────────────────────────────────────────────
    case "flashcards": {
      const rawPairs = Array.isArray(content["pairs"])
        ? (content["pairs"] as Array<{ term?: string; match?: string }>)
        : []
      const difficulty = typeof content["difficulty"] === "string" ? content["difficulty"] : ""
      const tags = Array.isArray(content["tags"]) ? content["tags"].map(String).filter(Boolean) : []

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-[12px] font-semibold text-foreground">
              {rawPairs.length} card{rawPairs.length === 1 ? "" : "s"}
            </span>
            {difficulty && (
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{difficulty}</span>
            )}
          </div>
          {rawPairs.length > 0 ? (
            <div className="grid gap-2">
              {rawPairs.slice(0, 4).map((pair, index) => (
                <div key={index} className="rounded-lg border border-border bg-background px-3 py-2">
                  <p className="text-[11px] font-semibold text-foreground">{pair.term || `Prompt ${index + 1}`}</p>
                  <PreviewText
                    text={pair.match || "Answer not set"}
                    className="mt-1 text-[11px] leading-relaxed text-muted-foreground"
                    tone="paper"
                    fontSizePx={11}
                    lineHeightPx={17}
                    maxLines={2}
                  />
                </div>
              ))}
              {rawPairs.length > 4 && (
                <p className="text-center text-[10px] text-muted-foreground">+{rawPairs.length - 4} more cards</p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
              <span className="text-[11px] text-muted-foreground">Add prompt and answer pairs.</span>
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 5).map((tag) => (
                <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )
    }

    // ─── Interactive / Quiz ─────────────────────────────────────────────────────
    case "interactive": {
      const prompt = typeof content["prompt"] === "string" ? content["prompt"] : ""
      const interactionType = typeof content["interactionType"] === "string" ? content["interactionType"] : "multiple-choice"

      // Options are stored as {text, correct, feedback}[] by InteractiveEditor
      const rawOpts = Array.isArray(content["options"])
        ? (content["options"] as Array<{ text?: string; correct?: boolean }>)
        : []

      const tfCorrect = typeof content["tfCorrect"] === "boolean" ? content["tfCorrect"] : true

      return (
        <div className="space-y-3">
          <PreviewText
            text={prompt}
            emptyText="Your question will appear here..."
            className="text-[13px] font-medium leading-snug text-foreground"
            tone="soft"
            fontSizePx={13}
            fontWeight={500}
            lineHeightPx={18}
            maxLines={3}
          />

          {interactionType === "multiple-choice" && rawOpts.length > 0 && (
            <div className="space-y-2">
              {rawOpts.slice(0, 4).map((opt, i) => (
                <div
                  key={i}
                  className={[
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12px] transition-colors",
                    opt.correct
                      ? "border-[#d6ede3] bg-[#d6ede3]/50 text-[#2e6b4a]"
                      : "border-border text-muted-foreground",
                  ].join(" ")}
                >
                  <span className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    opt.correct ? "border-[#5c9970] bg-[#5c9970]" : "border-border",
                  ].join(" ")}>
                    {opt.correct && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  {opt.text || `Option ${String.fromCharCode(65 + i)}`}
                </div>
              ))}
            </div>
          )}

          {interactionType === "multiple-choice" && rawOpts.length === 0 && (
            <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
              <span className="text-[11px] text-muted-foreground">Multiple choice — add options to see preview</span>
            </div>
          )}

          {interactionType === "true-false" && (
            <div className="flex gap-2">
              <div className={["flex-1 rounded-lg border px-3 py-2 text-center text-[13px] font-semibold transition-colors", tfCorrect ? "border-[#d6ede3] bg-[#d6ede3]/50 text-[#2e6b4a]" : "border-border text-muted-foreground"].join(" ")}>True</div>
              <div className={["flex-1 rounded-lg border px-3 py-2 text-center text-[13px] font-semibold transition-colors", !tfCorrect ? "border-[#f0d8d8] bg-[#f0d8d8]/50 text-[#8a3030]" : "border-border text-muted-foreground"].join(" ")}>False</div>
            </div>
          )}

          {interactionType === "short-answer" && (
            <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
              <span className="text-[11px] text-muted-foreground">Short answer — student types their response</span>
            </div>
          )}

          {interactionType === "ranking" && rawOpts.length > 0 && (
            <div className="space-y-1.5">
              {rawOpts.slice(0, 4).map((opt, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{i + 1}</span>
                  {opt.text || `Item ${i + 1}`}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // ─── Form ───────────────────────────────────────────────────────────────────
    case "form": {
      const prompt = typeof content["prompt"] === "string" ? content["prompt"] : ""
      const submitLabel = typeof content["submitLabel"] === "string" ? content["submitLabel"] : "Submit"
      const fields = Array.isArray(content["fields"])
        ? content["fields"]
          .filter((field): field is Record<string, unknown> => typeof field === "object" && field !== null)
          .map((field, index) => ({
            label: typeof field.label === "string" && field.label.trim() ? field.label : `Field ${index + 1}`,
            type: typeof field.type === "string" ? field.type : "text",
            required: Boolean(field.required),
          }))
        : []

      return (
        <div className="space-y-3">
          {prompt && (
            <PreviewText
              text={prompt}
              className="text-[12px] leading-relaxed text-muted-foreground"
              tone="soft"
              fontSizePx={12}
              lineHeightPx={19}
              maxLines={3}
            />
          )}
          <div className="space-y-2">
            {(fields.length > 0 ? fields : [{ label: "Response", type: "textarea", required: true }]).slice(0, 4).map((field, index) => (
              <div key={`${field.label}-${index}`} className="rounded-lg border border-border bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] font-semibold text-foreground">{field.label}</span>
                  {field.required && <span className="ml-auto text-[10px] font-semibold text-muted-foreground">Required</span>}
                </div>
                <div className="mt-2 h-8 rounded-md border border-dashed border-border bg-muted/20" />
              </div>
            ))}
          </div>
          <button type="button" className="min-h-8 rounded-md border border-border bg-background px-3 text-[11px] font-semibold text-muted-foreground">
            {submitLabel}
          </button>
        </div>
      )
    }

    // ─── Voice Recorder ──────────────────────────────────────────────────────────
    case "voice-recorder": {
      const prompt = typeof content["prompt"] === "string" ? content["prompt"] : ""
      const maxDurationSeconds = typeof content["maxDurationSeconds"] === "number" ? content["maxDurationSeconds"] : 60
      const retryPolicy = typeof content["retryPolicy"] === "string" ? content["retryPolicy"] : "allow"

      return (
        <div className="space-y-3">
          {prompt && (
            <PreviewText
              text={prompt}
              className="text-[12px] leading-relaxed text-muted-foreground"
              tone="soft"
              fontSizePx={12}
              lineHeightPx={19}
              maxLines={3}
            />
          )}
          <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
            <div className="flex items-center justify-between">
              <Mic className="h-5 w-5 text-muted-foreground/60" />
              <span className="font-mono text-[22px] font-semibold text-foreground">0:00</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full w-1/4 rounded-full bg-[#00ccb3]" />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              <span>{maxDurationSeconds}s limit</span>
              <span className="ml-auto capitalize">{retryPolicy === "single" ? "One take" : "Retries allowed"}</span>
            </div>
          </div>
        </div>
      )
    }

    // ─── Sorter / Matcher ───────────────────────────────────────────────────────
    case "sorter": {
      const mode = typeof content["mode"] === "string" ? content["mode"] : "match"
      const pairs = Array.isArray(content["pairs"])
        ? content["pairs"]
          .filter((pair): pair is Record<string, unknown> => typeof pair === "object" && pair !== null)
          .map((pair, index) => ({
            term: typeof pair.term === "string" && pair.term.trim() ? pair.term : `Term ${index + 1}`,
            match: typeof pair.match === "string" && pair.match.trim() ? pair.match : `Match ${index + 1}`,
          }))
        : []
      const items = Array.isArray(content["items"]) ? content["items"].map(String).filter(Boolean) : []

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-[12px] font-semibold text-foreground">{mode === "order" ? "Ordering task" : "Matching task"}</span>
          </div>

          {mode === "order" ? (
            <div className="space-y-1.5">
              {(items.length > 0 ? items : pairs.map((pair) => pair.term)).slice(0, 4).map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[11px]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 truncate text-muted-foreground">{item || `Item ${index + 1}`}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {(pairs.length > 0 ? pairs : [{ term: "Term", match: "Match" }]).slice(0, 4).map((pair, index) => (
                <div key={`${pair.term}-${index}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-border px-3 py-2 text-[11px]">
                  <span className="min-w-0 truncate font-medium text-foreground/80">{pair.term}</span>
                  <span className="text-muted-foreground/40">to</span>
                  <span className="min-w-0 truncate text-right text-muted-foreground">{pair.match}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // ─── Simulation ─────────────────────────────────────────────────────────────
    case "rich-sim": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      if (url) return (
        <div className="rounded-lg overflow-hidden border border-border" style={{ height: 200 }}>
          <iframe src={url} className="w-full h-full border-0" title="Simulation preview" sandbox="allow-scripts allow-same-origin" />
        </div>
      )
      return <RichSimPlaceholder />
    }

    // ─── 3D Scene ────────────────────────────────────────────────────────────────
    case "village-3d": {
      const env = typeof content["environment"] === "string" ? content["environment"] : "village"
      return (
        <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border h-40 gap-2">
          <Box className="h-8 w-8 text-muted-foreground/40" />
          <span className="text-[12px] text-muted-foreground capitalize">{env} scene</span>
        </div>
      )
    }

    // ─── Dataset ─────────────────────────────────────────────────────────────────
    case "dataset": {
      const rows = typeof content["rows"] === "number" ? content["rows"] : 0
      const cols = typeof content["columns"] === "number" ? content["columns"] : 0
      const fmt  = typeof content["format"] === "string" ? content["format"] : ""
      const source = typeof content["source"] === "string" ? content["source"] : typeof content["url"] === "string" ? content["url"] : ""
      return (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {rows > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{rows} rows</span>}
            {cols > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{cols} columns</span>}
            {fmt && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{fmt}</span>}
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border h-24 px-3 text-center">
            <Database className="h-6 w-6 text-muted-foreground/40" />
            {source && <span className="mt-2 max-w-full truncate text-[11px] text-muted-foreground">{source}</span>}
          </div>
        </div>
      )
    }

    // ─── Media ────────────────────────────────────────────────────────────────────
    case "media": {
      const sources = Array.isArray(content["sources"]) ? content["sources"] as string[] : []
      return (
        <div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/20 border border-dashed border-border h-32 gap-2">
            <Layers className="h-6 w-6 text-muted-foreground/30" />
            {sources.length > 0 && (
              <span className="text-[11px] text-muted-foreground">{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      )
    }

    // ─── Games ────────────────────────────────────────────────────────────────────
    case "games": {
      const gameType = typeof content["gameType"] === "string" ? content["gameType"] : "word-match"
      const rawPairs = Array.isArray(content["pairs"]) ? (content["pairs"] as Array<{ term?: string; match?: string }>) : []
      const fillText = typeof content["fillText"] === "string" ? content["fillText"] : ""
      const rawItems = Array.isArray(content["items"]) ? (content["items"] as string[]) : []
      const timeLimit = typeof content["timeLimit"] === "number" ? content["timeLimit"] : 0

      const gameLabels: Record<string, string> = {
        "word-match": "Word Match",
        "memory": "Memory Game",
        "fill-blank": "Fill in the Blank",
        "drag-order": "Drag & Order",
      }

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-[#6b8fc4]" />
            <span className="text-[12px] font-semibold text-foreground">{gameLabels[gameType] ?? gameType}</span>
            {timeLimit > 0 && (
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{timeLimit}s</span>
            )}
          </div>

          {(gameType === "word-match" || gameType === "memory") && rawPairs.length > 0 && (
            <div className="space-y-1.5">
              {rawPairs.slice(0, 4).map((pair, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[11px]">
                  <span className="font-medium text-foreground/80 min-w-0 flex-1 truncate">{pair.term || `Term ${i + 1}`}</span>
                  <span className="shrink-0 text-muted-foreground/40">↔</span>
                  <span className="text-muted-foreground min-w-0 flex-1 truncate text-right">{pair.match || `Match ${i + 1}`}</span>
                </div>
              ))}
              {rawPairs.length > 4 && <p className="text-center text-[10px] text-muted-foreground">+{rawPairs.length - 4} more pairs</p>}
            </div>
          )}

          {gameType === "fill-blank" && fillText && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <PreviewText
                text={fillText.replace(/\[[^\]]+\]/g, "___")}
                className="text-[12px] leading-relaxed text-foreground/80"
                tone="paper"
                fontSizePx={12}
                lineHeightPx={19}
                maxLines={4}
              />
            </div>
          )}

          {gameType === "drag-order" && rawItems.length > 0 && (
            <div className="space-y-1.5">
              {rawItems.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[11px]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold">{i + 1}</span>
                  <span className="text-muted-foreground">{item || `Step ${i + 1}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // ─── AI Chat ──────────────────────────────────────────────────────────────────
    case "chat": {
      const aiPersona = typeof content["aiPersona"] === "string" ? content["aiPersona"] : "AI Tutor"
      const openingMessage = typeof content["openingMessage"] === "string" ? content["openingMessage"] : ""
      const starters = Array.isArray(content["conversationStarters"]) ? (content["conversationStarters"] as string[]) : []

      return (
        <div className="space-y-3">
          {/* Chat bubble mock */}
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00ccb3] to-[#4a94ff] shadow-sm">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-muted/50 border border-border px-3 py-2 max-w-[90%]">
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{aiPersona}</p>
              <PreviewText
                text={openingMessage}
                emptyText="Hello! I'm here to help you learn. What would you like to explore?"
                className="text-[12px] leading-relaxed text-foreground"
                tone="soft"
                fontSizePx={12}
                lineHeightPx={19}
                maxLines={4}
              />
            </div>
          </div>

          {/* Starters */}
          {starters.length > 0 && (
            <div className="space-y-1.5 pl-1">
              <p className="text-[10px] text-muted-foreground font-medium">Suggested questions:</p>
              {starters.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors">
                  <MessageSquare className="h-3 w-3 shrink-0 text-[#4a94ff]/60" />
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* Student input mock */}
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
            <p className="flex-1 text-[11px] text-muted-foreground/50 italic">Type your message…</p>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4a94ff]/80">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      )
    }

    case "text-editor": {
      const html = typeof content["document"] === "string" ? content["document"] : ""
      const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

      return (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[#b87070]" />
            <span className="h-2 w-2 rounded-full bg-[#a89450]" />
            <span className="h-2 w-2 rounded-full bg-[#5c9970]" />
            <span className="ml-2 text-[10px] font-medium text-muted-foreground">TipTap workspace</span>
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="h-3 w-24 rounded bg-[#dbe8f6]" />
            <PreviewText
              text={plain}
              emptyText="A barebones rich-text writing area for notes, drafting, and guided responses."
              className="text-[12px] leading-6 text-muted-foreground"
              tone="paper"
              fontSizePx={12}
              lineHeightPx={24}
              maxLines={5}
            />
          </div>
        </div>
      )
    }

    case "code-snippet":
    case "code-editor": {
      const code = typeof content["code"] === "string" ? content["code"] : ""
      const lines = code.split("\n").filter(Boolean).slice(0, 5)
      const language = typeof content["language"] === "string" ? content["language"] : "javascript"
      const caption = typeof content["caption"] === "string" ? content["caption"] : typeof content["prompt"] === "string" ? content["prompt"] : ""

      return (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
              <FileCode2 className="h-3 w-3" />
              {cardType === "code-snippet" ? "Snippet" : "CodeMirror"}
            </span>
            <span className="rounded-full border border-[#5c9970]/30 bg-[#5c9970]/15 px-2 py-0.5 text-[9px] font-medium text-[#5c9970]">
              {language}
            </span>
          </div>
          <div className="space-y-1.5 px-3 py-3 font-mono text-[11px] leading-5 text-slate-200">
            {lines.length > 0 ? lines.map((line, index) => (
              <div key={index} className="flex gap-3">
                <span className="w-4 text-right text-slate-500">{index + 1}</span>
                <span className="truncate">{line}</span>
              </div>
            )) : (
              <p className="text-slate-400">Add starter code to preview the editor.</p>
            )}
          </div>
          {caption && (
            <div className="border-t border-slate-800 bg-slate-900/70 px-3 py-2">
              <PreviewText
                text={caption}
                className="text-[11px] leading-relaxed text-slate-400"
                fontSizePx={11}
                lineHeightPx={17}
                maxLines={3}
              />
            </div>
          )}
        </div>
      )
    }

    case "whiteboard": {
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-white/80 px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">tldraw</span>
            <span className="text-[10px] text-muted-foreground">Infinite canvas</span>
          </div>
          <div className="relative h-40 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_35%),linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[length:auto,24px_24px,24px_24px]">
            <div className="absolute left-6 top-6 rounded-lg border border-[#dbe8f6] bg-[#dbe8f6]/80 px-3 py-2 text-[11px] text-[#3a6ea0] shadow-sm">Main idea</div>
            <div className="absolute right-8 top-10 rounded-full border border-[#d6ede3] bg-[#d6ede3]/80 px-3 py-2 text-[11px] text-[#2e6b4a] shadow-sm">Sketch</div>
            <div className="absolute bottom-6 left-1/3 rounded-lg border border-[#f0e8cc] bg-[#f0e8cc]/80 px-3 py-2 text-[11px] text-[#7a6010] shadow-sm">Notes</div>
          </div>
        </div>
      )
    }

    case "slides": {
      const rawSlides = Array.isArray(content["slides"])
        ? (content["slides"] as Array<{ title?: string; body?: string; notes?: string }>)
        : []
      const slides = rawSlides.length > 0
        ? rawSlides
        : [{ title: title || "Slide deck", body: "Add slides, notes, and embedded lesson materials." }]
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-neutral-50 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Slides</span>
            <span className="text-[10px] text-muted-foreground">{slides.length} slides</span>
          </div>
          <div className="grid grid-cols-[4.5rem_1fr] gap-0">
            <div className="space-y-1 border-r border-border bg-neutral-50 p-2">
              {slides.slice(0, 4).map((slide, index) => (
                <div key={`${slide.title ?? "slide"}-${index}`} className="rounded border border-border bg-white px-2 py-1.5">
                  <p className="truncate text-[9px] font-semibold text-foreground">{index + 1}. {slide.title || "Untitled"}</p>
                </div>
              ))}
            </div>
            <div className="min-h-40 p-4">
              <p className="text-[15px] font-bold text-foreground">{slides[0]?.title || title || "Slide deck"}</p>
              <PreviewText
                text={slides[0]?.body || ""}
                emptyText="Add slide content."
                className="mt-3 text-[12px] leading-relaxed text-muted-foreground"
                tone="paper"
                fontSizePx={12}
                lineHeightPx={19}
                maxLines={5}
              />
              {slides[0]?.notes && (
                <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2">
                  <PreviewText
                    text={slides[0].notes}
                    className="text-[10px] leading-relaxed text-muted-foreground"
                    tone="caption"
                    fontSizePx={10}
                    lineHeightPx={15}
                    maxLines={4}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // ─── Timeline ─────────────────────────────────────────────────────────────────
    case "timeline": {
      const rawEvents = Array.isArray(content["events"])
        ? (content["events"] as Array<{ date?: string; label?: string; description?: string; color?: string }>)
        : []
      const events = rawEvents.map((ev) => ({
        date: ev.date ?? "",
        label: ev.label ?? "",
        description: ev.description,
        color: ev.color,
      }))
      if (events.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border h-40 gap-2">
            <Timer className="h-7 w-7 text-muted-foreground/30" />
            <span className="text-[11px] text-muted-foreground">Add events to see the timeline.</span>
          </div>
        )
      }
      return <TimelineJSPreview events={events} eventsKey={JSON.stringify(events)} />
    }

    // ─── Legend ───────────────────────────────────────────────────────────────────
    case "legend": {
      const rawItems = Array.isArray(content["items"])
        ? (content["items"] as Array<{ color?: string; label?: string; description?: string; value?: string | number }>)
        : []
      const legendLayout = typeof content["layout"] === "string" ? content["layout"] as "list" | "chips" | "grid" : "list"
      const items = rawItems.map((item) => ({
        color: item.color ?? "#94a3b8",
        label: item.label ?? "",
        description: item.description,
        value: item.value,
      }))
      if (items.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border h-40 gap-2">
            <List className="h-7 w-7 text-muted-foreground/30" />
            <span className="text-[11px] text-muted-foreground">Add items to build the legend.</span>
          </div>
        )
      }
      return <LegendPreview items={items} layout={legendLayout} />
    }

    default:
      return <p className="text-sm text-muted-foreground">Preview not available for this type yet.</p>
  } })();

  return (
    <div>
      {!hideTitle && (
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border/40">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/30">
            <meta.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
          </div>
          {onTitleChange ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-[13px] font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none"
              placeholder={meta.label}
            />
          ) : (
            <span className="flex-1 min-w-0 text-[13px] font-semibold text-foreground truncate">
              {title || meta.label}
            </span>
          )}
        </div>
      )}
      {body}
    </div>
  )
}
