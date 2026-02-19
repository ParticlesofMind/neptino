import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function AdminCoursesPage() {
  return (
    <PageSection
      title="All Courses"
      description="Monitor and review all course content."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Course Moderation Queue"
          description="12 courses are awaiting review."
        />
        <InfoCard
          title="Quality Alerts"
          description="4 courses need updated metadata or missing assets."
        />
      </div>
    </PageSection>
  )
}
