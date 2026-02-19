import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function AdminTutorialsPage() {
  return (
    <PageSection
      title="Tutorials"
      description="Manage platform help content, onboarding guides, and documentation for all roles."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Teacher Guides"
          description="Onboarding walkthroughs and how-to articles for course creation and the Course Builder."
        />
        <InfoCard
          title="Student Guides"
          description="Help content for navigating the platform, joining classes, and using messaging."
        />
        <InfoCard
          title="Admin Documentation"
          description="Platform administration references, user management flows, and configuration guides."
        />
        <InfoCard
          title="Release Notes"
          description="Changelog and feature announcements distributed to all platform users."
        />
      </div>
    </PageSection>
  )
}
