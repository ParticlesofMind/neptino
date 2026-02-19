import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function StudentMessagesPage() {
  return (
    <PageSection
      title="Messages"
      description="Chat with teachers and classmates."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Inbox"
          description="Open conversations with classmates and teachers."
        />
        <InfoCard
          title="Integration"
          description="Messaging panel is ready to be connected."
        />
      </div>
    </PageSection>
  )
}
