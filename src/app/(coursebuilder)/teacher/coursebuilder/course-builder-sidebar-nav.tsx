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
    <aside className="no-scrollbar hidden w-60 shrink-0 overflow-y-auto md:block">
      <div className="h-full rounded-2xl border border-border bg-background p-3">
        <nav className="space-y-4">
          {SECTIONS.map((group) => (
            <div key={group.heading}>
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                      className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/30 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-white" : "text-muted-foreground"}`} />
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
      </div>
    </aside>
  )
}
