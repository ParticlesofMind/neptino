/**
 * ISCED-F 2013 — International Standard Classification of Education:
 * Fields of Education and Training 2013
 *
 * Three-level hierarchy:
 *   Broad  (1-digit code, e.g. "01")   — 10 fields  (excl. "00 Generic")
 *   Narrow (3-digit code, e.g. "011")  — 26 fields
 *   Detailed (4-digit code, e.g. "0111") — ~80 fields
 *
 * The broadLabel values match the ISCED_DOMAINS constants in src/types/atlas.ts,
 * which are the values stored in the encyclopedia_items.domain DB column.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ISCEDFDetailedField {
  code: string
  label: string
  narrowCode: string
  broadLabel: string
}

export interface ISCEDFNarrowField {
  code: string
  label: string
  broadLabel: string
  detailed: ISCEDFDetailedField[]
}

export interface ISCEDFBroadField {
  code: string
  label: string
  narrow: ISCEDFNarrowField[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const ISCED_F_2013: ISCEDFBroadField[] = [
  {
    code: "01",
    label: "Education",
    narrow: [
      {
        code: "011",
        label: "Education",
        broadLabel: "Education",
        detailed: [
          { code: "0111", label: "Education science", narrowCode: "011", broadLabel: "Education" },
          { code: "0112", label: "Training for pre-school teachers", narrowCode: "011", broadLabel: "Education" },
          { code: "0113", label: "Teacher training without subject specialisation", narrowCode: "011", broadLabel: "Education" },
          { code: "0114", label: "Teacher training with subject specialisation", narrowCode: "011", broadLabel: "Education" },
        ],
      },
    ],
  },
  {
    code: "02",
    label: "Arts and humanities",
    narrow: [
      {
        code: "021",
        label: "Arts",
        broadLabel: "Arts and humanities",
        detailed: [
          { code: "0211", label: "Fine arts", narrowCode: "021", broadLabel: "Arts and humanities" },
          { code: "0212", label: "Fashion, interior and industrial design", narrowCode: "021", broadLabel: "Arts and humanities" },
          { code: "0213", label: "Fine arts (excluding music and performing arts)", narrowCode: "021", broadLabel: "Arts and humanities" },
          { code: "0214", label: "Handicrafts", narrowCode: "021", broadLabel: "Arts and humanities" },
          { code: "0215", label: "Music and performing arts", narrowCode: "021", broadLabel: "Arts and humanities" },
        ],
      },
      {
        code: "022",
        label: "Humanities (except languages)",
        broadLabel: "Arts and humanities",
        detailed: [
          { code: "0221", label: "Religion and theology", narrowCode: "022", broadLabel: "Arts and humanities" },
          { code: "0222", label: "History and archaeology", narrowCode: "022", broadLabel: "Arts and humanities" },
          { code: "0223", label: "Philosophy and ethics", narrowCode: "022", broadLabel: "Arts and humanities" },
        ],
      },
      {
        code: "023",
        label: "Languages",
        broadLabel: "Arts and humanities",
        detailed: [
          { code: "0231", label: "Language acquisition", narrowCode: "023", broadLabel: "Arts and humanities" },
          { code: "0232", label: "Literature and linguistics", narrowCode: "023", broadLabel: "Arts and humanities" },
        ],
      },
    ],
  },
  {
    code: "03",
    label: "Social sciences, journalism and information",
    narrow: [
      {
        code: "031",
        label: "Social and behavioural sciences",
        broadLabel: "Social sciences, journalism and information",
        detailed: [
          { code: "0311", label: "Economics", narrowCode: "031", broadLabel: "Social sciences, journalism and information" },
          { code: "0312", label: "Political sciences and civics", narrowCode: "031", broadLabel: "Social sciences, journalism and information" },
          { code: "0313", label: "Psychology", narrowCode: "031", broadLabel: "Social sciences, journalism and information" },
          { code: "0314", label: "Sociology and cultural studies", narrowCode: "031", broadLabel: "Social sciences, journalism and information" },
        ],
      },
      {
        code: "032",
        label: "Journalism and information",
        broadLabel: "Social sciences, journalism and information",
        detailed: [
          { code: "0321", label: "Journalism and reporting", narrowCode: "032", broadLabel: "Social sciences, journalism and information" },
          { code: "0322", label: "Library, information and archival studies", narrowCode: "032", broadLabel: "Social sciences, journalism and information" },
        ],
      },
    ],
  },
  {
    code: "04",
    label: "Business, administration and law",
    narrow: [
      {
        code: "041",
        label: "Business and administration",
        broadLabel: "Business, administration and law",
        detailed: [
          { code: "0411", label: "Accounting and taxation", narrowCode: "041", broadLabel: "Business, administration and law" },
          { code: "0412", label: "Finance, banking and insurance", narrowCode: "041", broadLabel: "Business, administration and law" },
          { code: "0413", label: "Management and administration", narrowCode: "041", broadLabel: "Business, administration and law" },
          { code: "0414", label: "Marketing and advertising", narrowCode: "041", broadLabel: "Business, administration and law" },
          { code: "0415", label: "Secretarial and office work", narrowCode: "041", broadLabel: "Business, administration and law" },
          { code: "0416", label: "Wholesale and retail sales", narrowCode: "041", broadLabel: "Business, administration and law" },
          { code: "0417", label: "Work skills", narrowCode: "041", broadLabel: "Business, administration and law" },
        ],
      },
      {
        code: "042",
        label: "Law",
        broadLabel: "Business, administration and law",
        detailed: [
          { code: "0421", label: "Law", narrowCode: "042", broadLabel: "Business, administration and law" },
        ],
      },
    ],
  },
  {
    code: "05",
    label: "Natural sciences, mathematics and statistics",
    narrow: [
      {
        code: "051",
        label: "Biological and related sciences",
        broadLabel: "Natural sciences, mathematics and statistics",
        detailed: [
          { code: "0511", label: "Biology", narrowCode: "051", broadLabel: "Natural sciences, mathematics and statistics" },
          { code: "0512", label: "Biochemistry", narrowCode: "051", broadLabel: "Natural sciences, mathematics and statistics" },
        ],
      },
      {
        code: "052",
        label: "Environment",
        broadLabel: "Natural sciences, mathematics and statistics",
        detailed: [
          { code: "0521", label: "Environmental sciences", narrowCode: "052", broadLabel: "Natural sciences, mathematics and statistics" },
          { code: "0522", label: "Natural environments and wildlife", narrowCode: "052", broadLabel: "Natural sciences, mathematics and statistics" },
        ],
      },
      {
        code: "053",
        label: "Physical sciences",
        broadLabel: "Natural sciences, mathematics and statistics",
        detailed: [
          { code: "0531", label: "Chemistry", narrowCode: "053", broadLabel: "Natural sciences, mathematics and statistics" },
          { code: "0532", label: "Earth sciences", narrowCode: "053", broadLabel: "Natural sciences, mathematics and statistics" },
          { code: "0533", label: "Physics", narrowCode: "053", broadLabel: "Natural sciences, mathematics and statistics" },
        ],
      },
      {
        code: "054",
        label: "Mathematics and statistics",
        broadLabel: "Natural sciences, mathematics and statistics",
        detailed: [
          { code: "0541", label: "Mathematics", narrowCode: "054", broadLabel: "Natural sciences, mathematics and statistics" },
          { code: "0542", label: "Statistics", narrowCode: "054", broadLabel: "Natural sciences, mathematics and statistics" },
        ],
      },
    ],
  },
  {
    code: "06",
    label: "Information and Communication Technologies",
    narrow: [
      {
        code: "061",
        label: "Information and Communication Technologies",
        broadLabel: "Information and Communication Technologies",
        detailed: [
          { code: "0611", label: "Computer use", narrowCode: "061", broadLabel: "Information and Communication Technologies" },
          { code: "0612", label: "Database and network design and administration", narrowCode: "061", broadLabel: "Information and Communication Technologies" },
          { code: "0613", label: "Software and applications development and analysis", narrowCode: "061", broadLabel: "Information and Communication Technologies" },
        ],
      },
    ],
  },
  {
    code: "07",
    label: "Engineering, manufacturing and construction",
    narrow: [
      {
        code: "071",
        label: "Engineering and engineering trades",
        broadLabel: "Engineering, manufacturing and construction",
        detailed: [
          { code: "0711", label: "Chemical engineering and processes", narrowCode: "071", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0712", label: "Environmental protection technology", narrowCode: "071", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0713", label: "Electricity and energy", narrowCode: "071", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0714", label: "Electronics and automation", narrowCode: "071", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0715", label: "Mechanics and metal trades", narrowCode: "071", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0716", label: "Motor vehicles, ships and aircraft", narrowCode: "071", broadLabel: "Engineering, manufacturing and construction" },
        ],
      },
      {
        code: "072",
        label: "Manufacturing and processing",
        broadLabel: "Engineering, manufacturing and construction",
        detailed: [
          { code: "0721", label: "Food processing", narrowCode: "072", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0722", label: "Materials (glass, paper, plastic and wood)", narrowCode: "072", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0723", label: "Textiles (clothes, footwear and leather)", narrowCode: "072", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0724", label: "Mining and extraction", narrowCode: "072", broadLabel: "Engineering, manufacturing and construction" },
        ],
      },
      {
        code: "073",
        label: "Architecture and construction",
        broadLabel: "Engineering, manufacturing and construction",
        detailed: [
          { code: "0731", label: "Architecture and town planning", narrowCode: "073", broadLabel: "Engineering, manufacturing and construction" },
          { code: "0732", label: "Building and civil engineering", narrowCode: "073", broadLabel: "Engineering, manufacturing and construction" },
        ],
      },
    ],
  },
  {
    code: "08",
    label: "Agriculture, forestry, fisheries and veterinary",
    narrow: [
      {
        code: "081",
        label: "Agriculture",
        broadLabel: "Agriculture, forestry, fisheries and veterinary",
        detailed: [
          { code: "0811", label: "Crop and livestock production", narrowCode: "081", broadLabel: "Agriculture, forestry, fisheries and veterinary" },
          { code: "0812", label: "Horticulture", narrowCode: "081", broadLabel: "Agriculture, forestry, fisheries and veterinary" },
        ],
      },
      {
        code: "082",
        label: "Forestry",
        broadLabel: "Agriculture, forestry, fisheries and veterinary",
        detailed: [
          { code: "0821", label: "Forestry", narrowCode: "082", broadLabel: "Agriculture, forestry, fisheries and veterinary" },
        ],
      },
      {
        code: "083",
        label: "Fisheries",
        broadLabel: "Agriculture, forestry, fisheries and veterinary",
        detailed: [
          { code: "0831", label: "Fisheries", narrowCode: "083", broadLabel: "Agriculture, forestry, fisheries and veterinary" },
        ],
      },
      {
        code: "084",
        label: "Veterinary",
        broadLabel: "Agriculture, forestry, fisheries and veterinary",
        detailed: [
          { code: "0841", label: "Veterinary", narrowCode: "084", broadLabel: "Agriculture, forestry, fisheries and veterinary" },
        ],
      },
    ],
  },
  {
    code: "09",
    label: "Health and welfare",
    narrow: [
      {
        code: "091",
        label: "Health",
        broadLabel: "Health and welfare",
        detailed: [
          { code: "0911", label: "Dental studies", narrowCode: "091", broadLabel: "Health and welfare" },
          { code: "0912", label: "Medicine", narrowCode: "091", broadLabel: "Health and welfare" },
          { code: "0913", label: "Nursing and midwifery", narrowCode: "091", broadLabel: "Health and welfare" },
          { code: "0914", label: "Medical diagnostic and treatment technology", narrowCode: "091", broadLabel: "Health and welfare" },
          { code: "0915", label: "Therapy and rehabilitation", narrowCode: "091", broadLabel: "Health and welfare" },
          { code: "0916", label: "Pharmacy", narrowCode: "091", broadLabel: "Health and welfare" },
          { code: "0917", label: "Traditional and complementary medicine and therapy", narrowCode: "091", broadLabel: "Health and welfare" },
        ],
      },
      {
        code: "092",
        label: "Welfare",
        broadLabel: "Health and welfare",
        detailed: [
          { code: "0921", label: "Care of the elderly and of disabled adults", narrowCode: "092", broadLabel: "Health and welfare" },
          { code: "0922", label: "Child care and youth services", narrowCode: "092", broadLabel: "Health and welfare" },
          { code: "0923", label: "Social work and counselling", narrowCode: "092", broadLabel: "Health and welfare" },
        ],
      },
    ],
  },
  {
    code: "10",
    label: "Services",
    narrow: [
      {
        code: "101",
        label: "Personal services",
        broadLabel: "Services",
        detailed: [
          { code: "1011", label: "Domestic services", narrowCode: "101", broadLabel: "Services" },
          { code: "1012", label: "Hair and beauty services", narrowCode: "101", broadLabel: "Services" },
          { code: "1013", label: "Hotel, restaurants and catering", narrowCode: "101", broadLabel: "Services" },
          { code: "1014", label: "Sports", narrowCode: "101", broadLabel: "Services" },
          { code: "1015", label: "Travel, tourism and leisure", narrowCode: "101", broadLabel: "Services" },
        ],
      },
      {
        code: "102",
        label: "Hygiene and occupational health services",
        broadLabel: "Services",
        detailed: [
          { code: "1021", label: "Community sanitation", narrowCode: "102", broadLabel: "Services" },
          { code: "1022", label: "Occupational health and safety", narrowCode: "102", broadLabel: "Services" },
        ],
      },
      {
        code: "103",
        label: "Security services",
        broadLabel: "Services",
        detailed: [
          { code: "1031", label: "Military and defence", narrowCode: "103", broadLabel: "Services" },
          { code: "1032", label: "Protection of persons and property", narrowCode: "103", broadLabel: "Services" },
        ],
      },
      {
        code: "104",
        label: "Transport services",
        broadLabel: "Services",
        detailed: [
          { code: "1041", label: "Transport services", narrowCode: "104", broadLabel: "Services" },
        ],
      },
    ],
  },
]

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** All narrow fields as a flat list. */
export const ISCED_F_NARROW: ISCEDFNarrowField[] = ISCED_F_2013.flatMap((b) => b.narrow)

/** All detailed fields as a flat list. */
export const ISCED_F_DETAILED: ISCEDFDetailedField[] = ISCED_F_NARROW.flatMap((n) => n.detailed)

/** Narrow fields for a given broad label (matches ISCED_DOMAINS value). */
export function getNarrowForBroad(broadLabel: string): ISCEDFNarrowField[] {
  return ISCED_F_NARROW.filter((n) => n.broadLabel === broadLabel)
}

/** Detailed fields for a given narrow code (e.g., "031"). */
export function getDetailedForNarrow(narrowCode: string): ISCEDFDetailedField[] {
  return ISCED_F_DETAILED.filter((d) => d.narrowCode === narrowCode)
}

/** Resolve the broad label (ISCED_DOMAINS value) for a narrow code. */
export function getBroadLabelForNarrow(narrowCode: string): string | null {
  return ISCED_F_NARROW.find((n) => n.code === narrowCode)?.broadLabel ?? null
}

/** Resolve the broad label for a detailed code. */
export function getBroadLabelForDetailed(detailedCode: string): string | null {
  return ISCED_F_DETAILED.find((d) => d.code === detailedCode)?.broadLabel ?? null
}

/** Resolve the narrow code for a detailed code. */
export function getNarrowCodeForDetailed(detailedCode: string): string | null {
  return ISCED_F_DETAILED.find((d) => d.code === detailedCode)?.narrowCode ?? null
}
