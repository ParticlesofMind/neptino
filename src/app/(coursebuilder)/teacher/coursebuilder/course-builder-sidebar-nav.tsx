import { Check } from "lucide-react"
import { type SectionId, SECTIONS, SETUP_SECTION_IDS } from "./page-section-registry"

interface CourseBuilderSidebarNavProps {
  activeSection: SectionId
  setActiveSection: (id: SectionId) => void
  completedSetupSections: Record<string, boolean>
  flashSectionId: SectionId | null
}

export function CourseBuilderSidebarNav({
  activeSection,
  setActiveSection,
  completedSetupSections,
  flashSectionId,
}: CourseBuilderSidebarNavProps) {
  return (
    <aside className="no-scrollbar hidden w-56 shrink-0 overflow-y-auto border-r border-border bg-muted/5 md:block">
      <nav className="px-2 py-3 space-y-4">
        {SECTIONS.map((group) => (
          <div key={group.heading}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.heading}
            </p>
            <div className="space-y-1">
              {group.items.map(({ id, label, icon: Icon }) => {
                const isSetupItem = SETUP_SECTION_IDS.includes(id)
                const isCompleted = Boolean(completedSetupSections[id])
                const isActive = activeSection === id
                return (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 border ${
                      isActive
                        ? "border-primary bg-primary text-white shadow-md"
                        : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                    }`} />
                    <span className="flex-1">{label}</span>
                    {isSetupItem && (
                      <span
                        className={`shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                          isCompleted
                            ? isActive
                              ? "border-white bg-white/20 text-white"
                              : "border-primary bg-primary/10 text-primary"
                            : isActive
                              ? "border-white/40 bg-transparent"
                              : "border-border bg-transparent"
                        } ${flashSectionId === id ? "animate-pulse" : ""}`}
                        aria-hidden
                      >
                        {isCompleted && <Check className="h-3 w-3" />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
