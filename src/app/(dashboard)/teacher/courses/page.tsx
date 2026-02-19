import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function TeacherCoursesPage() {
  return (
    <PageSection
      title="My Courses"
      description="Create, organize, and publish your course library."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Active Courses"
          description="You currently have 5 active courses."
        />
        <InfoCard
          title="Drafts"
          description="2 courses are saved as drafts."
        />
      </div>
    </PageSection>
  )
}
