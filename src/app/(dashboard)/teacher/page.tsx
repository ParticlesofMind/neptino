import { InfoCard, MetricCard } from "@/components/ui/page-section"
import Link from "next/link"

export default function TeacherHomePage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Your Teaching Portal</h1>
        <p className="text-slate-700">Create engaging courses, track student progress, and collaborate with your learners.</p>
      </div>

      {/* Key Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Overview</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Active Courses" value="5" />
          <MetricCard label="Total Students" value="127" />
          <MetricCard label="Unread Messages" value="8" />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            title="Create Course"
            description="Build and publish new course content with rich multimedia."
          />
          <InfoCard
            title="Grade Submissions"
            description="Review and provide feedback on student assignments."
          />
          <InfoCard
            title="View Analytics"
            description="Track student engagement and course performance metrics."
          />
          <InfoCard
            title="Send Announcements"
            description="Broadcast updates and important messages to your classes."
          />
          <InfoCard
            title="Canvas Editor"
            description="Create interactive visual lessons with the canvas tool."
          />
          <InfoCard
            title="Message Students"
            description="Direct communication with individual learners and groups."
          />
        </div>
      </div>

      {/* Active Courses */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Courses</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/teacher/courses"
            className="p-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition group"
          >
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 mb-2">Advanced JavaScript</h3>
            <p className="text-sm text-slate-600 mb-3">42 enrolled • 8 lessons</p>
            <div className="text-xs text-slate-500">Last updated 3 days ago</div>
          </Link>
          <Link
            href="/teacher/courses"
            className="p-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition group"
          >
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 mb-2">Python for Data Analysis</h3>
            <p className="text-sm text-slate-600 mb-3">85 enrolled • 12 lessons</p>
            <div className="text-xs text-slate-500">Last updated 1 day ago</div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
        <div className="space-y-2">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">3 assignments submitted</span> in Advanced JavaScript • 2 hours ago</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">5 new enrollments</span> in Python for Data Analysis • 6 hours ago</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">Course published</span> - Data Visualization 101 • Yesterday</p>
          </div>
        </div>
      </div>
    </div>
  )
}
