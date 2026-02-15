/**
 * Marketplace Filter API
 *
 * Provides structured, fingerprint-driven filtering and ranking of
 * ForgeAsset[] arrays. This module is UI-agnostic — it works with
 * plain data and returns sorted results.
 *
 * Used by both the marketplace page (marketplace.ts) and the
 * coursebuilder media sidebar (MediaInterface.ts).
 *
 * See: Course Builder Architecture §3.2, §5.3
 */

import type {
  CourseFingerprint,
  ISCEDPath,
  GradeLevel,
  Difficulty,
  BloomLevel,
  AssetCategory,
  InteractivityType,
  PedagogyBias,
  DepthLevel,
} from '../backend/courses/context/CourseFingerprint';
import { derivePedagogyBias } from '../backend/courses/context/CourseFingerprint';

/**
 * String label derived from PedagogyBias characteristics, used as a
 * lookup key for preferred pedagogical approaches.
 */
type PedagogyApproachLabel =
  | 'constructivist'
  | 'constructivist-progressive'
  | 'progressive'
  | 'essentialist-constructivist'
  | 'balanced'
  | 'essentialist'
  | 'essentialist-behaviorist'
  | 'behaviorist'
  | 'behaviorist-progressive';

// ── Types (mirrored from marketplace.ts to avoid coupling) ────────────

export interface LinkedEntity {
  id: string;
  type: string;
  name: string;
}

export interface ForgeAsset {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  creatorName: string;
  createdAt: string;
  assetType: string;             // e.g. "Interactive Timeline"
  assetCategory: AssetCategory;
  subjectDomains: string[];
  topicTags: string[];
  gradeLevel: GradeLevel[];
  difficulty: Difficulty;
  bloomLevel: BloomLevel[];
  pedagogicalApproach: string[];
  estimatedDuration: string;     // e.g. "30 minutes"
  learningObjectives: string[];
  linkedEntities: LinkedEntity[];
  interactivityType: InteractivityType;
  mediaFormat: string[];
  language: string;
  price: number | null;
  license: string;
  visibility: string;
  ratingAverage: number;
  ratingCount: number;
  downloadCount: number;
}

// ── Filter criteria ───────────────────────────────────────────────────

export interface MarketplaceFilterCriteria {
  /** Free-text search term (searches title, description, tags). */
  searchTerm?: string;

  /** ISCED path from the course classification. */
  iscedPath?: ISCEDPath | null;

  /** Asset categories to include (empty = all). */
  categories?: AssetCategory[];

  /** Grade levels to match (empty = all). */
  gradeLevels?: GradeLevel[];

  /** Maximum difficulty. */
  maxDifficulty?: Difficulty;

  /** Minimum Bloom level floor. */
  bloomFloor?: BloomLevel;

  /** Pedagogy approach label — used to boost matching approaches. */
  pedagogyApproach?: PedagogyApproachLabel;

  /** Maximum duration in minutes. */
  maxDurationMinutes?: number;

  /** Interactivity types to include (empty = all). */
  interactivityTypes?: InteractivityType[];

  /** Required language (ISO 639-1, e.g. "en"). */
  language?: string;

  /** Explicit domain strings to include (empty = all). */
  domains?: string[];

  /** Curriculum topic names — used for keyword relevance scoring. */
  topicKeywords?: string[];

  /** Only free / null-price assets? */
  freeOnly?: boolean;

  /** Maximum number of results. */
  limit?: number;
}

// ── Scored result ─────────────────────────────────────────────────────

export interface ScoredForgeAsset {
  asset: ForgeAsset;
  score: number;      // 0-100 relevance score
  matchReasons: string[];
}

// ── ISCED domain → marketplace domain mapping ─────────────────────────

/**
 * Maps ISCED broad field codes to human-readable marketplace domain strings.
 * The marketplace uses a slightly different domain taxonomy than the
 * encyclopedia (e.g. "Natural Sciences" vs. "Sciences").
 */
const ISCED_TO_MARKETPLACE_DOMAIN: Record<string, string[]> = {
  '00': ['Humanities', 'Philosophy & Ethics'],
  '01': ['Humanities', 'Arts & Design'],
  '02': ['Arts & Design'],
  '03': ['Social Sciences', 'Law & Governance'],
  '04': ['Business & Economics'],
  '05': ['Natural Sciences', 'Mathematics & Logic'],
  '06': ['Information & Communication Technologies', 'Natural Sciences'],
  '07': ['Engineering & Technology'],
  '08': ['Business & Economics', 'Health & Welfare'],
  '09': ['Health & Welfare'],
  '10': ['Environmental Studies', 'Agriculture & Forestry'],
};

/**
 * Keyword-based fallback for domain matching.
 */
const MARKETPLACE_DOMAIN_KEYWORDS: Record<string, string[]> = {
  'physics': ['Natural Sciences'],
  'chemistry': ['Natural Sciences'],
  'biology': ['Natural Sciences', 'Health & Welfare'],
  'mathematics': ['Mathematics & Logic'],
  'math': ['Mathematics & Logic'],
  'history': ['Humanities', 'Social Sciences'],
  'literature': ['Humanities', 'Language & Linguistics'],
  'art': ['Arts & Design'],
  'music': ['Arts & Design'],
  'philosophy': ['Philosophy & Ethics', 'Humanities'],
  'religion': ['Philosophy & Ethics'],
  'economics': ['Business & Economics'],
  'business': ['Business & Economics'],
  'engineering': ['Engineering & Technology'],
  'computer': ['Information & Communication Technologies'],
  'technology': ['Engineering & Technology', 'Information & Communication Technologies'],
  'geography': ['Environmental Studies', 'Social Sciences'],
  'ecology': ['Environmental Studies', 'Natural Sciences'],
  'politics': ['Law & Governance', 'Social Sciences'],
  'law': ['Law & Governance'],
  'sociology': ['Social Sciences'],
  'psychology': ['Social Sciences', 'Health & Welfare'],
  'medicine': ['Health & Welfare'],
  'health': ['Health & Welfare'],
  'language': ['Language & Linguistics'],
  'education': ['Education'],
};

// ── Bloom level ordering ──────────────────────────────────────────────

const BLOOM_ORDER: BloomLevel[] = [
  'remember', 'understand', 'apply', 'analyse', 'evaluate', 'create',
];

function bloomIndex(level: BloomLevel): number {
  return BLOOM_ORDER.indexOf(level);
}

// ── Difficulty ordering ───────────────────────────────────────────────

const DIFFICULTY_ORDER: Difficulty[] = ['introductory', 'intermediate', 'advanced'];

function difficultyIndex(level: Difficulty): number {
  return DIFFICULTY_ORDER.indexOf(level);
}

// ── Pedagogy approach ↔ bias mapping ──────────────────────────────────

/**
 * Maps PedagogyBias values to preferred pedagogical approach strings
 * in the marketplace data.
 */
const APPROACH_LABEL_TO_APPROACHES: Record<PedagogyApproachLabel, string[]> = {
  'constructivist': ['inquiry', 'project-based', 'collaborative', 'socratic'],
  'constructivist-progressive': ['inquiry', 'project-based', 'collaborative', 'socratic', 'gamified'],
  'progressive': ['gamified', 'collaborative', 'project-based', 'flipped'],
  'essentialist-constructivist': ['inquiry', 'socratic', 'direct-instruction'],
  'balanced': ['inquiry', 'direct-instruction', 'collaborative', 'gamified', 'project-based', 'socratic', 'flipped'],
  'essentialist': ['direct-instruction'],
  'essentialist-behaviorist': ['direct-instruction'],
  'behaviorist': ['direct-instruction', 'gamified'],
  'behaviorist-progressive': ['gamified', 'direct-instruction', 'flipped'],
};

// ── Duration parsing ──────────────────────────────────────────────────

/**
 * Parse "30 minutes", "1 hour", "1.5 hours", "45 min" etc. → minutes.
 */
function parseDurationMinutes(duration: string): number {
  const lower = duration.toLowerCase().trim();

  // "X hours Y minutes" pattern
  const hoursMinutes = lower.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?(?:\s+(\d+)\s*m(?:in(?:utes?)?)?)?/);
  if (hoursMinutes) {
    const hours = parseFloat(hoursMinutes[1]);
    const mins = hoursMinutes[2] ? parseInt(hoursMinutes[2], 10) : 0;
    return Math.round(hours * 60 + mins);
  }

  // "X minutes" / "X min" pattern
  const minutesMatch = lower.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/);
  if (minutesMatch) {
    return Math.round(parseFloat(minutesMatch[1]));
  }

  // Just a number — assume minutes
  const justNumber = lower.match(/^(\d+)$/);
  if (justNumber) {
    return parseInt(justNumber[1], 10);
  }

  return 0; // Unknown format — don't filter
}

// ── Core filter + rank function ───────────────────────────────────────

/**
 * Filter and rank marketplace assets based on the given criteria.
 * Items that don't pass hard filters are excluded; the rest are scored
 * and returned sorted by relevance (highest first).
 */
export function filterMarketplaceAssets(
  assets: ForgeAsset[],
  criteria: MarketplaceFilterCriteria,
): ScoredForgeAsset[] {
  const {
    searchTerm,
    iscedPath,
    categories,
    gradeLevels,
    maxDifficulty,
    bloomFloor,
    pedagogyApproach,
    maxDurationMinutes,
    interactivityTypes,
    language,
    domains,
    topicKeywords,
    freeOnly,
    limit,
  } = criteria;

  const termLower = searchTerm?.trim().toLowerCase() ?? '';
  const topicKeywordsLower = (topicKeywords ?? []).map((k) => k.toLowerCase());

  // Resolve ISCED → marketplace domains
  const iscedDomains = resolveISCEDMarketplaceDomains(iscedPath);

  // Combine explicit domains with ISCED-derived domains
  const targetDomains = new Set<string>([
    ...(domains ?? []),
    ...iscedDomains,
  ]);

  // Preferred approaches for the current pedagogy approach
  const preferredApproaches = pedagogyApproach ? APPROACH_LABEL_TO_APPROACHES[pedagogyApproach] ?? [] : [];

  const results: ScoredForgeAsset[] = [];

  for (const asset of assets) {
    const reasons: string[] = [];
    let score = 0;

    // ── Hard filters ────────────────────────────────────────────

    // Category filter
    if (categories && categories.length > 0) {
      if (!categories.includes(asset.assetCategory)) continue;
    }

    // Language filter
    if (language && asset.language !== language) continue;

    // Free-only filter
    if (freeOnly && asset.price != null && asset.price > 0) continue;

    // Duration filter
    if (maxDurationMinutes && maxDurationMinutes > 0) {
      const assetMins = parseDurationMinutes(asset.estimatedDuration);
      if (assetMins > 0 && assetMins > maxDurationMinutes) continue;
    }

    // Interactivity type filter
    if (interactivityTypes && interactivityTypes.length > 0) {
      if (!interactivityTypes.includes(asset.interactivityType)) continue;
    }

    // Text search filter
    if (termLower) {
      const searchable = [asset.title, asset.description, ...asset.topicTags].join(' ').toLowerCase();
      if (!searchable.includes(termLower)) continue;
      reasons.push('matches search term');
      score += 10;
    }

    // ── Soft scoring ────────────────────────────────────────────

    // Domain match
    if (targetDomains.size > 0) {
      const domainMatch = asset.subjectDomains.some((d) => targetDomains.has(d));
      if (domainMatch) {
        score += 25;
        reasons.push('domain match');
      } else {
        score -= 15;
      }
    }

    // Grade level match
    if (gradeLevels && gradeLevels.length > 0) {
      const gradeMatch = asset.gradeLevel.some((g) => gradeLevels.includes(g));
      if (gradeMatch) {
        score += 20;
        reasons.push('grade level match');
      } else {
        score -= 10;
      }
    }

    // Difficulty match
    if (maxDifficulty) {
      const maxIdx = difficultyIndex(maxDifficulty);
      const assetIdx = difficultyIndex(asset.difficulty);
      if (assetIdx <= maxIdx) {
        // At or below max difficulty
        score += 10;
        if (assetIdx === maxIdx) {
          reasons.push('exact difficulty match');
        } else {
          reasons.push('within difficulty range');
        }
      } else {
        score -= 10;
        reasons.push('above max difficulty');
      }
    }

    // Bloom level match
    if (bloomFloor) {
      const floorIdx = bloomIndex(bloomFloor);
      const assetBloomMax = Math.max(...asset.bloomLevel.map(bloomIndex));
      if (assetBloomMax >= floorIdx) {
        score += 15;
        reasons.push('meets Bloom floor');
      } else {
        score -= 5;
      }
    }

    // Pedagogy approach match
    if (preferredApproaches.length > 0) {
      const approachOverlap = asset.pedagogicalApproach.filter((a) =>
        preferredApproaches.includes(a),
      );
      if (approachOverlap.length > 0) {
        score += approachOverlap.length * 8;
        reasons.push(`pedagogy match: ${approachOverlap.join(', ')}`);
      }
    }

    // Topic keyword relevance — strongest signal
    if (topicKeywordsLower.length > 0) {
      const assetText = [asset.title, asset.description, ...asset.topicTags].join(' ').toLowerCase();
      let keywordHits = 0;
      for (const kw of topicKeywordsLower) {
        const words = kw.split(/\s+/).filter(Boolean);
        if (words.every((w) => assetText.includes(w))) {
          keywordHits++;
        }
      }
      if (keywordHits > 0) {
        score += keywordHits * 15;
        reasons.push(`${keywordHits} topic keyword match${keywordHits > 1 ? 'es' : ''}`);
      }
    }

    // Tag overlap
    if (topicKeywordsLower.length > 0) {
      const tagMatches = asset.topicTags.filter((tag) =>
        topicKeywordsLower.some(
          (kw) => tag.toLowerCase().includes(kw) || kw.includes(tag.toLowerCase()),
        ),
      );
      if (tagMatches.length > 0) {
        score += tagMatches.length * 5;
        reasons.push(`${tagMatches.length} tag overlap${tagMatches.length > 1 ? 's' : ''}`);
      }
    }

    // Quality boost — higher rated and more downloaded assets get a small boost
    score += Math.min(asset.ratingAverage * 2, 10);   // max +10 for 5-star
    score += Math.min(Math.log10(asset.downloadCount + 1) * 3, 10); // max ~10

    // Base score — every item that passes hard filters gets a minimum
    score = Math.max(score, 1);

    results.push({ asset, score, matchReasons: reasons });
  }

  // Sort by score descending, then by rating, then alphabetically
  results.sort(
    (a, b) =>
      b.score - a.score ||
      b.asset.ratingAverage - a.asset.ratingAverage ||
      a.asset.title.localeCompare(b.asset.title),
  );

  if (limit && limit > 0) {
    return results.slice(0, limit);
  }

  return results;
}

// ── Convenience: filter from fingerprint ──────────────────────────────

/**
 * Build filter criteria from a CourseFingerprint and apply it to the
 * given assets. This is the one-liner that the media sidebar calls.
 */
export function filterByFingerprint(
  assets: ForgeAsset[],
  fingerprint: CourseFingerprint,
  lessonIndex?: number,
  searchTerm?: string,
): ScoredForgeAsset[] {
  const iscedPath: ISCEDPath | null = (fingerprint.classification.domain || fingerprint.classification.subject || fingerprint.classification.topic)
    ? {
        domain: fingerprint.classification.domain ?? '',
        subject: fingerprint.classification.subject ?? '',
        topic: fingerprint.classification.topic ?? '',
        subtopic: fingerprint.classification.subtopic,
      }
    : null;

  // Derive grade levels from class_year
  const gradeLevels = fingerprint.classification.classYear
    ? classYearToGradeLevels(fingerprint.classification.classYear)
    : undefined;

  // Derive max difficulty from depth
  const depthToMaxDifficulty: Record<DepthLevel, Difficulty> = {
    'foundation': 'introductory',
    'intermediate': 'intermediate',
    'advanced': 'advanced',
  };
  const depth = fingerprint.classification.classYear
    ? classYearToDepthLevel(fingerprint.classification.classYear)
    : 'intermediate';
  const maxDifficulty = depthToMaxDifficulty[depth];

  // Derive pedagogy approach label from coordinates → bias → label
  let pedagogyApproach: PedagogyApproachLabel | undefined;
  if (fingerprint.pedagogyCoordinates) {
    const bias = derivePedagogyBias(fingerprint.pedagogyCoordinates);
    pedagogyApproach = derivePedagogyApproachLabel(bias);
  }

  // Max duration from schedule
  const maxDurationMinutes = fingerprint.schedule?.lessonDuration ?? undefined;

  // Collect topic keywords from curriculum
  let topicKeywords: string[] = [];
  if (lessonIndex !== undefined) {
    let idx = 0;
    for (const mod of fingerprint.modules) {
      for (const lesson of mod.lessons) {
        if (idx === lessonIndex) {
          topicKeywords = [...lesson.topics, ...lesson.objectives];
          break;
        }
        idx++;
      }
    }
  } else {
    for (const mod of fingerprint.modules) {
      for (const lesson of mod.lessons) {
        topicKeywords.push(...lesson.topics);
      }
    }
  }

  // Also extract keywords from the course name / description
  const courseKeywords = extractKeywords(
    `${fingerprint.courseName} ${fingerprint.courseDescription}`,
  );
  topicKeywords.push(...courseKeywords);
  topicKeywords = [...new Set(topicKeywords.filter(Boolean))];

  return filterMarketplaceAssets(assets, {
    searchTerm,
    iscedPath,
    gradeLevels,
    maxDifficulty,
    pedagogyApproach,
    maxDurationMinutes,
    topicKeywords,
    language: fingerprint.language || undefined,
  });
}

// ── Internal helpers ──────────────────────────────────────────────────

function resolveISCEDMarketplaceDomains(iscedPath: ISCEDPath | null | undefined): string[] {
  if (!iscedPath) return [];

  const result = new Set<string>();

  const broadCode = iscedPath.domain?.match(/^(\d{2})/)?.[1];
  if (broadCode && ISCED_TO_MARKETPLACE_DOMAIN[broadCode]) {
    for (const d of ISCED_TO_MARKETPLACE_DOMAIN[broadCode]) result.add(d);
  }

  const labels = [iscedPath.domain, iscedPath.subject, iscedPath.topic, iscedPath.subtopic]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [keyword, domains] of Object.entries(MARKETPLACE_DOMAIN_KEYWORDS)) {
    if (labels.includes(keyword)) {
      for (const d of domains) result.add(d);
    }
  }

  return Array.from(result);
}

function classYearToGradeLevels(classYear: string): GradeLevel[] {
  const lower = classYear.toLowerCase();
  const numMatch = lower.match(/(\d+)/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n <= 5) return ['3-5'];
    if (n <= 8) return ['3-5', '6-8'];
    if (n <= 12) return ['6-8', '9-12'];
    return ['9-12', 'higher-ed'];
  }
  if (/undergraduate|university|college|graduate|master|phd|doctoral/i.test(lower)) return ['higher-ed'];
  if (/secondary|high.?school/i.test(lower)) return ['9-12'];
  if (/middle/i.test(lower)) return ['6-8'];
  return ['3-5', '6-8'];
}

type DepthLevelLocal = 'foundation' | 'intermediate' | 'advanced';

function classYearToDepthLevel(classYear: string): DepthLevelLocal {
  const lower = classYear.toLowerCase();
  const numMatch = lower.match(/(\d+)/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n <= 6) return 'foundation';
    if (n <= 10) return 'intermediate';
    return 'advanced';
  }
  if (/undergraduate|university|college|graduate|master|phd|doctoral/i.test(lower)) return 'advanced';
  if (/secondary|high.?school/i.test(lower)) return 'intermediate';
  return 'foundation';
}

function extractKeywords(text: string): string[] {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'it', 'its',
    'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she',
    'they', 'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your',
    'his', 'their', 'not', 'no', 'nor', 'so', 'as', 'if', 'then',
    'than', 'too', 'very', 'just', 'about', 'above', 'after', 'again',
    'also', 'any', 'because', 'before', 'between', 'both', 'each',
    'few', 'into', 'more', 'most', 'other', 'over', 'same', 'some',
    'such', 'through', 'under', 'until', 'up', 'well', 'what', 'when',
    'where', 'which', 'while', 'who', 'whom', 'why', 'how', 'all',
    'course', 'introduction', 'class', 'lesson', 'unit', 'module',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Derive a pedagogy approach label from a PedagogyBias.
 * Uses constructivism level and interactivity to bucket into one of the
 * nine approach labels that map to concrete method preferences.
 */
function derivePedagogyApproachLabel(bias: PedagogyBias): PedagogyApproachLabel {
  const c = bias.constructivism; // 0-100
  const inter = bias.interactivity;

  if (c >= 70) {
    return inter === 'active' ? 'constructivist-progressive' : 'constructivist';
  }
  if (c >= 50) {
    return inter === 'active' ? 'progressive' : 'essentialist-constructivist';
  }
  if (c >= 30) {
    return 'balanced';
  }
  if (c >= 15) {
    return inter === 'active' ? 'behaviorist-progressive' : 'essentialist-behaviorist';
  }
  return inter === 'active' ? 'behaviorist-progressive' : 'behaviorist';
}
