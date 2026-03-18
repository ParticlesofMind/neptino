"use client"
import { useState } from "react"
import { CheckCircle2, X } from "lucide-react"

type ListingStatus = "pending" | "approved" | "rejected"

type Listing = {
  id: string
  title: string
  author: string
  type: string
  price: number | null
  submitted: string
  status: ListingStatus
}

const LISTINGS: Listing[] = [
  { id: "1", title: "Advanced Python Pack", author: "Dr. Anna Mueller", type: "Template Pack", price: 12, submitted: "Today", status: "pending" },
  { id: "2", title: "Web Dev Starter Kit", author: "James Park", type: "Template Pack", price: null, submitted: "Yesterday", status: "pending" },
  { id: "3", title: "Stats Flashcard Set", author: "Prof. Sarah Lin", type: "Resource Set", price: 5, submitted: "2 days ago", status: "pending" },
  { id: "4", title: "Data Cleaning Checklist", author: "Thomas Weber", type: "Resource Set", price: null, submitted: "4 days ago", status: "approved" },
  { id: "5", title: "CSS Animation Demos", author: "James Park", type: "Template Pack", price: 8, submitted: "1 week ago", status: "approved" },
  { id: "6", title: "Unrelated Promo Pack", author: "Unknown", type: "Template Pack", price: 99, submitted: "3 days ago", status: "rejected" },
]

const featured = [
  { title: "Data Cleaning Checklist", author: "Thomas Weber", type: "Resource Set", pinned: true },
  { title: "CSS Animation Demos", author: "James Park", type: "Template Pack", pinned: false },
]

const STATUS_FILTERS: Array<{ value: ListingStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

const statusStyle: Record<ListingStatus, string> = {
  pending: "bg-[#a89450]/10 text-[#a89450]",
  approved: "bg-[#5c9970]/10 text-[#5c9970]",
  rejected: "bg-[#b87070]/10 text-[#b87070]",
}

export default function AdminMarketplacePage() {
  const [filter, setFilter] = useState<ListingStatus | "all">("pending")

  const filtered = LISTINGS.filter((l) => filter === "all" || l.status === filter)
  const pendingCount = LISTINGS.filter((l) => l.status === "pending").length

  return (
    <div className="space-y-8">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Listings", value: String(LISTINGS.length) },
          { label: "Pending Review", value: String(pendingCount) },
          { label: "Approved", value: String(LISTINGS.filter((l) => l.status === "approved").length) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-background px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Listings review */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-foreground">Listings</h2>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "border border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
                {f.value === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {filtered.length === 0 && (
            <p className="px-5 py-8 text-sm text-muted-foreground">No listings in this category.</p>
          )}
          {filtered.map((listing) => (
            <div key={listing.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{listing.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {listing.author} &middot; {listing.type} &middot; {listing.price ? `${listing.price}N` : "Free"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{listing.submitted}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[listing.status]}`}>
                  {listing.status}
                </span>
                {listing.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-[#5c9970]/10 text-[#5c9970] transition-colors hover:bg-[#5c9970]/20"
                      aria-label="Approve"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-[#b87070]/10 text-[#b87070] transition-colors hover:bg-[#b87070]/20"
                      aria-label="Reject"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured content */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">Featured Content</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {featured.map((item) => (
            <div key={item.title} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.author} &middot; {item.type}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.pinned ? "bg-primary/10 text-primary" : "border border-border text-muted-foreground"
                }`}
              >
                {item.pinned ? "Pinned" : "Not featured"}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
