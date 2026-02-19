import { InfoCard, PageSection } from "@/components/ui/page-section"

export default function TeacherMessagesPage() {
  return (
    <PageSection
      title="Messages"
      description="Talk with students and collaborators."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Direct Messages"
          description="Open 8 active conversations with students."
        />
        <InfoCard
          title="Integration"
          description="Messaging interface will appear here."
        />
      </div>
    </PageSection>
  )
}
