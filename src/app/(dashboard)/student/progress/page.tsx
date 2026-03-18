import { BookOpen, CheckCircle2, ClipboardList, Award } from "lucide-react"

const courseProgress = [
  { id: "1", title: "Data Science 101", teacher: "Dr. Anna Mueller", progress: 60, lessonsCompleted: 9, lessonsTotal: 15, lastActivity: "2 hours ago" },
  { id: "2", title: "Web Development Basics", teacher: "James Park", progress: 45, lessonsCompleted: 5, lessonsTotal: 11, lastActivity: "Yesterday" },
  { id: "3", title: "Statistics for Beginners", teacher: "Prof. Sarah Lin", progress: 88, lessonsCompleted: 14, lessonsTotal: 16, lastActivity: "3 days ago" },
]

const assignments = [
  { id: "1", title: "Exploratory Data Analysis — Final Write-up", course: "Data Science 101", due: "Tomorrow", status: "pending" },
  { id: "2", title: "Responsive Layout Exercise", course: "Web Development Basics", due: "In 3 days", status: "pending" },
  { id: "3", title: "Probability Problem Set 4", course: "Statistics for Beginners", due: "Submitted", status: "submitted" },
  { id: "4", title: "Midterm Reflection Essay", course: "Data Science 101", due: "Submitted", status: "submitted" },
]

const achievements = [
  { label: "First Lesson", earned: true },
  { label: "5 Lessons", earned: true },
  { label: "First Submission", earned: true },
  { label: "10 Lessons", earned: true },
  { label: "25 Lessons", earned: false },
  { label: "Course Complete", earned: false },
]

export default function StudentProgressPage() {
  const totalLessons = courseProgress.reduce((s, c) => s + c.lessonsCompleted, 0)
  const submitted = assignments.filter((a) => a.status === "submitted").length

  return (
    <div className="space-y-8">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Courses Enrolled", value: String(courseProgress.length), Icon: BookOpen },
          { label: "Lessons Completed", value: String(totalLessons), Icon: CheckCircle2 },
          { label: "Assignments Submitted", value: String(submitted), Icon: ClipboardList },
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

      {/* Course progress */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">Course Progress</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {courseProgress.map((course) => (
            <div key={course.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{course.teacher}</p>
                  <p className="mt-0.5 font-medium text-foreground">{course.title}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground">{course.progress}%</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {course.lessonsCompleted} of {course.lessonsTotal} lessons &middot; last activity {course.lastActivity}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Assignments */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">Assignments</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.course}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{a.due}</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.status === "submitted"
                      ? "bg-[#5c9970]/10 text-[#5c9970]"
                      : "bg-[#b87c5c]/10 text-[#b87c5c]"
                  }`}
                >
                  {a.status === "submitted" ? "Submitted" : "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Achievements</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {achievements.map((a) => (
            <span
              key={a.label}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                a.earned
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {a.earned && <CheckCircle2 className="mr-1.5 h-3 w-3" />}
              {a.label}
            </span>
          ))}
        </div>
      </div>

    </div>
  )
}
