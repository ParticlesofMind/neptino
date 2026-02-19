import { MetricCard, PageSection } from "@/components/ui/page-section"

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
    </PageSection>
  )
}
