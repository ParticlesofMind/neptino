import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle2, MessageSquare } from "lucide-react"

const enrolledCourses = [
  { id: "1", title: "Data Science 101", teacher: "Dr. Anna Mueller", progress: 60, lastLesson: "Exploratory Data Analysis" },
  { id: "2", title: "Web Development Basics", teacher: "James Park", progress: 45, lastLesson: "CSS Flexbox and Grid" },
]

const recentActivity = [
  { action: "Completed lesson", context: "Exploratory Data Analysis", time: "2 hours ago" },
  { action: "Assignment submitted", context: "Web Development Basics", time: "5 hours ago" },
  { action: "New message", context: "from Dr. Anna Mueller", time: "Yesterday" },
]

export default function StudentHomePage() {
  return (
    <div className="space-y-8">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You have 4 pending assignments and 3 unread messages.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Enrolled Courses", value: "6", Icon: BookOpen },
          { label: "Lessons Completed", value: "24", Icon: CheckCircle2 },
          { label: "Unread Messages", value: "3", Icon: MessageSquare },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-background px-5 py-4">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Continue learning */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Continue Learning</h2>
          <Link
            href="/student/courses"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Browse catalog <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {enrolledCourses.map((course) => (
            <Link
              key={course.id}
              href="/student/courses"
              className="group rounded-lg border border-border bg-background p-5 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <p className="text-xs text-muted-foreground">{course.teacher}</p>
              <h3 className="mt-1 font-medium text-foreground transition-colors group-hover:text-primary">
                {course.title}
              </h3>
              <p className="mt-3 text-xs text-muted-foreground">Last: {course.lastLesson}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${course.progress}%` }} />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{course.progress}%</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">Recent Activity</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span className="text-sm text-foreground">
                  <span className="font-medium">{item.action}</span>
                  {" · "}
                  <span className="text-muted-foreground">{item.context}</span>
                </span>
              </div>
              <span className="ml-4 shrink-0 text-xs text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
