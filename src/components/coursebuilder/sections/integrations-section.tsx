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

export function IntegrationsSection({ courseId }: { courseId: string | null }) {
  const [lmsProvider, setLmsProvider] = useState("")
  const [apiAccess, setApiAccess] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [integrationNotes, setIntegrationNotes] = useState("")

  useCourseRowLoader<{ integration_settings: Record<string, unknown> | null }>({
    courseId,
    select: "integration_settings",
    onLoaded: (row) => {
      const i = row.integration_settings
      if (!i) return
      setLmsProvider((i.lms_provider as string) ?? "")
      setApiAccess((i.api_access as boolean) ?? false)
      setWebhookUrl((i.webhook_url as string) ?? "")
      setIntegrationNotes((i.integration_notes as string) ?? "")
    },
  })

  const handleSave = useCallback(async () => {
    if (!courseId) return
    await updateCourseById(courseId, {
      integration_settings: {
        lms_provider:      lmsProvider || null,
        api_access:        apiAccess,
        webhook_url:       webhookUrl || null,
        integration_notes: integrationNotes || null,
      },
      updated_at: new Date().toISOString(),
    })
  }, [courseId, lmsProvider, apiAccess, webhookUrl, integrationNotes])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  return (
    <SetupSection title="External Integrations" description="Connect your course to external platforms and APIs.">
      <SetupPanels
        config={(
          <div className="space-y-4">
            <div>
              <FieldLabel>LMS Provider</FieldLabel>
              <SelectInput value={lmsProvider} onChange={(e) => setLmsProvider(e.target.value)}>
                <option value="">None</option>
                <option value="Canvas">Canvas</option>
                <option value="Moodle">Moodle</option>
                <option value="Schoology">Schoology</option>
              </SelectInput>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={apiAccess}
                onChange={() => setApiAccess(!apiAccess)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              <span className="text-sm text-foreground">Enable API access for this course</span>
            </label>
            <div>
              <FieldLabel hint="optional">Webhook URL</FieldLabel>
              <TextInput
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <FieldLabel hint="optional">Integration Notes</FieldLabel>
              <textarea
                rows={3}
                value={integrationNotes}
                onChange={(e) => setIntegrationNotes(e.target.value)}
                placeholder="Describe external automation related to this course"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
        )}
        preview={(
          <div className="rounded-lg border border-border bg-background p-4 space-y-2.5">
            <OverlineLabel>Integration Preview</OverlineLabel>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">LMS</span><span className="font-medium text-foreground">{lmsProvider || "None"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">API Access</span><span className="font-medium text-foreground">{apiAccess ? "Enabled" : "Disabled"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Webhook</span><span className="font-medium text-foreground text-right max-w-[60%]">{webhookUrl || "—"}</span></div>
            <div className="pt-1 text-xs text-muted-foreground">{integrationNotes || "No integration notes."}</div>
          </div>
        )}
      />
    </SetupSection>
  )
}
