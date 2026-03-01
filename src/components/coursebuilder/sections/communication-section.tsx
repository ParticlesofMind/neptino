"use client"

import { useState, useCallback } from "react"
import {
  FieldLabel,
  TextInput,
  SelectInput,
  updateCourseById,
  useCourseRowLoader,
  useDebouncedChangeSave,
  SetupSection,
  SetupPanels,
} from "@/components/coursebuilder"
import { OverlineLabel } from "@/components/ui/overline-label"

export function CommunicationSection({ courseId }: { courseId: string | null }) {
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [announcementChannel, setAnnouncementChannel] = useState("email")
  const [digest, setDigest] = useState(false)
  const [officeHours, setOfficeHours] = useState("")

  useCourseRowLoader<{ communication_settings: Record<string, unknown> | null }>({
    courseId,
    select: "communication_settings",
    onLoaded: (row) => {
      const c = row.communication_settings
      if (!c) return
      setWelcomeMessage((c.welcome_message as string) ?? "")
      setAnnouncementChannel((c.announcement_channel as string) ?? "email")
      setDigest((c.digest as boolean) ?? false)
      setOfficeHours((c.office_hours as string) ?? "")
    },
  })

  const handleSave = useCallback(async () => {
    if (!courseId) return
    await updateCourseById(courseId, {
      communication_settings: {
        welcome_message:      welcomeMessage || null,
        announcement_channel: announcementChannel,
        digest,
        office_hours:         officeHours || null,
      },
      updated_at: new Date().toISOString(),
    })
  }, [courseId, welcomeMessage, announcementChannel, digest, officeHours])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  return (
    <SetupSection title="Communication" description="Configure how you communicate with enrolled students.">
      <SetupPanels
        config={(
          <div className="space-y-4">
            <div>
              <FieldLabel>Welcome Message</FieldLabel>
              <textarea
                rows={4}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Send a short welcome note to enrolled students"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div>
              <FieldLabel>Announcement Channel</FieldLabel>
              <SelectInput value={announcementChannel} onChange={(e) => setAnnouncementChannel(e.target.value)}>
                <option value="email">Email</option>
                <option value="in-app">In-app</option>
                <option value="sms">SMS</option>
              </SelectInput>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={digest}
                onChange={() => setDigest(!digest)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              <span className="text-sm text-foreground">Enable weekly update digest</span>
            </label>
            <div>
              <FieldLabel hint="optional">Office Hours</FieldLabel>
              <TextInput
                value={officeHours}
                onChange={(e) => setOfficeHours(e.target.value)}
                placeholder="Thursdays 3–5pm CET"
              />
            </div>
          </div>
        )}
        preview={(
          <div className="rounded-lg border border-border bg-background p-4 space-y-2.5">
            <OverlineLabel>Communication Preview</OverlineLabel>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Channel</span><span className="font-medium text-foreground">{announcementChannel}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Weekly Digest</span><span className="font-medium text-foreground">{digest ? "Enabled" : "Disabled"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Office Hours</span><span className="font-medium text-foreground">{officeHours || "—"}</span></div>
            <div className="pt-1 text-xs text-muted-foreground">{welcomeMessage || "No welcome message set."}</div>
          </div>
        )}
      />
    </SetupSection>
  )
}
