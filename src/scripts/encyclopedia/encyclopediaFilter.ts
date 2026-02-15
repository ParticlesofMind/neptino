/**
 * Encyclopedia Filter API
 *
 * Provides structured, fingerprint-driven filtering and ranking of
 * KnowledgeItem[] arrays. This module is UI-agnostic — it works with
 * plain data and returns sorted results.
 *
 * Used by both the encyclopedia page (encyclopedia.ts) and the
 * coursebuilder media sidebar (MediaInterface.ts).
 *
 * See: Course Builder Architecture §3.1, §5.2
 */

import type {
  CourseFingerprint,
  ISCEDPath,
  DepthLevel,
} from '../backend/courses/context/CourseFingerprint';

// ── Types (mirrored from encyclopedia.ts to avoid coupling) ───────────

export type EntityType =
  | 'Person'
  | 'Event'
  | 'Location'
  | 'Concept / Theory'
  | 'Invention / Technology'
  | 'Work'
  | 'Institution'
  | 'Movement / School'
  | 'Era / Period';

export interface KnowledgeItem {
  id: string;
  title: string;
  wikidataId?: string;
  knowledgeType: EntityType;
  domain: string;
  secondaryDomains: string[];
  eraGroup: 'ancient' | 'early-modern' | 'modern' | 'contemporary';
  eraLabel: string;
  depth: 'foundation' | 'intermediate' | 'advanced';
  summary: string;
  tags: string[];
}

// ── Filter criteria ───────────────────────────────────────────────────

export interface EncyclopediaFilterCriteria {
  /** Free-text search term (searches title, summary, tags). */
  searchTerm?: string;

  /** ISCED path from the course classification. */
  iscedPath?: ISCEDPath | null;

  /** Desired depth from grade level + assessment scores. */
  depth?: DepthLevel;

  /** Entity types to include (empty = all). */
  entityTypes?: EntityType[];

  /** Era groups to include (empty = all). */
  eraGroups?: Array<'ancient' | 'early-modern' | 'modern' | 'contemporary'>;

  /** Explicit domain strings to include (empty = all). */
  domains?: string[];

  /** Curriculum topic names — used for keyword relevance scoring. */
  topicKeywords?: string[];

  /** Maximum number of results to return. */
  limit?: number;
}

// ── Scored result ─────────────────────────────────────────────────────

export interface ScoredKnowledgeItem {
  item: KnowledgeItem;
  score: number;      // 0-100 relevance score
  matchReasons: string[];
}

// ── ISCED domain → encyclopedia domain mapping ────────────────────────

/**
 * Maps ISCED domain codes (e.g. "05-natural-sciences") and their labels
 * to the human-readable encyclopedia domain strings.
 *
 * This is a many-to-many fuzzy mapping. An ISCED code can map to multiple
 * encyclopedia domains, and vice versa.
 */
const ISCED_TO_ENCYCLOPEDIA_DOMAIN: Record<string, string[]> = {
  // ISCED broad fields
  '00': ['Philosophy & Religion', 'Arts, Literature & Culture'],
  '01': ['Arts, Literature & Culture', 'Society & Social Movements'],
  '02': ['Arts, Literature & Culture'],
  '03': ['Society & Social Movements', 'Politics & Governance'],
  '04': ['Economics & Commerce'],
  '05': ['Sciences', 'Technology & Engineering', 'Mathematics & Logic'],
  '06': ['Technology & Engineering', 'Sciences'],
  '07': ['Technology & Engineering'],
  '08': ['Economics & Commerce', 'Society & Social Movements'],
  '09': ['Military, Conflict & Strategy', 'Politics & Governance'],
  '10': ['Society & Social Movements', 'Exploration & Environment'],
};

/**
 * Keyword-based fallback when ISCED codes aren't specific enough.
 * Maps lowercase keywords to encyclopedia domain names.
 */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  'physics': ['Sciences', 'Technology & Engineering'],
  'chemistry': ['Sciences'],
  'biology': ['Sciences', 'Exploration & Environment'],
  'mathematics': ['Mathematics & Logic'],
  'math': ['Mathematics & Logic'],
  'history': ['Politics & Governance', 'Military, Conflict & Strategy', 'Society & Social Movements'],
  'literature': ['Arts, Literature & Culture'],
  'art': ['Arts, Literature & Culture'],
  'music': ['Arts, Literature & Culture'],
  'philosophy': ['Philosophy & Religion'],
  'religion': ['Philosophy & Religion'],
  'economics': ['Economics & Commerce'],
  'business': ['Economics & Commerce'],
  'engineering': ['Technology & Engineering'],
  'computer': ['Technology & Engineering'],
  'technology': ['Technology & Engineering'],
  'geography': ['Exploration & Environment'],
  'ecology': ['Exploration & Environment', 'Sciences'],
  'politics': ['Politics & Governance'],
  'law': ['Politics & Governance', 'Society & Social Movements'],
  'sociology': ['Society & Social Movements'],
  'psychology': ['Society & Social Movements', 'Sciences'],
  'medicine': ['Sciences'],
  'health': ['Sciences'],
  'military': ['Military, Conflict & Strategy'],
  'war': ['Military, Conflict & Strategy'],
  'exploration': ['Exploration & Environment'],
  'navigation': ['Exploration & Environment', 'Technology & Engineering'],
};

// ── Core filter + rank function ───────────────────────────────────────

/**
 * Filter and rank encyclopedia items based on the given criteria.
 * Items that don't pass hard filters are excluded; the rest are scored
 * and returned sorted by relevance (highest first).
 */
export function filterEncyclopediaItems(
  items: KnowledgeItem[],
  criteria: EncyclopediaFilterCriteria,
): ScoredKnowledgeItem[] {
  const {
    searchTerm,
    iscedPath,
    depth,
    entityTypes,
    eraGroups,
    domains,
    topicKeywords,
    limit,
  } = criteria;

  const termLower = searchTerm?.trim().toLowerCase() ?? '';
  const topicKeywordsLower = (topicKeywords ?? []).map((k) => k.toLowerCase());

  // Resolve ISCED path to encyclopedia domain names
  const iscedDomains = resolveISCEDDomains(iscedPath);

  // Combine explicit domains with ISCED-derived domains
  const targetDomains = new Set<string>([
    ...(domains ?? []),
    ...iscedDomains,
  ]);

  const results: ScoredKnowledgeItem[] = [];

  for (const item of items) {
    const reasons: string[] = [];
    let score = 0;

    // ── Hard filters (exclude on fail) ──────────────────────────

    // Entity type filter
    if (entityTypes && entityTypes.length > 0) {
      if (!entityTypes.includes(item.knowledgeType)) continue;
    }

    // Era filter
    if (eraGroups && eraGroups.length > 0) {
      if (!eraGroups.includes(item.eraGroup)) continue;
    }

    // Text search filter
    if (termLower) {
      const searchable = [item.title, item.summary, ...item.tags].join(' ').toLowerCase();
      if (!searchable.includes(termLower)) continue;
      reasons.push('matches search term');
      score += 10;
    }

    // ── Soft scoring (boost on match) ───────────────────────────

    // Domain match — strong signal
    if (targetDomains.size > 0) {
      const allItemDomains = [item.domain, ...item.secondaryDomains];
      const domainMatch = allItemDomains.some((d) => targetDomains.has(d));
      if (domainMatch) {
        // Primary domain match is stronger
        if (targetDomains.has(item.domain)) {
          score += 30;
          reasons.push('primary domain match');
        } else {
          score += 15;
          reasons.push('secondary domain match');
        }
      } else {
        // If we have target domains and item doesn't match any, penalize heavily
        score -= 20;
      }
    }

    // Depth match
    if (depth) {
      if (item.depth === depth) {
        score += 15;
        reasons.push('depth match');
      } else {
        // Adjacent depths get partial credit
        const depthOrder: DepthLevel[] = ['foundation', 'intermediate', 'advanced'];
        const targetIdx = depthOrder.indexOf(depth);
        const itemIdx = depthOrder.indexOf(item.depth);
        const distance = Math.abs(targetIdx - itemIdx);
        if (distance === 1) {
          score += 5;
          reasons.push('adjacent depth');
        }
        // distance 2 = no score
      }
    }

    // Topic keyword relevance — strongest signal for specific content matching
    if (topicKeywordsLower.length > 0) {
      const itemText = [item.title, item.summary, ...item.tags].join(' ').toLowerCase();
      let keywordHits = 0;
      for (const kw of topicKeywordsLower) {
        // Split multi-word keywords and check each word
        const words = kw.split(/\s+/).filter(Boolean);
        if (words.every((w) => itemText.includes(w))) {
          keywordHits++;
        }
      }
      if (keywordHits > 0) {
        score += keywordHits * 20;
        reasons.push(`${keywordHits} topic keyword match${keywordHits > 1 ? 'es' : ''}`);
      }
    }

    // Tag overlap with topic keywords
    if (topicKeywordsLower.length > 0) {
      const tagMatches = item.tags.filter((tag) =>
        topicKeywordsLower.some((kw) => tag.toLowerCase().includes(kw) || kw.includes(tag.toLowerCase())),
      );
      if (tagMatches.length > 0) {
        score += tagMatches.length * 5;
        reasons.push(`${tagMatches.length} tag overlap${tagMatches.length > 1 ? 's' : ''}`);
      }
    }

    // Base score — every item that passes hard filters gets a minimum
    score = Math.max(score, 1);

    results.push({ item, score, matchReasons: reasons });
  }

  // Sort by score descending, then alphabetically by title
  results.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

  // Apply limit
  if (limit && limit > 0) {
    return results.slice(0, limit);
  }

  return results;
}

// ── Convenience: filter from fingerprint ──────────────────────────────

/**
 * Build filter criteria from a CourseFingerprint and apply it to the
 * given items. This is the one-liner that the media sidebar calls.
 *
 * @param items        Full encyclopedia dataset
 * @param fingerprint  Current course fingerprint
 * @param lessonIndex  Optional: focus on a specific lesson's topics
 * @param searchTerm   Optional: additional user text search
 */
export function filterByFingerprint(
  items: KnowledgeItem[],
  fingerprint: CourseFingerprint,
  lessonIndex?: number,
  searchTerm?: string,
): ScoredKnowledgeItem[] {
  const iscedPath: ISCEDPath | null = (fingerprint.classification.domain || fingerprint.classification.subject || fingerprint.classification.topic)
    ? {
        domain: fingerprint.classification.domain ?? '',
        subject: fingerprint.classification.subject ?? '',
        topic: fingerprint.classification.topic ?? '',
        subtopic: fingerprint.classification.subtopic,
      }
    : null;

  // Derive depth from grade level
  const gradeLevels = fingerprint.classification.classYear
    ? classYearToDepth(fingerprint.classification.classYear)
    : undefined;

  // Collect topic keywords from the curriculum
  let topicKeywords: string[] = [];
  if (lessonIndex !== undefined) {
    // Focus on a specific lesson
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
    // Use all curriculum topics
    for (const mod of fingerprint.modules) {
      for (const lesson of mod.lessons) {
        topicKeywords.push(...lesson.topics);
      }
    }
  }

  // Also extract keywords from the course name and description
  const courseKeywords = extractKeywords(
    `${fingerprint.courseName} ${fingerprint.courseDescription}`,
  );
  topicKeywords.push(...courseKeywords);

  // Deduplicate
  topicKeywords = [...new Set(topicKeywords.filter(Boolean))];

  return filterEncyclopediaItems(items, {
    searchTerm,
    iscedPath,
    depth: gradeLevels,
    topicKeywords,
  });
}

// ── Internal helpers ──────────────────────────────────────────────────

function resolveISCEDDomains(iscedPath: ISCEDPath | null | undefined): string[] {
  if (!iscedPath) return [];

  const result = new Set<string>();

  // Try the 2-digit broad field code
  const broadCode = iscedPath.domain?.match(/^(\d{2})/)?.[1];
  if (broadCode && ISCED_TO_ENCYCLOPEDIA_DOMAIN[broadCode]) {
    for (const d of ISCED_TO_ENCYCLOPEDIA_DOMAIN[broadCode]) result.add(d);
  }

  // Try keyword-based matching on the ISCED path labels
  const labels = [iscedPath.domain, iscedPath.subject, iscedPath.topic, iscedPath.subtopic]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [keyword, domains] of Object.entries(DOMAIN_KEYWORDS)) {
    if (labels.includes(keyword)) {
      for (const d of domains) result.add(d);
    }
  }

  return Array.from(result);
}

function classYearToDepth(classYear: string): DepthLevel {
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

/**
 * Extract meaningful keywords from free text, filtering out stop words.
 */
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
