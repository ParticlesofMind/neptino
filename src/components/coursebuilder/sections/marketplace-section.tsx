"use client"

import { useState, useCallback } from "react"
import {
  FieldLabel,
  TextInput,
  SelectInput,
  updateCourseById,
  useCourseRowLoader,
  useDebouncedChangeSave,
  SetupSection,
  SetupPanels,
} from "@/components/coursebuilder"
import { OverlineLabel } from "@/components/ui/overline-label"

export function MarketplaceSection({ courseId }: { courseId: string | null }) {
  const [listingStatus, setListingStatus] = useState("draft")
  const [targetAudience, setTargetAudience] = useState("")
  const [revenueShare, setRevenueShare] = useState(30)
  const [distribution, setDistribution] = useState("")

  useCourseRowLoader<{ marketplace_settings: Record<string, unknown> | null }>({
    courseId,
    select: "marketplace_settings",
    onLoaded: (row) => {
      const m = row.marketplace_settings
      if (!m) return
      setListingStatus((m.listing_status as string) ?? "draft")
      setTargetAudience((m.target_audience as string) ?? "")
      setRevenueShare((m.revenue_share as number) ?? 30)
      setDistribution((m.distribution_channels as string) ?? "")
    },
  })

  const handleSave = useCallback(async () => {
    if (!courseId) return
    await updateCourseById(courseId, {
      marketplace_settings: {
        listing_status:        listingStatus,
        target_audience:       targetAudience,
        revenue_share:         revenueShare,
        distribution_channels: distribution,
      },
      updated_at: new Date().toISOString(),
    })
  }, [courseId, listingStatus, targetAudience, revenueShare, distribution])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  return (
    <SetupSection title="Marketplace" description="Configure how your course appears in the Neptino marketplace.">
      <SetupPanels
        config={(
          <div className="space-y-4">
            <div>
              <FieldLabel>Listing Status</FieldLabel>
              <SelectInput value={listingStatus} onChange={(e) => setListingStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
                <option value="published">Published</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Target Audience</FieldLabel>
              <TextInput
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Grade 11 Humanities"
              />
            </div>
            <div>
              <FieldLabel hint="0–100">Revenue Share (%)</FieldLabel>
              <TextInput
                type="number"
                min={0}
                max={100}
                value={revenueShare}
                onChange={(e) => setRevenueShare(Math.min(100, Math.max(0, Number(e.target.value))))}
                placeholder="30"
              />
            </div>
            <div>
              <FieldLabel hint="optional">Distribution Channels</FieldLabel>
              <textarea
                rows={3}
                value={distribution}
                onChange={(e) => setDistribution(e.target.value)}
                placeholder="List marketplaces or partner channels"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
        )}
        preview={(
          <div className="rounded-lg border border-border bg-background p-4 space-y-2.5">
            <OverlineLabel>Marketplace Preview</OverlineLabel>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className="font-medium text-foreground">{listingStatus}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Audience</span><span className="font-medium text-foreground text-right max-w-[60%]">{targetAudience || "—"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Revenue Share</span><span className="font-medium text-foreground">{revenueShare}%</span></div>
            <div className="pt-1 text-xs text-muted-foreground">{distribution || "No distribution channels configured."}</div>
          </div>
        )}
      />
    </SetupSection>
  )
}
