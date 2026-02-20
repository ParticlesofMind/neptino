"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CreateView } from "@/components/canvas/CreateView"
import { computePageConfig, type CanvasPageConfig } from "@/components/canvas/PixiCanvas"
import { SaveStatusBar, SetupColumn, SetupPanels, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { ClassificationSection } from "@/components/coursebuilder/sections/classification-section"
import { CurriculumSection } from "@/components/coursebuilder/sections/curriculum-section"
import { EssentialsSection } from "@/components/coursebuilder/sections/essentials-section"
import { GenerationSection } from "@/components/coursebuilder/sections/generation-section"
import { PedagogySection } from "@/components/coursebuilder/sections/pedagogy-section"
import { ScheduleSection } from "@/components/coursebuilder/sections/schedule-section"
import { StudentsSection } from "@/components/coursebuilder/sections/students-section"
import { TemplatesSection } from "@/components/coursebuilder/sections/templates-section"
import { VisibilitySection } from "@/components/coursebuilder/sections/visibility-section"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  AlignJustify,
  Users,
  BookOpen,
  LayoutTemplate,
  Calendar,
  BookMarked,
  Zap,
  Eye,
  Store,
  DollarSign,
  Plug,
  MessageSquare,
  Layers,
  Monitor,
  Palette,
  Smile,
  Bell,
  Database,
  Settings,
  Rocket,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "setup" | "create" | "preview" | "launch"
type SectionId = string

// ─── View navigation helpers ──────────────────────────────────────────────────

const VIEW_SEQUENCE: View[] = ["setup", "create", "preview", "launch"]
const VIEW_LABELS: Record<View, string> = {
  setup:   "Setup",
  create:  "Create",
  preview: "Preview",
  launch:  "Launch",
}
function getPrevView(v: View): View | null {
  const idx = VIEW_SEQUENCE.indexOf(v)
  return idx > 0 ? VIEW_SEQUENCE[idx - 1] : null
}
function getNextView(v: View): View | null {
  const idx = VIEW_SEQUENCE.indexOf(v)
  return idx < VIEW_SEQUENCE.length - 1 ? VIEW_SEQUENCE[idx + 1] : null
}

interface SectionItem {
  id: SectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface SectionGroup {
  heading: string
  items: SectionItem[]
}

// ─── Course preview type ─────────────────────────────────────────────────────

interface CourseEssentials {
  title: string
  subtitle: string
  description: string
  language: string
  courseType: string
  imageName: string | null
}

interface CourseCreatedData extends CourseEssentials {
  imageUrl: string | null
}

// ─── Section registry ─────────────────────────────────────────────────────────

const SECTIONS: SectionGroup[] = [
  {
    heading: "SETUP",
    items: [
      { id: "essentials", label: "Essentials", icon: FileText },
      { id: "classification", label: "Classification", icon: AlignJustify },
      { id: "students", label: "Students", icon: Users },
      { id: "pedagogy", label: "Pedagogy", icon: BookOpen },
      { id: "templates", label: "Templates", icon: LayoutTemplate },
      { id: "schedule", label: "Schedule", icon: Calendar },
      { id: "curriculum", label: "Curriculum", icon: BookMarked },
      { id: "generation", label: "Generation", icon: Zap },
    ],
  },
  {
    heading: "PUBLISHING",
    items: [
      { id: "visibility", label: "Course Visibility", icon: Eye },
      { id: "marketplace", label: "Marketplace", icon: Store },
      { id: "pricing", label: "Pricing & Monetization", icon: DollarSign },
      { id: "integrations", label: "External Integrations", icon: Plug },
      { id: "communication", label: "Communication", icon: MessageSquare },
    ],
  },
  {
    heading: "ENGINE",
    items: [
      { id: "page-setup", label: "Page Setup", icon: Layers },
      { id: "interface", label: "Interface", icon: Monitor },
      { id: "themes", label: "Themes", icon: Palette },
      { id: "accessibility", label: "Accessibility", icon: Smile },
    ],
  },
  {
    heading: "SETTINGS",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "data-management", label: "Data Management", icon: Database },
      { id: "advanced", label: "Advanced Settings", icon: Settings },
    ],
  },
]

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary"
    />
  )
}

function SelectInput({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </select>
  )
}

function Placeholder() {
  return (
    <div className="space-y-6">
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
        <p className="text-sm text-muted-foreground">This section is under construction.</p>
      </div>
      <SaveStatusBar status="empty" lastSavedAt={null} />
    </div>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

// ─── Sections ─────────────────────────────────────────────────────────────────

// ─── Students ─────────────────────────────────────────────────────────────────

// ─── Marketplace ──────────────────────────────────────────────────────────────

function MarketplaceSection({ courseId }: { courseId: string | null }) {
  const [listingStatus, setListingStatus] = useState("draft")
  const [targetAudience, setTargetAudience] = useState("")
  const [revenueShare, setRevenueShare] = useState(30)
  const [distribution, setDistribution] = useState("")
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("marketplace_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.marketplace_settings) {
          const m = data.marketplace_settings as Record<string, unknown>
          setListingStatus((m.listing_status as string) ?? "draft")
          setTargetAudience((m.target_audience as string) ?? "")
          setRevenueShare((m.revenue_share as number) ?? 30)
          setDistribution((m.distribution_channels as string) ?? "")
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        marketplace_settings: {
          listing_status:       listingStatus,
          target_audience:      targetAudience,
          revenue_share:        revenueShare,
          distribution_channels: distribution,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, listingStatus, targetAudience, revenueShare, distribution])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  return (
    <SetupSection title="Marketplace" description="Configure how your course appears in the Neptino marketplace.">
      <SetupPanels
        config={(
          <div className="space-y-4">
            <div>
              <FieldLabel>Listing Status</FieldLabel>
              <SelectInput value={listingStatus} onChange={(e) => setListingStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
                <option value="published">Published</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Target Audience</FieldLabel>
              <TextInput
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Grade 11 Humanities"
              />
            </div>
            <div>
              <FieldLabel hint="0–100">Revenue Share (%)</FieldLabel>
              <TextInput
                type="number"
                min={0}
                max={100}
                value={revenueShare}
                onChange={(e) => setRevenueShare(Math.min(100, Math.max(0, Number(e.target.value))))}
                placeholder="30"
              />
            </div>
            <div>
              <FieldLabel hint="optional">Distribution Channels</FieldLabel>
              <textarea
                rows={3}
                value={distribution}
                onChange={(e) => setDistribution(e.target.value)}
                placeholder="List marketplaces or partner channels"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
        )}
        preview={(
          <div className="rounded-lg border border-border bg-background p-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Marketplace Preview</p>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className="font-medium text-foreground">{listingStatus}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Audience</span><span className="font-medium text-foreground text-right max-w-[60%]">{targetAudience || "—"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Revenue Share</span><span className="font-medium text-foreground">{revenueShare}%</span></div>
            <div className="pt-1 text-xs text-muted-foreground">{distribution || "No distribution channels configured."}</div>
          </div>
        )}
      />
      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection({ courseId }: { courseId: string | null }) {
  const [pricingModel, setPricingModel] = useState("free")
  const [basePrice, setBasePrice] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [trial, setTrial] = useState(false)
  const [discountNotes, setDiscountNotes] = useState("")
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("pricing_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.pricing_settings) {
          const p = data.pricing_settings as Record<string, unknown>
          setPricingModel((p.pricing_model as string) ?? "free")
          setBasePrice(p.base_price != null ? String(p.base_price) : "")
          setCurrency((p.currency as string) ?? "USD")
          setTrial((p.trial as boolean) ?? false)
          setDiscountNotes((p.discount_notes as string) ?? "")
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        pricing_settings: {
          pricing_model:  pricingModel,
          base_price:     basePrice !== "" ? Number(basePrice) : null,
          currency,
          trial,
          discount_notes: discountNotes || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
  }, [courseId, pricingModel, basePrice, currency, trial, discountNotes])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  return (
    <SetupSection title="Pricing & Monetization" description="Set the pricing model and revenue settings for your course.">
      <SetupPanels
        config={(
          <div className="space-y-4">
            <div>
              <FieldLabel>Pricing Model</FieldLabel>
              <SelectInput value={pricingModel} onChange={(e) => setPricingModel(e.target.value)}>
                <option value="free">Free</option>
                <option value="subscription">Subscription</option>
                <option value="one-time">One-time purchase</option>
                <option value="license">Site license</option>
              </SelectInput>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Base Price</FieldLabel>
                <TextInput
                  type="number"
                  min={0}
                  step={1}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="99"
                />
              </div>
              <div>
                <FieldLabel>Currency</FieldLabel>
                <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </SelectInput>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={trial}
                onChange={() => setTrial(!trial)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              <span className="text-sm text-foreground">Offer free trial</span>
            </label>
            <div>
              <FieldLabel hint="optional">Discount Notes</FieldLabel>
              <textarea
                rows={3}
                value={discountNotes}
                onChange={(e) => setDiscountNotes(e.target.value)}
                placeholder="Describe educator or early-bird discounts"
                className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
        )}
        preview={(
          <div className="rounded-lg border border-border bg-background p-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pricing Preview</p>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Model</span><span className="font-medium text-foreground">{pricingModel}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Price</span><span className="font-medium text-foreground">{basePrice || "0"} {currency}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trial</span><span className="font-medium text-foreground">{trial ? "Enabled" : "Disabled"}</span></div>
            <div className="pt-1 text-xs text-muted-foreground">{discountNotes || "No discount notes."}</div>
          </div>
        )}
      />
      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}

// ─── External Integrations ────────────────────────────────────────────────────

function IntegrationsSection({ courseId }: { courseId: string | null }) {
  const [lmsProvider, setLmsProvider] = useState("")
  const [apiAccess, setApiAccess] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [integrationNotes, setIntegrationNotes] = useState("")
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("integration_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.integration_settings) {
          const i = data.integration_settings as Record<string, unknown>
          setLmsProvider((i.lms_provider as string) ?? "")
          setApiAccess((i.api_access as boolean) ?? false)
          setWebhookUrl((i.webhook_url as string) ?? "")
          setIntegrationNotes((i.integration_notes as string) ?? "")
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        integration_settings: {
          lms_provider:      lmsProvider || null,
          api_access:        apiAccess,
          webhook_url:       webhookUrl || null,
          integration_notes: integrationNotes || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
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
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Integration Preview</p>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">LMS</span><span className="font-medium text-foreground">{lmsProvider || "None"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">API Access</span><span className="font-medium text-foreground">{apiAccess ? "Enabled" : "Disabled"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Webhook</span><span className="font-medium text-foreground text-right max-w-[60%]">{webhookUrl || "—"}</span></div>
            <div className="pt-1 text-xs text-muted-foreground">{integrationNotes || "No integration notes."}</div>
          </div>
        )}
      />
      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}

// ─── Communication ────────────────────────────────────────────────────────────

function CommunicationSection({ courseId }: { courseId: string | null }) {
  const [welcomeMessage, setWelcomeMessage] = useState("")
  const [announcementChannel, setAnnouncementChannel] = useState("email")
  const [digest, setDigest] = useState(false)
  const [officeHours, setOfficeHours] = useState("")
  const [saveStatus, setSaveStatus] = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    const supabase = createClient()
    supabase.from("courses").select("communication_settings").eq("id", courseId).single()
      .then(({ data, error }) => {
        if (!error && data?.communication_settings) {
          const c = data.communication_settings as Record<string, unknown>
          setWelcomeMessage((c.welcome_message as string) ?? "")
          setAnnouncementChannel((c.announcement_channel as string) ?? "email")
          setDigest((c.digest as boolean) ?? false)
          setOfficeHours((c.office_hours as string) ?? "")
        }
      })
  }, [courseId])

  const handleSave = useCallback(async () => {
    if (!courseId) return
    setSaveStatus("saving")
    const supabase = createClient()
    const { error } = await supabase.from("courses")
      .update({
        communication_settings: {
          welcome_message:      welcomeMessage || null,
          announcement_channel: announcementChannel,
          digest,
          office_hours:         officeHours || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    if (error) setSaveStatus("error")
    else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
    }
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
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Communication Preview</p>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Channel</span><span className="font-medium text-foreground">{announcementChannel}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Weekly Digest</span><span className="font-medium text-foreground">{digest ? "Enabled" : "Disabled"}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Office Hours</span><span className="font-medium text-foreground">{officeHours || "—"}</span></div>
            <div className="pt-1 text-xs text-muted-foreground">{welcomeMessage || "No welcome message set."}</div>
          </div>
        )}
      />
      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}

// ─── Page Setup ───────────────────────────────────────────────────────────────

const PAGE_DIMS = {
  a4:          { w: 21,    h: 29.7  },
  "us-letter": { w: 21.59, h: 27.94 },
}

const PAGE_LABELS = {
  a4:          { cm: "A4 (21.0 × 29.7 cm)",         inches: 'A4 (8.27″ × 11.69″)'         },
  "us-letter": { cm: "US Letter (21.6 × 27.9 cm)",  inches: 'US Letter (8.5″ × 11″)'       },
}

function PageSetupSection({
  courseId,
  initialConfig,
  onSaved,
}: {
  courseId?:      string | null
  initialConfig?: CanvasPageConfig | null
  onSaved?:       (cfg: CanvasPageConfig) => void
}) {
  const [units, setUnits]             = useState<"cm" | "inches">("cm")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [size, setSize]               = useState<"a4" | "us-letter">("a4")
  const [pageCount, setPageCount]     = useState(initialConfig?.pageCount ?? 1)
  const [margins, setMargins]         = useState({ top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 })
  const [saveStatus, setSaveStatus]   = useState<"empty" | "saving" | "saved" | "error">("empty")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const updateMargin = (side: keyof typeof margins, val: string) =>
    setMargins((prev) => ({ ...prev, [side]: parseFloat(val) || 0 }))

  const handleSave = useCallback(async () => {
    if (!courseId) {
      setSaveStatus("empty")
      return
    }

    const factor = units === "cm" ? 10 : 25.4
    const marginsMm = {
      top:    margins.top    * factor,
      right:  margins.right  * factor,
      bottom: margins.bottom * factor,
      left:   margins.left   * factor,
    }
    const cfg       = computePageConfig(size, orientation, pageCount, marginsMm)

    const supabase = createClient()
    const storedSettings = {
      page_size:        size,
      page_orientation: orientation,
      page_count:       pageCount,
      margins_mm:       marginsMm,
    }

    const { error } = await supabase
      .from("courses")
      .update({ generation_settings: storedSettings })
      .eq("id", courseId)

    if (error) {
      setSaveStatus("error")
    } else {
      setLastSavedAt(new Date().toISOString())
      setSaveStatus("saved")
      onSaved?.(cfg)
    }
  }, [courseId, units, margins, size, orientation, pageCount, onSaved])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  const isLandscape = orientation === "landscape"
  const { w, h } = PAGE_DIMS[size]
  const physW = isLandscape ? h : w
  const physH = isLandscape ? w : h
  const previewW = 160
  const previewH = Math.round(previewW * (physH / physW))

  return (
    <SetupSection title="Page Setup" description="Configure the canvas dimensions and margins for lesson pages.">
      <div className="grid flex-1 min-h-0 gap-8 lg:grid-cols-2 items-stretch">
        {/* Config */}
        <SetupColumn className="space-y-5">
          <div>
            <div className="flex gap-5">
              {(["cm", "inches"] as const).map((u) => (
                <label key={u} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="units"
                    value={u}
                    checked={units === u}
                    onChange={() => setUnits(u)}
                    className="accent-primary"
                  />
                  <span className="text-foreground">{u === "cm" ? "Metric (cm)" : "Imperial (inches)"}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="flex gap-5">
              {(["portrait", "landscape"] as const).map((o) => (
                <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="orientation"
                    value={o}
                    checked={orientation === o}
                    onChange={() => setOrientation(o)}
                    className="accent-primary"
                  />
                  <span className="text-foreground capitalize">{o}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="flex flex-col gap-2">
              {(["a4", "us-letter"] as const).map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="canvas-size"
                    value={s}
                    checked={size === s}
                    onChange={() => setSize(s)}
                    className="accent-primary"
                  />
                  <span className="text-foreground">{PAGE_LABELS[s][units]}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Number of Pages</FieldLabel>
            <TextInput
              type="number"
              min={1}
              max={500}
              step={1}
              value={pageCount}
              onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div>
            <FieldLabel>Margins ({units})</FieldLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["top", "bottom", "left", "right"] as const).map((side) => (
                <div key={side}>
                  <FieldLabel>{side.charAt(0).toUpperCase() + side.slice(1)}</FieldLabel>
                  <TextInput
                    type="number"
                    step={0.01}
                    min={0}
                    max={10}
                    value={margins[side]}
                    onChange={(e) => updateMargin(side, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

        </SetupColumn>

        {/* Visual preview */}
        <SetupColumn>
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative border border-border bg-white shadow-sm"
              style={{ width: previewW, height: previewH }}
            >
              <div
                className="absolute border border-dashed border-primary/40"
                style={{
                  top:    `${(margins.top    / physH) * 100}%`,
                  bottom: `${(margins.bottom / physH) * 100}%`,
                  left:   `${(margins.left   / physW) * 100}%`,
                  right:  `${(margins.right  / physW) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {PAGE_LABELS[size][units]} · {orientation}
            </p>
            <p className="text-xs text-muted-foreground">
              {pageCount} page{pageCount !== 1 ? "s" : ""} · Margins: {margins.top} / {margins.right} / {margins.bottom} / {margins.left} {units}
            </p>
          </div>
        </SetupColumn>
      </div>
      <SaveStatusBar status={courseId ? saveStatus : "empty"} lastSavedAt={lastSavedAt} />
    </SetupSection>
  )
}

// ─── Advanced ─────────────────────────────────────────────────────────────────

function AdvancedSection() {
  return (
    <SetupSection title="Advanced Settings" description="Destructive actions and advanced configuration.">
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground">
          Once you delete a course, there is no going back. Please be certain.
        </p>
        <button
          type="button"
          className="rounded-md border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
        >
          Delete Course
        </button>
      </div>
      <SaveStatusBar status="empty" lastSavedAt={null} />
    </SetupSection>
  )
}

// ─── Preview View ─────────────────────────────────────────────────────────────

function PreviewView({ courseData }: { courseData: CourseCreatedData | null }) {
  if (!courseData?.title) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <p className="text-sm font-medium text-foreground">Nothing to preview yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete the Setup section to see your course preview.
        </p>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <div className="rounded-xl border border-border bg-background overflow-hidden shadow-sm">
        {courseData.imageUrl ? (
          <div className="h-56 overflow-hidden">
            <img src={courseData.imageUrl} alt={courseData.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center bg-muted/50">
            <span className="text-xs italic text-muted-foreground/40">No cover image</span>
          </div>
        )}
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{courseData.title}</h1>
            {courseData.subtitle && (
              <p className="mt-1 text-base text-muted-foreground">{courseData.subtitle}</p>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{courseData.description}</p>
          <div className="flex flex-wrap gap-2">
            {courseData.language && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {courseData.language}
              </span>
            )}
            {courseData.courseType && (
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {courseData.courseType}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-5">
        <FieldLabel>Student Experience Preview</FieldLabel>
        <p className="text-sm text-muted-foreground">
          This is a simplified preview. The full student experience — including the lesson canvas, assignments,
          and assessments — will be available once the course is launched.
        </p>
      </div>
    </div>
  )
}

// ─── Launch View ──────────────────────────────────────────────────────────────

function LaunchView({
  courseId,
  courseData,
  onSetView,
}: {
  courseId:   string | null
  courseData: CourseCreatedData | null
  onSetView:  (v: View) => void
}) {
  const [launching, setLaunching] = useState(false)
  const [launched,  setLaunched]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const checks = [
    { label: "Course created",      ok: !!courseId },
    { label: "Title set",           ok: !!(courseData?.title  && courseData.title.length  >= 3) },
    { label: "Description added",   ok: !!(courseData?.description && courseData.description.length >= 10) },
    { label: "Language selected",   ok: !!courseData?.language },
    { label: "Course type selected", ok: !!courseData?.courseType },
  ]
  const allPassed = checks.every((c) => c.ok)

  async function handleLaunch() {
    if (!courseId) return
    setLaunching(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("courses")
      .update({
        visibility_settings: {
          visible: true, enrollment: true, approval: false,
          notifications: true, public_discovery: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", courseId)
    setLaunching(false)
    if (err) setError(err.message)
    else setLaunched(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Launch Course</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the checklist below, then publish your course to make it visible and open for enrollment.
        </p>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-border bg-background divide-y divide-border overflow-hidden">
        {checks.map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-3">
            <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${
              ok ? "bg-emerald-500" : "bg-muted border border-border"
            }`}>
              {ok && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 8 8">
                  <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${ok ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {!ok && (
              <button
                type="button"
                onClick={() => onSetView("setup")}
                className="ml-auto text-xs text-primary hover:underline"
              >
                Fix →
              </button>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {launched ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4 space-y-1">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Course launched successfully!
          </p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">
            Your course is now visible and open for enrollment.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleLaunch}
          disabled={!allPassed || launching || !courseId}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Rocket className="h-4 w-4" />
          {launching ? "Launching…" : "Launch Course"}
        </button>
      )}
    </div>
  )
}

// ─── Section router ───────────────────────────────────────────────────────────

function SectionContent({
  id,
  onCourseCreated,
  courseCreatedData,
  initialEssentials,
  existingCourseId,
  pageConfig,
  onPageConfigChange,
}: {
  id: SectionId
  onCourseCreated: (courseId: string, data: CourseCreatedData) => void
  courseCreatedData: CourseCreatedData | null
  initialEssentials: CourseCreatedData | null
  existingCourseId: string | null
  pageConfig?: CanvasPageConfig | null
  onPageConfigChange?: (cfg: CanvasPageConfig) => void
}) {
  switch (id) {
    case "essentials":     return <EssentialsSection key={existingCourseId ?? "new"} onCourseCreated={onCourseCreated} initialData={initialEssentials} existingCourseId={existingCourseId} />
    case "classification": return <ClassificationSection courseCreatedData={courseCreatedData} courseId={existingCourseId} />
    case "students":       return <StudentsSection courseId={existingCourseId} />
    case "pedagogy":       return <PedagogySection       courseId={existingCourseId} />
    case "templates":      return <TemplatesSection     courseId={existingCourseId} />
    case "schedule":       return <ScheduleSection      courseId={existingCourseId} />
    case "curriculum":     return <CurriculumSection    courseId={existingCourseId} />
    case "generation":     return <GenerationSection     courseId={existingCourseId} />
    case "visibility":     return <VisibilitySection    courseId={existingCourseId} />
    case "marketplace":    return <MarketplaceSection   courseId={existingCourseId} />
    case "pricing":        return <PricingSection        courseId={existingCourseId} />
    case "integrations":   return <IntegrationsSection   courseId={existingCourseId} />
    case "communication":  return <CommunicationSection  courseId={existingCourseId} />
    case "page-setup":     return <PageSetupSection key={`${existingCourseId ?? "new"}-${pageConfig?.pageCount ?? 1}`} courseId={existingCourseId} initialConfig={pageConfig} onSaved={onPageConfigChange} />
    case "advanced":       return <AdvancedSection />
    default:               return <Placeholder />
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    }>
      <CourseBuilderPageInner />
    </Suspense>
  )
}

function CourseBuilderPageInner() {
  const searchParams = useSearchParams()
  const urlCourseId = searchParams.get("id")
  const urlView     = searchParams.get("view") as View | null
  const [view, setView] = useState<View>(
    urlView && (["setup", "create", "preview", "launch"] as string[]).includes(urlView)
      ? urlView
      : "setup"
  )
  const [activeSection, setActiveSection] = useState<SectionId>("essentials")
  const [courseTitle, setCourseTitle] = useState("Untitled Course")
  const [courseId, setCourseId] = useState<string | null>(urlCourseId)
  const [courseCreatedData, setCourseCreatedData] = useState<CourseCreatedData | null>(null)
  const [initialEssentials, setInitialEssentials] = useState<CourseCreatedData | null>(null)
  const [pageConfig, setPageConfig] = useState<CanvasPageConfig | null>(null)
  const [loadingCourse, setLoadingCourse] = useState(!!urlCourseId)
  const [editingTitle, setEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!urlCourseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("id, course_name, course_subtitle, course_description, course_language, course_type, course_image, generation_settings")
      .eq("id", urlCourseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const loaded: CourseCreatedData = {
            title: data.course_name ?? "",
            subtitle: data.course_subtitle ?? "",
            description: data.course_description ?? "",
            language: data.course_language ?? "",
            courseType: data.course_type ?? "",
            imageName: null,
            imageUrl: data.course_image ?? null,
          }
          setInitialEssentials(loaded)
          setCourseCreatedData(loaded)
          setCourseTitle(data.course_name ?? "Untitled Course")
          setCourseId(urlCourseId)

          // Restore page setup from generation_settings
          const gs = data.generation_settings as Record<string, unknown> | null
          if (gs?.page_size) {
            try {
              const cfg = computePageConfig(
                gs.page_size as "a4" | "us-letter",
                (gs.page_orientation as "portrait" | "landscape") ?? "portrait",
                (gs.page_count as number) ?? 1,
                (gs.margins_mm as { top: number; right: number; bottom: number; left: number }) ??
                  { top: 25.4, right: 19.05, bottom: 25.4, left: 19.05 },
              )
              setPageConfig(cfg)
            } catch {
              // ignore malformed settings
            }
          }
        }
        setLoadingCourse(false)
      })
  }, [urlCourseId])

  const handleCourseCreated = useCallback((id: string, essentials: CourseCreatedData) => {
    setCourseId(id)
    setCourseTitle(essentials.title)
    setCourseCreatedData(essentials)
    // Only auto-advance to classification when creating a new course
    if (!urlCourseId && !courseId) {
      setActiveSection("classification")
    }
  }, [urlCourseId, courseId])

  const startEditTitle = () => {
    setEditingTitle(true)
    setTimeout(() => titleRef.current?.select(), 10)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Top chrome */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4 shrink-0 gap-4">
        {/* Left: back / previous step */}
        <div className="flex items-center min-w-[110px]">
          {getPrevView(view) === null ? (
            <Link
              href="/teacher/courses"
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Courses
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setView(getPrevView(view)!)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {VIEW_LABELS[getPrevView(view)!]}
            </button>
          )}
        </div>

        {/* Center: editable title + current step badge */}
        <div className="flex flex-1 items-center justify-center gap-2 min-w-0 overflow-hidden">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="max-w-xs rounded border-0 bg-transparent text-sm font-medium text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring px-1"
            />
          ) : (
            <button
              onClick={startEditTitle}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate max-w-xs"
            >
              {courseTitle}
            </button>
          )}
          <span className="shrink-0 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {VIEW_LABELS[view]}
          </span>
        </div>

        {/* Right: next step */}
        <div className="flex items-center justify-end min-w-[110px]">
          {getNextView(view) !== null ? (
            <button
              type="button"
              onClick={() => setView(getNextView(view)!)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                getNextView(view) === "launch"
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "border border-border bg-background text-foreground hover:border-primary/30 hover:text-primary"
              }`}
            >
              {VIEW_LABELS[getNextView(view)!]}
              {getNextView(view) === "launch"
                ? <Rocket className="h-3.5 w-3.5" />
                : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            /* At launch view — "Done" returns to courses list */
            <Link
              href="/teacher/courses"
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
            >
              Done
            </Link>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {view === "setup" ? (
          <div className="flex flex-1 overflow-hidden p-2 bg-muted/10">
            <div className="flex flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
              <aside className="no-scrollbar hidden w-52 shrink-0 overflow-y-auto border-r border-border bg-background md:block">
                <nav className="px-3 py-4 space-y-5">
                  {SECTIONS.map((group) => (
                    <div key={group.heading}>
                      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {group.heading}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            onClick={() => setActiveSection(id)}
                            className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition ${
                              activeSection === id
                                ? "bg-accent text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </aside>

              <main className="flex-1 overflow-hidden bg-muted/20 px-8 pt-4 pb-8">
                <div className="mx-auto flex h-full min-h-0 max-w-7xl flex-col">
                  {loadingCourse ? (
                    <div className="flex items-center justify-center h-48">
                      <span className="text-sm text-muted-foreground">Loading course…</span>
                    </div>
                  ) : (
                    <SectionContent
                      id={activeSection}
                      onCourseCreated={handleCourseCreated}
                      courseCreatedData={courseCreatedData}
                      initialEssentials={initialEssentials}
                      existingCourseId={courseId}
                      pageConfig={pageConfig}
                      onPageConfigChange={setPageConfig}
                    />
                  )}
                </div>
              </main>
            </div>
          </div>
        ) : view === "create" ? (
          <div className="flex flex-1 overflow-hidden p-2 bg-muted/10">
            <div className="flex flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
              <CreateView canvasConfig={pageConfig} courseId={courseId} />
            </div>
          </div>
        ) : view === "preview" ? (
          <div className="no-scrollbar flex flex-1 overflow-y-auto p-2 bg-muted/10">
            <div className="no-scrollbar flex flex-1 overflow-y-auto rounded-xl border border-border shadow-sm bg-background px-6">
              <PreviewView courseData={courseCreatedData} />
            </div>
          </div>
        ) : (
          <div className="no-scrollbar flex flex-1 overflow-y-auto p-2 bg-muted/10">
            <div className="no-scrollbar flex flex-1 overflow-y-auto rounded-xl border border-border shadow-sm bg-background px-6">
              <LaunchView courseId={courseId} courseData={courseCreatedData} onSetView={setView} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
