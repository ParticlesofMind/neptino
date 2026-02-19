import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function TeacherTutorialsPage() {
  return (
    <PageSection
      title="Tutorials"
      description="Learning guides for Neptino tools and workflows."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Getting Started"
          description="Tutorial content can be added here in sections."
        />
        <InfoCard
          title="Advanced Workflows"
          description="Deep-dive guides for course design, templates, and publishing."
        />
      </div>
    </PageSection>
  )
}
