import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function AdminMessagesPage() {
  return (
    <PageSection
      title="Messages"
      description="System-wide communication center."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Broadcast Channel"
          description="Send announcements to all teachers and students."
        />
        <InfoCard
          title="Integration Status"
          description="Messaging integration is ready for connection."
        />
      </div>
    </PageSection>
  )
}
