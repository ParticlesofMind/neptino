import { InfoCard, MetricCard, PageSection } from "@/components/ui/page-section"

export default function StudentProgressPage() {
  return (
    <div className="space-y-8">
      {/* Summary metrics */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Overview</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Courses In Progress" value="3" />
          <MetricCard label="Lessons Completed" value="24" />
          <MetricCard label="Assignments Submitted" value="18" />
        </div>
      </div>

      {/* Progress breakdown */}
      <PageSection
        title="Progress"
        description="Track your learning activity across all enrolled courses."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard
            title="Current Courses"
            description="See detailed progress for each course you are currently enrolled in."
          />
          <InfoCard
            title="Completed Courses"
            description="Review courses you have fully completed and download certificates."
          />
          <InfoCard
            title="Assignments"
            description="View submitted work, pending tasks, and instructor feedback."
          />
          <InfoCard
            title="Achievements"
            description="Milestones and badges earned throughout your learning journey."
          />
        </div>
      </PageSection>
    </div>
  )
}
