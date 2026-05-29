export type GuidanceIscedNode = {
  value: string
  label: string
  code: string
}

export type GuidanceIscedSubtopic = GuidanceIscedNode

export type GuidanceIscedTopic = GuidanceIscedNode & {
  subtopics: GuidanceIscedSubtopic[]
}

export type GuidanceIscedSubject = GuidanceIscedNode & {
  topics: GuidanceIscedTopic[]
}

export type GuidanceIscedDomain = GuidanceIscedNode & {
  subjects: GuidanceIscedSubject[]
}

export type SuggestedIscedPath = {
  domain: GuidanceIscedDomain
  subject: GuidanceIscedSubject
  topic: GuidanceIscedTopic
  subtopic: GuidanceIscedSubtopic | null
  confidence: "strong" | "partial" | "low"
}

export type ClassificationGuidance = {
  suggestedPath: SuggestedIscedPath | null
  keyTerms: string[]
  mandatoryTopics: string[]
  priorKnowledge: string
  applicationContext: string
}

export type ClassificationGuidanceInput = {
  courseTitle?: string | null
  courseSubtitle?: string | null
  courseDescription?: string | null
  classYear?: string | null
  currentDomain?: string | null
  currentSubject?: string | null
  currentTopic?: string | null
  currentSubtopic?: string | null
  domains: GuidanceIscedDomain[]
}

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "based",
  "basic",
  "before",
  "build",
  "course",
  "courses",
  "create",
  "designed",
  "each",
  "from",
  "grade",
  "have",
  "into",
  "learn",
  "learning",
  "lesson",
  "lessons",
  "level",
  "overview",
  "students",
  "study",
  "teacher",
  "that",
  "their",
  "this",
  "through",
  "understand",
  "with",
])

const SUBJECT_HINTS: Array<{ triggers: string[]; additions: string[] }> = [
  {
    triggers: ["algebra", "calculus", "equation", "equations", "function", "functions", "geometry", "trigonometry"],
    additions: ["mathematics", "statistics"],
  },
  {
    triggers: ["biology", "cell", "cells", "genetics", "ecology", "photosynthesis"],
    additions: ["biology", "biochemistry", "science"],
  },
  {
    triggers: ["chemistry", "chemical", "molecule", "molecules", "reaction", "reactions"],
    additions: ["chemistry", "science"],
  },
  {
    triggers: ["physics", "force", "forces", "mechanics", "motion", "energy"],
    additions: ["physics", "science"],
  },
  {
    triggers: ["coding", "computer", "javascript", "programming", "python", "software"],
    additions: ["computer", "software", "information", "communication", "technology"],
  },
  {
    triggers: ["business", "entrepreneurship", "finance", "management", "marketing"],
    additions: ["business", "administration", "management"],
  },
  {
    triggers: ["english", "grammar", "language", "literature", "writing"],
    additions: ["language", "literature"],
  },
  {
    triggers: ["geography", "history", "civics", "society", "politics"],
    additions: ["social", "science", "history", "geography"],
  },
  {
    triggers: ["drawing", "music", "painting", "theatre", "visual"],
    additions: ["arts", "humanities"],
  },
]

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim()
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    const clean = value.trim()
    const key = clean.toLowerCase()
    if (!clean || seen.has(key)) return
    seen.add(key)
    result.push(clean)
  })

  return result
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => (part.length <= 3 ? part : `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`))
    .join(" ")
}

function displayNode(node: GuidanceIscedNode): string {
  return `${node.code} — ${node.label}`
}

function matchesInput(node: GuidanceIscedNode, input: string | null | undefined): boolean {
  const clean = cleanText(input)
  return clean === node.value || clean === node.label || clean === displayNode(node)
}

function scoreNode(node: GuidanceIscedNode, tokens: Set<string>, rawText: string): number {
  const label = `${node.label} ${node.value}`.toLowerCase()
  const nodeTokens = tokenize(label)
  let score = 0

  nodeTokens.forEach((token) => {
    if (tokens.has(token)) score += 8
  })

  tokens.forEach((token) => {
    if (label.includes(token)) score += 2
  })

  if (rawText.includes(node.label.toLowerCase())) score += 12
  return score
}

function expandTokens(tokens: string[]): string[] {
  const set = new Set(tokens)

  SUBJECT_HINTS.forEach((hint) => {
    if (hint.triggers.some((trigger) => set.has(trigger))) {
      hint.additions.forEach((addition) => set.add(addition))
    }
  })

  return [...set]
}

function resolveCurrentPath(input: ClassificationGuidanceInput): SuggestedIscedPath | null {
  const domain = input.domains.find((entry) => matchesInput(entry, input.currentDomain))
  const subject = domain?.subjects.find((entry) => matchesInput(entry, input.currentSubject))
  const topic = subject?.topics.find((entry) => matchesInput(entry, input.currentTopic))
  const subtopic = topic?.subtopics.find((entry) => matchesInput(entry, input.currentSubtopic)) ?? null

  if (!domain || !subject || !topic) return null
  return { domain, subject, topic, subtopic, confidence: "strong" }
}

function suggestPath(input: ClassificationGuidanceInput, tokens: Set<string>, rawText: string): SuggestedIscedPath | null {
  const currentPath = resolveCurrentPath(input)
  if (currentPath) return currentPath

  let best: { path: SuggestedIscedPath; score: number } | null = null

  for (const domain of input.domains) {
    const domainScore = scoreNode(domain, tokens, rawText)

    for (const subject of domain.subjects) {
      const subjectScore = scoreNode(subject, tokens, rawText)

      for (const topic of subject.topics) {
        const topicScore = scoreNode(topic, tokens, rawText)
        const topSubtopic = topic.subtopics
          .map((subtopic) => ({ subtopic, score: scoreNode(subtopic, tokens, rawText) }))
          .sort((a, b) => b.score - a.score)[0]
        const score = domainScore + subjectScore * 2 + topicScore * 3 + (topSubtopic?.score ?? 0)

        if (!best || score > best.score) {
          best = {
            path: {
              domain,
              subject,
              topic,
              subtopic: topSubtopic && topSubtopic.score > 0 ? topSubtopic.subtopic : null,
              confidence: score >= 34 ? "strong" : score >= 14 ? "partial" : "low",
            },
            score,
          }
        }
      }
    }
  }

  if (!best || best.score < 8) return null
  return best.path
}

function extractTermCandidates(text: string): string[] {
  const tokens = tokenize(text)
  const phrases: string[] = []

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const first = tokens[index]
    const second = tokens[index + 1]
    if (!first || !second) continue
    phrases.push(titleCase(`${first} ${second}`))
  }

  return unique([...phrases, ...tokens.map(titleCase)])
}

export function buildClassificationGuidance(input: ClassificationGuidanceInput): ClassificationGuidance {
  const rawSource = [
    input.courseTitle,
    input.courseSubtitle,
    input.courseDescription,
    input.classYear,
    input.currentDomain,
    input.currentSubject,
    input.currentTopic,
    input.currentSubtopic,
  ].map(cleanText).filter(Boolean).join(" ")

  const rawText = rawSource.toLowerCase()
  const expandedTokens = expandTokens(tokenize(rawSource))
  const tokenSet = new Set(expandedTokens)
  const suggestedPath = suggestPath(input, tokenSet, rawText)
  const pathLabels = suggestedPath
    ? [suggestedPath.subject.label, suggestedPath.topic.label, suggestedPath.subtopic?.label].filter(Boolean) as string[]
    : []

  const keyTerms = unique([
    ...extractTermCandidates(rawSource),
    ...pathLabels,
  ]).slice(0, 8)

  const mandatoryTopics = unique([
    suggestedPath?.topic.label ?? "",
    suggestedPath?.subtopic?.label ?? "",
    ...extractTermCandidates(`${input.courseTitle ?? ""} ${input.courseDescription ?? ""}`).slice(0, 6),
  ]).slice(0, 5)

  const subjectLabel = suggestedPath?.subject.label ?? "the subject"
  const topicLabel = suggestedPath?.topic.label ?? "the course topic"
  const levelText = cleanText(input.classYear) || "the selected class year"

  return {
    suggestedPath,
    keyTerms,
    mandatoryTopics,
    priorKnowledge: `Students should be ready for ${levelText} work in ${subjectLabel}, including foundational vocabulary and basic problem-solving routines related to ${topicLabel}.`,
    applicationContext: `Use examples and practice tasks that connect ${topicLabel} to the course description, student level, and the institution's teaching context.`,
  }
}

export function formatSuggestedPathLabel(path: SuggestedIscedPath): string {
  return [path.domain.label, path.subject.label, path.topic.label, path.subtopic?.label]
    .filter(Boolean)
    .join(" / ")
}
