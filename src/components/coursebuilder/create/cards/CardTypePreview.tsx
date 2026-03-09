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
  Bot,
  Box,
  Check,
  Code2,
  Columns2,
  Columns3,
  Database,
  FileText,
  Film,
  Gamepad2,
  Grid3X3,
  Grid3x2,
  HelpCircle,
  Image as ImageIcon,
  Layout,
  LayoutDashboard,
  Layers,
  LayoutGrid,
  LayoutPanelLeft,
  LayoutPanelTop,
  LayoutTemplate,
  LineChart,
  List,
  Map as MapIcon,
  MessageSquare,
  Network,
  PanelLeft,
  PanelLeftOpen,
  PenTool,
  PlayCircle,
  Rows2,
  Rows3,
  ScrollText,
  Sparkles,
  Table2,
  Timer,
} from "lucide-react"
import type { CardType } from "../types"
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

const Model3DViewer = dynamic(
  () => import("@/components/coursebuilder/model-3d-viewer").then((m) => m.Model3DViewer),
  { ssr: false },
)

const TimelineJSPreview = dynamic(
  () => import("./card-types/timeline-preview-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-neutral-50 text-[12px] text-neutral-400" style={{ height: 160 }}>
        Loading timeline…
      </div>
    ),
  },
)

// ─── Meta ─────────────────────────────────────────────────────────────────────

export interface CardTypeMeta { label: string; icon: LucideIcon }

export const CARD_TYPE_META: Record<CardType, CardTypeMeta> = {
  text:         { label: "Text",        icon: FileText    },
  image:        { label: "Image",       icon: ImageIcon   },
  audio:        { label: "Audio",       icon: AudioLines  },
  video:        { label: "Video",       icon: PlayCircle  },
  animation:    { label: "Animation",   icon: Film        },
  dataset:      { label: "Dataset",     icon: Database    },
  "model-3d":   { label: "3D Model",    icon: Box         },
  map:          { label: "Map",         icon: MapIcon     },
  chart:        { label: "Chart",       icon: LineChart   },
  diagram:      { label: "Diagram",     icon: Network     },
  media:        { label: "Media",       icon: Layers      },
  document:     { label: "Document",    icon: ScrollText  },
  table:        { label: "Table",       icon: Table2      },
  "rich-sim":   { label: "Simulation",  icon: Sparkles    },
  "village-3d": { label: "3D Scene",    icon: Box         },
  interactive:  { label: "Quiz",        icon: HelpCircle  },
  games:        { label: "Game",        icon: Gamepad2    },
  chat:         { label: "Chat with character", icon: Bot },  
  "text-editor": { label: "Text editor", icon: FileText },
  "code-editor": { label: "Code editor", icon: Code2 },
  whiteboard:   { label: "Whiteboard",  icon: PenTool },
  timeline:     { label: "Timeline",    icon: Timer       },
  legend:       { label: "Legend",      icon: List        },
  // ── Layout containers ─────────────────────────────────────────
  "layout-split":     { label: "Split",     icon: Columns2         },
  "layout-stack":     { label: "Stack",     icon: Rows2            },
  "layout-feature":   { label: "Feature",   icon: Layout           },
  "layout-sidebar":   { label: "Sidebar",   icon: PanelLeft        },
  "layout-quad":      { label: "Quad",      icon: LayoutGrid       },
  "layout-mosaic":    { label: "Mosaic",    icon: Grid3X3          },
  "layout-triptych":  { label: "Triptych",  icon: Columns3         },
  "layout-trirow":    { label: "Trirow",    icon: Rows3            },
  "layout-banner":    { label: "Banner",    icon: LayoutPanelTop   },
  "layout-broadside": { label: "Broadside", icon: LayoutTemplate   },
  "layout-tower":     { label: "Tower",     icon: LayoutPanelLeft  },
  "layout-pinboard":  { label: "Pinboard",  icon: LayoutDashboard  },
  "layout-annotated": { label: "Annotated", icon: PanelLeftOpen    },
  "layout-sixgrid":   { label: "Six-Grid",  icon: Grid3x2          },
}

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
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-8">
            {plain || "Add your copy here."}
          </p>
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
              {caption && <p className="text-[11px] text-muted-foreground">{caption}</p>}
              {attribution && <p className="text-[10px] text-muted-foreground/60 italic">{attribution}</p>}
            </div>
          )}
        </div>
      )
    }

    case "audio": {
      const url = typeof content["url"] === "string" ? content["url"] : ""
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
      return <Model3DViewer />

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

    case "document": {
      const fileType = typeof content["documentType"] === "string"
        ? content["documentType"].toUpperCase()
        : typeof content["fileType"] === "string"
        ? content["fileType"].toUpperCase()
        : "PDF"
      const pages = typeof content["pages"] === "number" ? content["pages"] : 0
      const excerpt = typeof content["excerpt"] === "string" ? content["excerpt"] : ""
      const sections: { heading: string; body: string }[] = (() => {
        try { return content["sections"] ? JSON.parse(content["sections"] as string) : [] } catch { return [] }
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
            <p className="text-[12px] text-muted-foreground leading-relaxed italic line-clamp-3">{excerpt}</p>
          )}
          {sections.slice(0, 2).map((sec, i) => (
            <div key={i} className="border-l-2 border-border pl-3">
              {sec.heading && <p className="text-[11px] font-semibold text-foreground mb-0.5">{sec.heading}</p>}
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{sec.body || "Section body…"}</p>
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
          <p className="text-[13px] font-medium text-foreground leading-snug">{prompt || "Your question will appear here…"}</p>

          {interactionType === "multiple-choice" && rawOpts.length > 0 && (
            <div className="space-y-2">
              {rawOpts.slice(0, 4).map((opt, i) => (
                <div
                  key={i}
                  className={[
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12px] transition-colors",
                    opt.correct
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-border text-muted-foreground",
                  ].join(" ")}
                >
                  <span className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    opt.correct ? "border-green-500 bg-green-500" : "border-border",
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
              <div className={["flex-1 rounded-lg border px-3 py-2 text-center text-[13px] font-semibold transition-colors", tfCorrect ? "border-green-200 bg-green-50 text-green-700" : "border-border text-muted-foreground"].join(" ")}>True</div>
              <div className={["flex-1 rounded-lg border px-3 py-2 text-center text-[13px] font-semibold transition-colors", !tfCorrect ? "border-red-200 bg-red-50 text-red-700" : "border-border text-muted-foreground"].join(" ")}>False</div>
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
            <Gamepad2 className="h-4 w-4 text-violet-500" />
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
            <div className="rounded-lg bg-muted/20 border border-border px-3 py-2.5 text-[12px] text-foreground/80 leading-relaxed">
              {fillText.replace(/\[[^\]]+\]/g, "___").slice(0, 120)}
              {fillText.length > 120 && "…"}
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
              <p className="text-[12px] text-foreground leading-relaxed">
                {openingMessage || "Hello! I'm here to help you learn. What would you like to explore?"}
              </p>
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
            <span className="h-2 w-2 rounded-full bg-rose-300" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            <span className="ml-2 text-[10px] font-medium text-muted-foreground">TipTap workspace</span>
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="h-3 w-24 rounded bg-sky-100" />
            <p className="text-[12px] leading-6 text-muted-foreground line-clamp-5">
              {plain || "A barebones rich-text writing area for notes, drafting, and guided responses."}
            </p>
          </div>
        </div>
      )
    }

    case "code-editor": {
      const code = typeof content["code"] === "string" ? content["code"] : ""
      const lines = code.split("\n").filter(Boolean).slice(0, 5)
      const language = typeof content["language"] === "string" ? content["language"] : "javascript"

      return (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">CodeMirror</span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-medium text-emerald-200">
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
            <div className="absolute left-6 top-6 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-800 shadow-sm">Main idea</div>
            <div className="absolute right-8 top-10 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 shadow-sm">Sketch</div>
            <div className="absolute bottom-6 left-1/3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 shadow-sm">Notes</div>
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
