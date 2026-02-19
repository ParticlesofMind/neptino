import { MetricCard, PageSection } from "@/components/ui/page-section"

export default function AdminHomePage() {
  return (
    <PageSection
      title="Admin Dashboard"
      description="System administration and platform overview."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active Users" value="1,284" />
        <MetricCard label="Published Courses" value="96" />
        <MetricCard label="Pending Reviews" value="12" />
        </div>
    </PageSection>
  )
}
