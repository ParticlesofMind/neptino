import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function AdminSettingsPage() {
  return (
    <PageSection
      title="Settings"
      description="Configure platform behavior and policies."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Security"
          description="Manage authentication and access settings."
        />
        <InfoCard
          title="Notifications"
          description="Set email and in-app alert behavior."
        />
      </div>
    </PageSection>
  )
}
