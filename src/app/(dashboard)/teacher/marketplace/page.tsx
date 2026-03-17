import { Download, Package, Search, ShoppingBag, Star, Layers, Gamepad2, BookTemplate, Cpu, Upload } from "lucide-react"
import type { MarketplaceAsset, MarketplaceAssetType } from "@/types/marketplace"

const TYPE_META: Record<MarketplaceAssetType, { label: string; color: string }> = {
  simulation:          { label: "Simulation",  color: "border-[#6b8fc4]/30 bg-[#6b8fc4]/10 text-[#6b8fc4]" },
  compound_blueprint:  { label: "Blueprint",   color: "border-[#5c9970]/30 bg-[#5c9970]/10 text-[#5c9970]" },
  lesson_template:     { label: "Template",    color: "border-primary/20 bg-primary/10 text-primary" },
  game_config:         { label: "Game",        color: "border-[#b87070]/30 bg-[#b87070]/10 text-[#b87070]" },
  card_collection:     { label: "Collection",  color: "border-[#a89450]/30 bg-[#a89450]/10 text-[#a89450]" },
}

const ASSETS: MarketplaceAsset[] = [
  {
    id: "a1", title: "Photosynthesis Interactive Sim", description: "A pre-configured simulation card for plant biology with scaffolded checkpoints and self-assessment prompts.", assetType: "simulation",
    authorId: "u1", authorName: "Dr. Amara Osei", price: 0, currency: "USD", tags: ["biology", "science"], domain: "05",
    createdAt: "2026-02-10", updatedAt: "2026-02-10", downloadCount: 412, rating: 4.7, ratingCount: 38,
  },
  {
    id: "a2", title: "Timeline + Map Blueprint", description: "A wired compound blueprint pairing a historical timeline with an interactive map. Ready to populate with your own content.", assetType: "compound_blueprint",
    authorId: "u2", authorName: "Neptino Team", price: 0, currency: "USD", tags: ["history", "geography"], domain: "02",
    createdAt: "2026-01-28", updatedAt: "2026-02-15", downloadCount: 891, rating: 4.9, ratingCount: 74,
  },
  {
    id: "a3", title: "Introductory Programming Unit", description: "Full session template for a 6-lesson introduction to programming: variables, loops, functions, and debugging.", assetType: "lesson_template",
    authorId: "u3", authorName: "Carlos Mendes", price: 499, currency: "USD", tags: ["programming", "beginner"], domain: "06",
    createdAt: "2026-01-05", updatedAt: "2026-03-01", downloadCount: 265, rating: 4.5, ratingCount: 22,
  },
  {
    id: "a4", title: "Vocabulary Pairs Game — French B1", description: "Game card config for a French vocabulary matching exercise. 60 term pairs, timed rounds, and scoring variants.", assetType: "game_config",
    authorId: "u4", authorName: "Hélène Bouchard", price: 199, currency: "USD", tags: ["french", "vocabulary", "language"], domain: "02",
    createdAt: "2026-02-20", updatedAt: "2026-02-20", downloadCount: 183, rating: 4.3, ratingCount: 17,
  },
  {
    id: "a5", title: "Climate Science Card Collection", description: "40 atlas-linked cards covering greenhouse gases, ocean systems, feedback loops, and climate policy — ready to drop into any course.", assetType: "card_collection",
    authorId: "u2", authorName: "Neptino Team", price: 0, currency: "USD", tags: ["climate", "science", "environment"], domain: "05",
    createdAt: "2026-03-01", updatedAt: "2026-03-14", downloadCount: 673, rating: 4.8, ratingCount: 51,
  },
  {
    id: "a6", title: "Newton's Laws Simulation Suite", description: "Three pre-configured physics simulations covering inertia, acceleration, and action-reaction with embedded quizzes.", assetType: "simulation",
    authorId: "u5", authorName: "Prof. James Liu", price: 299, currency: "USD", tags: ["physics", "mechanics"], domain: "05",
    createdAt: "2026-02-08", updatedAt: "2026-02-08", downloadCount: 344, rating: 4.6, ratingCount: 31,
  },
]

const TYPE_FILTERS: { key: MarketplaceAssetType | "all"; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all",               label: "All Assets",  Icon: ShoppingBag },
  { key: "simulation",        label: "Simulations", Icon: Cpu },
  { key: "compound_blueprint",label: "Blueprints",  Icon: Layers },
  { key: "lesson_template",   label: "Templates",   Icon: BookTemplate },
  { key: "game_config",       label: "Games",       Icon: Gamepad2 },
  { key: "card_collection",   label: "Collections", Icon: Package },
]

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Free"
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(price / 100)
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3 w-3 fill-[#a89450] text-[#a89450]" />
      <span className="text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  )
}

function AssetCard({ asset }: { asset: MarketplaceAsset }) {
  const type = TYPE_META[asset.assetType]
  const price = formatPrice(asset.price, asset.currency)
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-background transition hover:border-primary/30 hover:shadow-md">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${type.color}`}>
            {type.label}
          </span>
          <span className={`shrink-0 text-sm font-semibold ${asset.price === 0 ? "text-[#5c9970]" : "text-foreground"}`}>
            {price}
          </span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground leading-snug">{asset.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{asset.description}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <StarRating rating={asset.rating} count={asset.ratingCount} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="h-3 w-3" />
            {asset.downloadCount.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-xs text-muted-foreground">{asset.authorName}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/15"
        >
          {asset.acquired ? "Acquired" : asset.price === 0 ? "Add to library" : "Purchase"}
        </button>
      </div>
    </article>
  )
}

export default function TeacherMarketplacePage() {
  const metrics = [
    { label: "Assets Available", value: "1,240", sub: "+87 this month",       Icon: ShoppingBag },
    { label: "Free Assets",      value: "634",   sub: "51% of catalog",       Icon: Package },
    { label: "In My Library",    value: "14",    sub: "3 added this week",     Icon: Download },
    { label: "My Listings",      value: "2",     sub: "1 pending review",      Icon: Upload },
  ]

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Marketplace</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Browse, acquire, and publish reusable teaching assets.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <Upload className="h-4 w-4 text-primary" />
          Publish an asset
        </button>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border xl:grid-cols-4">
        {metrics.map(({ label, value, sub, Icon }) => (
          <div key={label} className="px-6 py-4">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold leading-none text-foreground">{value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Search + type filters */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search assets, topics, authors..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto rounded-md border border-border bg-muted/20 p-1">
          {TYPE_FILTERS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                key === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset grid */}
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">6</span> of 1,240 assets
          </p>
          <select className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15">
            <option>Most downloaded</option>
            <option>Highest rated</option>
            <option>Newest</option>
            <option>Price: low to high</option>
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ASSETS.map((a) => <AssetCard key={a.id} asset={a} />)}
        </div>

        {/* Coming soon notice */}
        <div className="mt-6 rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm font-medium text-foreground">More assets coming soon</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The marketplace is in early access. Publishing tools and full search are on the roadmap.
          </p>
        </div>
      </div>
    </div>
  )
}
