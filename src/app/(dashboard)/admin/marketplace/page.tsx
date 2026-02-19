import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function AdminMarketplacePage() {
  return (
    <PageSection
      title="Marketplace"
      description="Manage marketplace listings, moderate content, and track platform-wide activity."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Pending Listings"
          description="Review and approve course templates and resources submitted by teachers."
        />
        <InfoCard
          title="Featured Content"
          description="Pin and promote selected packs to the top of the marketplace discovery feed."
        />
        <InfoCard
          title="Category Management"
          description="Create and organise marketplace categories visible to students and teachers."
        />
        <InfoCard
          title="Revenue & Analytics"
          description="Track marketplace engagement, downloads, and activity metrics across all roles."
        />
      </div>
    </PageSection>
  )
}
