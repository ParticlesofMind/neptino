import { Check } from "lucide-react"
import { type SectionId, getSections, getSetupSectionIds } from "./page-section-registry"

interface CourseBuilderSidebarNavProps {
  activeSection: SectionId
  setActiveSection: (id: SectionId) => void
  completedSetupSections: Record<string, boolean>
  flashSectionId: SectionId | null
  setupSectionsLocked: boolean
}

export function CourseBuilderSidebarNav({
  activeSection,
  setActiveSection,
  completedSetupSections,
  flashSectionId,
  setupSectionsLocked,
}: CourseBuilderSidebarNavProps) {
  const sections = getSections()
  const setupSectionIds = getSetupSectionIds()

  return (
    <aside className="no-scrollbar hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-background md:block">
      <div className="min-h-full p-3">
        <nav className="space-y-4">
          {sections.map((group) => (
            <div key={group.heading}>
              <p className="mb-1 px-2 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.heading}
              </p>
              <div className="space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const isSetupItem = setupSectionIds.includes(id)
                  const isCompleted = Boolean(completedSetupSections[id])
                  const isActive = activeSection === id
                  const isLocked = setupSectionsLocked && id !== "essentials"
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(id)}
                      disabled={isLocked}
                      aria-disabled={isLocked}
                      title={isLocked ? "Create your course in Essentials to unlock this section." : undefined}
                      className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left font-sans text-xs font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 ${
                        isLocked
                          ? "cursor-not-allowed text-muted-foreground/60"
                          :
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors ${isActive && !isLocked ? "text-foreground" : "text-muted-foreground"}`} />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {isSetupItem && (
                        <span
                          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                            isLocked
                              ? "border-border/70 bg-transparent"
                              :
                            isCompleted
                              ? isActive
                                ? "border-foreground/30 bg-background text-foreground"
                                : "border-muted-foreground/40 bg-background text-muted-foreground"
                              : isActive
                                ? "border-foreground/20 bg-transparent"
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
