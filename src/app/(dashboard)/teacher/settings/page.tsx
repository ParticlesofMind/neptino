import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function TeacherSettingsPage() {
  return (
    <PageSection
      title="Settings"
      description="Update your profile and teaching preferences."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Profile"
          description="Manage your account details."
        />
        <InfoCard
          title="Classroom Preferences"
          description="Control classroom defaults and notifications."
        />
      </div>
    </PageSection>
  )
}
