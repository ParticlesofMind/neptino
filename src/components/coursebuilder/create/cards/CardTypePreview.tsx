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
import type { LucideIcon } from "lucide-react"
import {
  AudioLines,
  Box,
  Database,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  LineChart,
  Map as MapIcon,
  Network,
  PlayCircle,
  Sparkles,
  Table2,
} from "lucide-react"
import type { CardType } from "../types"
import {
  AnimationPreview,
  AudioPreview,
  ChartPreview,
  DiagramPreview,
  MapPreview,
  RichSimPlaceholder,
  VideoPreview,
} from "./card-type-preview-subviews"

const Model3DViewer = dynamic(
  () => import("@/components/coursebuilder/model-3d-viewer").then((m) => m.Model3DViewer),
  { ssr: false },
)

// ─── Meta ─────────────────────────────────────────────────────────────────────

export interface CardTypeMeta { label: string; icon: LucideIcon }

export const CARD_TYPE_META: Record<CardType, CardTypeMeta> = {
  text:         { label: "Text",        icon: FileText   },
  image:        { label: "Image",       icon: ImageIcon  },
  audio:        { label: "Audio",       icon: AudioLines },
  video:        { label: "Video",       icon: PlayCircle },
  animation:    { label: "Animation",   icon: Film       },
  dataset:      { label: "Dataset",     icon: Database   },
  "model-3d":   { label: "3D Model",    icon: Box        },
  map:          { label: "Map",         icon: MapIcon    },
  chart:        { label: "Chart",       icon: LineChart  },
  diagram:      { label: "Diagram",     icon: Network    },
  media:        { label: "Media",       icon: Layers     },
  document:     { label: "Document",    icon: FileText   },
  table:        { label: "Table",       icon: Table2     },
  "rich-sim":   { label: "Simulation",  icon: Sparkles   },
  "village-3d": { label: "3D Scene",    icon: Box        },
  interactive:  { label: "Interactive", icon: Sparkles   },
}

// ─── Main exported component ──────────────────────────────────────────────────

export interface CardTypePreviewProps {
  cardType: CardType
  content:  Record<string, unknown>
}

/**
 * Renders a gallery-quality visual preview for a given card type and content.
 * Mirrors the CardPreview component in the teacher card gallery page.
 */
export function CardTypePreview({ cardType, content }: CardTypePreviewProps) {
  const meta  = CARD_TYPE_META[cardType]
  const title = typeof content["title"] === "string" ? content["title"] : meta.label

  switch (cardType) {
    case "text": {
      const text = typeof content["text"] === "string" ? content["text"] : ""
      return (
        <div className="overflow-auto">
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap line-clamp-6">
            {text || "Add your copy here."}
          </p>
        </div>
      )
    }
    case "image": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      const alt = typeof content["alt"] === "string" ? content["alt"] : title
      return (
        <div className="rounded-xl overflow-hidden">
          {url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={url} alt={alt || "Image"} className="w-full h-full object-cover" style={{ maxHeight: 240 }} />
            : <span className="text-muted-foreground text-sm">No image provided.</span>}
        </div>
      )
    }
    case "audio": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      return <AudioPreview url={url} />
    }
    case "video": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      if (!url) return <div className="flex items-center justify-center rounded-xl border border-dashed border-border h-32 text-muted-foreground text-sm">No video provided.</div>
      return <VideoPreview url={url} />
    }
    case "animation": {
      const format   = typeof content["format"]   === "string" ? content["format"]   : ""
      const duration = typeof content["duration"] === "string" ? content["duration"] : ""
      const fps      = typeof content["fps"]      === "number" ? content["fps"]      : 0
      return <AnimationPreview format={format} duration={duration} fps={fps} />
    }
    case "map": {
      const lat    = typeof content["lat"]    === "number" ? content["lat"]    : 20
      const lng    = typeof content["lng"]    === "number" ? content["lng"]    : 10
      const zoom   = typeof content["zoom"]   === "number" ? content["zoom"]   : 2
      const layers = Array.isArray(content["layers"]) ? content["layers"] as string[] : []
      return <MapPreview lat={lat} lng={lng} zoom={zoom} layers={layers} />
    }
    case "chart": {
      const chartType = typeof content["chartType"] === "string" ? content["chartType"] : "line"
      const xLabel    = typeof content["xLabel"]    === "string" ? content["xLabel"]    : ""
      const yLabel    = typeof content["yLabel"]    === "string" ? content["yLabel"]    : ""
      const source    = typeof content["source"]    === "string" ? content["source"]    : ""
      return <ChartPreview chartType={chartType} xLabel={xLabel} yLabel={yLabel} source={source} />
    }
    case "diagram": {
      const diagramType = typeof content["diagramType"] === "string" ? content["diagramType"] : "flowchart"
      const nodes       = typeof content["nodes"]       === "number" ? content["nodes"]       : 7
      const edges       = typeof content["edges"]       === "number" ? content["edges"]       : 7
      return <DiagramPreview diagramType={diagramType} nodes={nodes} edges={edges} />
    }
    case "model-3d":
      return <Model3DViewer />
    case "table": {
      const cols = (typeof content["columns"] === "string" ? content["columns"].split(",") : ["Column 1", "Column 2", "Column 3"]).slice(0, 5)
      const rows: string[][] = (() => { try { return content["rows"] ? JSON.parse(content["rows"] as string) : [["—","—","—"]] } catch { return [["—","—","—"]] } })()
      return (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">{cols.map((c, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-foreground/80 whitespace-nowrap">{c}</th>)}</tr>
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
    case "document": {
      const sections: { heading: string; body: string }[] = (() => { try { return content["sections"] ? JSON.parse(content["sections"] as string) : [] } catch { return [] } })()
      return (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground leading-tight">{title}</h3>
          {sections.slice(0, 2).map((sec, i) => (
            <div key={i}>
              {sec.heading && <h4 className="text-[12px] font-semibold text-foreground mb-1">{sec.heading}</h4>}
              <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">{sec.body || "Section body…"}</p>
            </div>
          ))}
          {sections.length === 0 && <p className="text-sm text-muted-foreground italic">Start writing sections to see a preview.</p>}
        </div>
      )
    }
    case "interactive": {
      const prompt = typeof content["prompt"] === "string" ? content["prompt"] : ""
      const options = typeof content["options"] === "string" ? content["options"].split("\n").filter(Boolean) : []
      const interactionType = typeof content["interactionType"] === "string" ? content["interactionType"] : "multiple-choice"
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{prompt || "Your question will appear here…"}</p>
          {options.length > 0 && (
            <div className="space-y-2">
              {options.slice(0, 4).map((opt, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-[12px] text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors">
                  <span className="h-4 w-4 rounded-full border border-border shrink-0" />
                  {opt}
                </div>
              ))}
            </div>
          )}
          {options.length === 0 && (
            <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
              <span className="text-[11px] text-muted-foreground capitalize">{interactionType} — add options to see preview</span>
            </div>
          )}
        </div>
      )
    }
    case "rich-sim": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
      if (url) return <div className="rounded-lg overflow-hidden border border-border" style={{ height: 200 }}><iframe src={url} className="w-full h-full border-0" title="Simulation preview" sandbox="allow-scripts allow-same-origin" /></div>
      return <RichSimPlaceholder />
    }
    case "village-3d": {
      const env = typeof content["environment"] === "string" ? content["environment"] : "village"
      return (
        <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border h-40 gap-2">
          <Box className="h-8 w-8 text-muted-foreground/40" />
          <span className="text-[12px] text-muted-foreground capitalize">{env} scene</span>
        </div>
      )
    }
    case "dataset": {
      const rows = typeof content["rows"] === "number" ? content["rows"] : 0
      const cols = typeof content["columns"] === "number" ? content["columns"] : 0
      const fmt  = typeof content["format"] === "string" ? content["format"] : ""
      return (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {rows > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{rows} rows</span>}
            {cols > 0 && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{cols} columns</span>}
            {fmt && <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{fmt}</span>}
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 border border-border h-24">
            <Database className="h-6 w-6 text-muted-foreground/40" />
          </div>
        </div>
      )
    }
    case "media": {
      const primary = typeof content["primary"] === "string" ? content["primary"] : "video/mp4"
      const sources = Array.isArray(content["sources"]) ? content["sources"] as string[] : []
      return (
        <div>
          <p className="text-[12px] text-muted-foreground mb-3">Primary: {primary}</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => <span key={s as string} className="rounded-full border border-border px-3 py-1 text-[12px] text-muted-foreground">{s as string}</span>)}
          </div>
        </div>
      )
    }
    default:
      return <p className="text-sm text-muted-foreground">Preview not available for this type yet.</p>
  }
}
