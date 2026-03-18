import Link from "next/link"
import { BookOpen, CheckCircle2, Server, ShieldAlert, Users, AlertCircle, ArrowRight } from "lucide-react"

const recentActivity = [
  { text: "New user registration", context: "sarah.kim@example.com", time: "1h ago", type: "user" },
  { text: "Course submitted for review", context: "Introduction to Machine Learning", time: "3h ago", type: "course" },
  { text: "12 courses batch-approved", context: "Awaiting publication", time: "Yesterday", type: "course" },
  { text: "Marketplace listing flagged", context: "Advanced Python Pack", time: "Yesterday", type: "alert" },
  { text: "System backup completed", context: "Database · 2.4 GB", time: "2 days ago", type: "system" },
]

const services = [
  { name: "Database", detail: "Latency 45ms · CPU 32%", ok: true },
  { name: "API Service", detail: "2.5K req/min · Uptime 99.98%", ok: true },
  { name: "Storage", detail: "68% capacity · 142 GB used", ok: true },
  { name: "Auth Service", detail: "Healthy · 0 incidents", ok: true },
]

export default function AdminHomePage() {
  return (
    <div className="space-y-8">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active Users", value: "1,284", detail: "+18 this week", Icon: Users },
          { label: "Published Courses", value: "96", detail: "8 pending review", Icon: BookOpen },
          { label: "Pending Reviews", value: "12", detail: "4 due today", Icon: CheckCircle2 },
          { label: "System Alerts", value: "0", detail: "All services nominal", Icon: ShieldAlert },
        ].map(({ label, value, detail, Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-background px-5 py-4">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Manage Users", href: "/admin/users", description: "View and edit user accounts" },
          { label: "Review Courses", href: "/admin/courses", description: "Approve or reject submissions" },
          { label: "Marketplace", href: "/admin/marketplace", description: "Moderate listings and features" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center justify-between rounded-lg border border-border bg-background px-5 py-4 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-foreground group-hover:text-primary">{link.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{link.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </Link>
        ))}
      </div>

      {/* System status */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">System Status</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {services.map((s) => (
            <div key={s.name} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">{s.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{s.detail}</span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: "#5c9970", color: "#fff" }}
                >
                  Operational
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">Recent Activity</h2>
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {recentActivity.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 gap-4">
              <div className="flex items-center gap-3">
                {item.type === "alert" ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#b87070]" />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                )}
                <span className="text-sm text-foreground">
                  <span className="font-medium">{item.text}</span>
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
