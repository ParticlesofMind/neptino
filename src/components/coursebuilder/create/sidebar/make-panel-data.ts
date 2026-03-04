import {
  AudioLines,
  Bot,
  Box,
  Database,
  FileText,
  Film,
  Gamepad2,
  HelpCircle,
  ImageIcon,
  LineChart,
  Map as MapIcon,
  Network,
  PlayCircle,
  Sparkles,
  Table2,
} from "lucide-react"
import type { ComponentType } from "react"

import type { CardType } from "../types"

export interface CardSpec {
  cardType: CardType
  label: string
  description: string
  detail: string
  fields: string[]
  group: "media" | "data" | "interactive"
  Icon: ComponentType<{ size?: number; className?: string }>
}

export const SAMPLE_CONTENT: Partial<Record<CardType, Record<string, unknown>>> = {
  text: {
    title: "The Water Cycle",
    text: "<h2>The Water Cycle</h2><p>The water cycle describes the continuous movement of water through Earth's systems — from surface bodies to the atmosphere and back again. It is driven by solar energy and the force of gravity, distributing heat and freshwater across the planet.</p><p>Evaporation converts liquid water into vapour; condensation forms clouds; precipitation returns water to the surface; infiltration recharges groundwater aquifers.</p>",
  },
  image: {
    title: "Diagram: Circulatory system",
    url: "https://picsum.photos/seed/anatomy/800/600",
    alt: "Medical illustration of the circulatory system",
    caption: "The human circulatory system showing major arteries and veins.",
    attribution: "Public domain medical illustration",
  },
  audio: {
    title: "Lecture excerpt — Cell division",
    url: "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3",
    transcript: "[0:00] Welcome to today's lecture on cell division.\n[0:30] We will cover mitosis and meiosis…",
  },
  video: {
    title: "Introduction to photosynthesis",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  animation: {
    title: "Mitosis — cell division",
    format: "Lottie / JSON",
    duration: "8s",
    fps: 30,
  },
  "model-3d": {
    title: "Astronaut model",
    format: "GLB",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
  },
  map: {
    title: "World population density",
    lat: 20.0,
    lng: 10.0,
    zoom: 2,
    layers: ["choropleth", "city labels"],
    mapLayer: "Standard",
  },
  chart: {
    title: "Global temperature anomaly 1880–2020",
    chartType: "line",
    xLabel: "Year",
    yLabel: "°C anomaly",
    colorScheme: "Blue",
    showLegend: true,
    showGrid: true,
    columns: ["Year", "Anomaly"],
    rows: [
      ["1900", "-0.08"], ["1920", "-0.28"], ["1940", "-0.03"],
      ["1960", "-0.01"], ["1980", "0.27"], ["2000", "0.42"],
      ["2020", "1.02"],
    ],
  },
  diagram: {
    title: "Krebs cycle overview",
    diagramType: "cycle",
    nodes: [
      { id: "a", label: "Acetyl CoA", x: 175, y: 10, shape: "rect" },
      { id: "b", label: "Citrate", x: 305, y: 70, shape: "rect" },
      { id: "c", label: "Isocitrate", x: 315, y: 145, shape: "rect" },
      { id: "d", label: "α-Ketoglut.", x: 205, y: 200, shape: "rect" },
      { id: "e", label: "Malate", x: 95, y: 200, shape: "rect" },
      { id: "f", label: "Fumarate", x: 10, y: 145, shape: "rect" },
      { id: "g", label: "Oxaloacet.", x: 20, y: 70, shape: "rect" },
    ],
    edges: [
      { from: "g", to: "a" }, { from: "a", to: "b" }, { from: "b", to: "c" },
      { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "e", to: "f" },
      { from: "f", to: "g" },
    ],
  },
  table: {
    title: "Element properties",
    columns: ["Element", "Symbol", "Atomic No.", "Mass (u)"],
    rows: [
      ["Hydrogen", "H", "1", "1.008"],
      ["Carbon", "C", "6", "12.011"],
      ["Oxygen", "O", "8", "15.999"],
      ["Nitrogen", "N", "7", "14.007"],
    ],
    sortable: true,
  },
  document: {
    title: "Newton's Principia Mathematica",
    documentType: "pdf",
    pages: 512,
    excerpt: "Every body persists in its state of being at rest or of moving uniformly straight forward, except insofar as it is compelled to change its state by forces impressed.",
  },
  interactive: {
    title: "Photosynthesis quiz",
    interactionType: "multiple-choice",
    prompt: "Which organelle is responsible for photosynthesis in plant cells?",
    options: [
      { text: "Mitochondria", correct: false, feedback: "Mitochondria handle cellular respiration, not photosynthesis." },
      { text: "Chloroplast", correct: true, feedback: "Correct! Chloroplasts contain chlorophyll and drive photosynthesis." },
      { text: "Nucleus", correct: false, feedback: "The nucleus stores DNA — it doesn't carry out photosynthesis." },
      { text: "Ribosome", correct: false, feedback: "Ribosomes build proteins, not carbohydrates from sunlight." },
    ],
    points: 1,
  },
  games: {
    title: "Cell biology vocabulary match",
    gameType: "word-match",
    instructions: "Match each cell organelle to its primary function.",
    pairs: [
      { term: "Mitochondria", match: "Energy production (ATP)" },
      { term: "Ribosome", match: "Protein synthesis" },
      { term: "Nucleus", match: "DNA storage & gene regulation" },
      { term: "Chloroplast", match: "Photosynthesis" },
    ],
    timeLimit: 120,
    showHints: true,
  },
  chat: {
    title: "Chat with Darwin",
    topic: "Charles Darwin's theory of evolution by natural selection, including concepts of variation, inheritance, selection pressure, and adaptation.",
    aiPersona: "Charles Darwin",
    openingMessage: "Ah, a curious student! I am Charles Darwin. What would you like to know about evolution and natural selection?",
    learningObjectives: "Understand how natural selection drives evolution; explain the role of variation and environment; describe key evidence for evolutionary theory.",
    conversationStarters: [
      "How did you develop the theory of natural selection?",
      "What is the role of variation in evolution?",
      "Can you explain the Galapagos finches example?",
    ],
    maxTurns: 20,
    difficulty: "intermediate",
  },
}

export const CARD_SPECS: CardSpec[] = [
  // ─── Media ───────────────────────────────────────────────────────────────────
  {
    cardType: "text",
    label: "Text",
    description: "Rich formatted copy with headings, lists, and emphasis.",
    detail: "Full TipTap rich-text editor with heading levels, bullet/numbered lists, blockquotes, bold, italic, underline, and links. AI generation supported.",
    fields: ["Title (optional)", "Body (rich text)", "Reading level", "Estimated duration"],
    group: "media",
    Icon: FileText,
  },
  {
    cardType: "image",
    label: "Image",
    description: "Inline media with caption and attribution.",
    detail: "Upload or paste a URL. Live preview with dimension readout. Required alt text for accessibility.",
    fields: ["Image URL / upload", "Alt text", "Caption", "Attribution"],
    group: "media",
    Icon: ImageIcon,
  },
  {
    cardType: "audio",
    label: "Audio",
    description: "Audio clip with waveform player and transcript.",
    detail: "Full waveform player with scrubber and mute. Chapter markers with timecodes. Transcript editor.",
    fields: ["Audio URL", "Playback speed", "Transcript", "Chapter markers"],
    group: "media",
    Icon: AudioLines,
  },
  {
    cardType: "video",
    label: "Video",
    description: "YouTube, Vimeo, or hosted video.",
    detail: "Auto-detects YouTube/Vimeo URLs and shows native embed. Supports poster images, captions, and chapter markers.",
    fields: ["Video URL", "Poster", "Captions URL", "Chapters"],
    group: "media",
    Icon: PlayCircle,
  },
  {
    cardType: "animation",
    label: "Animation",
    description: "Lottie JSON, GIF, or animated SVG.",
    detail: "Load Lottie animations with play/pause/speed controls. Supports GIF and SVG formats. Full playback scrubber.",
    fields: ["Animation URL", "Format", "Speed", "Loop"],
    group: "media",
    Icon: Film,
  },
  {
    cardType: "model-3d",
    label: "3D Model",
    description: "GLB / GLTF 3D scene with orbit controls.",
    detail: "Full WebGL viewer powered by React Three Fiber. Camera presets, lighting environments, wireframe toggle, and 3D annotations.",
    fields: ["Model URL (GLB / GLTF)", "Camera preset", "Lighting", "Annotations"],
    group: "media",
    Icon: Box,
  },
  // ─── Data & Visuals ──────────────────────────────────────────────────────────
  {
    cardType: "map",
    label: "Map",
    description: "Geographic map with lat/lng and zoom.",
    detail: "OpenStreetMap embed with full viewport controls: lat, lng, zoom slider, and style presets (Standard, Cycle, Transport).",
    fields: ["Lat / Lng", "Zoom level", "Map style", "Overlays"],
    group: "data",
    Icon: MapIcon,
  },
  {
    cardType: "chart",
    label: "Chart",
    description: "Editable data table with live chart preview.",
    detail: "Full recharts-powered chart editor. Inline spreadsheet for data entry. Supports Line, Bar, Area, Scatter, and Pie charts with color schemes.",
    fields: ["Chart type", "Data table", "Axis labels", "Color scheme"],
    group: "data",
    Icon: LineChart,
  },
  {
    cardType: "diagram",
    label: "Diagram",
    description: "Visual node-edge diagram builder.",
    detail: "SVG canvas diagram editor. Add, drag, connect, and rename nodes. Flowchart, Concept Map, and Cycle layouts. Node shapes: rect, diamond, oval, hex.",
    fields: ["Nodes (drag & connect)", "Edges", "Layout preset", "Node shapes"],
    group: "data",
    Icon: Network,
  },
  {
    cardType: "table",
    label: "Table",
    description: "Structured data table with inline editing.",
    detail: "Spreadsheet-like table editor. Tab to advance cells, Enter for new row. Up to 8 columns × 50 rows. Sortable and highlight-rule settings.",
    fields: ["Column headers", "Data rows", "Row limit", "Sort / highlight"],
    group: "data",
    Icon: Table2,
  },
  {
    cardType: "document",
    label: "Document",
    description: "PDF, slide deck, or web article.",
    detail: "Embed PDF documents, Google Slides, or web articles with a native preview. Add structured sections with headings and body text.",
    fields: ["Document URL", "Type", "Pages", "Sections"],
    group: "data",
    Icon: FileText,
  },
  {
    cardType: "dataset",
    label: "Dataset",
    description: "Structured data snapshot with metadata.",
    detail: "Reference a data source with row/column counts, format, schema version, and refresh cadence.",
    fields: ["Source URL", "Format", "Row count", "Refresh"],
    group: "data",
    Icon: Database,
  },
  // ─── Interactive ──────────────────────────────────────────────────────────────
  {
    cardType: "interactive",
    label: "Quiz",
    description: "Graded questions with per-option feedback.",
    detail: "Full quiz builder: Multiple Choice, True/False, Short Answer, and Ranking. Per-option feedback, hint text, and point scoring.",
    fields: ["Interaction type", "Question", "Options", "Feedback / hints"],
    group: "interactive",
    Icon: HelpCircle,
  },
  {
    cardType: "rich-sim",
    label: "Simulation",
    description: "Embeddable interactive simulation or widget.",
    detail: "Embed any interactive simulation via URL. Configure starter prompt, checkpoints, and hint scaffolding.",
    fields: ["Embed URL", "Prompt", "Checkpoints", "Hints"],
    group: "interactive",
    Icon: Sparkles,
  },
  {
    cardType: "games",
    label: "Game",
    description: "Vocabulary match, memory, fill-in-the-blank.",
    detail: "Gamified learning activities: Word Match, Memory Cards, Fill in the Blank, Drag & Drop ordering. Configure pairs, time limits, and scoring.",
    fields: ["Game type", "Term/definition pairs", "Time limit", "Hints"],
    group: "interactive",
    Icon: Gamepad2,
  },
  {
    cardType: "chat",
    label: "AI Chat",
    description: "Students converse with a topic-expert AI.",
    detail: "Configure an AI persona and knowledge domain. Students chat freely or follow guided prompts. Supports Socratic dialogue, role-play, and Q&A modes.",
    fields: ["Topic / context", "AI persona", "Opening message", "Conversation starters"],
    group: "interactive",
    Icon: Bot,
  },
]

export const GROUPS: { id: "media" | "data" | "interactive"; label: string }[] = [
  { id: "media", label: "Media" },
  { id: "data", label: "Data & Visuals" },
  { id: "interactive", label: "Interactive" },
]
