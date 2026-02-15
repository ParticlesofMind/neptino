/**
 * CourseFingerprint — The complete typed specification of a course's identity,
 * classification, pedagogy, schedule, structure, and student context.
 *
 * Every value a teacher enters during setup progressively narrows the universe
 * of appropriate content. This interface captures the full set of constraints
 * that drive encyclopedia filtering, marketplace ranking, and template block
 * content acceptance.
 *
 * See: Course Builder Architecture §2.2
 */

import type { TemplateType, TemplateBlockType } from '../templates/templateOptions';

// ── Re-exported / shared enums ────────────────────────────────────────

export type AssetCategory = 'explanation' | 'activity' | 'assessment' | 'simulation' | 'planning';
export type GradeLevel = 'pre-k' | 'k-2' | '3-5' | '6-8' | '9-12' | 'higher-ed' | 'adult';
export type Difficulty = 'introductory' | 'intermediate' | 'advanced';
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyse' | 'evaluate' | 'create';
export type InteractivityType = 'active' | 'expositive' | 'mixed';
export type DepthLevel = 'foundation' | 'intermediate' | 'advanced';

// ── ISCED Classification ──────────────────────────────────────────────

export interface ISCEDPath {
  domain: string;        // e.g. "05-natural-sciences"
  subject: string;       // e.g. "052-physical-sciences"
  topic: string;         // e.g. "0533-physics"
  subtopic?: string;
}

export interface CourseClassification {
  classYear?: string;
  curricularFramework?: string;
  domain?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  previousCourse?: string;
  currentCourse?: string;
  nextCourse?: string;
}

// ── Pedagogy ──────────────────────────────────────────────────────────

/** The raw 2-D coordinate the teacher sets (both axes -100 … 100). */
export interface PedagogyCoordinates {
  x: number; // Essentialist (-100) ↔ Progressive (+100)
  y: number; // Behaviorist  (-100) ↔ Constructivist (+100)
}

/** Derived content-preference profile used by filter pipelines. */
export interface PedagogyBias {
  interactivity: InteractivityType;
  constructivism: number;             // 0-100, derived from y
  assetCategoryWeights: Record<AssetCategory, number>; // 0-1 relevance weight
  bloomBias: BloomLevel[];            // preferred Bloom levels
}

// ── Students ──────────────────────────────────────────────────────────

export interface StudentSummary {
  studentCount: number;
  gradeLevel?: string;
  learningStyles: string[];
  averageAssessmentScore?: number;
}

// ── Schedule ──────────────────────────────────────────────────────────

export interface ScheduleSummary {
  totalSessions: number;
  lessonDuration: number;  // minutes
  courseDuration?: { start: string; end: string };
}

// ── Curriculum ────────────────────────────────────────────────────────

export interface CurriculumLessonSummary {
  title: string;
  topics: string[];
  competencies: string[];
  objectives: string[];
  tasks: string[];
  templateType?: TemplateType;
}

export interface CurriculumModuleSummary {
  title: string;
  lessons: CurriculumLessonSummary[];
}

export interface StructureConfig {
  topicsPerLesson: number;
  objectivesPerTopic: number;
  tasksPerObjective: number;
}

// ── Template acceptance rules ─────────────────────────────────────────

export interface BlockContentAcceptance {
  acceptsEncyclopedia: boolean;
  acceptsMarketplace: AssetCategory[];
  acceptsMedia: string[];  // media format strings
  maxItems?: number;
  layoutStrategy: 'stack' | 'grid' | 'freeform';
}

/** Default acceptance rules for each template block type. */
export const DEFAULT_BLOCK_ACCEPTANCE: Record<TemplateBlockType, BlockContentAcceptance> = {
  header: {
    acceptsEncyclopedia: false,
    acceptsMarketplace: [],
    acceptsMedia: ['images'],
    layoutStrategy: 'stack',
  },
  body: {
    acceptsEncyclopedia: true,
    acceptsMarketplace: ['explanation', 'activity', 'assessment', 'simulation', 'planning'],
    acceptsMedia: ['images', 'videos', 'audio', 'text'],
    layoutStrategy: 'stack',
  },
  footer: {
    acceptsEncyclopedia: false,
    acceptsMarketplace: [],
    acceptsMedia: [],
    layoutStrategy: 'stack',
  },
  program: {
    acceptsEncyclopedia: true,
    acceptsMarketplace: ['planning'],
    acceptsMedia: ['text'],
    layoutStrategy: 'stack',
  },
  resources: {
    acceptsEncyclopedia: true,
    acceptsMarketplace: ['planning', 'explanation'],
    acceptsMedia: ['images', 'text', 'links'],
    layoutStrategy: 'stack',
  },
  content: {
    acceptsEncyclopedia: true,
    acceptsMarketplace: ['explanation', 'activity', 'simulation'],
    acceptsMedia: ['images', 'videos', 'audio', 'text'],
    layoutStrategy: 'grid',
  },
  assignment: {
    acceptsEncyclopedia: false,
    acceptsMarketplace: ['activity', 'assessment'],
    acceptsMedia: ['text'],
    layoutStrategy: 'stack',
  },
  scoring: {
    acceptsEncyclopedia: false,
    acceptsMarketplace: ['assessment'],
    acceptsMedia: ['text'],
    layoutStrategy: 'stack',
  },
};

// ── The Full Fingerprint ──────────────────────────────────────────────

export interface CourseFingerprint {
  // ─ Source identifiers ─
  courseId: string;
  lastRefreshed: string; // ISO timestamp

  // ─ From Essentials ─
  courseName: string;
  courseSubtitle?: string;
  courseDescription: string;
  language: string;
  institution: string;
  courseType?: string;

  // ─ From Classification (ISCED 2011) ─
  classification: CourseClassification;

  // ─ From Students ─
  students: StudentSummary;

  // ─ From Pedagogy ─
  pedagogyCoordinates: PedagogyCoordinates | null;
  instructionalApproach: string;

  // ─ From Templates ─
  activeTemplateTypes: TemplateType[];
  templateBlockAcceptance: Record<TemplateBlockType, BlockContentAcceptance>;

  // ─ From Schedule ─
  schedule: ScheduleSummary | null;

  // ─ From Curriculum ─
  moduleOrganization: 'linear' | 'modular';
  modules: CurriculumModuleSummary[];
  structureConfig: StructureConfig;
}

// ── Grade-level mapping ───────────────────────────────────────────────

/**
 * Maps common classYear strings (as stored in classification_data) to
 * the marketplace's GradeLevel enum values.
 */
export function classYearToGradeLevel(classYear: string | undefined): GradeLevel[] {
  if (!classYear) return [];

  const lower = classYear.toLowerCase().trim();

  // Direct matches
  const directMap: Record<string, GradeLevel[]> = {
    'pre-k': ['pre-k'],
    'pre-kindergarten': ['pre-k'],
    'kindergarten': ['k-2'],
    'k': ['k-2'],
  };
  if (directMap[lower]) return directMap[lower];

  // Year/grade number extraction
  const numMatch = lower.match(/(\d+)/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n <= 2) return ['k-2'];
    if (n <= 5) return ['3-5'];
    if (n <= 8) return ['6-8'];
    if (n <= 12) return ['9-12'];
    if (n <= 16) return ['higher-ed'];
    return ['adult'];
  }

  // Text-based matching
  if (/undergraduate|university|college|bachelor/i.test(lower)) return ['higher-ed'];
  if (/graduate|master|doctoral|phd|postgrad/i.test(lower)) return ['higher-ed', 'adult'];
  if (/adult|professional|continuing/i.test(lower)) return ['adult'];
  if (/primary|elementary/i.test(lower)) return ['3-5'];
  if (/middle|junior/i.test(lower)) return ['6-8'];
  if (/secondary|high.?school|senior/i.test(lower)) return ['9-12'];

  return [];
}

// ── Pedagogy → content preference mapping ─────────────────────────────

/**
 * Derives content/asset preference signals from the 2-D pedagogy coordinates.
 */
export function derivePedagogyBias(coords: PedagogyCoordinates | null): PedagogyBias {
  if (!coords) {
    // Balanced default
    return {
      interactivity: 'mixed',
      constructivism: 50,
      assetCategoryWeights: {
        explanation: 0.5,
        activity: 0.5,
        assessment: 0.5,
        simulation: 0.5,
        planning: 0.5,
      },
      bloomBias: ['understand', 'apply'],
    };
  }

  const { x, y } = coords;

  // Interactivity preference from combined position
  let interactivity: InteractivityType;
  if (y > 30 || x > 30) {
    interactivity = 'active';
  } else if (y < -30 && x < -30) {
    interactivity = 'expositive';
  } else {
    interactivity = 'mixed';
  }

  // Constructivism is a 0–100 scale mapped from y (-100…100)
  const constructivism = Math.round((y + 100) / 2);

  // Asset category weights
  // Progressive + Constructivist → simulations, activities
  // Essentialist + Behaviorist → explanations, assessments
  const progressiveFactor = (x + 100) / 200;   // 0–1
  const constructiveFactor = (y + 100) / 200;   // 0–1
  const traditionalFactor = 1 - (progressiveFactor + constructiveFactor) / 2;

  const assetCategoryWeights: Record<AssetCategory, number> = {
    explanation: clamp(0.3 + traditionalFactor * 0.5),
    activity: clamp(0.3 + progressiveFactor * 0.4 + constructiveFactor * 0.3),
    assessment: clamp(0.3 + traditionalFactor * 0.3),
    simulation: clamp(0.2 + constructiveFactor * 0.6),
    planning: 0.5, // neutral — always useful
  };

  // Bloom level bias
  const bloomBias: BloomLevel[] = [];
  if (traditionalFactor > 0.6) {
    bloomBias.push('remember', 'understand');
  }
  if (progressiveFactor > 0.4 || constructiveFactor > 0.4) {
    bloomBias.push('apply', 'analyse');
  }
  if (constructiveFactor > 0.6) {
    bloomBias.push('evaluate', 'create');
  }
  // Ensure at least something
  if (bloomBias.length === 0) {
    bloomBias.push('understand', 'apply');
  }

  return { interactivity, constructivism, assetCategoryWeights, bloomBias };
}

// ── Depth mapping ─────────────────────────────────────────────────────

/**
 * Maps gradeLevel + optional assessment score to encyclopedia depth.
 */
export function deriveDepthLevel(
  gradeLevels: GradeLevel[],
  averageScore?: number,
): DepthLevel {
  // If we have assessment data use it as a secondary signal
  const scoreModifier = averageScore !== undefined
    ? (averageScore >= 80 ? 1 : averageScore >= 50 ? 0 : -1)
    : 0;

  const gradeScore = gradeLevels.reduce((max, gl) => {
    const map: Record<GradeLevel, number> = {
      'pre-k': 0, 'k-2': 0, '3-5': 1, '6-8': 1,
      '9-12': 2, 'higher-ed': 3, 'adult': 3,
    };
    return Math.max(max, map[gl] ?? 1);
  }, 0);

  const combined = gradeScore + scoreModifier;
  if (combined <= 0) return 'foundation';
  if (combined <= 2) return 'intermediate';
  return 'advanced';
}

// ── Approach label ────────────────────────────────────────────────────

/**
 * Produce a human-readable instructional-approach name from coordinates.
 * Mirrors the logic in pedagogyHandler.ts → approachName().
 */
export function deriveApproachLabel(coords: PedagogyCoordinates | null): string {
  if (!coords) return 'Balanced';
  const { x, y } = coords;
  if (x < -50 && y < -50) return 'Traditional';
  if (x > 50 && y > 50) return 'Progressive';
  if (x < 0 && y > 50) return 'Guided Discovery';
  if (x > 50 && y < 0) return 'Competency-Based';
  if (Math.abs(x) <= 25 && Math.abs(y) <= 25) return 'Balanced';
  if (y > 25) return 'Constructivist-Leaning';
  if (y < -25) return 'Behaviorist-Leaning';
  if (x > 25) return 'Progressive-Leaning';
  if (x < -25) return 'Essentialist-Leaning';
  return 'Blended';
}

// ── Helper ────────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n));
}
