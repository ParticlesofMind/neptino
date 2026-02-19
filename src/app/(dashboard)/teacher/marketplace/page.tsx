import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function TeacherMarketplacePage() {
  return (
    <PageSection
      title="Marketplace"
      description="Discover templates and reusable learning assets."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Featured Packs"
          description="Browse featured content packs and teaching resources."
        />
        <InfoCard
          title="Recently Added"
          description="14 new template and media packs were published this week."
        />
      </div>
    </PageSection>
  )
}
