import { BookOpen, Blocks, ChevronRight, Layers, Rocket, Settings, Users, Video } from "lucide-react"

type TutorialStatus = "available" | "coming-soon"

interface TutorialItem {
  title: string
  description: string
  duration: string
  status: TutorialStatus
}

interface TutorialSection {
  heading: string
  sub: string
  Icon: React.ComponentType<{ className?: string }>
  items: TutorialItem[]
}

const SECTIONS: TutorialSection[] = [
  {
    heading: "Getting Started",
    sub: "The essentials: account setup, your first course, and navigation.",
    Icon: Rocket,
    items: [
      { title: "Creating your first course",              description: "From blank canvas to a published course in under 10 minutes.",                   duration: "8 min", status: "available" },
      { title: "Navigating the teacher dashboard",        description: "Overview of the home screen, sidebar sections, and quick actions.",               duration: "4 min", status: "available" },
      { title: "Enrolling and managing students",         description: "How to create classes, add learners, and track their progress.",                   duration: "6 min", status: "available" },
      { title: "Understanding roles and permissions",     description: "Teacher, student, and admin roles — what each can see and do.",                    duration: "5 min", status: "available" },
    ],
  },
  {
    heading: "Course Builder",
    sub: "Build rich, structured curricula with the multi-layer canvas builder.",
    Icon: Blocks,
    items: [
      { title: "Curriculum structure: topics, objectives, tasks", description: "Anatomy of a course: how the three-level hierarchy connects to the canvas.", duration: "7 min", status: "available" },
      { title: "Using AI generation",                    description: "Let the AI scaffold a full curriculum from a title and domain. Edit from there.",    duration: "6 min", status: "available" },
      { title: "Course templates",                        description: "Start from a pre-built template and customise it for your subject.",                 duration: "5 min", status: "available" },
      { title: "Drag-and-drop layout",                    description: "Reorder topics and objectives by dragging them on the Setup view.",                 duration: "4 min", status: "available" },
      { title: "Publishing and review workflow",          description: "Draft → Review → Live: managing your course lifecycle.",                            duration: "5 min", status: "coming-soon" },
    ],
  },
  {
    heading: "Canvas and Live Sessions",
    sub: "Delivering lessons in real time using the full-screen canvas.",
    Icon: Video,
    items: [
      { title: "Creating and scheduling a live session",  description: "How to link a canvas document to a scheduled class and launch it live.",           duration: "6 min", status: "coming-soon" },
      { title: "Canvas card types",                       description: "Text, media, simulation, game, timeline, map — what each card does.",               duration: "9 min", status: "coming-soon" },
      { title: "Teacher mode vs. preview mode",           description: "Understanding the difference between editing, previewing, and presenting.",         duration: "4 min", status: "coming-soon" },
    ],
  },
  {
    heading: "Atlas and Encyclopedia",
    sub: "Navigate the built-in knowledge graph and link content to Atlas entities.",
    Icon: Layers,
    items: [
      { title: "What is the Atlas?",                      description: "The 4-layer knowledge system: entities, media, products, and activities.",          duration: "5 min", status: "available" },
      { title: "Filtering and searching the Atlas",       description: "Using domain, type, and layer filters to find relevant atlas entries.",             duration: "4 min", status: "available" },
      { title: "Linking atlas entries to course content", description: "Attaching encyclopedia items to tasks and canvas cards for enriched context.",      duration: "6 min", status: "coming-soon" },
    ],
  },
  {
    heading: "Marketplace",
    sub: "Acquiring, importing, and publishing reusable teaching assets.",
    Icon: BookOpen,
    items: [
      { title: "Browsing and acquiring free assets",      description: "How to find, preview, and add free assets to your library.",                        duration: "4 min", status: "coming-soon" },
      { title: "Importing an asset into a course",        description: "Drag acquired templates and blueprints directly into the course builder.",          duration: "5 min", status: "coming-soon" },
      { title: "Publishing your own asset",               description: "Packaging a template or simulation and submitting it to the marketplace.",           duration: "7 min", status: "coming-soon" },
    ],
  },
  {
    heading: "Settings and Administration",
    sub: "Account preferences, institutional settings, and billing.",
    Icon: Settings,
    items: [
      { title: "Profile and notification settings",       description: "Update your display name, avatar, and communication preferences.",                  duration: "3 min", status: "available" },
      { title: "Institutional accounts",                  description: "Setting up a shared workspace for a school or department.",                          duration: "5 min", status: "coming-soon" },
      { title: "Payout setup for marketplace sellers",    description: "Connecting a payment account to receive revenue from asset sales.",                  duration: "6 min", status: "coming-soon" },
    ],
  },
]

function TutorialRow({ item, isLast }: { item: TutorialItem; isLast: boolean }) {
  const available = item.status === "available"
  return (
    <div className={`flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-muted/20 ${!isLast ? "border-b border-border" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${available ? "text-foreground" : "text-muted-foreground"}`}>
            {item.title}
          </span>
          {!available && (
            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Coming soon
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="shrink-0 text-xs text-muted-foreground">{item.duration}</span>
        {available && (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </div>
    </div>
  )
}

function TutorialSectionBlock({ section }: { section: TutorialSection }) {
  const { Icon } = section
  const available = section.items.filter((i) => i.status === "available").length
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{section.heading}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{section.sub}</p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {available} / {section.items.length} available
        </span>
      </div>
      <div>
        {section.items.map((item, i) => (
          <TutorialRow key={item.title} item={item} isLast={i === section.items.length - 1} />
        ))}
      </div>
    </div>
  )
}

export default function TeacherTutorialsPage() {
  const totalAvailable = SECTIONS.flatMap((s) => s.items).filter((i) => i.status === "available").length
  const totalItems = SECTIONS.flatMap((s) => s.items).length

  const quickLinks = SECTIONS.map(({ heading, Icon, items }) => ({
    heading,
    Icon,
    count: items.filter((i) => i.status === "available").length,
    total: items.length,
  }))

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tutorials</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Step-by-step guides for every feature of Neptino.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            {totalAvailable} <span className="text-muted-foreground">of {totalItems} guides available</span>
          </span>
        </div>
      </div>

      {/* Quick nav bar */}
      <div className="flex items-center gap-0 overflow-x-auto border-b border-border divide-x divide-border">
        {quickLinks.map(({ heading, Icon, count, total }) => (
          <div key={heading} className="flex min-w-0 shrink-0 items-center gap-2 px-5 py-3">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground truncate">{heading}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{count}/{total}</span>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-4 p-5">
        {SECTIONS.map((section) => (
          <TutorialSectionBlock key={section.heading} section={section} />
        ))}
      </div>
    </div>
  )
}
