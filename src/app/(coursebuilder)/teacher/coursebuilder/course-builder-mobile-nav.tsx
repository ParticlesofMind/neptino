import { Check } from "lucide-react"
import { type SectionId, getSections, getSetupSectionIds } from "./page-section-registry"

interface CourseBuilderMobileNavProps {
  activeSection: SectionId
  setActiveSection: (id: SectionId) => void
  completedSetupSections: Record<string, boolean>
  setupSectionsLocked: boolean
}

export function CourseBuilderMobileNav({
  activeSection,
  setActiveSection,
  completedSetupSections,
  setupSectionsLocked,
}: CourseBuilderMobileNavProps) {
  const sections = getSections()
  const setupSectionIds = getSetupSectionIds()

  return (
    <div className="no-scrollbar flex h-14 shrink-0 items-center gap-1 overflow-x-auto border-t border-border bg-background px-2 py-1.5 md:hidden">
      {sections.flatMap((group) => group.items).map(({ id, label, icon: Icon }) => {
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
            title={label}
            className={`relative flex h-10 min-w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border px-2.5 font-sans text-[10px] font-medium whitespace-nowrap transition-colors duration-150 ${
              isLocked
                ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground/70"
                :
              isActive
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 transition-colors ${
              isActive && !isLocked ? "text-primary" : "text-muted-foreground"
            }`} />
            <span className="hidden sm:block">{label}</span>
            {isSetupItem && isCompleted && (
              <Check className="absolute right-1 top-1 h-3 w-3 text-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
