import type { LucideIcon } from "lucide-react"
import {
  AudioLines,
  Bot,
  Box,
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

export type CardGroup = "resources" | "tools" | "experiences" | "layout"

export interface CardTypeMeta {
  label: string
  icon: LucideIcon
}

interface SidebarCardDefinition {
  description: string
  detail: string
  fields: string[]
  group: CardGroup
}

interface CardTypeDefinition extends CardTypeMeta {
  cardType: CardType
  sidebar?: SidebarCardDefinition
}

export interface CardSpec {
  cardType: CardType
  label: string
  description: string
  detail: string
  fields: string[]
  group: CardGroup
  Icon: LucideIcon
}

export const GROUPS: { id: CardGroup; label: string }[] = [
  { id: "resources", label: "Resources" },
  { id: "tools", label: "Tools" },
  { id: "experiences", label: "Experiences" },
  { id: "layout", label: "Layout" },
]

const CARD_TYPE_DEFINITIONS: CardTypeDefinition[] = [
  { cardType: "text", label: "Text", icon: FileText, sidebar: { description: "Rich formatted copy with headings, lists, and emphasis.", detail: "Full TipTap rich-text editor with heading levels, bullet/numbered lists, blockquotes, bold, italic, underline, and links. AI generation supported.", fields: ["Title (optional)", "Body (rich text)", "Reading level", "Estimated duration"], group: "resources" } },
  { cardType: "image", label: "Image", icon: ImageIcon, sidebar: { description: "Inline media with caption and attribution.", detail: "Upload or paste a URL. Live preview with dimension readout. Required alt text for accessibility.", fields: ["Image URL / upload", "Alt text", "Caption", "Attribution"], group: "resources" } },
  { cardType: "audio", label: "Audio", icon: AudioLines, sidebar: { description: "Audio clip with waveform player and transcript.", detail: "Full waveform player with scrubber and mute. Chapter markers with timecodes. Transcript editor.", fields: ["Audio URL", "Playback speed", "Transcript", "Chapter markers"], group: "resources" } },
  { cardType: "video", label: "Video", icon: PlayCircle, sidebar: { description: "YouTube, Vimeo, or hosted video.", detail: "Auto-detects YouTube/Vimeo URLs and shows native embed. Supports poster images, captions, and chapter markers.", fields: ["Video URL", "Poster", "Captions URL", "Chapters"], group: "resources" } },
  { cardType: "animation", label: "Animation", icon: Film, sidebar: { description: "Lottie JSON, GIF, or animated SVG.", detail: "Load Lottie animations with play/pause/speed controls. Supports GIF and SVG formats. Full playback scrubber.", fields: ["Animation URL", "Format", "Speed", "Loop"], group: "resources" } },
  { cardType: "dataset", label: "Dataset", icon: Database, sidebar: { description: "Structured data snapshot with metadata.", detail: "Reference a data source with row/column counts, format, schema version, and refresh cadence.", fields: ["Source URL", "Format", "Row count", "Refresh"], group: "resources" } },
  { cardType: "model-3d", label: "3D Model", icon: Box, sidebar: { description: "Curated GLB models with orbit controls.", detail: "Display-only WebGL viewer powered by React Three Fiber. Uses a small Poly Pizza test catalog with camera presets and viewing controls.", fields: ["Poly Pizza model", "Camera preset", "Lighting", "Display options"], group: "resources" } },
  { cardType: "map", label: "Map", icon: MapIcon, sidebar: { description: "Geographic map with lat/lng and zoom.", detail: "Leaflet + OpenStreetMap. Full viewport controls: lat, lng, zoom slider, style presets (Standard, Topographic, Dark), and overlay layers (Labels, Choropleth, Points).", fields: ["Lat / Lng", "Zoom level", "Map style", "Overlays"], group: "resources" } },
  { cardType: "chart", label: "Chart", icon: LineChart, sidebar: { description: "Editable data table with live chart preview.", detail: "Full recharts-powered chart editor. Inline spreadsheet for data entry. Supports Line, Bar, Area, Scatter, and Pie charts with color schemes.", fields: ["Chart type", "Data table", "Axis labels", "Color scheme"], group: "resources" } },
  { cardType: "diagram", label: "Diagram", icon: Network, sidebar: { description: "Visual node-edge diagram builder.", detail: "SVG canvas diagram editor. Add, drag, connect, and rename nodes. Flowchart, Concept Map, and Cycle layouts. Node shapes: rect, diamond, oval, hex.", fields: ["Nodes (drag & connect)", "Edges", "Layout preset", "Node shapes"], group: "resources" } },
  { cardType: "media", label: "Media", icon: Layers },
  { cardType: "document", label: "Document", icon: ScrollText, sidebar: { description: "PDF, slide deck, or web article.", detail: "Embed PDF documents, Google Slides, or web articles with a native preview. Add structured sections with headings and body text.", fields: ["Document URL", "Type", "Pages", "Sections"], group: "resources" } },
  { cardType: "table", label: "Table", icon: Table2, sidebar: { description: "Structured data table with inline editing.", detail: "Spreadsheet-like table editor. Tab to advance cells, Enter for new row. Up to 8 columns × 50 rows. Sortable and highlight-rule settings.", fields: ["Column headers", "Data rows", "Row limit", "Sort / highlight"], group: "resources" } },
  { cardType: "rich-sim", label: "Simulation", icon: Sparkles, sidebar: { description: "Embeddable simulation or widget — passive observation.", detail: "Embed any simulation via URL. Configure a starter prompt, observation checkpoints, and hint scaffolding. Student watches; no graded response.", fields: ["Embed URL", "Prompt", "Checkpoints", "Hints"], group: "experiences" } },
  { cardType: "village-3d", label: "3D Scene", icon: Box },
  { cardType: "interactive", label: "Quiz", icon: HelpCircle, sidebar: { description: "Graded questions with per-option feedback.", detail: "Full quiz builder: Multiple Choice, True/False, Short Answer, and Ranking. Per-option feedback, hint text, and point scoring.", fields: ["Interaction type", "Question", "Options", "Feedback / hints"], group: "tools" } },
  { cardType: "games", label: "Game", icon: Gamepad2, sidebar: { description: "Vocabulary match, memory, fill-in-the-blank.", detail: "Gamified learning activities: Word Match, Memory Cards, Fill in the Blank, Drag & Drop ordering. Configure pairs, time limits, and scoring.", fields: ["Game type", "Term/definition pairs", "Time limit", "Hints"], group: "experiences" } },
  { cardType: "chat", label: "Chat with character", icon: Bot, sidebar: { description: "AI-powered character chat — guided conversation with a persona.", detail: "Configure an AI persona, Ollama model, opening message, learning objectives, and conversation starters. Students chat with the character to explore a topic.", fields: ["AI persona", "Ollama model", "Topic", "Opening message", "Conversation starters", "Max turns"], group: "tools" } },
  { cardType: "text-editor", label: "Text editor", icon: FileText, sidebar: { description: "Embedded writing surface powered by TipTap.", detail: "A barebones rich-text workspace for drafting, annotating, and guided writing directly inside the layout.", fields: ["Title", "Document body", "Placeholder", "Mode"], group: "tools" } },
  { cardType: "code-editor", label: "Code editor", icon: Code2, sidebar: { description: "Embedded code workspace powered by CodeMirror.", detail: "Syntax-highlighted code editor with language selection, starter prompt, and a clean reading-focused surface for live coding examples.", fields: ["Title", "Language", "Starter code", "Prompt"], group: "tools" } },
  { cardType: "whiteboard", label: "Whiteboard", icon: PenTool, sidebar: { description: "Embedded whiteboard powered by tldraw.", detail: "A lightweight infinite canvas for sketching diagrams, concept maps, annotations, and lesson-side brainstorming.", fields: ["Title", "Board prompt", "Board key"], group: "tools" } },
  { cardType: "timeline", label: "Timeline", icon: Timer, sidebar: { description: "Chronological event sequence with dates and descriptions.", detail: "Horizontal scrollable TimelineJS timeline. Each event has a date badge, title, and optional description paragraph. Ideal for history, process flows, and product simulations.", fields: ["Events (date, label, description)", "Orientation (horizontal)", "Node colors"], group: "resources" } },
  { cardType: "legend", label: "Legend", icon: List, sidebar: { description: "Color-coded key for maps, charts, and simulations.", detail: "List, chip, or grid layout. Each item has a color swatch, label, and optional description or value. Designed to live in narrow sidebar slots alongside a map or diagram.", fields: ["Items (color, label, description)", "Layout (list / chips / grid)", "Title"], group: "resources" } },
  { cardType: "layout-split", label: "Split", icon: Columns2, sidebar: { description: "Two equal full-height columns. Good for side-by-side comparison.", detail: "50/50 columns. Neither side is dominant. Drop any card type into each slot — the slot adapts to its content.", fields: ["Left slot", "Right slot"], group: "layout" } },
  { cardType: "layout-stack", label: "Stack", icon: Rows2, sidebar: { description: "Two full-width rows, 60% top and 40% bottom.", detail: "Top slot is the primary content area, bottom is secondary. The workhorse layout: Video above, Quiz below; Timeline above, Text below.", fields: ["Primary slot (top)", "Secondary slot (bottom)"], group: "layout" } },
  { cardType: "layout-feature", label: "Feature", icon: Layout, sidebar: { description: "Narrow left panel + large right area + thin bottom strip.", detail: "Product-first composition. Left panel is a persistent legend/control rail, right upper is the main map or visual, right lower is timeline/caption context. Recommended for Simulation ensembles.", fields: ["Legend / controls slot", "Primary map / visual slot", "Timeline / context slot"], group: "layout" } },
  { cardType: "layout-sidebar", label: "Sidebar", icon: PanelLeft, sidebar: { description: "Asymmetric 30 / 70 columns.", detail: "Teacher-friendly product split: narrow column for legend/filters/guidance, wide column for the main product body (map, timeline, or simulation scene).", fields: ["Legend / guidance slot", "Primary product slot"], group: "layout" } },
  { cardType: "layout-quad", label: "Quad", icon: LayoutGrid, sidebar: { description: "2 × 2 equal grid, four cells.", detail: "Gallery use, four-way comparison, or a compound that surfaces four simultaneous data views.", fields: ["Top-left", "Top-right", "Bottom-left", "Bottom-right"], group: "layout" } },
  { cardType: "layout-mosaic", label: "Mosaic", icon: Grid3X3, sidebar: { description: "3 × 3 equal grid, nine cells.", detail: "Dense information display: image galleries, multi-dataset views, or a game board layout. High cell count means card coordination matters.", fields: ["Nine equal slots"], group: "layout" } },
  { cardType: "layout-triptych", label: "Triptych", icon: Columns3, sidebar: { description: "Three equal full-height columns.", detail: "Horizontal triptych: three parallel content threads side-by-side. Good for concept comparisons, three-step processes, or three-character portraits.", fields: ["Left slot", "Centre slot", "Right slot"], group: "layout" } },
  { cardType: "layout-trirow", label: "Trirow", icon: Rows3, sidebar: { description: "Three full-width horizontal bands: header, body, footer.", detail: "Classic textbook page structure. Header anchors the topic, body carries main content, footer provides context or exercises.", fields: ["Header slot", "Body slot", "Footer slot"], group: "layout" } },
  { cardType: "layout-banner", label: "Banner", icon: LayoutPanelTop, sidebar: { description: "Full-width header strip above two equal columns.", detail: "A spanning title or media banner sits above a two-column body. Common in magazine layouts and textbook openers.", fields: ["Header slot (full width)", "Left column slot", "Right column slot"], group: "layout" } },
  { cardType: "layout-broadside", label: "Broadside", icon: LayoutTemplate, sidebar: { description: "Full-width header strip above three equal columns.", detail: "Broadside: wide header announces the topic, three-column body delivers parallel content threads. Used in newspaper spreads and academic journals.", fields: ["Header slot (full width)", "Left column", "Centre column", "Right column"], group: "layout" } },
  { cardType: "layout-tower", label: "Tower", icon: LayoutPanelLeft, sidebar: { description: "Wide left feature column spanning full height beside three compact side panels.", detail: "A dominant left column (image, timeline, or diagram) stands alongside three stacked right panels. Good for narrative-with-data sidebars.", fields: ["Feature slot (left, full height)", "Top-right panel", "Mid-right panel", "Bottom-right panel"], group: "layout" } },
  { cardType: "layout-pinboard", label: "Pinboard", icon: LayoutDashboard, sidebar: { description: "Full-width header above a 2 × 2 card grid.", detail: "Pin a title or guiding question at the top, then display four equal content cards below. Used in bulletin-board and review-sheet layouts.", fields: ["Header slot (full width)", "Top-left card", "Top-right card", "Bottom-left card", "Bottom-right card"], group: "layout" } },
  { cardType: "layout-annotated", label: "Annotated", icon: PanelLeftOpen, sidebar: { description: "Narrow annotation margin beside a 2 × 2 content grid.", detail: "Product review layout: keep legend/glossary persistent in the left rail while map, chart, evidence, and prompt cards occupy the right grid. Built for teacher-led synthesis pages.", fields: ["Legend / glossary rail", "Map cell", "Chart cell", "Evidence cell", "Prompt cell"], group: "layout" } },
  { cardType: "layout-sixgrid", label: "Six-Grid", icon: Grid3x2, sidebar: { description: "3 × 2 storyboard grid, six equal cells.", detail: "Six-panel storyboard or comic-strip layout. Each cell holds a single content card. Good for sequential narratives, timelines, or step-by-step visual guides.", fields: ["Panel 1", "Panel 2", "Panel 3", "Panel 4", "Panel 5", "Panel 6"], group: "layout" } },
]

export const CARD_TYPE_META: Record<CardType, CardTypeMeta> = Object.fromEntries(
  CARD_TYPE_DEFINITIONS.map(({ cardType, label, icon }) => [cardType, { label, icon }]),
) as Record<CardType, CardTypeMeta>

export const CARD_SPECS: CardSpec[] = CARD_TYPE_DEFINITIONS.flatMap((definition) => {
  if (!definition.sidebar) {
    return []
  }

  return [{
    cardType: definition.cardType,
    label: definition.label,
    description: definition.sidebar.description,
    detail: definition.sidebar.detail,
    fields: definition.sidebar.fields,
    group: definition.sidebar.group,
    Icon: definition.icon,
  }]
})