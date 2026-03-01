// Single source of truth for the Atlas entity/media/product taxonomy used
// across the filter bar and the sort-content drilldown. Both components import
// from here instead of duplicating the constant.

export const TAXONOMY = {
  entities: {
    label: "Entity",
    color: "#60a5fa",
    layerParam: null as string | null,
    items: [
      { name: "Concept",     children: ["Theory", "Theorem", "Law", "Principle", "Definition", "Model"] },
      { name: "Process",     children: ["Procedure", "Technique", "Algorithm", "Cycle", "Method", "Reaction"] },
      { name: "Instance",    children: ["Example", "Case Study", "Specimen", "Record"] },
      { name: "Person",      children: ["Individual", "Collective"] },
      { name: "State",       children: ["Physical State", "Psychological State", "Social State", "Health State"] },
      { name: "Time",        children: ["Event", "Period", "Epoch"] },
      { name: "Environment", children: ["Place", "Organism", "Matter"] },
      { name: "Work",        children: ["Text", "Artwork", "Musical Work", "Artifact"] },
      { name: "Technology",  children: ["Instrument", "Machine", "System", "Material Technology"] },
      { name: "Institution", children: ["Political Body", "Educational Body", "Religious Body", "Economic Body", "Cultural Body"] },
      { name: "Movement",    children: ["Intellectual", "Artistic", "Political", "Social"] },
    ],
  },
  media: {
    label: "Media",
    color: "#f472b6",
    layerParam: "2" as string | null,
    items: [
      { name: "Text",      children: ["Primary Source", "Secondary Source", "Reference", "Annotation"] },
      { name: "Image",     children: ["Photograph", "Illustration", "Diagram", "Chart", "Map Image"] },
      { name: "Audio",     children: ["Speech", "Music", "Natural Sound", "Narration"] },
      { name: "Video",     children: ["Documentary Clip", "Lecture Recording", "Demonstration", "Animation", "Archival Footage"] },
      { name: "Dataset",   children: ["Statistical Data", "Geospatial Data", "Time Series", "Genomic Data", "Economic Data"] },
      { name: "3D Model",  children: ["Static Model", "Interactive Model", "Scan"] },
    ],
  },
  products: {
    label: "Product",
    color: "#34d399",
    layerParam: "3" as string | null,
    items: [
      { name: "Map",         children: ["Geographic Map", "Thematic Map", "Concept Map", "Interactive Map"] },
      { name: "Timeline",    children: ["Chronological", "Comparative", "Geological", "Interactive"] },
      { name: "Simulation",  children: ["Passive", "Interactive", "Role Simulation"] },
      { name: "Game",        children: ["Knowledge Game", "Strategy Game", "Role-Play Game", "Puzzle Game"] },
      { name: "Documentary", children: ["Historical", "Scientific", "Social"] },
      { name: "Diagram",     children: ["Structural", "Process", "Comparative", "Hierarchical"] },
      { name: "Narrative",   children: ["Historical Narrative", "Scientific Narrative", "Annotated Work"] },
      { name: "Profile",     children: ["Person Profile", "Place Profile", "Institution Profile", "Species Profile", "Work Profile"] },
    ],
  },
} as const

export type CatKey = keyof typeof TAXONOMY

export const CATEGORY_KEYS: CatKey[] = ["entities", "media", "products"]

export function layerToCat(layer: string | null): CatKey {
  if (layer === "2") return "media"
  if (layer === "3") return "products"
  return "entities"
}
