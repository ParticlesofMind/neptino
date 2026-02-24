type RetrievalContext = {
  courseName: string
  courseDescription?: string
  keyTerms?: string[]
  mandatoryTopics?: string[]
}

type SourcePreference = {
  id: string
  label: string
  priority: string
}

export type SourceExcerpt = {
  sourceId: string
  sourceLabel: string
  title: string
  excerpt: string
  url?: string
}

type RetrievalResult = {
  excerpts: SourceExcerpt[]
  skipped: Array<{ sourceId: string; reason: string }>
}

const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map<string, { at: number; data: SourceExcerpt[] }>()

const SOURCE_WEIGHTS: Record<string, number> = {
  very_high: 4,
  high: 3,
  medium: 2,
  low: 1,
  very_low: 0.5,
}

const SUPPORTED_SOURCES = new Map([
  ["wikipedia", { label: "Wikipedia", fetcher: fetchMediaWikiExcerpts }],
  ["wikibooks", { label: "Wikibooks", fetcher: fetchMediaWikiExcerpts }],
  ["wikiversity", { label: "Wikiversity", fetcher: fetchMediaWikiExcerpts }],
  ["arxiv", { label: "arXiv", fetcher: fetchArxivExcerpts }],
  ["gutenberg", { label: "Project Gutenberg", fetcher: fetchGutenbergExcerpts }],
])

const MEDIAWIKI_BASE: Record<string, string> = {
  wikipedia: "https://en.wikipedia.org",
  wikibooks: "https://en.wikibooks.org",
  wikiversity: "https://en.wikiversity.org",
}

function buildQuery(context: RetrievalContext): string {
  const tokens = [
    context.courseName,
    context.courseDescription,
    ...(context.keyTerms ?? []),
    ...(context.mandatoryTopics ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  return tokens.slice(0, 240)
}

function truncate(text: string, max = 700): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 3)}...`
}

function allocateQuotas(preferences: SourcePreference[], totalBudget: number): Map<string, number> {
  const weighted = preferences.map((pref) => ({
    id: pref.id,
    weight: SOURCE_WEIGHTS[pref.priority] ?? 1,
  }))

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0) || 1
  const allocations = new Map<string, number>()

  weighted.forEach(({ id, weight }) => {
    const raw = (weight / totalWeight) * totalBudget
    const rounded = weight >= 1 ? Math.max(1, Math.round(raw)) : Math.round(raw)
    allocations.set(id, rounded)
  })

  let used = Array.from(allocations.values()).reduce((sum, n) => sum + n, 0)
  if (used > totalBudget) {
    const over = used - totalBudget
    const ids = Array.from(allocations.keys())
    for (let i = ids.length - 1; i >= 0 && used > totalBudget; i -= 1) {
      const id = ids[i]
      const current = allocations.get(id) ?? 0
      if (current > 0) {
        allocations.set(id, current - 1)
        used -= 1
      }
    }
  }

  return allocations
}

async function fetchMediaWikiExcerpts(sourceId: string, query: string, limit: number): Promise<SourceExcerpt[]> {
  const baseUrl = MEDIAWIKI_BASE[sourceId]
  if (!baseUrl) return []

  const searchUrl = `${baseUrl}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`
  const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) })
  if (!searchRes.ok) return []

  const searchData = (await searchRes.json()) as { query?: { search?: Array<{ pageid: number; title: string }> } }
  const results = searchData.query?.search ?? []

  const excerpts: SourceExcerpt[] = []
  for (const result of results) {
    const extractUrl = `${baseUrl}/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&origin=*&pageids=${result.pageid}`
    const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(8000) })
    if (!extractRes.ok) continue
    const extractData = (await extractRes.json()) as { query?: { pages?: Record<string, { extract?: string }> } }
    const page = extractData.query?.pages?.[String(result.pageid)]
    const extract = page?.extract ? truncate(page.extract) : ""
    if (!extract) continue
    excerpts.push({
      sourceId,
      sourceLabel: SUPPORTED_SOURCES.get(sourceId)?.label ?? sourceId,
      title: result.title,
      excerpt: extract,
      url: `${baseUrl}/?curid=${result.pageid}`,
    })
  }

  return excerpts
}

async function fetchArxivExcerpts(_: string, query: string, limit: number): Promise<SourceExcerpt[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return []
  const xml = await res.text()

  const entries = xml.split("<entry>").slice(1)
  return entries.slice(0, limit).map((entry) => {
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
    const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/)
    const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/)
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "arXiv entry"
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : ""
    return {
      sourceId: "arxiv",
      sourceLabel: "arXiv",
      title,
      excerpt: truncate(summary),
      url: idMatch ? idMatch[1].trim() : undefined,
    }
  }).filter((entry) => entry.excerpt)
}

async function fetchGutenbergExcerpts(_: string, query: string, limit: number): Promise<SourceExcerpt[]> {
  const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return []
  const data = (await res.json()) as { results?: Array<{ title: string; id: number }> }
  const results = data.results ?? []
  return results.slice(0, limit).map((entry) => ({
    sourceId: "gutenberg",
    sourceLabel: "Project Gutenberg",
    title: entry.title,
    excerpt: "Public domain literature reference.",
    url: `https://www.gutenberg.org/ebooks/${entry.id}`,
  }))
}

export async function retrieveSourceExcerpts(
  context: RetrievalContext,
  preferences: SourcePreference[],
  totalBudget = 8,
): Promise<RetrievalResult> {
  const query = buildQuery(context)
  if (!query) return { excerpts: [], skipped: [] }

  const quotas = allocateQuotas(preferences, totalBudget)
  const excerpts: SourceExcerpt[] = []
  const skipped: Array<{ sourceId: string; reason: string }> = []

  for (const pref of preferences) {
    const limit = quotas.get(pref.id) ?? 0
    if (limit <= 0) continue
    const sourceInfo = SUPPORTED_SOURCES.get(pref.id)
    if (!sourceInfo) {
      skipped.push({ sourceId: pref.id, reason: "Unsupported source" })
      continue
    }
    const cacheKey = `${pref.id}:${query}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      excerpts.push(...cached.data)
      continue
    }
    try {
      const fetched = await sourceInfo.fetcher(pref.id, query, limit)
      cache.set(cacheKey, { at: Date.now(), data: fetched })
      excerpts.push(...fetched)
    } catch {
      skipped.push({ sourceId: pref.id, reason: "Fetch failed" })
    }
  }

  return { excerpts, skipped }
}
