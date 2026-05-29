import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchWikidataEntities } from "@/lib/atlas/wikidata"
import type { AtlasItem } from "@/types/atlas"

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const queryText = params.get("q")?.trim() ?? ""
  const limit = Math.min(Math.max(Number.parseInt(params.get("limit") ?? "8", 10) || 8, 1), 20)
  const type = params.get("type")?.trim() ?? ""
  const includeExternal = params.get("external") === "1"

  const supabase = await createClient()
  let query = supabase
    .from("encyclopedia_items")
    .select("id,wikidata_id,title,knowledge_type,sub_type,domain,secondary_domains,era_group,era_label,depth,summary,tags,metadata,created_at")
    .order("title", { ascending: true })
    .limit(limit)

  if (queryText.length > 2) {
    query = query.textSearch("search_vector", queryText, { type: "websearch", config: "english" })
  }
  if (type) {
    query = query.eq("knowledge_type", type)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const external = includeExternal && queryText.length > 2
    ? await searchWikidataEntities(queryText, 5).catch(() => [])
    : []

  return NextResponse.json({
    items: (data ?? []) as AtlasItem[],
    external: external.map((item) => ({
      id: item.id ?? "",
      label: item.label ?? item.title ?? item.id ?? "",
      description: item.description ?? null,
      url: item.concepturi ?? (item.id ? `https://www.wikidata.org/wiki/${item.id}` : null),
    })),
  })
}
