import { InfoCard, MetricCard, WelcomeBanner, SectionHeading, ActivityItem } from "@/components/ui/page-section"
import Link from "next/link"

export default function StudentHomePage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <WelcomeBanner
        title="Welcome to Your Learning Journey"
        description="Continue where you left off or explore new courses to expand your skills."
        variant="emerald"
      />

      {/* Key Metrics */}
      <div>
        <SectionHeading>Your Progress</SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Enrolled Courses" value="6" />
          <MetricCard label="Pending Assignments" value="4" />
          <MetricCard label="Unread Messages" value="3" />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeading>Quick Actions</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            title="Continue Learning"
            description="Resume from your most recent lesson and track your progress."
          />
          <InfoCard
            title="Upcoming Deadlines"
            description="Keep track of assignment due dates and live sessions."
          />
          <InfoCard
            title="Browse Marketplace"
            description="Discover and enroll in new courses aligned with your interests."
          />
          <InfoCard
            title="View Achievements"
            description="Celebrate your learning milestones and earned badges."
          />
          <InfoCard
            title="Send Messages"
            description="Connect with instructors and classmates for support."
          />
          <InfoCard
            title="Review Feedback"
            description="Check comments and suggestions from your instructors."
          />
        </div>
      </div>

      {/* Active Courses Section */}
      <div>
        <SectionHeading>Active Courses</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/student/courses"
            className="p-6 rounded-lg border border-border bg-background hover:bg-muted/30 hover:border-border transition group"
          >
            <h3 className="font-semibold text-foreground group-hover:text-primary mb-2">Data Science 101</h3>
            <p className="text-sm text-muted-foreground mb-3">Progress: 60%</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </Link>
          <Link
            href="/student/courses"
            className="p-6 rounded-lg border border-border bg-background hover:bg-muted/30 hover:border-border transition group"
          >
            <h3 className="font-semibold text-foreground group-hover:text-primary mb-2">Web Development Basics</h3>
            <p className="text-sm text-muted-foreground mb-3">Progress: 45%</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <SectionHeading>Recent Activity</SectionHeading>
        <div className="space-y-2">
          <ActivityItem>
            <span className="font-medium">Completed lesson</span> in Data Science 101 • 2 hours ago
          </ActivityItem>
          <ActivityItem>
            <span className="font-medium">Assignment submitted</span> for Web Development • 5 hours ago
          </ActivityItem>
          <ActivityItem>
            <span className="font-medium">New message</span> from John Smith • Yesterday
          </ActivityItem>
        </div>
      </div>
    </div>
  )
}
