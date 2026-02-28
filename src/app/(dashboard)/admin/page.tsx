import { InfoCard, MetricCard, WelcomeBanner, SectionHeading, ActivityItem } from "@/components/ui/page-section"

export default function AdminHomePage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <WelcomeBanner
        title="Platform Administration"
        description="Monitor system health, manage users, and oversee platform operations."
        variant="amber"
      />

      {/* Key Metrics */}
      <div>
        <SectionHeading>System Overview</SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Active Users" value="1,284" />
          <MetricCard label="Published Courses" value="96" />
          <MetricCard label="Pending Reviews" value="12" />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeading>Administrative Actions</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            title="Manage Users"
            description="Add, edit, or remove user accounts and manage permissions."
          />
          <InfoCard
            title="Review Content"
            description="Moderate flagged courses, messages, and user submissions."
          />
          <InfoCard
            title="System Health"
            description="Monitor platform status, API performance, and uptime metrics."
          />
          <InfoCard
            title="Course Approvals"
            description="Review and approve courses before they are published."
          />
          <InfoCard
            title="Compliance Reports"
            description="Generate compliance reports and audit logs."
          />
          <InfoCard
            title="Email Templates"
            description="Configure platform notifications and email communications."
          />
        </div>
      </div>

      {/* System Status */}
      <div>
        <SectionHeading>System Status</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-6 rounded-lg border border-green-200 bg-green-50">
            <h3 className="font-semibold text-foreground mb-2">Database</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-block px-3 py-1 rounded-full bg-green-200 text-green-900 font-medium">Operational</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Latency: 45ms • CPU: 32%</div>
          </div>
          <div className="p-6 rounded-lg border border-green-200 bg-green-50">
            <h3 className="font-semibold text-foreground mb-2">API Service</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-block px-3 py-1 rounded-full bg-green-200 text-green-900 font-medium">Operational</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Requests: 2.5K/min • Uptime: 99.98%</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <SectionHeading>Recent Activity</SectionHeading>
        <div className="space-y-2">
          <ActivityItem>
            <span className="font-medium">New user registration</span> • sarah.kim@example.com • 1 hour ago
          </ActivityItem>
          <ActivityItem>
            <span className="font-medium">Content flagged</span> for review in course #45 • 3 hours ago
          </ActivityItem>
          <ActivityItem>
            <span className="font-medium">12 courses approved</span> awaiting publication • Yesterday
          </ActivityItem>
        </div>
      </div>
    </div>
  )
}
