export type AtlasTaxonomyStatus = "active" | "provisional" | "deprecated"

export type AtlasTaxonomyTerm<TId extends string = string> = {
  id: TId
  label: string
  status: AtlasTaxonomyStatus
  aliases?: readonly string[]
}

export type AtlasEntityTaxonomyTerm<TId extends string = string> = AtlasTaxonomyTerm<TId> & {
  subtypes: readonly AtlasTaxonomyTerm[]
}

export const ATLAS_ENTITY_TYPES = [
  {
    id: "Concept",
    label: "Concept",
    status: "active",
    aliases: ["concept / theory", "idea"],
    subtypes: [
      { id: "Theory", label: "Theory", status: "active" },
      { id: "Theorem", label: "Theorem", status: "active" },
      { id: "Law", label: "Law", status: "active" },
      { id: "Principle", label: "Principle", status: "active" },
      { id: "Model", label: "Model", status: "active" },
      { id: "Definition", label: "Definition", status: "active" },
    ],
  },
  {
    id: "Process",
    label: "Process",
    status: "active",
    aliases: ["method", "procedure", "cycle"],
    subtypes: [
      { id: "Biological process", label: "Biological process", status: "provisional" },
      { id: "Chemical process", label: "Chemical process", status: "provisional" },
      { id: "Historical process", label: "Historical process", status: "provisional" },
      { id: "Technical process", label: "Technical process", status: "provisional" },
    ],
  },
  {
    id: "Instance",
    label: "Instance",
    status: "active",
    aliases: ["object", "case"],
    subtypes: [
      { id: "Object", label: "Object", status: "provisional" },
      { id: "Case", label: "Case", status: "provisional" },
      { id: "Artifact", label: "Artifact", status: "provisional" },
    ],
  },
  {
    id: "Person",
    label: "Person",
    status: "active",
    aliases: ["human", "biography"],
    subtypes: [
      { id: "Author", label: "Author", status: "provisional" },
      { id: "Artist", label: "Artist", status: "provisional" },
      { id: "Scientist", label: "Scientist", status: "provisional" },
      { id: "Political leader", label: "Political leader", status: "provisional" },
      { id: "Educator", label: "Educator", status: "provisional" },
    ],
  },
  {
    id: "State",
    label: "State",
    status: "active",
    aliases: ["condition"],
    subtypes: [
      { id: "Condition", label: "Condition", status: "provisional" },
      { id: "Physical state", label: "Physical state", status: "provisional" },
      { id: "Social state", label: "Social state", status: "provisional" },
    ],
  },
  {
    id: "Time",
    label: "Time",
    status: "active",
    aliases: ["event", "period", "era"],
    subtypes: [
      { id: "Event", label: "Event", status: "active" },
      { id: "Period", label: "Period", status: "active" },
      { id: "Epoch", label: "Epoch", status: "active" },
    ],
  },
  {
    id: "Environment",
    label: "Environment",
    status: "active",
    aliases: ["place", "location"],
    subtypes: [
      { id: "Place", label: "Place", status: "active" },
      { id: "City", label: "City", status: "provisional" },
      { id: "Region", label: "Region", status: "provisional" },
      { id: "Country", label: "Country", status: "provisional" },
      { id: "Organism", label: "Organism", status: "active" },
      { id: "Matter", label: "Matter", status: "active" },
    ],
  },
  {
    id: "Work",
    label: "Work",
    status: "active",
    aliases: ["creative work", "publication"],
    subtypes: [
      { id: "Book", label: "Book", status: "provisional" },
      { id: "Play", label: "Play", status: "provisional" },
      { id: "Poem", label: "Poem", status: "provisional" },
      { id: "Film", label: "Film", status: "provisional" },
      { id: "Painting", label: "Painting", status: "provisional" },
      { id: "Research paper", label: "Research paper", status: "provisional" },
    ],
  },
  {
    id: "Technology",
    label: "Technology",
    status: "active",
    aliases: ["tool", "system"],
    subtypes: [
      { id: "Tool", label: "Tool", status: "provisional" },
      { id: "System", label: "System", status: "provisional" },
      { id: "Device", label: "Device", status: "provisional" },
      { id: "Technique", label: "Technique", status: "provisional" },
    ],
  },
  {
    id: "Institution",
    label: "Institution",
    status: "active",
    aliases: ["organization", "organisation", "polity"],
    subtypes: [
      { id: "Organization", label: "Organization", status: "provisional" },
      { id: "Polity", label: "Polity", status: "provisional" },
      { id: "Empire", label: "Empire", status: "provisional" },
      { id: "Government", label: "Government", status: "provisional" },
      { id: "Company", label: "Company", status: "provisional" },
      { id: "School", label: "School", status: "provisional" },
      { id: "Army", label: "Army", status: "provisional" },
    ],
  },
  {
    id: "Movement",
    label: "Movement",
    status: "active",
    aliases: ["school of thought", "campaign"],
    subtypes: [
      { id: "Political movement", label: "Political movement", status: "provisional" },
      { id: "Art movement", label: "Art movement", status: "provisional" },
      { id: "Intellectual movement", label: "Intellectual movement", status: "provisional" },
      { id: "Religious movement", label: "Religious movement", status: "provisional" },
      { id: "Social movement", label: "Social movement", status: "provisional" },
    ],
  },
] as const satisfies readonly AtlasEntityTaxonomyTerm[]

export const ATLAS_MEDIA_TYPES = [
  { id: "Text", label: "Text", status: "active", aliases: ["passage", "excerpt"] },
  { id: "Image", label: "Image", status: "active", aliases: ["photo", "illustration"] },
  { id: "Audio", label: "Audio", status: "active" },
  { id: "Video", label: "Video", status: "active" },
  { id: "Dataset", label: "Dataset", status: "active", aliases: ["csv", "table data"] },
  { id: "3D Model", label: "3D Model", status: "active", aliases: ["model", "glb"] },
  { id: "Document", label: "Document", status: "provisional", aliases: ["pdf", "scan"] },
  { id: "Animation", label: "Animation", status: "provisional", aliases: ["lottie", "motion"] },
  { id: "Code Snippet", label: "Code Snippet", status: "provisional", aliases: ["code"] },
  { id: "Embed", label: "Embed", status: "provisional", aliases: ["iframe", "external embed"] },
] as const satisfies readonly AtlasTaxonomyTerm[]

export const ATLAS_PRODUCT_TYPES = [
  { id: "Map", label: "Map", status: "active" },
  { id: "Timeline", label: "Timeline", status: "active" },
  { id: "Chart", label: "Chart", status: "provisional" },
  { id: "Table", label: "Table", status: "provisional" },
  { id: "Diagram", label: "Diagram", status: "active" },
  { id: "Profile", label: "Profile", status: "active" },
  { id: "Narrative", label: "Narrative", status: "active", aliases: ["compendium"] },
  { id: "Documentary", label: "Documentary", status: "active" },
  { id: "Simulation", label: "Simulation", status: "active" },
  { id: "Gallery", label: "Gallery", status: "provisional" },
  { id: "Game", label: "Game", status: "active" },
] as const satisfies readonly AtlasTaxonomyTerm[]

export const ATLAS_ACTIVITY_FAMILIES = [
  "Recall",
  "Identify",
  "Classify",
  "Compare",
  "Interpret",
  "Explain",
  "Model",
  "Argue",
  "Create",
  "Reflect",
  "Assess",
  "Converse",
] as const

export const ATLAS_ACTIVITY_TYPES = [
  ...ATLAS_ACTIVITY_FAMILIES.map((id) => ({ id, label: id, status: "active" as const })),
  { id: "Exercise", label: "Exercise", status: "deprecated", aliases: ["practice"] },
  { id: "Quiz", label: "Quiz", status: "deprecated" },
  { id: "Assessment", label: "Assessment", status: "deprecated" },
  { id: "Interactive Simulation", label: "Interactive Simulation", status: "deprecated" },
  { id: "Game", label: "Game", status: "active" },
  { id: "AI Chat", label: "AI Chat", status: "provisional", aliases: ["chat", "conversation"] },
] as const satisfies readonly AtlasTaxonomyTerm[]

export const ATLAS_PEDAGOGICAL_ROLES = [
  "Activation",
  "Instruction",
  "Practice",
  "Feedback",
  "Assessment",
  "Reflection",
  "Review",
] as const

export const ATLAS_STUDENT_ACTIONS = [
  "Recall",
  "Identify",
  "Classify",
  "Compare",
  "Interpret",
  "Model",
  "Argue",
  "Create",
  "Reflect",
] as const

export const ATLAS_TAXONOMY_ALIASES = {
  "concept / theory": "Concept",
  location: "Environment",
  place: "Environment",
  event: "Time",
  period: "Time",
  organization: "Institution",
  organisation: "Institution",
  polity: "Institution",
  compendium: "Narrative",
  maps: "Map",
  dataset: "Dataset",
  "code editor": "Code Snippet",
  chat: "Converse",
  "ai chat": "AI Chat",
} as const

export type AtlasEntityTypeId = (typeof ATLAS_ENTITY_TYPES)[number]["id"]
export type AtlasEntitySubtypeId = (typeof ATLAS_ENTITY_TYPES)[number]["subtypes"][number]["id"]
export type AtlasMediaTypeId = (typeof ATLAS_MEDIA_TYPES)[number]["id"]
export type AtlasProductTypeId = (typeof ATLAS_PRODUCT_TYPES)[number]["id"]
export type AtlasActivityFamilyId = (typeof ATLAS_ACTIVITY_FAMILIES)[number]
export type AtlasActivityTypeId = (typeof ATLAS_ACTIVITY_TYPES)[number]["id"]
export type AtlasPedagogicalRoleId = (typeof ATLAS_PEDAGOGICAL_ROLES)[number]
export type AtlasStudentActionId = (typeof ATLAS_STUDENT_ACTIONS)[number]

type TaxonomySection = "entity" | "media" | "product" | "activity"

const TAXONOMY_TERMS_BY_SECTION = {
  entity: ATLAS_ENTITY_TYPES,
  media: ATLAS_MEDIA_TYPES,
  product: ATLAS_PRODUCT_TYPES,
  activity: ATLAS_ACTIVITY_TYPES,
} as const

export function taxonomyIds<TTerm extends AtlasTaxonomyTerm>(terms: readonly TTerm[]): TTerm["id"][] {
  return terms.map((term) => term.id)
}

export function canonicalizeAtlasTaxonomyValue(section: TaxonomySection, value: string): string | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  const directAlias = ATLAS_TAXONOMY_ALIASES[normalized as keyof typeof ATLAS_TAXONOMY_ALIASES]
  if (directAlias) {
    return directAlias
  }

  for (const term of TAXONOMY_TERMS_BY_SECTION[section]) {
    if (term.id.toLowerCase() === normalized || term.label.toLowerCase() === normalized) {
      return term.id
    }
    if ("aliases" in term && term.aliases?.some((alias: string) => alias.toLowerCase() === normalized)) {
      return term.id
    }
  }

  return null
}
