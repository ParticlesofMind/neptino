"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CreateView } from "@/components/canvas/CreateView"
import { computePageConfig, type CanvasPageConfig } from "@/components/canvas/PixiCanvas"
import { SetupColumn, SetupPanelLayout, SetupPanels, SetupSection } from "@/components/coursebuilder/layout-primitives"
import { ClassificationSection } from "@/components/coursebuilder/sections/classification-section"
import { CurriculumSection } from "@/components/coursebuilder/sections/curriculum-section"
import { EssentialsSection } from "@/components/coursebuilder/sections/essentials-section"
import { LLMSection } from "@/components/coursebuilder/sections/llm-section"
import { PedagogySection } from "@/components/coursebuilder/sections/pedagogy-section"
import { ResourcesSection } from "@/components/coursebuilder/sections/resources-section"
import { ScheduleSection } from "@/components/coursebuilder/sections/schedule-section"
import { StudentsSection } from "@/components/coursebuilder/sections/students-section"
import { TemplatesSection } from "@/components/coursebuilder/sections/templates-section"
import { VisibilitySection } from "@/components/coursebuilder/sections/visibility-section"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import { createClient } from "@/lib/supabase/client"
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  FileText,
  AlignJustify,
  Users,
  BookOpen,
  LayoutTemplate,
  Calendar,
  BookMarked,
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
  Check,
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

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}

// ─── Course preview type ─────────────────────────────────────────────────────

interface CourseEssentials {
  title: string
  subtitle: string
  description: string
  language: string
  courseType: string
  teacherId: string
  teacherName: string
  institution: string
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
      { id: "resources", label: "Resources", icon: BookOpen },
      { id: "curriculum", label: "Curriculum", icon: BookMarked },
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
      { id: "llm", label: "AI Model", icon: Brain },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "data-management", label: "Data Management", icon: Database },
      { id: "advanced", label: "Advanced Settings", icon: Settings },
    ],
  },
]

const SETUP_SECTION_IDS = SECTIONS.find((group) => group.heading === "SETUP")?.items.map((item) => item.id) ?? []

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

  // ── Print options ──
  const [colorMode, setColorMode]       = useState<"color" | "grayscale" | "bw">("color")
  const [headerFooter] = useState({ pageNumbers: true, courseTitle: false, date: false, studentName: false })
  const [inkSaver, setInkSaver]         = useState(false)
  const [bleed, setBleed]               = useState(0)        // mm
  const [cropMarks, setCropMarks]       = useState(false)
  const [pageScaling, setPageScaling]   = useState<"fit" | "actual" | "custom">("fit")
  const [customScale, setCustomScale]   = useState(100)       // %
  const [duplex, setDuplex]             = useState<"none" | "long" | "short">("none")
  const [exportQuality, setExportQuality] = useState<"screen" | "print" | "high">("print")

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
      print_options: {
        color_mode:      colorMode,
        header_footer:   headerFooter,
        ink_saver:       inkSaver,
        bleed_mm:        bleed,
        crop_marks:      cropMarks,
        page_scaling:    pageScaling,
        custom_scale:    pageScaling === "custom" ? customScale : null,
        duplex:          duplex,
        export_quality:  exportQuality,
      },
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
  }, [courseId, units, margins, size, orientation, pageCount, onSaved, colorMode, headerFooter, inkSaver, bleed, cropMarks, pageScaling, customScale, duplex, exportQuality])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  const isLandscape = orientation === "landscape"
  const { w, h } = PAGE_DIMS[size]
  const physW = isLandscape ? h : w
  const physH = isLandscape ? w : h
  const previewW = 480
  const previewH = Math.round(previewW * (physH / physW))

  return (
    <SetupSection title="Page Setup" description="Configure the canvas dimensions and margins for lesson pages.">
      <SetupPanelLayout>
        {/* Config */}
        <SetupColumn className="space-y-6">
          {/* Units toggle */}
          <div>
            <FieldLabel>Units</FieldLabel>
            <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {(["cm", "inches"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    units === u
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u === "cm" ? "Metric (cm)" : "Imperial (in)"}
                </button>
              ))}
            </div>
          </div>

          {/* Page size toggle */}
          <div>
            <FieldLabel>Page Size</FieldLabel>
            <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {(["a4", "us-letter"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    size === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "a4" ? "A4" : "US Letter"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{PAGE_LABELS[size][units]}</p>
          </div>

          {/* Orientation toggle */}
          <div>
            <FieldLabel>Orientation</FieldLabel>
            <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {(["portrait", "landscape"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrientation(o)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                    orientation === o
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div>
            <FieldLabel>Margins ({units})</FieldLabel>
            <div className="grid gap-3 grid-cols-2">
              {(["top", "bottom", "left", "right"] as const).map((side) => (
                <div key={side}>
                  <span className="mb-1 block text-xs text-muted-foreground">{side.charAt(0).toUpperCase() + side.slice(1)}</span>
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

          {/* ── Print Options ── */}
          <div className="border-t border-border pt-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Print Options</p>

            {/* Color mode */}
            <div className="mb-5">
              <FieldLabel>Color Mode</FieldLabel>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {(["color", "grayscale", "bw"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setColorMode(m)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      colorMode === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "color" ? "Full Color" : m === "grayscale" ? "Grayscale" : "B & W"}
                  </button>
                ))}
              </div>
            </div>

            {/* Ink saver */}
            <div className="mb-5">
              <label className="flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <span className="text-xs font-medium text-foreground">Ink Saver Mode</span>
                  <p className="text-[11px] text-muted-foreground">Reduces backgrounds &amp; color saturation</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={inkSaver}
                  onClick={() => setInkSaver((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                    inkSaver ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${
                    inkSaver ? "translate-x-[18px]" : "translate-x-[2px]"
                  }`} />
                </button>
              </label>
            </div>

            {/* Bleed & Crop marks */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Bleed (mm)</FieldLabel>
                <TextInput
                  type="number"
                  step={0.5}
                  min={0}
                  max={10}
                  value={bleed}
                  onChange={(e) => setBleed(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <FieldLabel>Crop Marks</FieldLabel>
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-xs text-foreground">{cropMarks ? "Enabled" : "Disabled"}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={cropMarks}
                    onClick={() => setCropMarks((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                      cropMarks ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${
                      cropMarks ? "translate-x-[18px]" : "translate-x-[2px]"
                    }`} />
                  </button>
                </label>
              </div>
            </div>

            {/* Page scaling */}
            <div className="mb-5">
              <FieldLabel>Page Scaling</FieldLabel>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {(["fit", "actual", "custom"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPageScaling(s)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition ${
                      pageScaling === s
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "fit" ? "Fit to Page" : s === "actual" ? "Actual Size" : "Custom"}
                  </button>
                ))}
              </div>
              {pageScaling === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <TextInput
                    type="number"
                    min={25}
                    max={400}
                    step={5}
                    value={customScale}
                    onChange={(e) => setCustomScale(Math.max(25, Math.min(400, parseInt(e.target.value) || 100)))}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}
            </div>

            {/* Duplex */}
            <div className="mb-5">
              <FieldLabel>Duplex Binding</FieldLabel>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {(["none", "long", "short"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuplex(d)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      duplex === d
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d === "none" ? "Single-Sided" : d === "long" ? "Long Edge" : "Short Edge"}
                  </button>
                ))}
              </div>
            </div>

            {/* Export quality */}
            <div>
              <FieldLabel>Export Quality</FieldLabel>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {(["screen", "print", "high"] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setExportQuality(q)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      exportQuality === q
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {q === "screen" ? "Screen (150 DPI)" : q === "print" ? "Print (300 DPI)" : "High (600 DPI)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SetupColumn>

        {/* Visual preview */}
        <SetupColumn>
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div
              className="relative rounded-sm border border-border bg-white shadow-md transition-all duration-200"
              style={{ width: previewW, height: previewH }}
            >
              {/* Bleed area (outside the page) */}
              {bleed > 0 && (
                <div
                  className="absolute rounded-sm border border-dotted border-orange-400/50 bg-orange-400/5"
                  style={{
                    top:    `-${(bleed / 10 / physH) * 100}%`,
                    bottom: `-${(bleed / 10 / physH) * 100}%`,
                    left:   `-${(bleed / 10 / physW) * 100}%`,
                    right:  `-${(bleed / 10 / physW) * 100}%`,
                  }}
                />
              )}
              {/* Crop marks */}
              {cropMarks && (
                <>
                  {/* top-left */}
                  <div className="absolute -top-3 left-0 h-3 w-px bg-foreground/40" />
                  <div className="absolute top-0 -left-3 h-px w-3 bg-foreground/40" />
                  {/* top-right */}
                  <div className="absolute -top-3 right-0 h-3 w-px bg-foreground/40" />
                  <div className="absolute top-0 -right-3 h-px w-3 bg-foreground/40" />
                  {/* bottom-left */}
                  <div className="absolute -bottom-3 left-0 h-3 w-px bg-foreground/40" />
                  <div className="absolute bottom-0 -left-3 h-px w-3 bg-foreground/40" />
                  {/* bottom-right */}
                  <div className="absolute -bottom-3 right-0 h-3 w-px bg-foreground/40" />
                  <div className="absolute bottom-0 -right-3 h-px w-3 bg-foreground/40" />
                </>
              )}
              {/* Margin area */}
              <div
                className="absolute rounded-sm border border-dashed border-primary/30 bg-primary/[0.03]"
                style={{
                  top:    `${(margins.top    / physH) * 100}%`,
                  bottom: `${(margins.bottom / physH) * 100}%`,
                  left:   `${(margins.left   / physW) * 100}%`,
                  right:  `${(margins.right  / physW) * 100}%`,
                }}
              />
              {/* Fake content lines */}
              <div
                className="absolute flex flex-col gap-[6px] opacity-30"
                style={{
                  top:    `calc(${(margins.top / physH) * 100}% + 8px)`,
                  left:   `calc(${(margins.left / physW) * 100}% + 8px)`,
                  right:  `calc(${(margins.right / physW) * 100}% + 8px)`,
                }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-[3px] rounded-full ${colorMode === "bw" ? "bg-black/60" : colorMode === "grayscale" ? "bg-gray-400/60" : "bg-muted-foreground/60"}`} style={{ width: `${70 + (i % 3) * 10}%` }} />
                ))}
              </div>
              {/* Grayscale/BW overlay */}
              {colorMode !== "color" && (
                <div className={`pointer-events-none absolute inset-0 rounded-sm ${
                  colorMode === "bw" ? "mix-blend-saturation bg-white" : "mix-blend-saturation bg-gray-200/40"
                }`} />
              )}
            </div>
          </div>
        </SetupColumn>
      </SetupPanelLayout>
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
    case "resources":      return <ResourcesSection     courseId={existingCourseId} />
    case "curriculum":     return <CurriculumSection    courseId={existingCourseId} />
    case "llm":            return <LLMSection           courseId={existingCourseId} />
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
  const [flashSectionId, setFlashSectionId] = useState<SectionId | null>(null)
  const [completedSetupSections, setCompletedSetupSections] = useState<Record<string, boolean>>({})
  const titleRef = useRef<HTMLInputElement>(null)
  const completionFetchRef = useRef<{ courseId: string | null; at: number }>({ courseId: null, at: 0 })
  const lastSectionKeyRef = useRef<string | null>(null)
  const initializedSectionRef = useRef(false)

  const hydrateSectionCompletion = useCallback((raw: Record<string, unknown>) => {
    const classification = (raw.classification_data as Record<string, unknown> | null) ?? {}
    const students = (raw.students_overview as Record<string, unknown> | null) ?? {}
    const templateSettings = (raw.template_settings as Record<string, unknown> | null) ?? {}
    const schedule = (raw.schedule_settings as Record<string, unknown> | null) ?? {}
    const curriculum = (raw.curriculum_data as Record<string, unknown> | null) ?? {}
    const courseLayout = (raw.course_layout as Record<string, unknown> | null) ?? {}

    const templates = Array.isArray(templateSettings.templates)
      ? templateSettings.templates
      : Array.isArray(templateSettings)
        ? templateSettings
        : []

    const generatedEntries = Array.isArray(schedule.generated_entries) ? schedule.generated_entries : []
    const sessionRows = Array.isArray(curriculum.session_rows) ? curriculum.session_rows : []
    const studentsTotal = typeof students.total === "number" ? students.total : 0
    const pedagogy = (courseLayout.pedagogy as Record<string, unknown> | null) ?? null

    const essentialsDone = hasText(raw.course_name) && hasText(raw.course_description) && hasText(raw.course_language) && hasText(raw.course_type)
    const classificationDone = hasText(classification.domain) && hasText(classification.subject) && hasText(classification.topic)
    const scheduleDone = generatedEntries.length > 0
    const curriculumDone = sessionRows.length > 0

    const completion: Record<string, boolean> = {
      essentials: essentialsDone,
      classification: classificationDone,
      students: studentsTotal > 0,
      pedagogy: pedagogy !== null,
      templates: templates.length > 0,
      schedule: scheduleDone,
      curriculum: curriculumDone,
      generation: essentialsDone && scheduleDone && curriculumDone,
    }

    setCompletedSetupSections(completion)
  }, [])

  useEffect(() => {
    if (!urlCourseId) return
    const supabase = createClient()
    supabase
      .from("courses")
      .select("id, course_name, course_subtitle, course_description, course_language, course_type, course_image, teacher_id, institution, generation_settings, classification_data, students_overview, template_settings, schedule_settings, curriculum_data, course_layout")
      .eq("id", urlCourseId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const gs = (data.generation_settings as Record<string, unknown> | null) ?? null
          const loaded: CourseCreatedData = {
            title: data.course_name ?? "",
            subtitle: data.course_subtitle ?? "",
            description: data.course_description ?? "",
            language: data.course_language ?? "",
            courseType: data.course_type ?? "",
            teacherId: (typeof data.teacher_id === "string" ? data.teacher_id : (typeof gs?.teacher_id === "string" ? gs.teacher_id : "")) ?? "",
            teacherName: (typeof gs?.teacher_name === "string" ? gs.teacher_name : "") ?? "",
            institution: data.institution ?? "Independent",
            imageName: null,
            imageUrl: data.course_image ?? null,
          }
          setInitialEssentials(loaded)
          setCourseCreatedData(loaded)
          setCourseTitle(data.course_name ?? "Untitled Course")
          setCourseId(urlCourseId)

          // Restore page setup from generation_settings
          const gsForPage = data.generation_settings as Record<string, unknown> | null
          if (gsForPage?.page_size) {
            try {
              const cfg = computePageConfig(
                gsForPage.page_size as "a4" | "us-letter",
                (gsForPage.page_orientation as "portrait" | "landscape") ?? "portrait",
                (gsForPage.page_count as number) ?? 1,
                (gsForPage.margins_mm as { top: number; right: number; bottom: number; left: number }) ??
                  { top: 25.4, right: 19.05, bottom: 25.4, left: 19.05 },
              )
              setPageConfig(cfg)
            } catch {
              // ignore malformed settings
            }
          }

          hydrateSectionCompletion(data as Record<string, unknown>)
        }
        setLoadingCourse(false)
      })
  }, [urlCourseId, hydrateSectionCompletion])

  useEffect(() => {
    if (!courseId) {
      setCompletedSetupSections({})
      return
    }
    const now = Date.now()
    if (completionFetchRef.current.courseId === courseId && now - completionFetchRef.current.at < 4000) {
      return
    }
    completionFetchRef.current = { courseId, at: now }
    const supabase = createClient()
    supabase
      .from("courses")
      .select("course_name, course_description, course_language, course_type, classification_data, students_overview, template_settings, schedule_settings, curriculum_data, course_layout")
      .eq("id", courseId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        hydrateSectionCompletion(data as Record<string, unknown>)
      })
  }, [courseId, activeSection, hydrateSectionCompletion])

  useEffect(() => {
    if (!courseId) {
      lastSectionKeyRef.current = "coursebuilder:last-section:new"
      return
    }
    const key = `coursebuilder:last-section:${courseId}`
    lastSectionKeyRef.current = key
    if (initializedSectionRef.current) return
    const stored = window.localStorage.getItem(key)
    if (stored) {
      setActiveSection(stored)
    }
    initializedSectionRef.current = true
  }, [courseId])

  useEffect(() => {
    const key = lastSectionKeyRef.current ?? "coursebuilder:last-section:new"
    window.localStorage.setItem(key, activeSection)
  }, [activeSection])

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

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ sectionId?: SectionId }>
      const sectionId = custom.detail?.sectionId
      if (!sectionId) return
      setView("setup")
      setActiveSection(sectionId)
      setFlashSectionId(sectionId)
      window.setTimeout(() => setFlashSectionId((prev) => (prev === sectionId ? null : prev)), 1800)
    }

    window.addEventListener("coursebuilder:navigate-section", handler)
    return () => window.removeEventListener("coursebuilder:navigate-section", handler)
  }, [])

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

        {/* Center: logo */}
        <div className="flex flex-1 items-center justify-center">
          <img src="/octopus-logo.png" alt="Neptino" className="h-6 w-6" />
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
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border shadow-sm md:flex-row">
              <aside className="no-scrollbar hidden w-52 shrink-0 overflow-y-auto border-r border-border bg-background md:block">
                <nav className="px-3 py-4 space-y-5">
                  {SECTIONS.map((group) => (
                    <div key={group.heading}>
                      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {group.heading}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map(({ id, label, icon: Icon }) => (
                          (() => {
                            const isSetupItem = SETUP_SECTION_IDS.includes(id)
                            const isCompleted = Boolean(completedSetupSections[id])
                            return (
                          <button
                            key={id}
                            onClick={() => setActiveSection(id)}
                            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition ${
                              activeSection === id
                                ? "bg-accent text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {label}
                            {isSetupItem && (
                              <span
                                className={`ml-auto inline-flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
                                  isCompleted
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-transparent"
                                } ${flashSectionId === id ? "animate-pulse" : ""}`}
                                aria-hidden
                              >
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </button>
                            )
                          })()
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </aside>

              <main className="flex-1 overflow-hidden bg-muted/20 px-4 pt-4 pb-4 md:px-8 md:pb-8">
                <div className="mx-auto flex h-full min-h-0 flex-col">
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

              {/* Mobile horizontal section nav — bottom bar */}
              <div className="no-scrollbar flex shrink-0 items-center gap-1 overflow-x-auto border-t border-border bg-background px-2 py-2 md:hidden">
                {SECTIONS.flatMap((group) => group.items).map(({ id, label, icon: Icon }) => (
                  (() => {
                    const isSetupItem = SETUP_SECTION_IDS.includes(id)
                    const isCompleted = Boolean(completedSetupSections[id])
                    return (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                      activeSection === id
                        ? "bg-accent text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    {label}
                    {isSetupItem && (
                      <span
                        className={`ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-transparent"
                        }`}
                        aria-hidden
                      >
                        <Check className="h-2 w-2" />
                      </span>
                    )}
                  </button>
                    )
                  })()
                ))}
              </div>
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
