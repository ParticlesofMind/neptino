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
  Map as MapIcon,
  MessageSquare,
  Network,
  PanelLeft,
  PanelLeftOpen,
  PlayCircle,
  Rows2,
  Rows3,
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
  document:     { label: "Document",    icon: FileText    },
  table:        { label: "Table",       icon: Table2      },
  "rich-sim":   { label: "Simulation",  icon: Sparkles    },
  "village-3d": { label: "3D Scene",    icon: Box         },
  interactive:  { label: "Quiz",        icon: HelpCircle  },
  games:        { label: "Game",        icon: Gamepad2    },
  chat:         { label: "AI Chat",     icon: Bot         },
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
  cardType: CardType
  content:  Record<string, unknown>
}

/**
 * Renders a gallery-quality visual preview for a given card type and content.
 */
export function CardTypePreview({ cardType, content }: CardTypePreviewProps) {
  const meta  = CARD_TYPE_META[cardType]
  const title = typeof content["title"] === "string" ? content["title"] : meta.label

  switch (cardType) {
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
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={url} alt={alt || "Image"} className="w-full h-full object-cover" style={{ maxHeight: 240 }} />
            : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border h-36 gap-2 bg-muted/20">
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
      const sections: { heading: string; body: string }[] = (() => {
        try { return content["sections"] ? JSON.parse(content["sections"] as string) : [] } catch { return [] }
      })()
      const excerpt = typeof content["excerpt"] === "string" ? content["excerpt"] : ""
      return (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground leading-tight">{title}</h3>
          {excerpt && <p className="text-[12px] text-muted-foreground leading-relaxed italic line-clamp-4">{excerpt}</p>}
          {sections.slice(0, 2).map((sec, i) => (
            <div key={i}>
              {sec.heading && <h4 className="text-[12px] font-semibold text-foreground mb-1">{sec.heading}</h4>}
              <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">{sec.body || "Section body…"}</p>
            </div>
          ))}
          {sections.length === 0 && !excerpt && (
            <p className="text-sm text-muted-foreground italic">Start writing sections to see a preview.</p>
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
              {fillText.replace(/\[([^\]]+)\]/g, (_, word) => `___`).slice(0, 120)}
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

    default:
      return <p className="text-sm text-muted-foreground">Preview not available for this type yet.</p>
  }
}
