import { InfoCard, MetricCard } from "@/components/ui/page-section"
import Link from "next/link"

export default function StudentHomePage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Your Learning Journey</h1>
        <p className="text-slate-700">Continue where you left off or explore new courses to expand your skills.</p>
      </div>

      {/* Key Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Progress</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Enrolled Courses" value="6" />
          <MetricCard label="Pending Assignments" value="4" />
          <MetricCard label="Unread Messages" value="3" />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
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
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Courses</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/student/courses"
            className="p-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition group"
          >
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 mb-2">Data Science 101</h3>
            <p className="text-sm text-slate-600 mb-3">Progress: 60%</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </Link>
          <Link
            href="/student/courses"
            className="p-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition group"
          >
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 mb-2">Web Development Basics</h3>
            <p className="text-sm text-slate-600 mb-3">Progress: 45%</p>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
        <div className="space-y-2">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">Completed lesson</span> in Data Science 101 • 2 hours ago</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">Assignment submitted</span> for Web Development • 5 hours ago</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">New message</span> from John Smith • Yesterday</p>
          </div>
        </div>
      </div>
    </div>
  )
}
