import type { ComponentType } from "react"
import {
  AudioLines,
  Bot,
  Box,
  Code2,
  Columns2,
  Columns3,
  Database,
  ExternalLink,
  FileText,
  FileCode2,
  Film,
  ClipboardList,
  Gamepad2,
  Grid3X3,
  Grid3x2,
  HelpCircle,
  ImageIcon,
  Layout,
  LayoutDashboard,
  LayoutGrid,
  LayoutPanelLeft,
  LayoutPanelTop,
  LayoutTemplate,
  Layers,
  LineChart,
  Map as MapIcon,
  Network,
  Mic,
  ArrowLeftRight,
  PanelLeft,
  PanelLeftOpen,
  PenTool,
  PlayCircle,
  Presentation,
  Rows2,
  Rows3,
  Sparkles,
  Table2,
} from "lucide-react"

import type { CardId, CardType } from "../types"
import {
  buildCompositionPresetContent,
  COMPOSITION_PRESETS,
} from "./composition-presets"
import { CARD_SPECS, GROUPS, SUBGROUPS, type CardGroup, type CardSubgroup } from "./make-panel-data"

export interface Category {
  id: CardGroup
  label: string
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>
  types: CardType[]
}

export interface LibraryItem {
  id: CardId
  cardType: CardType
  title: string
  description: string
  group: CardGroup
  subgroup: CardSubgroup
  content?: Record<string, unknown>
  layoutLabel?: string
}

export interface PurposeFilter {
  id: "all" | CardSubgroup
  label: string
  description: string
}

export const CATEGORIES: Category[] = [
  {
    id: "materials",
    label: "Materials",
    Icon: Layers,
    types: CARD_SPECS.filter((spec) => spec.group === "materials").map((spec) => spec.cardType),
  },
  {
    id: "compositions",
    label: "Compositions",
    Icon: Sparkles,
    types: CARD_SPECS.filter((spec) => spec.group === "compositions").map((spec) => spec.cardType),
  },
]

export const PURPOSE_FILTERS: Record<CardGroup, PurposeFilter[]> = Object.fromEntries(
  GROUPS.map((group) => [
    group.id,
    [
      { id: "all", label: "All purposes", description: `All ${group.label.toLowerCase()}` },
      ...SUBGROUPS[group.id],
    ],
  ]),
) as Record<CardGroup, PurposeFilter[]>

export const LIBRARY_ITEMS: LibraryItem[] = COMPOSITION_PRESETS.map((preset) => {
  const layout = preset.layouts.find((option) => option.cardType === preset.defaultLayout) ?? preset.layouts[0]
  return {
    id: `composition-preset-${preset.id}` as CardId,
    cardType: layout.cardType,
    title: preset.title,
    description: preset.description,
    group: "compositions",
    subgroup: preset.purpose,
    content: buildCompositionPresetContent(preset, layout.cardType),
    layoutLabel: layout.label,
  }
})

export const CARD_TYPE_COLORS: Record<CardType, { bg: string; text: string }> = {
  text: { bg: "bg-primary/10", text: "text-primary" },
  image: { bg: "bg-[#5c9970]/10", text: "text-[#5c9970]" },
  audio: { bg: "bg-[#b87c5c]/10", text: "text-[#b87c5c]" },
  video: { bg: "bg-[#6b8fc4]/10", text: "text-[#6b8fc4]" },
  animation: { bg: "bg-[#b87070]/10", text: "text-[#b87070]" },
  dataset: { bg: "bg-primary/10", text: "text-primary" },
  embed: { bg: "bg-muted", text: "text-muted-foreground" },
  flashcards: { bg: "bg-[#a89450]/10", text: "text-[#a89450]" },
  "code-snippet": { bg: "bg-neutral-900/10", text: "text-neutral-700" },
  "model-3d": { bg: "bg-[#a89450]/10", text: "text-[#a89450]" },
  map: { bg: "bg-[#5c9970]/10", text: "text-[#5c9970]" },
  chart: { bg: "bg-[#b87c5c]/10", text: "text-[#b87c5c]" },
  diagram: { bg: "bg-[#6b8fc4]/10", text: "text-[#6b8fc4]" },
  media: { bg: "bg-[#5c9970]/10", text: "text-[#5c9970]" },
  document: { bg: "bg-muted", text: "text-muted-foreground" },
  table: { bg: "bg-[#b87c5c]/10", text: "text-[#b87c5c]" },
  "source-excerpt": { bg: "bg-primary/10", text: "text-primary" },
  citation: { bg: "bg-muted", text: "text-muted-foreground" },
  bibliography: { bg: "bg-[#a89450]/10", text: "text-[#a89450]" },
  "gis-layer": { bg: "bg-[#5c9970]/10", text: "text-[#5c9970]" },
  "rich-sim": { bg: "bg-[#a89450]/10", text: "text-[#a89450]" },
  "village-3d": { bg: "bg-[#a89450]/10", text: "text-[#a89450]" },
  interactive: { bg: "bg-[#5c9970]/10", text: "text-[#5c9970]" },
  form: { bg: "bg-[#5c9970]/10", text: "text-[#5c9970]" },
  "voice-recorder": { bg: "bg-[#b87c5c]/10", text: "text-[#b87c5c]" },
  sorter: { bg: "bg-[#6b8fc4]/10", text: "text-[#6b8fc4]" },
  games: { bg: "bg-[#6b8fc4]/10", text: "text-[#6b8fc4]" },
  chat: { bg: "bg-[#b87070]/10", text: "text-[#b87070]" },
  "text-editor": { bg: "bg-primary/10", text: "text-primary" },
  "code-editor": { bg: "bg-muted", text: "text-foreground/70" },
  whiteboard: { bg: "bg-[#5c9970]/10", text: "text-[#5c9970]" },
  slides: { bg: "bg-[#a89450]/10", text: "text-[#a89450]" },
  timeline: { bg: "bg-primary/10", text: "text-primary" },
  legend: { bg: "bg-[#5c9970]/10", text: "text-[#5c9970]" },
  "layout-split": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-stack": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-feature": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-sidebar": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-quad": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-mosaic": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-triptych": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-trirow": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-banner": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-broadside": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-tower": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-pinboard": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-annotated": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-sixgrid": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-comparison": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-stepped": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-hero": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-dialogue": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-gallery": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-spotlight": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-flipcard": { bg: "bg-muted", text: "text-muted-foreground" },
  "layout-resizable-grid": { bg: "bg-muted", text: "text-muted-foreground" },
}

export const TYPE_LABEL: Partial<Record<CardType, string>> = {
  embed: "Embed",
  flashcards: "Flashcard Set",
  "code-snippet": "Code Snippet",
  "source-excerpt": "Source Excerpt",
  "gis-layer": "GIS Layer",
  "rich-sim": "Embedded Simulator",
  "village-3d": "3D Scene",
  interactive: "Assessment",
  form: "Form",
  "voice-recorder": "Voice Recorder",
  sorter: "Sorter / Matcher",
  chat: "Character",
  "text-editor": "Writing Pad",
  "code-editor": "Code Editor",
  whiteboard: "Whiteboard",
  slides: "Slides",
  "layout-split": "Split",
  "layout-stack": "Stack",
  "layout-feature": "Feature",
  "layout-sidebar": "Sidebar",
  "layout-quad": "Quad",
  "layout-mosaic": "Mosaic",
  "layout-triptych": "Triptych",
  "layout-trirow": "Trirow",
  "layout-banner": "Banner",
  "layout-broadside": "Broadside",
  "layout-tower": "Tower",
  "layout-pinboard": "Pinboard",
  "layout-annotated": "Annotated",
  "layout-sixgrid": "Six-Grid",
  "layout-comparison": "Comparison",
  "layout-stepped": "Stepped",
  "layout-hero": "Hero",
  "layout-dialogue": "Dialogue",
  "layout-gallery": "Gallery",
  "layout-spotlight": "Spotlight",
  "layout-flipcard": "Flipcard",
  "layout-resizable-grid": "Resizable Grid",
}

export const TYPE_ICONS: Partial<Record<CardType, ComponentType<{ size?: number; className?: string }>>> = {
  text: FileText,
  image: ImageIcon,
  audio: AudioLines,
  video: PlayCircle,
  animation: Film,
  embed: ExternalLink,
  flashcards: ClipboardList,
  "code-snippet": FileCode2,
  "model-3d": Box,
  document: FileText,
  map: MapIcon,
  chart: LineChart,
  diagram: Network,
  table: Table2,
  "source-excerpt": FileText,
  citation: FileText,
  bibliography: ClipboardList,
  "gis-layer": Layers,
  dataset: Database,
  "rich-sim": Sparkles,
  interactive: HelpCircle,
  form: ClipboardList,
  "voice-recorder": Mic,
  sorter: ArrowLeftRight,
  games: Gamepad2,
  chat: Bot,
  "text-editor": FileText,
  "code-editor": Code2,
  whiteboard: PenTool,
  slides: Presentation,
  "layout-split": Columns2,
  "layout-stack": Rows2,
  "layout-feature": Layout,
  "layout-sidebar": PanelLeft,
  "layout-quad": LayoutGrid,
  "layout-mosaic": Grid3X3,
  "layout-triptych": Columns3,
  "layout-trirow": Rows3,
  "layout-banner": LayoutPanelTop,
  "layout-broadside": LayoutTemplate,
  "layout-tower": LayoutPanelLeft,
  "layout-pinboard": LayoutDashboard,
  "layout-annotated": PanelLeftOpen,
  "layout-sixgrid": Grid3x2,
  "layout-comparison": Columns2,
  "layout-stepped": Rows3,
  "layout-hero": LayoutPanelTop,
  "layout-dialogue": Columns2,
  "layout-gallery": Grid3X3,
  "layout-spotlight": Layout,
  "layout-flipcard": LayoutTemplate,
  "layout-resizable-grid": LayoutDashboard,
}
