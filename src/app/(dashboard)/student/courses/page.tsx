import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function StudentCoursesPage() {
  return (
    <PageSection
      title="Courses"
      description="View enrolled classes and continue learning."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Current Enrollments"
          description="You are currently enrolled in 6 classes."
        />
        <InfoCard
          title="Recommended Next"
          description="Continue from your last lesson or review pending assignments."
        />
      </div>
    </PageSection>
  )
}
