import { MetricCard, PageSection } from "@/components/ui/page-section"

export default function StudentHomePage() {
  return (
    <PageSection
      title="Student Dashboard"
      description="Welcome to your learning space."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Enrolled Courses" value="6" />
        <MetricCard label="Pending Assignments" value="4" />
        <MetricCard label="Unread Messages" value="3" />
        </div>
    </PageSection>
  )
}
