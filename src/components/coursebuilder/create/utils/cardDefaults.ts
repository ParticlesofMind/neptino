/**
 * Card Defaults
 *
 * Provides optimal default dimensions and sample content for each card type.
 * Used when dragging cards from the Files Browser onto the canvas.
 */

import type { CardType } from "../types"
import {
  CANVAS_COMPOSITION_CONTENT_WIDTH_PX,
  STANDARD_COMPOSITION_DIMENSIONS,
  TALL_COMPOSITION_DIMENSIONS,
  type CardDimensions,
} from "../cards/cardSizing"

// ─── Default dimensions ───────────────────────────────────────────────────────

/**
 * Returns optimal default dimensions for a given card type.
 * These sizes are chosen to balance visual clarity with canvas space efficiency.
 */
export function getDefaultCardDimensions(cardType: CardType): CardDimensions {
  const dimensionMap: Record<CardType, CardDimensions> = {
    // ── Media cards ──
    text:       { width: 420, height: 320 },
    image:      { width: 400, height: 300 },
    audio:      { width: 420, height: 180 },
    video:      { width: 480, height: 270 },
    animation:  { width: 480, height: 270 },
    dataset:    { width: 480, height: 200 },
    embed:      { width: 520, height: 320 },
    flashcards: { width: 520, height: 340 },
    "code-snippet": { width: 560, height: 300 },
    "model-3d": { width: 520, height: 280 },
    map:        { width: CANVAS_COMPOSITION_CONTENT_WIDTH_PX, height: 380 },
    chart:      { width: 480, height: 320 },
    diagram:    { width: 480, height: 320 },
    media:      { width: 460, height: 240 },
    document:   { width: 420, height: 560 },
    table:      { width: 520, height: 360 },
    "source-excerpt": { width: 440, height: 300 },
    citation:    { width: 380, height: 220 },
    bibliography: { width: 460, height: 320 },
    "gis-layer": { width: 420, height: 260 },

    // ── Interactive cards ──
    "rich-sim":   { width: 520, height: 320 },
    "village-3d": { width: 560, height: 360 },
    interactive:  { width: 480, height: 280 },
    form:         { width: 500, height: 320 },
    "voice-recorder": { width: 420, height: 220 },
    sorter:       { width: 520, height: 320 },
    games:        { width: 560, height: 360 },
    chat:         { width: 642, height: 640 },
    "text-editor": { width: 520, height: 360 },
    "code-editor": { width: 560, height: 380 },
    whiteboard:   { width: 640, height: 420 },
    slides:       { width: 720, height: 430 },
    timeline:     { width: CANVAS_COMPOSITION_CONTENT_WIDTH_PX, height: 180 },
    legend:       { width: 240, height: 320 },

    // ── Layout cards ──
    "layout-split":     STANDARD_COMPOSITION_DIMENSIONS,
    "layout-stack":     STANDARD_COMPOSITION_DIMENSIONS,
    "layout-feature":   STANDARD_COMPOSITION_DIMENSIONS,
    "layout-sidebar":   STANDARD_COMPOSITION_DIMENSIONS,
    "layout-quad":      STANDARD_COMPOSITION_DIMENSIONS,
    "layout-mosaic":    TALL_COMPOSITION_DIMENSIONS,
    "layout-triptych":  STANDARD_COMPOSITION_DIMENSIONS,
    "layout-trirow":    STANDARD_COMPOSITION_DIMENSIONS,
    "layout-banner":    STANDARD_COMPOSITION_DIMENSIONS,
    "layout-broadside": STANDARD_COMPOSITION_DIMENSIONS,
    "layout-tower":     STANDARD_COMPOSITION_DIMENSIONS,
    "layout-pinboard":  STANDARD_COMPOSITION_DIMENSIONS,
    "layout-annotated": TALL_COMPOSITION_DIMENSIONS,
    "layout-sixgrid":   TALL_COMPOSITION_DIMENSIONS,
    "layout-comparison": STANDARD_COMPOSITION_DIMENSIONS,
    "layout-stepped": STANDARD_COMPOSITION_DIMENSIONS,
    "layout-hero": STANDARD_COMPOSITION_DIMENSIONS,
    "layout-dialogue": STANDARD_COMPOSITION_DIMENSIONS,
    "layout-gallery": TALL_COMPOSITION_DIMENSIONS,
    "layout-spotlight": TALL_COMPOSITION_DIMENSIONS,
    "layout-flipcard": STANDARD_COMPOSITION_DIMENSIONS,
    "layout-resizable-grid": STANDARD_COMPOSITION_DIMENSIONS,
  }

  const dimensions = dimensionMap[cardType]
  return dimensions ? { ...dimensions } : { width: 420, height: 220 }
}

// ─── Sample content ───────────────────────────────────────────────────────────

/**
 * Returns realistic sample content for each card type.
 * Ensures cards appear populated and ready-to-test when dropped.
 */
export function getSampleCardContent(
  cardType: CardType,
  title: string,
): Record<string, unknown> {
  switch (cardType) {
    case "text":
      return {
        title,
        text: "The water cycle, also known as the hydrological cycle, describes the continuous movement of water through Earth's systems — from surface bodies to the atmosphere and back again. It is driven primarily by solar energy and the force of gravity, and it plays a fundamental role in distributing heat and freshwater across the planet.\n\nEvaporation is the process by which liquid water at the surface of oceans, lakes, rivers, and soil is converted into water vapour and enters the atmosphere. The sun's radiant energy provides the heat needed to break the molecular bonds holding liquid water together.",
        readingLevel: "B2",
        durationMinutes: 5,
      }

    case "image":
      return {
        title,
        url: "https://picsum.photos/seed/education/800/600",
        alt: "Educational diagram",
        caption: "Visual representation for teaching purposes",
        attribution: "Sample image",
      }

    case "audio":
      return {
        title,
        url: "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3",
        duration: "04:12",
        transcript: "[0:00] Audio clip with narration and explanation of key concepts.",
        transcriptSegments: [
          { id: "audio-default-1", start: 0, end: 12, text: "Audio clip with narration and explanation of key concepts." },
        ],
        playback: "1x",
      }

    case "video":
      return {
        title,
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        poster: "",
        captionsUrl: "",
        startAtSeconds: 0,
        duration: "10:53",
      }

    case "animation":
      return {
        title,
        format: "Lottie / JSON",
        duration: "8s",
        fps: 30,
        loop: true,
      }

    case "dataset":
      return {
        title,
        rows: 150,
        columns: 8,
        format: "CSV",
        url: "",
      }

    case "embed":
      return {
        title,
        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        provider: "iframe",
        caption: "Embedded external resource",
      }

    case "flashcards":
      return {
        title,
        gameType: "word-match",
        pairs: [
          { term: "Evaporation", match: "Liquid water turns to vapor" },
          { term: "Condensation", match: "Water vapor turns into droplets" },
          { term: "Precipitation", match: "Water falls to earth" },
        ],
        showHints: true,
      }

    case "code-snippet":
      return {
        title,
        language: "typescript",
        code: "export function area(width: number, height: number): number {\n  return width * height\n}\n",
        caption: "Read-only example",
      }

    case "model-3d":
      return {
        title,
        format: "GLB",
        url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
        polygons: 12500,
      }

    case "map":
      return {
        title,
        lat: 20.0,
        lng: 10.0,
        zoom: 2,
        layers: ["choropleth", "city labels"],
        attribution: "Natural Earth",
      }

    case "chart":
      return {
        title,
        chartType: "line",
        xLabel: "Time",
        yLabel: "Value",
        source: "Sample data",
        dataPoints: 24,
      }

    case "diagram":
      return {
        title,
        diagramType: "cycle",
        nodes: [
          { id: "a", label: "Question", x: 80, y: 80, shape: "rect" },
          { id: "b", label: "Evidence", x: 270, y: 30, shape: "rect" },
          { id: "c", label: "Pattern", x: 460, y: 80, shape: "rect" },
          { id: "d", label: "Conclusion", x: 270, y: 190, shape: "oval" },
        ],
        edges: [
          { from: "a", to: "b" },
          { from: "b", to: "c" },
          { from: "c", to: "d" },
          { from: "d", to: "a" },
        ],
        layout: "auto",
      }

    case "document":
      return {
        title,
        fileType: "PDF",
        pages: 12,
        url: "",
      }

    case "table":
      return {
        title,
        rows: 10,
        columns: 5,
        format: "HTML",
      }

    case "source-excerpt":
      return {
        title,
        excerpt: "Students should examine this passage as evidence, then connect it to the claim or question under discussion.",
        context: "Add source context, authorship, audience, purpose, and relevant uncertainty.",
        locator: "Page, paragraph, timestamp, map sheet, or archive reference",
        citationTitle: "Source title",
        sourceUrl: "",
      }

    case "citation":
      return {
        title,
        creator: "Author or institution",
        year: "2026",
        sourceUrl: "",
        sourceType: "web",
        license: "Review required",
        attribution: "",
      }

    case "bibliography":
      return {
        title,
        style: "short",
        entries: [
          { title: "Primary source record", creator: "Institution", year: "2026", url: "", license: "Review required" },
          { title: "Supporting source", creator: "Author", year: "2026", url: "", license: "Review required" },
        ],
        notes: "Add the strongest classroom-ready sources first.",
      }

    case "gis-layer":
      return {
        title,
        layerType: "boundary",
        geometryType: "GeoJSON",
        featureCount: 1,
        dateRange: "Review required",
        geometryPrecision: "Unknown",
        sourceUrl: "",
        warnings: ["Geometry requires source review before classroom use."],
      }

    case "rich-sim":
      return {
        title,
        simType: "physics",
        controls: ["play", "pause", "reset"],
        interactive: true,
      }

    case "village-3d":
      return {
        title,
        sceneType: "exploration",
        interactiveElements: 8,
        cameraMode: "first-person",
      }

    case "interactive":
      return {
        title,
        activityType: "quiz",
        questions: 5,
        timeLimit: 300,
        difficulty: "intermediate",
      }

    case "form":
      return {
        title,
        prompt: "Reflect on the lesson and submit your response.",
        fields: [
          { label: "Name", type: "text", required: true },
          { label: "Reflection", type: "textarea", required: true },
        ],
      }

    case "voice-recorder":
      return {
        title,
        prompt: "Record a 60-second spoken summary.",
        maxDurationSeconds: 60,
        transcript: "",
      }

    case "sorter":
      return {
        title,
        mode: "match",
        pairs: [
          { term: "Photosynthesis", match: "Plants make glucose" },
          { term: "Respiration", match: "Cells release energy" },
        ],
      }

    case "games":
      return {
        title,
        gameType: "word-match",
        instructions: "Match the terms with their definitions",
        pairs: [
          { term: "Photosynthesis", match: "Process by which plants make food" },
          { term: "Mitosis", match: "Cell division process" },
          { term: "Evolution", match: "Change in species over time" },
        ],
        timeLimit: 180,
        showHints: true,
      }

    case "chat":
      return {
        title,
        chatMode: "qa",
        model: "gemma3:4b",
        topic: "Educational topic",
        aiPersona: "AI Tutor",
        openingMessage: "Hello! I'm here to help you learn. What would you like to explore?",
        learningObjectives: "Understand key concepts through conversation",
        conversationStarters: [
          "What is the water cycle?",
          "How does photosynthesis work?",
          "Explain cell division",
        ],
        maxTurns: 20,
        difficulty: "intermediate",
      }

    case "text-editor":
      return {
        title,
        document: "<h2>Draft workspace</h2><p>Use this area for guided writing, annotation, or collaborative note-taking.</p><ul><li>Introduce the core concept.</li><li>Add evidence or examples.</li><li>Close with a short reflection.</li></ul>",
        placeholder: "Start writing...",
        mode: "document",
      }

    case "code-editor":
      return {
        title,
        language: "javascript",
        code: "function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('Neptino'))\n",
        prompt: "Edit the snippet, run it externally, or use it as a live coding reference.",
      }

    case "whiteboard":
      return {
        title,
        boardKey: "",
        prompt: "Sketch a concept map, diagram a process, or collect quick visual notes.",
      }

    case "slides":
      return {
        title,
        slides: [
          { title: "Opening", body: "Introduce the topic and orient the audience.", notes: "Set context before showing evidence." },
          { title: "Evidence", body: "Place a source, map, chart, image, or example here.", notes: "Ask students what they notice." },
          { title: "Synthesis", body: "Summarise the key claim or next action.", notes: "Close with a short check for understanding." },
        ],
      }

    case "timeline":
      return {
        title,
        orientation: "vertical",
        events: [
          { date: "Step 1", label: "Start", description: "Beginning of the sequence." },
          { date: "Step 2", label: "Process", description: "The main action takes place." },
          { date: "Step 3", label: "Outcome", description: "The result or conclusion." },
        ],
      }

    case "legend":
      return {
        title,
        layout: "list",
        items: [
          { color: "#3b82f6", label: "Category A", description: "First category" },
          { color: "#8b5cf6", label: "Category B", description: "Second category" },
          { color: "#14b8a6", label: "Category C", description: "Third category" },
        ],
      }

    case "layout-split":
    case "layout-stack":
    case "layout-feature":
    case "layout-sidebar":
    case "layout-quad":
    case "layout-mosaic":
    case "layout-triptych":
    case "layout-trirow":
    case "layout-banner":
    case "layout-broadside":
    case "layout-tower":
    case "layout-pinboard":
    case "layout-annotated":
    case "layout-sixgrid":
    case "layout-comparison":
    case "layout-stepped":
    case "layout-hero":
    case "layout-dialogue":
    case "layout-gallery":
    case "layout-spotlight":
    case "layout-flipcard":
    case "layout-resizable-grid":
      return { title, slots: {} }

    default:
      return { title }
  }
}
