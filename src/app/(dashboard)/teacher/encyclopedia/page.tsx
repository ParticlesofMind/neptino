import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function TeacherEncyclopediaPage() {
  return (
    <PageSection
      title="Encyclopedia"
      description="Browse people, concepts, and key events for course content."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Knowledge Library"
          description="Use this space to curate references for lessons."
        />
        <InfoCard
          title="Saved Collections"
          description="Create topical collections for quick course reuse."
        />
      </div>
    </PageSection>
  )
}
