import { MetricCard, PageSection } from "@/components/ui/page-section"

export default function AdminUsersPage() {
  return (
    <PageSection
      title="Users"
      description="Manage platform users and permissions."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Users" value="1,284" />
        <MetricCard label="Teachers" value="212" />
        <MetricCard label="Students" value="1,032" />
      </div>
    </PageSection>
  )
}
