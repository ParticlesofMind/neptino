import { InfoCard, MetricCard, PageSection } from "@/components/ui/page-section"

export default function TeacherHomePage() {
  return (
    <PageSection
      title="Teacher Dashboard"
      description="Manage your courses and students."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active Courses" value="5" />
        <MetricCard label="Total Students" value="127" />
        <MetricCard label="Unread Messages" value="8" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Quick Actions"
          description="Create new course content and publish updates faster."
        />
        <InfoCard
          title="Recent Activity"
          description="View latest submissions, comments, and course updates."
        />
      </div>
    </PageSection>
  )
}
