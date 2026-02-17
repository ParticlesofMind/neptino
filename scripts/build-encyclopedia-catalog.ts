#!/usr/bin/env tsx
/**
 * build-encyclopedia-catalog.ts  —  TEST MODE
 *
 * Seeds exactly 3 curated entities per knowledge type (27 total) into the
 * Supabase `encyclopedia_items` table. Resolves Wikidata QIDs dynamically
 * from Wikipedia article titles (no hardcoded QIDs that can be wrong).
 *
 * Knowledge types: Person, Event, Location, Concept / Theory,
 *   Invention / Technology, Work, Institution, Movement / School,
 *   Era / Period — 3 each.
 *
 * When the product is close to release, swap back to the bulk Wikidata
 * scraper (build-encyclopedia-catalog.ts.bak).
 *
 * Usage:
 *   npx tsx scripts/build-encyclopedia-catalog.ts
 *   npm run build:encyclopedia
 *
 * Required env vars:
 *   SUPABASE_URL          – your Supabase project URL
 *   SUPABASE_SERVICE_KEY  – service-role key (bypasses RLS)
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolve(__dirname, "../public/data/encyclopedia/manifest.json");

/* ------------------------------------------------------------------ */
/*  Supabase client                                                    */
/* ------------------------------------------------------------------ */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY.\n" +
    "Set them before running: export SUPABASE_URL=... SUPABASE_SERVICE_KEY=..."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const CORE_DOMAINS = [
  "Mathematics & Logic",
  "Natural Sciences",
  "Medical & Health Sciences",
  "Engineering & Technology",
  "Philosophy & Thought",
  "Social Sciences",
  "Arts & Creative Expression",
  "Language & Communication",
  "Governance & Institutions",
  "Spiritual & Religious Thought",
  "Exploration & Discovery",
  "Agriculture & Ecology",
] as const;

type CoreDomain = (typeof CORE_DOMAINS)[number];

interface EncyclopediaRow {
  id: string;
  wikidata_id: string;
  title: string;
  knowledge_type: string;
  domain: CoreDomain;
  secondary_domains: CoreDomain[];
  era_group: "ancient" | "early-modern" | "modern" | "contemporary";
  era_label: string;
  depth: "foundation" | "intermediate" | "advanced";
  summary: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Knowledge types (mirrors the UI entity-type dropdown)               */
/* ------------------------------------------------------------------ */

const KNOWLEDGE_TYPES = [
  "Person",
  "Event",
  "Location",
  "Concept / Theory",
  "Invention / Technology",
  "Work",
  "Institution",
  "Movement / School",
  "Era / Period",
] as const;

type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

/* ------------------------------------------------------------------ */
/*  Curated test entities  — 3 per knowledge type, 27 total            */
/*                                                                     */
/*  Source of truth: Wikipedia article title (human-verifiable).        */
/*  Wikidata QIDs are resolved dynamically at runtime.                 */
/*  Entities are chosen for:                                           */
/*    - Coverage of ALL 9 knowledge types                              */
/*    - Cross-domain connections (secondary_domains link them)         */
/*    - Era diversity (ancient → contemporary)                         */
/*    - Geographic diversity (not just Western)                        */
/*    - Educational value for an interactive learning platform         */
/* ------------------------------------------------------------------ */

interface SeedConnection {
  /** Display title of the target entity (must match another SeedEntry.displayTitle) */
  entity: string;
  /** Describes the relationship FROM this entity TO the target */
  relationship: string;
}

interface SeedEntry {
  /** Exact Wikipedia article title — the source of truth */
  wikipediaTitle: string;
  /** Display name in the encyclopedia (may differ from WP title) */
  displayTitle: string;
  knowledgeType: KnowledgeType;
  domain: CoreDomain;
  secondaryDomains: CoreDomain[];
  eraGroup: EncyclopediaRow["era_group"];
  eraLabel: string;
  depth: EncyclopediaRow["depth"];
  tags: string[];
  /** Explicit entity-to-entity connections (referencing other seed entries) */
  connections: SeedConnection[];
  /**
   * Type-specific metadata — varies by knowledgeType:
   *   Person:                birthYear, deathYear, nationality, occupation, knownFor
   *   Event:                 startYear, endYear, location, outcome
   *   Location:              coordinates {lat,lng}, country, founded, status
   *   Concept / Theory:      originYear, originatedBy, field
   *   Invention / Technology: inventionYear, inventor, field
   *   Work:                  publicationYear, author, genre
   *   Institution:           foundedYear, headquarters, type
   *   Movement / School:     startYear, endYear, region, founders
   *   Era / Period:          startYear, endYear, region, definingFeatures
   */
  typeMetadata: Record<string, unknown>;
}

const SEED_ENTITIES: SeedEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  //  PERSON  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "Marie Curie",
    displayTitle: "Marie Curie",
    knowledgeType: "Person",
    domain: "Natural Sciences",
    secondaryDomains: ["Medical & Health Sciences"],
    eraGroup: "modern",
    eraLabel: "19th–20th century",
    depth: "foundation",
    tags: ["physicist", "chemist", "radioactivity", "nobel prize"],
    connections: [
      { entity: "Theory of Relativity", relationship: "contemporary of Einstein's work on" },
      { entity: "Royal Society", relationship: "elected foreign member of" },
      { entity: "Industrial Revolution", relationship: "scientific culture of late era produced" },
    ],
    typeMetadata: {
      birthYear: 1867,
      deathYear: 1934,
      nationality: "Polish-French",
      occupation: "Physicist, chemist",
      knownFor: "Pioneered research on radioactivity; first woman to win a Nobel Prize; only person to win Nobel Prizes in two different sciences",
    },
  },
  {
    wikipediaTitle: "Leonardo da Vinci",
    displayTitle: "Leonardo da Vinci",
    knowledgeType: "Person",
    domain: "Arts & Creative Expression",
    secondaryDomains: ["Engineering & Technology", "Natural Sciences"],
    eraGroup: "early-modern",
    eraLabel: "1452–1519",
    depth: "foundation",
    tags: ["painter", "inventor", "polymath", "renaissance"],
    connections: [
      { entity: "The Renaissance", relationship: "quintessential figure of" },
      { entity: "Printing Press", relationship: "contemporary beneficiary of" },
      { entity: "Machu Picchu", relationship: "exact contemporary of Incan builders of" },
    ],
    typeMetadata: {
      birthYear: 1452,
      deathYear: 1519,
      nationality: "Italian (Florentine Republic)",
      occupation: "Painter, inventor, polymath",
      knownFor: "Mona Lisa, The Last Supper, Vitruvian Man, flying machine designs, anatomical studies",
    },
  },
  {
    wikipediaTitle: "Confucius",
    displayTitle: "Confucius",
    knowledgeType: "Person",
    domain: "Philosophy & Thought",
    secondaryDomains: ["Governance & Institutions", "Spiritual & Religious Thought"],
    eraGroup: "ancient",
    eraLabel: "551–479 BCE",
    depth: "foundation",
    tags: ["philosopher", "ethics", "confucianism"],
    connections: [
      { entity: "Classical Antiquity", relationship: "lived during, in parallel to Greek" },
      { entity: "Stoicism", relationship: "parallel ethical tradition to" },
      { entity: "Democracy", relationship: "explored governance theory alongside Greek" },
    ],
    typeMetadata: {
      birthYear: -551,
      deathYear: -479,
      nationality: "Chinese (State of Lu)",
      occupation: "Philosopher, teacher, political advisor",
      knownFor: "The Analects, Confucianism, Five Classics, emphasis on ethics, filial piety, and proper social relationships",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  EVENT  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "French Revolution",
    displayTitle: "French Revolution",
    knowledgeType: "Event",
    domain: "Governance & Institutions",
    secondaryDomains: ["Social Sciences", "Philosophy & Thought"],
    eraGroup: "modern",
    eraLabel: "1789–1799",
    depth: "foundation",
    tags: ["revolution", "democracy", "rights of man"],
    connections: [
      { entity: "The Enlightenment", relationship: "directly inspired by ideals of" },
      { entity: "Democracy", relationship: "advanced the cause of" },
      { entity: "United Nations", relationship: "human rights legacy influenced" },
    ],
    typeMetadata: {
      startYear: 1789,
      endYear: 1799,
      location: "France",
      outcome: "End of absolute monarchy, Declaration of the Rights of Man, rise of the republic",
    },
  },
  {
    wikipediaTitle: "Apollo 11",
    displayTitle: "Apollo 11 Moon Landing",
    knowledgeType: "Event",
    domain: "Exploration & Discovery",
    secondaryDomains: ["Engineering & Technology"],
    eraGroup: "contemporary",
    eraLabel: "July 20, 1969",
    depth: "foundation",
    tags: ["space", "moon landing", "NASA"],
    connections: [
      { entity: "Telescope", relationship: "centuries of observation culminated in" },
      { entity: "CERN", relationship: "shared era of 'big science' with" },
      { entity: "Industrial Revolution", relationship: "engineering heritage traces back to" },
    ],
    typeMetadata: {
      startYear: 1969,
      endYear: 1969,
      location: "Kennedy Space Center, Florida → Sea of Tranquility, Moon",
      outcome: "First humans to walk on the Moon (Neil Armstrong, Buzz Aldrin); 21.5 hours on lunar surface",
    },
  },
  {
    wikipediaTitle: "Black Death",
    displayTitle: "Black Death",
    knowledgeType: "Event",
    domain: "Medical & Health Sciences",
    secondaryDomains: ["Social Sciences", "Agriculture & Ecology"],
    eraGroup: "early-modern",
    eraLabel: "1347–1351",
    depth: "foundation",
    tags: ["pandemic", "plague", "medieval"],
    connections: [
      { entity: "University of Bologna", relationship: "devastated medieval institutions like" },
      { entity: "The Renaissance", relationship: "social upheaval contributed to rise of" },
      { entity: "Printing Press", relationship: "labor shortages accelerated innovations like" },
    ],
    typeMetadata: {
      startYear: 1347,
      endYear: 1351,
      location: "Europe, Asia, North Africa",
      outcome: "Killed 30–60% of Europe's population; transformed labor markets, social structures, and medical thinking",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  LOCATION  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "Library of Alexandria",
    displayTitle: "Library of Alexandria",
    knowledgeType: "Location",
    domain: "Language & Communication",
    secondaryDomains: ["Philosophy & Thought", "Natural Sciences"],
    eraGroup: "ancient",
    eraLabel: "c. 283 BCE – c. 48 BCE",
    depth: "foundation",
    tags: ["library", "ancient egypt", "knowledge"],
    connections: [
      { entity: "Classical Antiquity", relationship: "premier institution of" },
      { entity: "Stoicism", relationship: "housed and preserved texts of" },
      { entity: "World Wide Web", relationship: "ancient predecessor vision of" },
    ],
    typeMetadata: {
      coordinates: { lat: 31.2, lng: 29.9 },
      country: "Egypt (Ptolemaic Kingdom)",
      founded: "c. 283 BCE",
      status: "Destroyed (exact date debated: 48 BCE – 642 CE)",
    },
  },
  {
    wikipediaTitle: "CERN",
    displayTitle: "CERN",
    knowledgeType: "Location",
    domain: "Natural Sciences",
    secondaryDomains: ["Engineering & Technology", "Mathematics & Logic"],
    eraGroup: "contemporary",
    eraLabel: "1954–present",
    depth: "intermediate",
    tags: ["particle physics", "large hadron collider", "research"],
    connections: [
      { entity: "World Wide Web", relationship: "birthplace of" },
      { entity: "Theory of Relativity", relationship: "experiments test predictions of" },
      { entity: "Royal Society", relationship: "modern peer institution to" },
    ],
    typeMetadata: {
      coordinates: { lat: 46.2333, lng: 6.05 },
      country: "Switzerland / France border (Meyrin, Geneva)",
      founded: "1954",
      status: "Active — 23 member states, ~17,000 personnel",
    },
  },
  {
    wikipediaTitle: "Machu Picchu",
    displayTitle: "Machu Picchu",
    knowledgeType: "Location",
    domain: "Exploration & Discovery",
    secondaryDomains: ["Engineering & Technology", "Spiritual & Religious Thought"],
    eraGroup: "early-modern",
    eraLabel: "c. 1450 CE",
    depth: "foundation",
    tags: ["inca", "archaeology", "peru"],
    connections: [
      { entity: "Leonardo da Vinci", relationship: "built during lifetime of" },
      { entity: "The Renaissance", relationship: "Incan engineering contemporary with" },
      { entity: "University of Bologna", relationship: "contemporary center of learning" },
    ],
    typeMetadata: {
      coordinates: { lat: -13.1631, lng: -72.545 },
      country: "Peru (Inca Empire)",
      founded: "c. 1450 CE by Emperor Pachacuti",
      status: "UNESCO World Heritage Site (1983); rediscovered 1911 by Hiram Bingham",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  CONCEPT / THEORY  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "Theory of relativity",
    displayTitle: "Theory of Relativity",
    knowledgeType: "Concept / Theory",
    domain: "Natural Sciences",
    secondaryDomains: ["Mathematics & Logic"],
    eraGroup: "contemporary",
    eraLabel: "1905–1915",
    depth: "intermediate",
    tags: ["physics", "einstein", "spacetime"],
    connections: [
      { entity: "Principia Mathematica (Newton)", relationship: "extended and superseded mechanics from" },
      { entity: "CERN", relationship: "tested and validated at" },
      { entity: "Scientific Revolution", relationship: "built on foundations of" },
    ],
    typeMetadata: {
      originYear: 1905,
      originatedBy: "Albert Einstein",
      field: "Physics",
    },
  },
  {
    wikipediaTitle: "Democracy",
    displayTitle: "Democracy",
    knowledgeType: "Concept / Theory",
    domain: "Governance & Institutions",
    secondaryDomains: ["Philosophy & Thought", "Social Sciences"],
    eraGroup: "ancient",
    eraLabel: "5th century BCE (Athens)",
    depth: "foundation",
    tags: ["government", "voting", "civic participation"],
    connections: [
      { entity: "The Republic (Plato)", relationship: "critically examined in" },
      { entity: "French Revolution", relationship: "central ideal of" },
      { entity: "The Enlightenment", relationship: "championed by thinkers of" },
      { entity: "United Nations", relationship: "promoted worldwide by" },
    ],
    typeMetadata: {
      originYear: -508,
      originatedBy: "Cleisthenes of Athens (Athenian reforms)",
      field: "Political philosophy / Governance",
    },
  },
  {
    wikipediaTitle: "Natural selection",
    displayTitle: "Natural Selection",
    knowledgeType: "Concept / Theory",
    domain: "Natural Sciences",
    secondaryDomains: ["Agriculture & Ecology", "Philosophy & Thought"],
    eraGroup: "modern",
    eraLabel: "1859",
    depth: "foundation",
    tags: ["evolution", "darwin", "biology"],
    connections: [
      { entity: "On the Origin of Species", relationship: "first published in" },
      { entity: "Royal Society", relationship: "debated and disseminated at" },
      { entity: "Industrial Revolution", relationship: "observed alongside ecological changes of" },
    ],
    typeMetadata: {
      originYear: 1859,
      originatedBy: "Charles Darwin (also Alfred Russel Wallace)",
      field: "Biology / Evolutionary theory",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  INVENTION / TECHNOLOGY  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "Printing press",
    displayTitle: "Printing Press",
    knowledgeType: "Invention / Technology",
    domain: "Engineering & Technology",
    secondaryDomains: ["Language & Communication", "Arts & Creative Expression"],
    eraGroup: "early-modern",
    eraLabel: "c. 1440",
    depth: "foundation",
    tags: ["gutenberg", "movable type", "mass communication"],
    connections: [
      { entity: "The Renaissance", relationship: "accelerated the spread of" },
      { entity: "Scientific Revolution", relationship: "enabled knowledge sharing during" },
      { entity: "The Enlightenment", relationship: "made possible the pamphlets of" },
      { entity: "University of Bologna", relationship: "transformed scholarly life at" },
    ],
    typeMetadata: {
      inventionYear: 1440,
      inventor: "Johannes Gutenberg",
      field: "Information technology / Mass communication",
    },
  },
  {
    wikipediaTitle: "World Wide Web",
    displayTitle: "World Wide Web",
    knowledgeType: "Invention / Technology",
    domain: "Engineering & Technology",
    secondaryDomains: ["Language & Communication", "Social Sciences"],
    eraGroup: "contemporary",
    eraLabel: "1989–present",
    depth: "foundation",
    tags: ["internet", "berners-lee", "hypertext"],
    connections: [
      { entity: "CERN", relationship: "invented at" },
      { entity: "Printing Press", relationship: "digital successor to" },
      { entity: "Library of Alexandria", relationship: "modern realization of" },
      { entity: "United Nations", relationship: "used for global communication by" },
    ],
    typeMetadata: {
      inventionYear: 1989,
      inventor: "Tim Berners-Lee",
      field: "Information technology / Global communication",
    },
  },
  {
    wikipediaTitle: "Telescope",
    displayTitle: "Telescope",
    knowledgeType: "Invention / Technology",
    domain: "Engineering & Technology",
    secondaryDomains: ["Natural Sciences", "Exploration & Discovery"],
    eraGroup: "early-modern",
    eraLabel: "1608",
    depth: "foundation",
    tags: ["optics", "astronomy", "galileo"],
    connections: [
      { entity: "Scientific Revolution", relationship: "key instrument of" },
      { entity: "Principia Mathematica (Newton)", relationship: "observations validated theories in" },
      { entity: "Apollo 11 Moon Landing", relationship: "centuries of observation preceded" },
    ],
    typeMetadata: {
      inventionYear: 1608,
      inventor: "Hans Lippershey (credited); Galileo first astronomical use (1609)",
      field: "Optics / Astronomy",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  WORK  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "Republic (Plato)",
    displayTitle: "The Republic (Plato)",
    knowledgeType: "Work",
    domain: "Philosophy & Thought",
    secondaryDomains: ["Governance & Institutions", "Social Sciences"],
    eraGroup: "ancient",
    eraLabel: "c. 375 BCE",
    depth: "intermediate",
    tags: ["dialogue", "justice", "ideal state"],
    connections: [
      { entity: "Democracy", relationship: "critically examines" },
      { entity: "Classical Antiquity", relationship: "foundational text of" },
      { entity: "Confucius", relationship: "parallel political philosophy to work of" },
      { entity: "Stoicism", relationship: "influenced later schools including" },
    ],
    typeMetadata: {
      publicationYear: -375,
      author: "Plato",
      genre: "Philosophical dialogue (Socratic)",
    },
  },
  {
    wikipediaTitle: "On the Origin of Species",
    displayTitle: "On the Origin of Species",
    knowledgeType: "Work",
    domain: "Natural Sciences",
    secondaryDomains: ["Philosophy & Thought", "Agriculture & Ecology"],
    eraGroup: "modern",
    eraLabel: "1859",
    depth: "foundation",
    tags: ["darwin", "evolution", "biology"],
    connections: [
      { entity: "Natural Selection", relationship: "introduces the theory of" },
      { entity: "Royal Society", relationship: "reviewed and debated by fellows of" },
      { entity: "Industrial Revolution", relationship: "published at height of" },
    ],
    typeMetadata: {
      publicationYear: 1859,
      author: "Charles Darwin",
      genre: "Scientific treatise (natural history)",
    },
  },
  {
    wikipediaTitle: "Philosophiæ Naturalis Principia Mathematica",
    displayTitle: "Principia Mathematica (Newton)",
    knowledgeType: "Work",
    domain: "Natural Sciences",
    secondaryDomains: ["Mathematics & Logic"],
    eraGroup: "early-modern",
    eraLabel: "1687",
    depth: "intermediate",
    tags: ["newton", "mechanics", "gravitation"],
    connections: [
      { entity: "Scientific Revolution", relationship: "culminating work of" },
      { entity: "Royal Society", relationship: "published with support of" },
      { entity: "Theory of Relativity", relationship: "later extended by" },
      { entity: "Telescope", relationship: "validated by observations using" },
    ],
    typeMetadata: {
      publicationYear: 1687,
      author: "Isaac Newton",
      genre: "Scientific treatise (mathematical physics)",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  INSTITUTION  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "Royal Society",
    displayTitle: "Royal Society",
    knowledgeType: "Institution",
    domain: "Natural Sciences",
    secondaryDomains: ["Engineering & Technology"],
    eraGroup: "early-modern",
    eraLabel: "1660–present",
    depth: "foundation",
    tags: ["scientific academy", "london", "peer review"],
    connections: [
      { entity: "Scientific Revolution", relationship: "founded during" },
      { entity: "Principia Mathematica (Newton)", relationship: "supported publication of" },
      { entity: "On the Origin of Species", relationship: "Darwin was fellow; debated" },
      { entity: "Marie Curie", relationship: "honored" },
    ],
    typeMetadata: {
      foundedYear: 1660,
      headquarters: "London, England",
      type: "Learned society / Scientific academy",
    },
  },
  {
    wikipediaTitle: "University of Bologna",
    displayTitle: "University of Bologna",
    knowledgeType: "Institution",
    domain: "Social Sciences",
    secondaryDomains: ["Philosophy & Thought", "Governance & Institutions"],
    eraGroup: "early-modern",
    eraLabel: "1088–present",
    depth: "foundation",
    tags: ["university", "oldest university", "medieval"],
    connections: [
      { entity: "The Renaissance", relationship: "center of learning during" },
      { entity: "Classical Antiquity", relationship: "preserved and studied texts from" },
      { entity: "Black Death", relationship: "survived and was transformed by" },
      { entity: "Printing Press", relationship: "scholarly life transformed by" },
    ],
    typeMetadata: {
      foundedYear: 1088,
      headquarters: "Bologna, Italy",
      type: "University — oldest in continuous operation worldwide",
    },
  },
  {
    wikipediaTitle: "United Nations",
    displayTitle: "United Nations",
    knowledgeType: "Institution",
    domain: "Governance & Institutions",
    secondaryDomains: ["Social Sciences"],
    eraGroup: "contemporary",
    eraLabel: "1945–present",
    depth: "foundation",
    tags: ["international organization", "peace", "human rights"],
    connections: [
      { entity: "Democracy", relationship: "promotes worldwide" },
      { entity: "French Revolution", relationship: "built on human rights legacy of" },
      { entity: "World Wide Web", relationship: "leverages for global diplomacy" },
    ],
    typeMetadata: {
      foundedYear: 1945,
      headquarters: "New York City, USA",
      type: "Intergovernmental organization — 193 member states",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  MOVEMENT / SCHOOL  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "Renaissance",
    displayTitle: "The Renaissance",
    knowledgeType: "Movement / School",
    domain: "Arts & Creative Expression",
    secondaryDomains: ["Natural Sciences", "Philosophy & Thought"],
    eraGroup: "early-modern",
    eraLabel: "14th–17th century",
    depth: "foundation",
    tags: ["cultural rebirth", "humanism", "classical revival"],
    connections: [
      { entity: "Leonardo da Vinci", relationship: "epitomized by" },
      { entity: "Classical Antiquity", relationship: "revival of ideals from" },
      { entity: "Printing Press", relationship: "spread by" },
      { entity: "University of Bologna", relationship: "nurtured at" },
    ],
    typeMetadata: {
      startYear: 1300,
      endYear: 1600,
      region: "Europe (originating in Italy)",
      founders: "Petrarch often credited as father of Renaissance humanism",
    },
  },
  {
    wikipediaTitle: "Age of Enlightenment",
    displayTitle: "The Enlightenment",
    knowledgeType: "Movement / School",
    domain: "Philosophy & Thought",
    secondaryDomains: ["Natural Sciences", "Governance & Institutions"],
    eraGroup: "early-modern",
    eraLabel: "17th–18th century",
    depth: "foundation",
    tags: ["reason", "science", "liberty"],
    connections: [
      { entity: "French Revolution", relationship: "directly inspired" },
      { entity: "Democracy", relationship: "championed" },
      { entity: "Scientific Revolution", relationship: "built on achievements of" },
      { entity: "Printing Press", relationship: "disseminated through works on" },
    ],
    typeMetadata: {
      startYear: 1685,
      endYear: 1815,
      region: "Europe (France, Britain, Germany, Scotland)",
      founders: "Locke, Voltaire, Kant, Rousseau, Hume",
    },
  },
  {
    wikipediaTitle: "Stoicism",
    displayTitle: "Stoicism",
    knowledgeType: "Movement / School",
    domain: "Philosophy & Thought",
    secondaryDomains: ["Spiritual & Religious Thought"],
    eraGroup: "ancient",
    eraLabel: "3rd century BCE – 2nd century CE",
    depth: "foundation",
    tags: ["virtue", "ethics", "ancient philosophy"],
    connections: [
      { entity: "Classical Antiquity", relationship: "major school within" },
      { entity: "Confucius", relationship: "parallel ethical tradition to" },
      { entity: "The Republic (Plato)", relationship: "engaged with ideas from" },
      { entity: "Library of Alexandria", relationship: "texts preserved at" },
    ],
    typeMetadata: {
      startYear: -300,
      endYear: 200,
      region: "Hellenistic world, Roman Empire",
      founders: "Zeno of Citium; later Seneca, Epictetus, Marcus Aurelius",
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  ERA / PERIOD  (3)
  // ═══════════════════════════════════════════════════════════════════
  {
    wikipediaTitle: "Classical antiquity",
    displayTitle: "Classical Antiquity",
    knowledgeType: "Era / Period",
    domain: "Philosophy & Thought",
    secondaryDomains: ["Natural Sciences", "Arts & Creative Expression"],
    eraGroup: "ancient",
    eraLabel: "8th century BCE – 5th century CE",
    depth: "foundation",
    tags: ["greece", "rome", "ancient civilization"],
    connections: [
      { entity: "Confucius", relationship: "contemporaneous thinker (China) during" },
      { entity: "The Republic (Plato)", relationship: "defining text of" },
      { entity: "Stoicism", relationship: "major school within" },
      { entity: "Democracy", relationship: "birthplace of" },
      { entity: "Library of Alexandria", relationship: "premier institution of" },
      { entity: "The Renaissance", relationship: "later rediscovered by" },
    ],
    typeMetadata: {
      startYear: -800,
      endYear: 500,
      region: "Mediterranean (Greece, Rome, Egypt)",
      definingFeatures: "Philosophy, democracy, theater, Roman law, engineering, art, rhetoric",
    },
  },
  {
    wikipediaTitle: "Scientific Revolution",
    displayTitle: "Scientific Revolution",
    knowledgeType: "Era / Period",
    domain: "Natural Sciences",
    secondaryDomains: ["Philosophy & Thought", "Mathematics & Logic"],
    eraGroup: "early-modern",
    eraLabel: "16th–17th century",
    depth: "foundation",
    tags: ["empiricism", "copernicus", "scientific method"],
    connections: [
      { entity: "Telescope", relationship: "key invention of" },
      { entity: "Principia Mathematica (Newton)", relationship: "culminated in" },
      { entity: "Royal Society", relationship: "institutionalized by" },
      { entity: "The Enlightenment", relationship: "intellectual foundation for" },
      { entity: "Theory of Relativity", relationship: "extended centuries later by" },
    ],
    typeMetadata: {
      startYear: 1543,
      endYear: 1687,
      region: "Europe (Italy, England, Germany, Netherlands)",
      definingFeatures: "Empiricism, scientific method, heliocentrism, mathematical physics, experimental verification",
    },
  },
  {
    wikipediaTitle: "Industrial Revolution",
    displayTitle: "Industrial Revolution",
    knowledgeType: "Era / Period",
    domain: "Engineering & Technology",
    secondaryDomains: ["Social Sciences", "Agriculture & Ecology"],
    eraGroup: "modern",
    eraLabel: "1760–1840",
    depth: "foundation",
    tags: ["mechanization", "factories", "urbanization"],
    connections: [
      { entity: "Printing Press", relationship: "built on innovations like" },
      { entity: "On the Origin of Species", relationship: "Darwin published during late phase of" },
      { entity: "Natural Selection", relationship: "ecological observations during" },
      { entity: "Apollo 11 Moon Landing", relationship: "engineering tradition led to" },
      { entity: "Marie Curie", relationship: "scientific culture produced researchers like" },
    ],
    typeMetadata: {
      startYear: 1760,
      endYear: 1840,
      region: "Britain, then Europe, North America, worldwide",
      definingFeatures: "Mechanization, steam power, factories, urbanization, railroad, mass production",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Media types                                                        */
/* ------------------------------------------------------------------ */

const MEDIA_TYPES = [
  "Text",
  "Audio",
  "Video",
  "Maps",
  "Timeline",
] as const;

type MediaType = (typeof MEDIA_TYPES)[number];

interface MediaSeedEntry {
  /** Slug suffix — combined with item slug for unique ID */
  slugSuffix: string;
  /** Display title of the target encyclopedia entity (must match a SeedEntry.displayTitle) */
  entityTitle: string;
  mediaType: MediaType;
  title: string;
  description: string;
  /** Placeholder URL — real URLs will be added when content is created */
  url: string;
  metadata?: Record<string, unknown>;
}

/**
 * 18 media resources: 3 per media type (6 types), spread across knowledge
 * types and domains. Every filter option should return results.
 *
 * Each media entry is authentic to the entity it belongs to:
 *   - Audio for a Person → actual voice recording (if one exists)
 *   - Video → real footage or archival film
 *   - Text → primary-source documents in the entity's own words
 *   - Maps → geographic / spatial representation
 *   - Timeline → chronological visualization of key events
 */
const SEED_MEDIA: MediaSeedEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  //  TEXT  (3)  — primary-source documents / excerpts
  // ═══════════════════════════════════════════════════════════════════
  {
    slugSuffix: "allegory-of-cave",
    entityTitle: "The Republic (Plato)",
    mediaType: "Text",
    title: "The Allegory of the Cave — Republic VII",
    description: "Plato's own words (Jowett translation): the prisoners, the shadows, the ascent into sunlight — the most famous passage in Western philosophy.",
    url: "https://example.com/text/allegory-of-cave",
    metadata: { wordCount: 3200, source: "Benjamin Jowett translation (1871)" },
  },
  {
    slugSuffix: "natural-selection-chapter",
    entityTitle: "On the Origin of Species",
    mediaType: "Text",
    title: "Chapter IV: Natural Selection — Full Text",
    description: "Darwin's own exposition of natural selection — the central mechanism of evolution — as published in the first edition of 1859.",
    url: "https://example.com/text/origin-ch4",
    metadata: { wordCount: 8500, source: "First edition (1859)" },
  },
  {
    slugSuffix: "analects-selections",
    entityTitle: "Confucius",
    mediaType: "Text",
    title: "The Analects — Selected Passages",
    description: "Key passages from Confucius's collected sayings on virtue, filial piety, governance, and education — in his own (translated) words.",
    url: "https://example.com/text/analects-selections",
    metadata: { wordCount: 4100, source: "James Legge translation (1861)" },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  AUDIO  (3)  — actual voice recordings / archival audio
  // ═══════════════════════════════════════════════════════════════════
  {
    slugSuffix: "curie-voice-recording",
    entityTitle: "Marie Curie",
    mediaType: "Audio",
    title: "Marie Curie — Spoken Wikipedia Article",
    description: "AI-narrated reading of the full Marie Curie Wikipedia article, covering her pioneering research on radioactivity, two Nobel Prizes, and lasting scientific legacy.",
    url: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Wikipedia_-_Marie_Curie.mp3",
    metadata: { duration: "37 min 39 s", source: "Wikimedia Commons / SoniTranslate (CC BY-SA 4.0)", recorded: 2024 },
  },
  {
    slugSuffix: "apollo-11-mission-audio",
    entityTitle: "Apollo 11 Moon Landing",
    mediaType: "Audio",
    title: "'The Eagle Has Landed' — NASA Mission Audio",
    description: "Original NASA mission audio capturing the moment the Eagle lunar module touched down on the Moon's surface — 'Houston, Tranquility Base here. The Eagle has landed.'",
    url: "https://upload.wikimedia.org/wikipedia/commons/8/87/Apollo_11_Eagle_Has_Landed.mp3",
    metadata: { duration: "5 s", source: "NASA (Public Domain)", recorded: 1969 },
  },
  {
    slugSuffix: "udhr-1948-reading",
    entityTitle: "United Nations",
    mediaType: "Audio",
    title: "Universal Declaration of Human Rights — Full Reading (English)",
    description: "Complete reading of all 30 articles of the Universal Declaration of Human Rights in English, recorded by Kara Shallenberg for LibriVox.",
    url: "https://upload.wikimedia.org/wikipedia/commons/transcoded/f/fc/Universal_Declaration_of_Human_Rights_-_eng_-_ks.ogg/Universal_Declaration_of_Human_Rights_-_eng_-_ks.ogg.mp3",
    metadata: { duration: "16 min 4 s", source: "LibriVox (Public Domain)", recorded: 2006 },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  VIDEO  (3)  — real footage / archival film
  // ═══════════════════════════════════════════════════════════════════
  {
    slugSuffix: "lhc-facility-footage",
    entityTitle: "CERN",
    mediaType: "Video",
    title: "Inside the Large Hadron Collider — Facility Footage",
    description: "Footage of CERN's 27 km particle accelerator ring, the ATLAS detector cavern, and the control room during a beam injection — filmed on-site by CERN's media team.",
    url: "https://example.com/video/cern-lhc-footage",
    metadata: { duration: "14 min", resolution: "4K", source: "CERN Document Server" },
  },
  {
    slugSuffix: "moon-landing-footage",
    entityTitle: "Apollo 11 Moon Landing",
    mediaType: "Video",
    title: "Apollo 11 — First Steps on the Moon (NASA Film)",
    description: "Restored NASA footage of Neil Armstrong descending the ladder of the Lunar Module Eagle and taking humanity's first steps on the lunar surface, July 20, 1969.",
    url: "https://example.com/video/apollo-11-first-steps",
    metadata: { duration: "8 min", resolution: "Restored 720p", source: "NASA Johnson Space Center" },
  },
  {
    slugSuffix: "berners-lee-www-demo",
    entityTitle: "World Wide Web",
    mediaType: "Video",
    title: "Tim Berners-Lee — First Public Web Demonstration",
    description: "Archival footage of Tim Berners-Lee demonstrating the WorldWideWeb browser on a NeXT computer at CERN. The first website, info.cern.ch, is shown navigating hypertext documents.",
    url: "https://example.com/video/berners-lee-www-demo",
    metadata: { duration: "6 min", resolution: "480p", source: "CERN Archives" },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  MAPS  (3)  — geographic / spatial representations
  // ═══════════════════════════════════════════════════════════════════
  {
    slugSuffix: "machu-picchu-site-map",
    entityTitle: "Machu Picchu",
    mediaType: "Maps",
    title: "Machu Picchu — Archaeological Site Map",
    description: "Detailed topographic map of the citadel showing the Temple of the Sun, Intihuatana stone, agricultural terraces, and the Inca Trail approach.",
    url: "https://example.com/maps/machu-picchu",
    metadata: { format: "Interactive SVG", layers: ["buildings", "terraces", "water", "trails"] },
  },
  {
    slugSuffix: "ancient-alexandria-plan",
    entityTitle: "Library of Alexandria",
    mediaType: "Maps",
    title: "Ancient Alexandria — City & Harbor Plan",
    description: "Reconstructed plan of Ptolemaic Alexandria showing the Great Library, Mouseion, Pharos lighthouse, royal quarter, and the Heptastadion causeway.",
    url: "https://example.com/maps/ancient-alexandria",
    metadata: { format: "Interactive SVG", era: "3rd century BCE" },
  },
  {
    slugSuffix: "black-death-spread",
    entityTitle: "Black Death",
    mediaType: "Maps",
    title: "The Spread of the Black Death, 1347–1351",
    description: "Animated map tracking the plague's advance from Central Asia through trade routes into Europe, with estimated mortality rates per region.",
    url: "https://example.com/maps/black-death-spread",
    metadata: { format: "Animated timeline map", dateRange: "1347–1351" },
  },

  // ═══════════════════════════════════════════════════════════════════
  //  TIMELINE  (3)  — chronological event visualizations
  // ═══════════════════════════════════════════════════════════════════
  {
    slugSuffix: "scientific-revolution-timeline",
    entityTitle: "Scientific Revolution",
    mediaType: "Timeline",
    title: "Milestones of the Scientific Revolution, 1543–1687",
    description: "From Copernicus's De Revolutionibus to Newton's Principia — key discoveries, publications, and instrument inventions that transformed natural philosophy into modern science.",
    url: "https://example.com/timeline/scientific-revolution",
    metadata: { events: 18, span: "1543–1687" },
  },
  {
    slugSuffix: "renaissance-timeline",
    entityTitle: "The Renaissance",
    mediaType: "Timeline",
    title: "The Renaissance — A Cultural Timeline",
    description: "Major artistic, literary, and scientific milestones from Petrarch (1304) through Galileo's telescope (1610): the rebirth of classical learning in Europe.",
    url: "https://example.com/timeline/renaissance",
    metadata: { events: 22, span: "1304–1610" },
  },
  {
    slugSuffix: "industrial-revolution-timeline",
    entityTitle: "Industrial Revolution",
    mediaType: "Timeline",
    title: "The Industrial Revolution — Key Innovations, 1760–1840",
    description: "From Watt's steam engine to the first railways — milestones in mechanization, factory systems, and urbanization that reshaped the modern world.",
    url: "https://example.com/timeline/industrial-revolution",
    metadata: { events: 16, span: "1760–1840" },
  },
];

/* ------------------------------------------------------------------ */
/*  Slug helper                                                        */
/* ------------------------------------------------------------------ */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  Resolve Wikipedia titles → Wikidata QIDs + extracts                */
/*  This is the RIGHT way: title is human-verifiable, QID is derived.  */
/* ------------------------------------------------------------------ */

interface ResolvedEntity {
  wikidataId: string;
  extract: string;
}

async function resolveFromWikipedia(
  titles: string[],
): Promise<Map<string, ResolvedEntity>> {
  const result = new Map<string, ResolvedEntity>();
  const BATCH = 20; // Wikipedia API limit for prop queries

  for (let i = 0; i < titles.length; i += BATCH) {
    const batch = titles.slice(i, i + BATCH);
    const titlesParam = batch.map((t) => encodeURIComponent(t)).join("|");

    try {
      // Single call: get both pageprops (wikidata QID) and extracts
      // &redirects=1 follows Wikipedia redirects (e.g. diacritics)
      const url =
        `https://en.wikipedia.org/w/api.php?action=query` +
        `&titles=${titlesParam}` +
        `&prop=pageprops|extracts&ppprop=wikibase_item` +
        `&exintro=1&explaintext=1&exsectionformat=plain` +
        `&redirects=1&format=json&formatversion=2`;

      const res = await fetch(url, {
        headers: { "User-Agent": "Neptino-Encyclopedia/1.0 (educational)" },
      });

      if (!res.ok) {
        console.warn(`  ⚠ Wikipedia API returned ${res.status}`);
        continue;
      }

      const json = (await res.json()) as {
        query: {
          redirects?: Array<{ from: string; to: string }>;
          pages: Array<{
            title: string;
            pageprops?: { wikibase_item?: string };
            extract?: string;
          }>;
        };
      };

      // Build redirect map: redirected title → original input title
      const redirectMap = new Map<string, string>();
      for (const r of json.query.redirects ?? []) {
        redirectMap.set(r.to.toLowerCase(), r.from);
      }

      for (const page of json.query.pages) {
        const qid = page.pageprops?.wikibase_item;
        if (!qid) {
          console.warn(`  ⚠ No Wikidata QID for "${page.title}"`);
          continue;
        }

        let extract = page.extract ?? "";
        if (extract.length > 800) {
          const truncated = extract.slice(0, 800);
          const lastPeriod = truncated.lastIndexOf(". ");
          extract = lastPeriod > 200 ? truncated.slice(0, lastPeriod + 1) : truncated + "…";
        }

        // Match back to our input title (Wikipedia may normalize or redirect)
        const redirectedFrom = redirectMap.get(page.title.toLowerCase());
        const matchedTitle =
          redirectedFrom ??
          batch.find((t) => t.toLowerCase() === page.title.toLowerCase()) ??
          page.title;

        result.set(matchedTitle, { wikidataId: qid, extract });
      }
    } catch (err) {
      console.warn(`  ⚠ Wikipedia batch failed:`, err);
    }

    // Polite pause
    if (i + BATCH < titles.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Neptino Encyclopedia — TEST MODE (27 entities + media) ║");
  console.log("║  3 per knowledge type × 9 types, 3 per media type × 5  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Target:  Supabase (${supabaseUrl})`);
  console.log(`  Mode:    3 curated entities per knowledge type × 9 types`);
  console.log(`           3 media resources per media type × 5 types`);
  console.log();

  // ── Phase 1: Clear existing data ────────────────────────────────

  console.log("[1/5] Clearing existing encyclopedia data…");

  // Clear media first (FK constraint)
  const { error: mediaDeleteError } = await supabase
    .from("encyclopedia_media")
    .delete()
    .neq("id", "__impossible__");

  if (mediaDeleteError) {
    console.error("  ⚠ Failed to clear media table:", mediaDeleteError.message);
  } else {
    console.log("  ✔ Media table cleared");
  }

  const { error: deleteError } = await supabase
    .from("encyclopedia_items")
    .delete()
    .neq("id", "__impossible__");

  if (deleteError) {
    console.error("  ✗ Failed to clear items table:", deleteError.message);
  } else {
    console.log("  ✔ Items table cleared");
  }

  // ── Phase 2: Resolve Wikipedia titles → QIDs + extracts ─────────

  console.log("[2/5] Resolving Wikipedia titles → Wikidata QIDs + extracts…");
  const allTitles = SEED_ENTITIES.map((e) => e.wikipediaTitle);
  const resolved = await resolveFromWikipedia(allTitles);
  console.log(`  ✔ Resolved ${resolved.size} / ${allTitles.length} entities`);

  // Verify all resolved correctly
  for (const entry of SEED_ENTITIES) {
    const r = resolved.get(entry.wikipediaTitle);
    if (!r) {
      console.warn(`  ⚠ MISSING: "${entry.wikipediaTitle}" — will use fallback`);
    } else {
      console.log(`    ✔ ${entry.displayTitle} → ${r.wikidataId}`);
    }
  }

  // ── Phase 3: Build rows & upsert ───────────────────────────────

  console.log("\n[3/5] Building entity rows & upserting…");

  // Build a slug lookup for connections
  const slugLookup = new Map<string, string>();
  for (const entry of SEED_ENTITIES) {
    slugLookup.set(entry.displayTitle, slugify(entry.displayTitle));
  }

  // Validate connections reference existing entities
  for (const entry of SEED_ENTITIES) {
    for (const conn of entry.connections) {
      if (!slugLookup.has(conn.entity)) {
        console.warn(`  ⚠ "${entry.displayTitle}" connection references unknown entity: "${conn.entity}"`);
      }
    }
  }

  const rows: EncyclopediaRow[] = SEED_ENTITIES.map((entry) => {
    const slug = slugify(entry.displayTitle);
    const r = resolved.get(entry.wikipediaTitle);

    const wikidataId = r?.wikidataId ?? "UNKNOWN";
    const summary =
      r?.extract && r.extract.length >= 50
        ? r.extract
        : `${entry.displayTitle} — ${entry.tags.join(", ")}.`;

    // Build connections with resolved slugs
    const resolvedConnections = entry.connections
      .filter((c) => slugLookup.has(c.entity))
      .map((c) => ({
        slug: slugLookup.get(c.entity)!,
        title: c.entity,
        relationship: c.relationship,
      }));

    return {
      id: slug,
      wikidata_id: wikidataId,
      title: entry.displayTitle,
      knowledge_type: entry.knowledgeType,
      domain: entry.domain,
      secondary_domains: entry.secondaryDomains,
      era_group: entry.eraGroup,
      era_label: entry.eraLabel,
      depth: entry.depth,
      summary,
      tags: entry.tags,
      metadata: {
        ...entry.typeMetadata,
        connections: resolvedConnections,
        wikipedia_title: entry.wikipediaTitle,
        test_mode: true,
      },
    };
  });

  const { error: upsertError } = await supabase
    .from("encyclopedia_items")
    .upsert(rows, { onConflict: "id" });

  if (upsertError) {
    console.error("  ✗ Upsert failed:", upsertError.message);
  } else {
    console.log(`  ✔ Seeded ${rows.length} entities`);
  }

  // ── Phase 4: Seed media resources ────────────────────────────────

  console.log("[4/5] Seeding media resources (3 per type × 5 types = 15)…");

  const mediaRows = SEED_MEDIA.map((m) => {
    const itemSlug = slugLookup.get(m.entityTitle);
    if (!itemSlug) {
      console.warn(`  ⚠ Media "${m.title}" references unknown entity: "${m.entityTitle}"`);
    }
    return {
      id: `${itemSlug ?? "unknown"}--${m.slugSuffix}`,
      item_id: itemSlug ?? "unknown",
      media_type: m.mediaType,
      title: m.title,
      description: m.description,
      url: m.url,
      metadata: m.metadata ?? {},
    };
  });

  const { error: mediaUpsertError } = await supabase
    .from("encyclopedia_media")
    .upsert(mediaRows, { onConflict: "id" });

  if (mediaUpsertError) {
    console.error("  ✗ Media upsert failed:", mediaUpsertError.message);
  } else {
    console.log(`  ✔ Seeded ${mediaRows.length} media resources`);
  }

  // ── Phase 5: Write static manifest ──────────────────────────────

  console.log("[5/5] Writing manifest…");

  const byDomain: Record<string, number> = {};
  const byEra: Record<string, number> = {};
  const byDepth: Record<string, number> = {};
  const byKnowledgeType: Record<string, number> = {};
  const allDomains = new Set<string>();
  const allEraGroups = new Set<string>();

  for (const row of rows) {
    byDomain[row.domain] = (byDomain[row.domain] ?? 0) + 1;
    byEra[row.era_group] = (byEra[row.era_group] ?? 0) + 1;
    byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;
    byKnowledgeType[row.knowledge_type] = (byKnowledgeType[row.knowledge_type] ?? 0) + 1;
    allDomains.add(row.domain);
    row.secondary_domains.forEach((d) => allDomains.add(d));
    allEraGroups.add(row.era_group);
  }

  // Count media types and track which items have media
  // Compendium = entity overview cards (every entity has one)
  const byMediaType: Record<string, number> = { Compendium: rows.length };
  const itemsWithMedia = new Set<string>();
  for (const m of mediaRows) {
    byMediaType[m.media_type] = (byMediaType[m.media_type] ?? 0) + 1;
    itemsWithMedia.add(m.item_id);
  }

  const manifest = {
    totalCount: rows.length,
    seededAt: new Date().toISOString(),
    testMode: true,
    knowledgeTypes: byKnowledgeType,
    domains: [...allDomains].sort(),
    domainCounts: byDomain,
    eraGroups: [...allEraGroups].sort(),
    eraCounts: byEra,
    depthCounts: byDepth,
    mediaTypes: byMediaType,
    totalMedia: mediaRows.length,
  };

  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  console.log(`  ✔ Manifest written to ${MANIFEST_PATH}`);

  // ── Summary ──────────────────────────────────────────────────────

  console.log();
  console.log("═══ Summary ═══════════════════════════════════════════");
  console.log(`  Mode:         TEST (3 per knowledge type × 9 types)`);
  console.log(`  Total seeded: ${rows.length} entities, ${mediaRows.length} media resources`);
  console.log(`  Knowledge types:`);
  for (const kt of KNOWLEDGE_TYPES) {
    const count = byKnowledgeType[kt] ?? 0;
    const names = rows.filter((r) => r.knowledge_type === kt).map((r) => r.title);
    console.log(`    ${kt}: ${count}  →  ${names.join(", ")}`);
  }
  console.log(`  Media types:`);
  for (const mt of MEDIA_TYPES) {
    const count = byMediaType[mt] ?? 0;
    const titles = mediaRows.filter((m) => m.media_type === mt).map((m) => m.title);
    console.log(`    ${mt}: ${count}  →  ${titles.join(", ")}`);
  }
  console.log(`  Domains:`);
  for (const domain of CORE_DOMAINS) {
    const count = byDomain[domain] ?? 0;
    if (count > 0) {
      const names = rows.filter((r) => r.domain === domain).map((r) => r.title);
      console.log(`    ${domain}: ${count}  →  ${names.join(", ")}`);
    }
  }
  console.log(`  Eras:   ${JSON.stringify(byEra)}`);
  console.log(`  Depths: ${JSON.stringify(byDepth)}`);

  // ── Connection graph validation ──
  console.log(`\n  Connection graph:`);
  let totalConns = 0;
  const connectedTo = new Map<string, Set<string>>();
  for (const row of rows) {
    const conns = (row.metadata as Record<string, unknown>).connections as Array<{slug: string; title: string}>;
    totalConns += conns.length;
    if (!connectedTo.has(row.id)) connectedTo.set(row.id, new Set());
    for (const c of conns) {
      connectedTo.get(row.id)!.add(c.slug);
      if (!connectedTo.has(c.slug)) connectedTo.set(c.slug, new Set());
      connectedTo.get(c.slug)!.add(row.id);
    }
  }
  const isolated = rows.filter((r) => !connectedTo.has(r.id) || connectedTo.get(r.id)!.size === 0);
  console.log(`    Total connections: ${totalConns}`);
  console.log(`    Entities with ≥1 connection: ${rows.filter((r) => connectedTo.get(r.id)?.size).length}/${rows.length}`);
  if (isolated.length > 0) {
    console.log(`    ⚠ ISOLATED entities: ${isolated.map((r) => r.title).join(", ")}`);
  } else {
    console.log(`    ✔ All entities are connected — no islands`);
  }

  console.log("════════════════════════════════════════════════════════");
  console.log();
  console.log(`Done! 27 test entities + ${mediaRows.length} media resources seeded.`);
  console.log("Swap to bulk mode later with: build-encyclopedia-catalog.ts.bak");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});