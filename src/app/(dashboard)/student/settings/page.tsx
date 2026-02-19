import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function StudentSettingsPage() {
  return (
    <PageSection
      title="Settings"
      description="Manage your learning preferences and account."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Profile"
          description="Edit your personal details."
        />
        <InfoCard
          title="Notifications"
          description="Choose how you receive updates."
        />
      </div>
    </PageSection>
  )
}
