import { InfoCard, MetricCard } from "@/components/ui/page-section"

export default function AdminHomePage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Platform Administration</h1>
        <p className="text-slate-700">Monitor system health, manage users, and oversee platform operations.</p>
      </div>

      {/* Key Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">System Overview</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Active Users" value="1,284" />
          <MetricCard label="Published Courses" value="96" />
          <MetricCard label="Pending Reviews" value="12" />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Administrative Actions</h2>
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
        <h2 className="text-lg font-semibold text-slate-900 mb-4">System Status</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-6 rounded-lg border border-green-200 bg-green-50">
            <h3 className="font-semibold text-slate-900 mb-2">Database</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Status</span>
              <span className="inline-block px-3 py-1 rounded-full bg-green-200 text-green-900 font-medium">Operational</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">Latency: 45ms • CPU: 32%</div>
          </div>
          <div className="p-6 rounded-lg border border-green-200 bg-green-50">
            <h3 className="font-semibold text-slate-900 mb-2">API Service</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Status</span>
              <span className="inline-block px-3 py-1 rounded-full bg-green-200 text-green-900 font-medium">Operational</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">Requests: 2.5K/min • Uptime: 99.98%</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
        <div className="space-y-2">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">New user registration</span> • sarah.kim@example.com • 1 hour ago</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">Content flagged</span> for review in course #45 • 3 hours ago</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-700"><span className="font-medium">12 courses approved</span> awaiting publication • Yesterday</p>
          </div>
        </div>
      </div>
    </div>
  )
}
